//! # Stake and Steal - GameFi on Linera with Dual-Token Liquidity Providing
//!
//! A GameFi application with liquidity-style yield farming and PvP stealing.
//!
//! ## Token System
//! - Token A (USDT): The staking token - users deposit this to earn yield
//! - Token B (SAS): The governance/game token - earned as rewards
//!
//! ## Yield Mechanism
//! When users stake Token A:
//! - They earn Token A yield (base APY from liquidity pool)
//! - They also earn Token B (SAS) as governance rewards
//!
//! ## Token B (SAS) Utilities
//! - Buy additional plots to spread tokens and reduce raid risk
//! - Buy shields (consumable) to block raids
//! - Future: Governance voting, premium features
//!
//! ## Hidden Plot System
//! Players have plots to hide their tokens. The plot configuration is encrypted on-chain
//! so raiders must guess which plot has tokens. More risk = more reward!

use linera_sdk::linera_base_types::{ChainId, Timestamp};
use serde::{Deserialize, Serialize};

// ============================================================================
// CONSTANTS
// ============================================================================

/// Base plots every player starts with
pub const BASE_PLOTS_COUNT: usize = 5;
/// Maximum plots a player can own (after purchasing more)
pub const MAX_PLOTS_PER_PLAYER: usize = 15;
pub const MAX_PAGES_PER_PLAYER: usize = 10;
pub const MAX_PLOTS_PER_PAGE: usize = 5;

/// Base yield rate in basis points (10 = 0.1% per block cycle)
pub const BASE_YIELD_RATE_BPS: u64 = 10;
/// SAS reward rate in basis points (5 = 0.05% of stake per block cycle)
pub const SAS_REWARD_RATE_BPS: u64 = 5;

/// Minimum stake required to guarantee a successful steal
pub const MIN_STEAL_STAKE: u128 = 1000;
/// Percentage stolen on successful raid
pub const STEAL_PERCENTAGE: u8 = 15;
/// Cooldown blocks between raids
pub const RAID_COOLDOWN_BLOCKS: u64 = 100;
/// Maximum raid history entries to keep
pub const MAX_RAID_HISTORY: usize = 50;

/// Cost of one additional plot in SAS tokens
pub const PLOT_COST_SAS: u128 = 500;
/// Cost of one shield in SAS tokens
pub const SHIELD_COST_SAS: u128 = 100;
/// Shield blocks one raid attempt
pub const SHIELD_BLOCK_COUNT: u8 = 1;

// ============================================================================
// APPLICATION ABI
// ============================================================================

pub struct StakeAndStealAbi;

impl linera_sdk::abi::ContractAbi for StakeAndStealAbi {
    type Operation = Operation;
    type Response = OperationResponse;
}

impl linera_sdk::abi::ServiceAbi for StakeAndStealAbi {
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
    pub initial_token_a_balance: Option<u128>,
    pub initial_token_b_balance: Option<u128>,
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
    /// Register a new player
    Register { encrypted_name: Vec<u8> },
    
    /// Create a new page of plots
    CreatePage,
    
    /// Deposit Token A to a specific plot (plot config is hidden/encrypted)
    Deposit { page_id: u8, plot_id: u8, amount: u128 },
    
    /// Withdraw Token A from a specific plot
    Withdraw { page_id: u8, plot_id: u8, amount: u128 },
    
    /// Claim Token A yield from specific plot
    ClaimYield { page_id: u8, plot_id: u8 },
    
    /// Claim all pending Token A yields
    ClaimAllYield,
    
    /// Claim SAS (Token B) rewards from specific plot
    ClaimSasRewards { page_id: u8, plot_id: u8 },
    
    /// Claim all pending SAS rewards
    ClaimAllSasRewards,
    
    /// Buy additional plot with SAS tokens
    BuyPlot { page_id: u8 },
    
    /// Buy shield with SAS tokens (global protection, not per-plot)
    BuyShield { count: u8 },
    
    /// Find potential raid targets
    FindTargets { count: u8 },
    
    /// Lock onto a target before raiding
    LockTarget { target_chain: ChainId, commitment: [u8; 32] },
    
