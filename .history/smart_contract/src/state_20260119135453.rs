//! # Steal & Yield - Application State

use linera_sdk::views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext};
use steal_and_yield::{GameConfig, Page, PlayerStats, RaidState};

/// The application state for a player
#[derive(RootView, async_graphql::SimpleObject)]
#[view(context = ViewStorageContext)]
pub struct StealAndYieldState {
    /// Whether the player is registered
    pub is_registered: RegisterView<bool>,
    /// Encrypted player name
    pub encrypted_name: RegisterView<Vec<u8>>,
    /// Available balance (not deposited in plots)
    pub available_balance: RegisterView<u128>,
    /// Number of pages
    pub page_count: RegisterView<u8>,
    /// Pages by ID (contains LandPlots)
    pub pages: MapView<u8, Page>,
    /// Current raid state
    pub raid_state: RegisterView<RaidState>,
    /// Player statistics
    pub stats: RegisterView<PlayerStats>,
    /// Game configuration
    pub config: RegisterView<GameConfig>,
    /// Current block number
    pub current_block: RegisterView<u64>,
    /// Last raid block
    pub last_raid_block: RegisterView<u64>,
}
