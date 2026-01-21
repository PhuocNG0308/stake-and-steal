//! # Stake and Steal - Application State
//!
//! Stores all player data including:
//! - Farm configuration with hidden plot balances
//! - Dual-token balances (Token A/USDT + Token B/SAS)
//! - Raid history for verification
//! - Player inventory (shields, purchased plots)

use linera_sdk::views::{linera_views, MapView, QueueView, RegisterView, RootView, ViewStorageContext};
use stake_and_steal::{GameConfig, Page, PlayerInventory, PlayerStats, RaidHistoryEntry, RaidState, MAX_RAID_HISTORY};

/// The application state for a player
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct StakeAndStealState {
    /// Whether the player is registered
    pub is_registered: RegisterView<bool>,
    /// Encrypted player name
    pub encrypted_name: RegisterView<Vec<u8>>,
    /// Token A (USDT) available balance (not deposited in plots)
    pub token_a_balance: RegisterView<u128>,
    /// Token B (SAS) balance
    pub token_b_balance: RegisterView<u128>,
    /// Player inventory (shields, etc.)
    pub inventory: RegisterView<PlayerInventory>,
    /// Number of pages
    pub page_count: RegisterView<u8>,
    /// Pages by ID (contains LandPlots with encrypted balances)
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
    /// Raid history (max 50 entries)
    pub raid_history: QueueView<RaidHistoryEntry>,
    /// Next raid history ID
    pub next_raid_id: RegisterView<u64>,
    /// Encryption key for plot data (derived from player's private key)
    pub encryption_key: RegisterView<[u8; 32]>,
}
