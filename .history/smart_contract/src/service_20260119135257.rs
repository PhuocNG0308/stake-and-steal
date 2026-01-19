//! # Steal & Yield - GraphQL Service

use async_graphql::{EmptySubscription, Object, Schema, SimpleObject};
use linera_sdk::{
    linera_base_types::WithServiceAbi,
    Service, ServiceRuntime,
};
use steal_and_yield::{GameConfig, GameError, PlayerStats, RaidState, StealAndYieldAbi};

mod state;
use state::PlayerState;

/// The service implementation
pub struct StealAndYieldService {
    runtime: ServiceRuntime<Self>,
}

linera_sdk::service!(StealAndYieldService);

impl WithServiceAbi for StealAndYieldService {
    type Abi = StealAndYieldAbi;
}

impl Service for StealAndYieldService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        StealAndYieldService { runtime }
    }

    async fn handle_query(&self, query: Self::Query) -> Self::QueryResponse {
        let schema = Schema::build(
            QueryRoot { runtime: &self.runtime },
            MutationRoot,
            EmptySubscription,
        )
        .finish();
        
        schema.execute(query).await
    }
}

// GraphQL-friendly types (avoiding u128 which doesn't implement OutputType)
#[derive(SimpleObject)]
struct PlayerInfo {
    is_registered: bool,
    encrypted_name: String,
    available_balance: String, // u128 as string
    page_count: u8,
    raid_state: String,
    stats: StatsInfo,
}

#[derive(SimpleObject)]
struct StatsInfo {
    total_deposited: String,
    total_withdrawn: String,
    total_yield_earned: String,
    total_stolen: String,
    total_lost_to_steals: String,
    successful_steals: u32,
    failed_steals: u32,
    times_raided: u32,
}

#[derive(SimpleObject)]
struct PageInfo {
    page_id: u8,
    plots: Vec<PlotInfo>,
    total_balance: String,
    total_pending_yield: String,
}

#[derive(SimpleObject)]
struct PlotInfo {
    plot_id: u8,
    balance: String,
    pending_yield: String,
    deposit_block: u64,
    last_claim_block: u64,
    is_active: bool,
}

#[derive(SimpleObject)]
struct ConfigInfo {
    yield_rate_bps: u32,
    steal_chance_bps: u32,
    min_deposit: String,
    max_deposit: String,
    raid_cooldown_blocks: u64,
    max_targets_per_request: u8,
}

#[derive(SimpleObject)]
struct RaidInfo {
    state: String,
    details: Option<String>,
}

impl From<&PlayerStats> for StatsInfo {
    fn from(stats: &PlayerStats) -> Self {
        StatsInfo {
            total_deposited: stats.total_deposited.to_string(),
            total_withdrawn: stats.total_withdrawn.to_string(),
            total_yield_earned: stats.total_yield_earned.to_string(),
            total_stolen: stats.total_stolen.to_string(),
            total_lost_to_steals: stats.total_lost_to_steals.to_string(),
            successful_steals: stats.successful_steals,
            failed_steals: stats.failed_steals,
            times_raided: stats.times_raided,
        }
    }
}

impl From<&GameConfig> for ConfigInfo {
    fn from(config: &GameConfig) -> Self {
        ConfigInfo {
            yield_rate_bps: config.yield_rate_bps,
            steal_chance_bps: config.steal_chance_bps,
            min_deposit: config.min_deposit.to_string(),
            max_deposit: config.max_deposit.to_string(),
            raid_cooldown_blocks: config.raid_cooldown_blocks,
            max_targets_per_request: config.max_targets_per_request,
        }
    }
}

fn raid_state_to_string(state: &RaidState) -> RaidInfo {
    match state {
        RaidState::Idle => RaidInfo {
            state: "Idle".to_string(),
            details: None,
        },
        RaidState::Cooldown { until_block } => RaidInfo {
            state: "Cooldown".to_string(),
            details: Some(format!("until_block: {}", until_block)),
        },
        RaidState::Searching { request_id } => RaidInfo {
            state: "Searching".to_string(),
            details: Some(format!("request_id: {}", request_id)),
        },
        RaidState::Choosing { targets, expires_at_block } => RaidInfo {
            state: "Choosing".to_string(),
            details: Some(format!(
                "targets: {}, expires_at: {}",
                targets.len(),
                expires_at_block
            )),
        },
        RaidState::Locked { target_chain, expires_at_block, .. } => RaidInfo {
            state: "Locked".to_string(),
            details: Some(format!(
                "target: {:?}, expires_at: {}",
                target_chain,
                expires_at_block
            )),
        },
        RaidState::Executing { target_chain, target_page, target_plot } => RaidInfo {
            state: "Executing".to_string(),
            details: Some(format!(
                "target: {:?}, page: {}, plot: {}",
                target_chain, target_page, target_plot
            )),
        },
    }
}