    /// Execute steal - raider picks a plot to try to steal from
    ExecuteSteal { 
        attacker_page: u8,
        attacker_plot: u8,
        target_page: u8, 
        target_plot: u8, 
        reveal_nonce: [u8; 32] 
    },
    
    /// Cancel current raid
    CancelRaid,
    
    /// Update game configuration (admin only)
    UpdateConfig { config: GameConfig },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OperationResponse {
    Success,
    Registered { player_id: ChainId },
    PageCreated { page_id: u8 },
    Deposited { page_id: u8, plot_id: u8, new_balance: u128 },
    Withdrawn { page_id: u8, plot_id: u8, amount: u128 },
    YieldClaimed { page_id: u8, plot_id: u8, yield_amount: u128 },
    AllYieldClaimed { total_yield: u128 },
    SasRewardsClaimed { page_id: u8, plot_id: u8, sas_amount: u128 },
    AllSasRewardsClaimed { total_sas: u128 },
    PlotPurchased { page_id: u8, plot_id: u8, sas_cost: u128 },
    ShieldPurchased { count: u8, total_cost: u128, total_shields: u8 },
    TargetsFound { targets: Vec<TargetInfo> },
    TargetLocked { target_chain: ChainId, lock_until_block: u64 },
    StealResult { 
        success: bool, 
        amount_stolen: u128, 
        plot_was_empty: bool,
        blocked_by_shield: bool,
    },
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
    StealAttempt { 
        attacker: ChainId, 
        target_page: u8, 
        target_plot: u8,
        attack_seed: [u8; 32] 
    },
    StealResult { success: bool, amount: u128, blocked_by_shield: bool },
    StolenFunds { from_chain: ChainId, amount: u128 },
}

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/// A single plot where Token A can be hidden
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct LandPlot {
    pub id: u8,
    pub is_active: bool,
    pub is_purchased: bool,  // Extra plots need to be purchased with SAS
    /// Token A balance (visible to owner, hidden from raiders)
    pub token_a_balance: u128,
    /// Pending Token A yield
    pub pending_token_a_yield: u128,
    /// Pending SAS (Token B) rewards
    pub pending_sas_rewards: u128,
    /// Encrypted balance hash for public verification
    pub balance_commitment: [u8; 32],
    pub deposit_block: u64,
    pub last_claim_block: u64,
}

impl LandPlot {
    /// Calculate Token A yield based on blocks elapsed
    pub fn calculate_token_a_yield(&self, current_block: u64, yield_rate_bps: u32) -> u128 {
        if !self.is_active || self.token_a_balance == 0 {
            return 0;
        }
        let blocks_elapsed = current_block.saturating_sub(self.last_claim_block);
        (self.token_a_balance)
            .saturating_mul(blocks_elapsed as u128)
            .saturating_mul(yield_rate_bps as u128)
            / 1_000_000
    }
    
    /// Calculate SAS (Token B) rewards based on blocks elapsed
    pub fn calculate_sas_rewards(&self, current_block: u64, sas_rate_bps: u32) -> u128 {
        if !self.is_active || self.token_a_balance == 0 {
            return 0;
        }
        let blocks_elapsed = current_block.saturating_sub(self.last_claim_block);
        (self.token_a_balance)
            .saturating_mul(blocks_elapsed as u128)
            .saturating_mul(sas_rate_bps as u128)
            / 1_000_000
    }

