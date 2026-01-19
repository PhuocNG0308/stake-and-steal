//! # Steal & Yield - GraphQL Service
//!
//! Provides read-only access to game state via GraphQL queries.

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use async_graphql::{EmptySubscription, Object, Request, Response, Schema, SimpleObject};
use linera_sdk::{
    linera_base_types::{ChainId, WithServiceAbi},
    views::{View, ViewStorageContext},
    Service, ServiceRuntime,
};
use steal_and_yield::{
    EncryptedData, GameConfig, LandPlot, Page, PlayerStats, RaidState, StealAndYieldAbi,
    TargetInfo,
};

use crate::state::PlayerState;

/// GraphQL service for the game
pub struct StealAndYieldService {
    state: PlayerState,
    runtime: ServiceRuntime<Self>,
}

linera_sdk::service!(StealAndYieldService);

impl WithServiceAbi for StealAndYieldService {
    type Abi = StealAndYieldAbi;
}

impl Service for StealAndYieldService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = PlayerState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");

        Self { state, runtime }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot {
                state: &self.state,
                runtime: &self.runtime,
            },
            MutationRoot,
            EmptySubscription,
        )
        .finish();

        schema.execute(request).await
    }
}

// ============================================================================
// GRAPHQL TYPES
// ============================================================================

/// GraphQL representation of a land plot
#[derive(SimpleObject)]
struct PlotInfo {
    plot_id: u8,
    balance: String,
    encrypted_balance: String,
    last_claim_block: String,
    is_empty: bool,
    is_locked: bool,
    lock_until_block: Option<String>,
    yield_earned: String,
    estimated_yield: String,
}

/// GraphQL representation of a page
#[derive(SimpleObject)]
struct PageInfo {
    page_id: u8,
    plots: Vec<PlotInfo>,
    total_balance: String,
    active_plots: u8,
}

/// GraphQL representation of player stats
#[derive(SimpleObject)]
struct PlayerStatsInfo {
    total_deposited: String,
    total_withdrawn: String,
    total_yield_earned: String,
    total_stolen_from_others: String,
    total_lost_to_thieves: String,
    successful_steals: u32,
    failed_steals: u32,
    times_raided: u32,
    times_defended: u32,
    win_rate: f64,
}

/// GraphQL representation of raid state
#[derive(SimpleObject)]
struct RaidStateInfo {
    state: String,
    targets: Option<Vec<TargetInfoGql>>,
    locked_target: Option<String>,
    lock_until: Option<String>,
    commitment: Option<String>,
}

/// GraphQL target info
#[derive(SimpleObject)]
struct TargetInfoGql {
    chain_id: String,
    estimated_value: String,
    last_active_block: String,
    defense_score: u8,
}

/// GraphQL attack log entry
#[derive(SimpleObject)]
struct AttackLogEntry {
    attacker_chain: String,
    timestamp_block: String,
    success: bool,
    amount: String,
}

/// GraphQL representation of game config
#[derive(SimpleObject)]
struct GameConfigInfo {
    yield_rate_bps: String,
    steal_success_rate: u8,
    steal_cooldown_blocks: String,
    max_pages: u8,
    max_plots_per_page: u8,
    min_deposit: String,
    max_steal_percentage: u8,
}

// ============================================================================
// QUERY ROOT
// ============================================================================

struct QueryRoot<'a> {
    state: &'a PlayerState,
    runtime: &'a ServiceRuntime<StealAndYieldService>,
}

#[Object]
impl<'a> QueryRoot<'a> {
    /// Check if player is registered
    async fn is_registered(&self) -> bool {
        *self.state.is_registered.get()
    }

    /// Get current chain ID
    async fn chain_id(&self) -> String {
        format!("{:?}", self.runtime.chain_id())
    }

    /// Get registry chain ID
    async fn registry_chain_id(&self) -> Option<String> {
        self.state.registry_chain_id.get().map(|c| format!("{:?}", c))
    }

    /// Get available balance (unclaimed yield + withdrawn funds)
    async fn available_balance(&self) -> String {
        self.state.available_balance.get().to_string()
    }

    /// Get total deposited across all pages
    async fn total_deposited(&self) -> String {
        self.state.total_deposited.get().to_string()
    }

    /// Get total yield earned
    async fn total_yield_earned(&self) -> String {
        self.state.total_yield_earned.get().to_string()
    }

    /// Get number of pages owned
    async fn page_count(&self) -> u8 {
        *self.state.page_count.get()
    }

