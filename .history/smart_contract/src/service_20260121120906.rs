//! # Stake and Steal - GraphQL Service

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;

use async_graphql::{EmptySubscription, Object, Request, Response, Schema, SimpleObject};
use linera_sdk::{linera_base_types::WithServiceAbi, views::View, Service, ServiceRuntime};
use stake_and_steal::StakeAndStealAbi;

use self::state::StakeAndStealState;

pub struct StakeAndStealService {
    state: Arc<StakeAndStealState>,
}

linera_sdk::service!(StakeAndStealService);

impl WithServiceAbi for StakeAndStealService {
    type Abi = StakeAndStealAbi;
}

impl Service for StakeAndStealService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = StakeAndStealState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        StakeAndStealService {
            state: Arc::new(state),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot {
                state: self.state.clone(),
            },
            MutationRoot,
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

// GraphQL-friendly types (avoiding u128 which doesn't implement OutputType)
#[derive(SimpleObject)]
struct PlayerInfo {
    is_registered: bool,
    encrypted_name: String,
    /// Token A (USDT) balance
    token_a_balance: String,
    /// Token B (SAS) balance
    token_b_balance: String,
    page_count: u8,
    raid_state: String,
}

#[derive(SimpleObject)]
struct InventoryInfo {
    total_plots: u8,
    shields: u8,
}

#[derive(SimpleObject)]
struct StatsInfo {
    total_deposited: String,
    total_withdrawn: String,
    /// Total Token A yield earned
    total_token_a_yield_earned: String,
    /// Total SAS earned
    total_sas_earned: String,
    /// Total SAS spent (on plots and shields)
    total_sas_spent: String,
    total_stolen: String,
    total_lost_to_steals: String,
    successful_steals: u32,
    failed_steals: u32,
    times_raided: u32,
    shields_used: u32,
    plots_purchased: u32,
}

#[derive(SimpleObject)]
struct PageInfo {
    page_id: u8,
    plots: Vec<PlotInfo>,
    total_balance: String,
    total_pending_yield: String,
    total_pending_sas: String,
}

#[derive(SimpleObject)]
struct PlotInfo {
    plot_id: u8,
    /// Token A balance in this plot
    token_a_balance: String,
    /// Pending Token A yield
    pending_token_a_yield: String,
    /// Pending SAS rewards
    pending_sas_rewards: String,
    deposit_block: String,
    last_claim_block: String,
    is_active: bool,
    is_purchased: bool,
}

#[derive(SimpleObject)]
struct ConfigInfo {
    yield_rate_bps: u32,
    sas_reward_rate_bps: u32,
    /// Minimum stake required for guaranteed steal
    min_steal_stake: String,
    min_deposit: String,
    max_deposit: String,
    raid_cooldown_blocks: String,
    max_targets_per_request: u8,
    plot_cost_sas: String,
    shield_cost_sas: String,
}

/// GraphQL Query Root
struct QueryRoot {
    state: Arc<StakeAndStealState>,
}

#[Object]
impl QueryRoot {
    /// Get player information
    async fn player(&self) -> PlayerInfo {
        let raid_state_str = match self.state.raid_state.get() {
            stake_and_steal::RaidState::Idle => "Idle".to_string(),
            stake_and_steal::RaidState::Searching { .. } => "Searching".to_string(),
            stake_and_steal::RaidState::Choosing { .. } => "Choosing".to_string(),
            stake_and_steal::RaidState::Locked { .. } => "Locked".to_string(),
            stake_and_steal::RaidState::Executing { .. } => "Executing".to_string(),
            stake_and_steal::RaidState::Cooldown { .. } => "Cooldown".to_string(),
        };

        PlayerInfo {
            is_registered: *self.state.is_registered.get(),
            encrypted_name: hex::encode(self.state.encrypted_name.get()),
            token_a_balance: self.state.token_a_balance.get().to_string(),
            token_b_balance: self.state.token_b_balance.get().to_string(),
            page_count: *self.state.page_count.get(),
            raid_state: raid_state_str,
        }
    }

    /// Get player inventory
    async fn inventory(&self) -> InventoryInfo {
        let inv = self.state.inventory.get();
        InventoryInfo {
            total_plots: inv.total_plots,
            shields: inv.shields,
        }
    }

    /// Get player statistics
    async fn stats(&self) -> StatsInfo {
        let stats = self.state.stats.get();
        StatsInfo {
            total_deposited: stats.total_deposited.to_string(),
            total_withdrawn: stats.total_withdrawn.to_string(),
            total_token_a_yield_earned: stats.total_token_a_yield_earned.to_string(),
            total_sas_earned: stats.total_sas_earned.to_string(),
            total_sas_spent: stats.total_sas_spent.to_string(),
            total_stolen: stats.total_stolen.to_string(),
            total_lost_to_steals: stats.total_lost_to_steals.to_string(),
            successful_steals: stats.successful_steals,
            failed_steals: stats.failed_steals,
            times_raided: stats.times_raided,
            shields_used: stats.shields_used,
            plots_purchased: stats.plots_purchased,
        }
    }

