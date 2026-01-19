//! # Steal & Yield - GameFi on Linera
//!
//! A simplified GameFi application with yield farming and PvP stealing.

use linera_sdk::linera_base_types::{ApplicationId, ChainId, Timestamp};
use serde::{Deserialize, Serialize};

// ============================================================================
// CONSTANTS
// ============================================================================

pub const MAX_PLOTS_PER_PAGE: usize = 5;
pub const MAX_PAGES_PER_PLAYER: usize = 10;
pub const BASE_YIELD_RATE_BPS: u64 = 10;
pub const STEAL_SUCCESS_RATE: u8 = 30;
pub const STEAL_PERCENTAGE: u8 = 15;
pub const RAID_COOLDOWN_BLOCKS: u64 = 100;

// ============================================================================
// APPLICATION ABI
// ============================================================================

pub struct StealAndYieldAbi;

impl linera_sdk::abi::ContractAbi for StealAndYieldAbi {
    type Operation = Operation;
    type Response = OperationResponse;
}

impl linera_sdk::abi::ServiceAbi for StealAndYieldAbi {
    type Query = async_graphql::Request;
    type QueryResponse = async_graphql::Response;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstantiationArgument {
    pub is_registry: bool,
    pub registry_chain_id: Option<ChainId>,
    pub initial_balance: Option<u128>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ApplicationParameters {
    pub debug_mode: bool,
}

// ============================================================================
// OPERATIONS
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Operation {
    Register { encrypted_name: Vec<u8> },
    Unregister,
    CreatePage,
    Deposit { page_id: u8, plot_id: u8, amount: u128 },
    Withdraw { page_id: u8, plot_id: u8, amount: u128 },
    Claim { page_id: u8, plot_id: u8 },
    ClaimAll,
    FindTargets { count: u8 },
    LockTarget { target_chain: ChainId, commitment: [u8; 32] },
    ExecuteSteal { target_page: u8, target_plot: u8, reveal_nonce: [u8; 32] },
    CancelRaid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OperationResponse {
    Success,
    Registered { player_id: ChainId },
    PageCreated { page_id: u8 },
    Deposited { page_id: u8, plot_id: u8, new_balance: u128 },
    Withdrawn { page_id: u8, plot_id: u8, amount: u128 },
    Claimed { page_id: u8, plot_id: u8, yield_amount: u128 },
    ClaimedAll { total_yield: u128 },
    TargetsFound { targets: Vec<TargetInfo> },
    TargetLocked { target_chain: ChainId, lock_until_block: u64 },
    StealResult { success: bool, amount_stolen: u128 },
    Error { message: String },
}

// ============================================================================
// MESSAGES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message {
    RegisterPlayer { player_chain: ChainId, encrypted_name: Vec<u8>, timestamp: Timestamp },
    UnregisterPlayer { player_chain: ChainId },
    RequestTargets { requester: ChainId, count: u8, request_id: u64 },
    TargetsResponse { targets: Vec<TargetInfo>, request_id: u64 },
    StealAttempt { attacker: ChainId, target_page: u8, target_plot: u8, attack_seed: [u8; 32] },
    StealResult { success: bool, amount: u128 },
    StolenFunds { from_chain: ChainId, amount: u128 },
}

// ============================================================================
// DATA STRUCTURES
// ============================================================================

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct LandPlot {
    pub id: u8,
    pub is_active: bool,
    pub balance: u128,
    pub deposit_block: u64,
    pub last_claim_block: u64,
    pub pending_yield: u128,
}

impl LandPlot {
    pub fn calculate_yield(&self, current_block: u64, yield_rate_bps: u32) -> u128 {
        if !self.is_active || self.balance == 0 {
            return 0;
        }
        let blocks_elapsed = current_block.saturating_sub(self.last_claim_block);
        (self.balance)
            .saturating_mul(blocks_elapsed as u128)
            .saturating_mul(yield_rate_bps as u128)
            / 1_000_000
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Page {
    pub page_id: u8,
    pub is_unlocked: bool,
    pub plots: Vec<LandPlot>,
    pub created_at: u64,
}

impl Page {
    pub fn new(id: u8, current_block: u64) -> Self {
        let plots = (0..MAX_PLOTS_PER_PAGE)
            .map(|i| LandPlot { id: i as u8, ..Default::default() })
            .collect();
        Self { page_id: id, is_unlocked: true, plots, created_at: current_block }
    }

    pub fn total_balance(&self) -> u128 {
        self.plots.iter().map(|p| p.balance).sum()
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub enum RaidState {
    #[default]
    Idle,
    Searching { request_id: u64 },
    Choosing { targets: Vec<TargetInfo>, expires_at_block: u64 },
    Locked { target_chain: ChainId, commitment: [u8; 32], expires_at_block: u64 },
    Executing { target_chain: ChainId, target_page: u8, target_plot: u8 },
    Cooldown { until_block: u64 },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TargetInfo {
    pub chain_id: ChainId,
    pub activity_score: u32,
    pub active_pages: u8,
    pub last_active_block: u64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PlayerStats {
    pub total_deposited: u128,
    pub total_withdrawn: u128,
    pub total_yield_earned: u128,
    pub total_stolen: u128,
    pub total_lost_to_steals: u128,
    pub successful_steals: u32,
    pub failed_steals: u32,
    pub times_raided: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryEntry {
    pub chain_id: ChainId,
    pub encrypted_name: Vec<u8>,
    pub registered_at: Timestamp,
    pub is_active: bool,
    pub page_count: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameConfig {
    pub yield_rate_bps: u64,
    pub steal_success_rate: u8,
    pub steal_percentage: u8,
    pub raid_cooldown_blocks: u64,
    pub min_deposit: u128,
    pub max_plots_per_page: u8,
    pub max_pages: u8,
}

impl Default for GameConfig {
    fn default() -> Self {
        Self {
            yield_rate_bps: BASE_YIELD_RATE_BPS,
            steal_success_rate: STEAL_SUCCESS_RATE,
            steal_percentage: STEAL_PERCENTAGE,
            raid_cooldown_blocks: RAID_COOLDOWN_BLOCKS,
            min_deposit: 100,
            max_plots_per_page: MAX_PLOTS_PER_PAGE as u8,
            max_pages: MAX_PAGES_PER_PLAYER as u8,
        }
    }
}

// ============================================================================
// ERROR TYPES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, thiserror::Error)]
pub enum GameError {
    #[error("Not registered")]
    NotRegistered,
    #[error("Already registered")]
    AlreadyRegistered,
    #[error("Invalid page ID: {0}")]
    InvalidPageId(u8),
    #[error("Invalid plot ID: {0}")]
    InvalidPlotId(u8),
    #[error("Insufficient balance")]
    InsufficientBalance,
    #[error("Already raiding")]
    AlreadyRaiding,
    #[error("Not raiding")]
    NotRaiding,
    #[error("In cooldown until block {0}")]
    InCooldown(u64),
    #[error("Internal error: {0}")]
    Internal(String),
}