    /// Get current block height
    async fn current_block(&self) -> String {
        self.state.current_block.get().to_string()
    }

    /// Get game configuration
    async fn config(&self) -> GameConfigInfo {
        let config = self.state.config.get();
        GameConfigInfo {
            yield_rate_bps: config.yield_rate_bps.to_string(),
            steal_success_rate: config.steal_success_rate,
            steal_cooldown_blocks: config.steal_cooldown_blocks.to_string(),
            max_pages: config.max_pages,
            max_plots_per_page: config.max_plots_per_page,
            min_deposit: config.min_deposit.to_string(),
            max_steal_percentage: config.max_steal_percentage,
        }
    }

    /// Get a specific page with all its plots
    async fn page(&self, page_id: u8) -> Option<PageInfo> {
        let page_opt = self.state.pages.get(&page_id).await.ok().flatten();

        match page_opt {
            Some(page) => {
                let current_block = *self.state.current_block.get();
                let config = self.state.config.get();

                let mut plots: Vec<PlotInfo> = Vec::new();
                let mut total_balance = 0u128;
                let mut active_plots = 0u8;

                for (plot_id, plot) in page.plots.iter().enumerate() {
                    if let Some(p) = plot {
                        let balance = p.encrypted_balance.decrypt(&self.get_dummy_key());
                        let yield_earned = p.calculate_pending_yield(current_block, config.yield_rate_bps);

                        total_balance += balance;
                        if balance > 0 {
                            active_plots += 1;
                        }

                        plots.push(PlotInfo {
                            plot_id: plot_id as u8,
                            balance: balance.to_string(),
                            encrypted_balance: hex::encode(&p.encrypted_balance.ciphertext),
                            last_claim_block: p.last_claim_block.to_string(),
                            is_empty: balance == 0,
                            is_locked: p.is_locked,
                            lock_until_block: if p.is_locked {
                                Some(p.lock_until_block.to_string())
                            } else {
                                None
                            },
                            yield_earned: p.yield_earned.to_string(),
                            estimated_yield: yield_earned.to_string(),
                        });
                    } else {
                        // Empty plot
                        plots.push(PlotInfo {
                            plot_id: plot_id as u8,
                            balance: "0".to_string(),
                            encrypted_balance: String::new(),
                            last_claim_block: "0".to_string(),
                            is_empty: true,
                            is_locked: false,
                            lock_until_block: None,
                            yield_earned: "0".to_string(),
                            estimated_yield: "0".to_string(),
                        });
                    }
                }

                Some(PageInfo {
                    page_id,
                    plots,
                    total_balance: total_balance.to_string(),
                    active_plots,
                })
            }
            None => None,
        }
    }

    /// Get all pages overview
    async fn all_pages(&self) -> Vec<PageInfo> {
        let page_count = *self.state.page_count.get();
        let mut pages = Vec::new();

        for page_id in 0..page_count {
            if let Some(page_info) = self.page(page_id).await {
                pages.push(page_info);
            }
        }

        pages
    }

    /// Get player stats
    async fn stats(&self) -> PlayerStatsInfo {
        let stats = self.state.stats.get();
        let total_attempts = stats.successful_steals + stats.failed_steals;
        let win_rate = if total_attempts > 0 {
            (stats.successful_steals as f64) / (total_attempts as f64) * 100.0
        } else {
            0.0
        };

        PlayerStatsInfo {
            total_deposited: stats.total_deposited.to_string(),
            total_withdrawn: stats.total_withdrawn.to_string(),
            total_yield_earned: stats.total_yield_earned.to_string(),
            total_stolen_from_others: stats.total_stolen_from_others.to_string(),
            total_lost_to_thieves: stats.total_lost_to_thieves.to_string(),
            successful_steals: stats.successful_steals,
            failed_steals: stats.failed_steals,
            times_raided: stats.times_raided,
            times_defended: stats.times_defended,
            win_rate,
        }
    }