    /// Get game configuration
    async fn config(&self) -> ConfigInfo {
        let config = self.state.config.get();
        ConfigInfo {
            yield_rate_bps: config.yield_rate_bps,
            sas_reward_rate_bps: config.sas_reward_rate_bps,
            min_steal_stake: config.min_steal_stake.to_string(),
            min_deposit: config.min_deposit.to_string(),
            max_deposit: config.max_deposit.to_string(),
            raid_cooldown_blocks: config.raid_cooldown_blocks.to_string(),
            max_targets_per_request: config.max_targets_per_request,
            plot_cost_sas: config.plot_cost_sas.to_string(),
            shield_cost_sas: config.shield_cost_sas.to_string(),
        }
    }

    /// Get Token A (USDT) balance
    async fn token_a_balance(&self) -> String {
        self.state.token_a_balance.get().to_string()
    }

    /// Get Token B (SAS) balance
    async fn token_b_balance(&self) -> String {
        self.state.token_b_balance.get().to_string()
    }

    /// Get a specific page
    async fn page(&self, page_id: u8) -> Option<PageInfo> {
        let page = self.state.pages.get(&page_id).await.ok()??;

        let plots: Vec<PlotInfo> = page
            .plots
            .iter()
            .enumerate()
            .map(|(i, plot)| PlotInfo {
                plot_id: i as u8,
                token_a_balance: plot.token_a_balance.to_string(),
                pending_token_a_yield: plot.pending_token_a_yield.to_string(),
                pending_sas_rewards: plot.pending_sas_rewards.to_string(),
                deposit_block: plot.deposit_block.to_string(),
                last_claim_block: plot.last_claim_block.to_string(),
                is_active: plot.is_active,
                is_purchased: plot.is_purchased,
                shield_active: plot.shield_active,
            })
            .collect();

        let total_balance: u128 = page.plots.iter().map(|p| p.token_a_balance).sum();
        let total_pending_yield: u128 = page.plots.iter().map(|p| p.pending_token_a_yield).sum();
        let total_pending_sas: u128 = page.plots.iter().map(|p| p.pending_sas_rewards).sum();

        Some(PageInfo {
            page_id: page.page_id,
            plots,
            total_balance: total_balance.to_string(),
            total_pending_yield: total_pending_yield.to_string(),
            total_pending_sas: total_pending_sas.to_string(),
        })
    }

    /// Get all pages
    async fn pages(&self) -> Vec<PageInfo> {
        let page_count = *self.state.page_count.get();
        let mut pages = Vec::new();

        for page_id in 0..page_count {
            if let Ok(Some(page)) = self.state.pages.get(&page_id).await {
                let plots: Vec<PlotInfo> = page
                    .plots
                    .iter()
                    .enumerate()
                    .map(|(i, plot)| PlotInfo {
                        plot_id: i as u8,
                        token_a_balance: plot.token_a_balance.to_string(),
                        pending_token_a_yield: plot.pending_token_a_yield.to_string(),
                        pending_sas_rewards: plot.pending_sas_rewards.to_string(),
                        deposit_block: plot.deposit_block.to_string(),
                        last_claim_block: plot.last_claim_block.to_string(),
                        is_active: plot.is_active,
                        is_purchased: plot.is_purchased,
                        shield_active: plot.shield_active,
                    })
                    .collect();

                let total_balance: u128 = page.plots.iter().map(|p| p.token_a_balance).sum();
                let total_pending_yield: u128 = page.plots.iter().map(|p| p.pending_token_a_yield).sum();
                let total_pending_sas: u128 = page.plots.iter().map(|p| p.pending_sas_rewards).sum();

                pages.push(PageInfo {
                    page_id: page.page_id,
                    plots,
                    total_balance: total_balance.to_string(),
                    total_pending_yield: total_pending_yield.to_string(),
                    total_pending_sas: total_pending_sas.to_string(),
                });
            }
        }

        pages
    }

    /// Calculate total Token A yield for all active plots
    async fn pending_token_a_yield(&self) -> String {
        let page_count = *self.state.page_count.get();
        let current_block = *self.state.current_block.get();
        let config = self.state.config.get();
        let mut total_yield = 0u128;

        for page_id in 0..page_count {
            if let Ok(Some(page)) = self.state.pages.get(&page_id).await {
                for plot in &page.plots {
                    if plot.is_active {
                        total_yield += plot.calculate_token_a_yield(current_block, config.yield_rate_bps);
                    }
                }
            }
        }

        total_yield.to_string()
    }

    /// Calculate total SAS rewards for all active plots
    async fn pending_sas_rewards(&self) -> String {
        let page_count = *self.state.page_count.get();
        let current_block = *self.state.current_block.get();
        let config = self.state.config.get();
        let mut total_sas = 0u128;

        for page_id in 0..page_count {
            if let Ok(Some(page)) = self.state.pages.get(&page_id).await {
                for plot in &page.plots {
                    if plot.is_active {
                        total_sas += plot.calculate_sas_rewards(current_block, config.sas_reward_rate_bps);
                    }
                }
            }
        }

        total_sas.to_string()
    }
}

/// GraphQL Mutation Root (empty - operations go through contract)
struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Placeholder mutation (operations use contract, not service)
    async fn placeholder(&self) -> bool {
        true
    }
}