/// GraphQL Query Root
struct QueryRoot<'a> {
    runtime: &'a ServiceRuntime<StealAndYieldService>,
}

#[Object]
impl<'a> QueryRoot<'a> {
    /// Get player information
    async fn player(&self) -> Result<PlayerInfo, String> {
        let state = self.runtime.state().await;
        
        Ok(PlayerInfo {
            is_registered: *state.is_registered.get(),
            encrypted_name: hex::encode(state.encrypted_name.get()),
            available_balance: state.available_balance.get().to_string(),
            page_count: *state.page_count.get(),
            raid_state: raid_state_to_string(state.raid_state.get()).state,
            stats: StatsInfo::from(state.stats.get()),
        })
    }

    /// Get player statistics
    async fn stats(&self) -> Result<StatsInfo, String> {
        let state = self.runtime.state().await;
        Ok(StatsInfo::from(state.stats.get()))
    }

    /// Get game configuration
    async fn config(&self) -> Result<ConfigInfo, String> {
        let state = self.runtime.state().await;
        Ok(ConfigInfo::from(state.config.get()))
    }

    /// Get raid state
    async fn raid_state(&self) -> Result<RaidInfo, String> {
        let state = self.runtime.state().await;
        Ok(raid_state_to_string(state.raid_state.get()))
    }

    /// Get a specific page
    async fn page(&self, page_id: u8) -> Result<Option<PageInfo>, String> {
        let state = self.runtime.state().await;
        
        let page = state.pages.get(&page_id).await.map_err(|e| e.to_string())?;
        
        match page {
            Some(p) => {
                let plots: Vec<PlotInfo> = p.plots
                    .iter()
                    .enumerate()
                    .map(|(i, plot)| PlotInfo {
                        plot_id: i as u8,
                        balance: plot.balance.to_string(),
                        pending_yield: plot.pending_yield.to_string(),
                        deposit_block: plot.deposit_block,
                        last_claim_block: plot.last_claim_block,
                        is_active: plot.is_active,
                    })
                    .collect();
                
                let total_balance: u128 = p.plots.iter().map(|plot| plot.balance).sum();
                let total_pending: u128 = p.plots.iter().map(|plot| plot.pending_yield).sum();
                
                Ok(Some(PageInfo {
                    page_id: p.page_id,
                    plots,
                    total_balance: total_balance.to_string(),
                    total_pending_yield: total_pending.to_string(),
                }))
            }
            None => Ok(None),
        }
    }

    /// Get all pages
    async fn pages(&self) -> Result<Vec<PageInfo>, String> {
        let state = self.runtime.state().await;
        let page_count = *state.page_count.get();
        let mut pages = Vec::new();
        
        for page_id in 0..page_count {
            if let Ok(Some(p)) = state.pages.get(&page_id).await {
                let plots: Vec<PlotInfo> = p.plots
                    .iter()
                    .enumerate()
                    .map(|(i, plot)| PlotInfo {
                        plot_id: i as u8,
                        balance: plot.balance.to_string(),
                        pending_yield: plot.pending_yield.to_string(),
                        deposit_block: plot.deposit_block,
                        last_claim_block: plot.last_claim_block,
                        is_active: plot.is_active,
                    })
                    .collect();
                
                let total_balance: u128 = p.plots.iter().map(|plot| plot.balance).sum();
                let total_pending: u128 = p.plots.iter().map(|plot| plot.pending_yield).sum();
                
                pages.push(PageInfo {
                    page_id: p.page_id,
                    plots,
                    total_balance: total_balance.to_string(),
                    total_pending_yield: total_pending.to_string(),
                });
            }
        }
        
        Ok(pages)
    }

    /// Get available balance
    async fn balance(&self) -> Result<String, String> {
        let state = self.runtime.state().await;
        Ok(state.available_balance.get().to_string())
    }

    /// Calculate total yield for all active plots
    async fn pending_yield(&self) -> Result<String, String> {
        let state = self.runtime.state().await;
        let page_count = *state.page_count.get();
        let current_block = *state.current_block.get();
        let config = state.config.get();
        let mut total_yield = 0u128;
        
        for page_id in 0..page_count {
            if let Ok(Some(p)) = state.pages.get(&page_id).await {
                for plot in &p.plots {
                    if plot.is_active {
                        total_yield += plot.calculate_yield(current_block, config.yield_rate_bps);
                    }
                }
            }
        }
        
        Ok(total_yield.to_string())
    }
}

/// GraphQL Mutation Root (empty for now, operations go through contract)
struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Placeholder mutation
    async fn placeholder(&self) -> bool {
        true
    }
}
