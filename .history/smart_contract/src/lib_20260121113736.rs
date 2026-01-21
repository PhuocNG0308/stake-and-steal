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
    
    /// Buy shield with SAS tokens
    BuyShield { count: u8 },
    
    /// Activate shield on a plot (consumes 1 shield)
    ActivateShield { page_id: u8, plot_id: u8 },
    
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
    Claimed { page_id: u8, plot_id: u8, yield_amount: u128 },
    ClaimedAll { total_yield: u128 },
    TargetsFound { targets: Vec<TargetInfo> },
    TargetLocked { target_chain: ChainId, lock_until_block: u64 },
    /// Raid result - success means raider guessed the correct plot
    StealResult { success: bool, amount_stolen: u128, plot_was_empty: bool },
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
    /// Raid attempt - attacker guesses a plot
    StealAttempt { 
        attacker: ChainId, 
        target_page: u8, 
        target_plot: u8,  // Attacker's guess
        attack_seed: [u8; 32] 
    },
    StealResult { success: bool, amount: u128 },
    StolenFunds { from_chain: ChainId, amount: u128 },
}

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/// A single plot where tokens can be hidden
/// On-chain, only the encrypted balance is visible to others
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct LandPlot {
    pub id: u8,
    pub is_active: bool,
    /// Actual balance (visible to owner, hidden from raiders via encryption)
    pub balance: u128,
    /// Encrypted balance hash for public verification
    pub balance_commitment: [u8; 32],
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
    /// Salt used for encrypting plot data
    pub encryption_salt: [u8; 32],
}

impl Page {
    pub fn new(id: u8, current_block: u64) -> Self {
        let plots = (0..MAX_PLOTS_PER_PAGE)
            .map(|i| LandPlot { id: i as u8, ..Default::default() })
            .collect();
        Self { 
            page_id: id, 
            is_unlocked: true, 
            plots, 
            created_at: current_block,
            encryption_salt: [0u8; 32], // Should be randomized
        }
    }

    pub fn total_balance(&self) -> u128 {
        self.plots.iter().map(|p| p.balance).sum()
    }

    /// Count of plots that have tokens (hidden from public queries)
    pub fn active_plots(&self) -> usize {
        self.plots.iter().filter(|p| p.balance > 0).count()
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
    /// 'attack' or 'defense'
    pub raid_type: RaidType,
    /// Chain ID of the other party
    pub other_party: ChainId,
    /// Which plot was raided
    pub plot_index: u8,
    /// Whether the raid succeeded
    pub success: bool,
    /// Amount stolen or lost
    pub amount: u128,
    /// Transaction hash/signature for verification
    pub tx_signature: Option<[u8; 64]>,
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
    pub total_yield_earned: u128,
    pub total_stolen: u128,
    pub total_lost_to_steals: u128,
    pub successful_steals: u32,
    pub failed_steals: u32,
    pub times_raided: u32,
    /// Times successfully defended (raider picked wrong plot)
    pub times_defended: u32,
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
    pub yield_rate_bps: u32,
    /// Minimum stake required for guaranteed steal
    pub min_steal_stake: u128,
    pub min_deposit: u128,
    pub max_deposit: u128,
    pub raid_cooldown_blocks: u64,
    pub max_targets_per_request: u8,
}

impl Default for GameConfig {
    fn default() -> Self {
        Self {
            yield_rate_bps: BASE_YIELD_RATE_BPS as u32,
            min_steal_stake: MIN_STEAL_STAKE,
            min_deposit: 100,
            max_deposit: 1_000_000_000,
            raid_cooldown_blocks: RAID_COOLDOWN_BLOCKS,
            max_targets_per_request: 10,
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