    /// Create a commitment hash for the balance (for obfuscation)
    pub fn create_balance_commitment(balance: u128, salt: &[u8; 32]) -> [u8; 32] {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        balance.hash(&mut hasher);
        salt.hash(&mut hasher);
        let hash = hasher.finish();
        
        let mut commitment = [0u8; 32];
        commitment[..8].copy_from_slice(&hash.to_le_bytes());
        commitment
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Page {
    pub page_id: u8,
    pub is_unlocked: bool,
    pub plots: Vec<LandPlot>,
    pub created_at: u64,
    pub encryption_salt: [u8; 32],
}

impl Page {
    pub fn new(id: u8, current_block: u64) -> Self {
        let plots = (0..MAX_PLOTS_PER_PAGE)
            .map(|i| LandPlot { 
                id: i as u8,
                is_purchased: i < BASE_PLOTS_COUNT, // First BASE_PLOTS are free
                ..Default::default() 
            })
            .collect();
        Self { 
            page_id: id, 
            is_unlocked: true, 
            plots, 
            created_at: current_block,
            encryption_salt: [0u8; 32],
        }
    }

    pub fn total_token_a_balance(&self) -> u128 {
        self.plots.iter().map(|p| p.token_a_balance).sum()
    }

    pub fn active_plots(&self) -> usize {
        self.plots.iter().filter(|p| p.token_a_balance > 0).count()
    }
    
    pub fn purchased_plots(&self) -> usize {
        self.plots.iter().filter(|p| p.is_purchased).count()
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
    /// Activity score (higher = more active player)
    pub activity_score: u32,
    pub active_pages: u8,
    pub last_active_block: u64,
    /// Total staked (public info)
    pub total_staked: u128,
    /// Number of plots with tokens (hidden - raiders don't know this)
    /// This is NOT exposed in public queries
    #[serde(skip_serializing)]
    pub hidden_active_plots: u8,
}

/// A single raid history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RaidHistoryEntry {
    pub id: u64,
    pub timestamp: Timestamp,
    pub raid_type: RaidType,
    pub other_party: ChainId,
    pub plot_index: u8,
    pub success: bool,
    pub amount: u128,
    pub blocked_by_shield: bool,
    /// Transaction signature as hex string (optional)
    pub tx_signature: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RaidType {
    Attack,
    Defense,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PlayerStats {
    pub total_deposited: u128,
    pub total_withdrawn: u128,
    pub total_token_a_yield_earned: u128,
    pub total_sas_earned: u128,
    pub total_sas_spent: u128,
    pub total_stolen: u128,
    pub total_lost_to_steals: u128,
    pub successful_steals: u32,
    pub failed_steals: u32,
    pub times_raided: u32,
    pub times_defended: u32,
    pub shields_used: u32,
    pub plots_purchased: u32,
}

/// Player's inventory
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PlayerInventory {
    /// Available shields (consumable)
    pub shields: u8,
    /// Total plots owned (including base + purchased)
    pub total_plots: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryEntry {
    pub chain_id: ChainId,
    pub encrypted_name: Vec<u8>,
    pub registered_at: Timestamp,
    pub is_active: bool,
    pub page_count: u8,
    /// Total staked across all pages (public)
    pub total_staked: u128,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameConfig {
    /// Token A yield rate in basis points
    pub yield_rate_bps: u32,
    /// SAS reward rate in basis points
    pub sas_reward_rate_bps: u32,
    /// Minimum stake required for guaranteed steal
    pub min_steal_stake: u128,
    pub min_deposit: u128,
    pub max_deposit: u128,
    pub raid_cooldown_blocks: u64,
    pub max_targets_per_request: u8,
    /// Cost of one plot in SAS tokens
    pub plot_cost_sas: u128,
    /// Cost of one shield in SAS tokens
    pub shield_cost_sas: u128,
}

impl Default for GameConfig {
    fn default() -> Self {
        Self {
            yield_rate_bps: BASE_YIELD_RATE_BPS as u32,
            sas_reward_rate_bps: SAS_REWARD_RATE_BPS as u32,
            min_steal_stake: MIN_STEAL_STAKE,
            min_deposit: 100,
            max_deposit: 1_000_000_000,
            raid_cooldown_blocks: RAID_COOLDOWN_BLOCKS,
            max_targets_per_request: 10,
            plot_cost_sas: PLOT_COST_SAS,
            shield_cost_sas: SHIELD_COST_SAS,
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
    #[error("Insufficient Token A balance")]
    InsufficientTokenABalance,
    #[error("Insufficient SAS balance")]
    InsufficientSasBalance,
    #[error("Maximum plots reached")]
    MaxPlotsReached,
    #[error("Plot not purchased")]
    PlotNotPurchased,
    #[error("No shields available")]
    NoShieldsAvailable,
    #[error("Already raiding")]
    AlreadyRaiding,
    #[error("Not raiding")]
    NotRaiding,
    #[error("In cooldown until block {0}")]
    InCooldown(u64),
    #[error("Internal error: {0}")]
    Internal(String),
}