    /// Get current raid state
    async fn raid_state(&self) -> RaidStateInfo {
        let raid_state = self.state.raid_state.get();

        match raid_state {
            RaidState::Idle => RaidStateInfo {
                state: "Idle".to_string(),
                targets: None,
                locked_target: None,
                lock_until: None,
                commitment: None,
            },
            RaidState::FindingTargets { request_id } => RaidStateInfo {
                state: format!("FindingTargets({})", request_id),
                targets: None,
                locked_target: None,
                lock_until: None,
                commitment: None,
            },
            RaidState::TargetsReceived { targets } => RaidStateInfo {
                state: "TargetsReceived".to_string(),
                targets: Some(
                    targets
                        .iter()
                        .map(|t| TargetInfoGql {
                            chain_id: format!("{:?}", t.chain_id),
                            estimated_value: t.estimated_value.to_string(),
                            last_active_block: t.last_active_block.to_string(),
                            defense_score: t.defense_score,
                        })
                        .collect(),
                ),
                locked_target: None,
                lock_until: None,
                commitment: None,
            },
            RaidState::TargetLocked {
                target_chain,
                commitment,
                lock_until_block,
            } => RaidStateInfo {
                state: "TargetLocked".to_string(),
                targets: None,
                locked_target: Some(format!("{:?}", target_chain)),
                lock_until: Some(lock_until_block.to_string()),
                commitment: Some(hex::encode(commitment)),
            },
            RaidState::ExecutingSteal { target_chain, .. } => RaidStateInfo {
                state: "ExecutingSteal".to_string(),
                targets: None,
                locked_target: Some(format!("{:?}", target_chain)),
                lock_until: None,
                commitment: None,
            },
            RaidState::Completed { success, amount } => RaidStateInfo {
                state: format!("Completed(success={}, amount={})", success, amount),
                targets: None,
                locked_target: None,
                lock_until: None,
                commitment: None,
            },
            RaidState::OnCooldown { until_block } => RaidStateInfo {
                state: format!("OnCooldown({})", until_block),
                targets: None,
                locked_target: None,
                lock_until: None,
                commitment: None,
            },
        }
    }

    /// Get attack logs
    async fn attack_logs(&self, limit: Option<u32>) -> Vec<AttackLogEntry> {
        let limit = limit.unwrap_or(10) as usize;
        let mut logs: Vec<AttackLogEntry> = Vec::new();

        // Get from the collection
        self.state.attack_logs.for_each_index(|idx| {
            if logs.len() >= limit {
                return Ok(());
            }
            // We'll need to get each log entry
            Ok(())
        }).await.ok();

        // For simplicity, return empty for now
        // In production, implement proper iteration
        logs
    }

    /// Get last steal cooldown block
    async fn last_steal_block(&self) -> String {
        self.state.last_steal_block.get().to_string()
    }

    /// Check if player is on steal cooldown
    async fn is_on_cooldown(&self) -> bool {
        let current_block = *self.state.current_block.get();
        let last_steal = *self.state.last_steal_block.get();
        let config = self.state.config.get();

        current_block < last_steal + config.steal_cooldown_blocks
    }

    /// Get cooldown remaining blocks
    async fn cooldown_remaining(&self) -> String {
        let current_block = *self.state.current_block.get();
        let last_steal = *self.state.last_steal_block.get();
        let config = self.state.config.get();

        let cooldown_end = last_steal + config.steal_cooldown_blocks;
        if current_block >= cooldown_end {
            "0".to_string()
        } else {
            (cooldown_end - current_block).to_string()
        }
    }

    /// Calculate total pending yield across all pages
    async fn total_pending_yield(&self) -> String {
        let current_block = *self.state.current_block.get();
        let config = self.state.config.get();
        let page_count = *self.state.page_count.get();

        let mut total_yield = 0u128;

        for page_id in 0..page_count {
            if let Ok(Some(page)) = self.state.pages.get(&page_id).await {
                for plot in page.plots.iter().flatten() {
                    total_yield += plot.calculate_pending_yield(current_block, config.yield_rate_bps);
                }
            }
        }

        total_yield.to_string()
    }

    /// Get player power score (for matchmaking)
    async fn power_score(&self) -> u64 {
        let total_deposited = *self.state.total_deposited.get();
        let stats = self.state.stats.get();

        // Simple power calculation
        let base_power = (total_deposited / 1_000_000) as u64; // Scale down
        let steal_bonus = stats.successful_steals as u64 * 10;
        let defense_bonus = stats.times_defended as u64 * 5;

        base_power + steal_bonus + defense_bonus
    }
}

impl<'a> QueryRoot<'a> {
    fn get_dummy_key(&self) -> Vec<u8> {
        // In production, this should use the actual owner's key
        vec![0u8; 32]
    }
}

// ============================================================================
// MUTATION ROOT (empty - mutations go through operations)
// ============================================================================

struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Placeholder - all mutations go through contract operations
    async fn _placeholder(&self) -> bool {
        true
    }
}
