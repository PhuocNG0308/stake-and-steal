//! # Steal & Yield - Core Types and State Definitions
//!
//! A GameFi application on Linera with:
//! - Yield Farming (Land & Deposit)
//! - PvP Stealing Mechanism
//! - FHE-ready encrypted state
//!
//! ## Architecture
//! - Each player owns a personal microchain
//! - Registry contract tracks all active players
//! - Cross-chain messages for stealing mechanics

use linera_sdk::linera_base_types::{ApplicationId, ChainId, Timestamp};
use serde::{Deserialize, Serialize};

// ============================================================================
// CONSTANTS
// ============================================================================

/// Maximum plots per page
pub const MAX_PLOTS_PER_PAGE: usize = 5;

/// Maximum pages per player
pub const MAX_PAGES_PER_PLAYER: usize = 10;

/// Base yield rate (basis points per block, e.g., 10 = 0.1%)
pub const BASE_YIELD_RATE_BPS: u64 = 10;

/// Steal success rate base (percentage, e.g., 30 = 30%)
pub const STEAL_SUCCESS_RATE: u8 = 30;

/// Steal percentage on success (e.g., 15 = 15% of plot balance)
pub const STEAL_PERCENTAGE: u8 = 15;

/// Cooldown blocks after a raid
pub const RAID_COOLDOWN_BLOCKS: u64 = 100;

/// Target lock duration (blocks)
pub const TARGET_LOCK_DURATION: u64 = 50;

// ============================================================================
// APPLICATION ABI
// ============================================================================

/// Application ABI marker
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

/// Arguments for instantiating the application
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstantiationArgument {
    /// Is this the registry chain?
    pub is_registry: bool,
    /// Registry chain ID (if not registry itself)
    pub registry_chain_id: Option<ChainId>,
    /// Initial token amount for testing
    pub initial_balance: Option<u128>,
}

/// Application parameters (immutable after deployment)
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ApplicationParameters {
    /// Token application ID for deposits
    pub token_app_id: Option<ApplicationId>,
    /// Enable debug mode
    pub debug_mode: bool,
}

// ============================================================================
// OPERATIONS (User Actions)
// ============================================================================

/// Operations that users can submit
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Operation {
    // === Registry Operations ===
    /// Register this chain as an active player
    Register {
        /// Player's display name (encrypted)
        encrypted_name: Vec<u8>,
    },

    /// Unregister from the game
    Unregister,

    // === Land & Deposit Operations ===
    /// Create a new page
    CreatePage,

    /// Deposit tokens into a specific plot
    Deposit {
        page_id: u8,
        plot_id: u8,
        /// Amount to deposit
        amount: u128,
        /// Encrypted metadata (balance obfuscation)
        encrypted_data: Vec<u8>,
    },

    /// Withdraw tokens from a plot
    Withdraw {
        page_id: u8,
        plot_id: u8,
        amount: u128,
    },

    /// Claim yield rewards from a plot
    Claim {
        page_id: u8,
        plot_id: u8,
    },

    /// Claim all yield rewards from all plots
    ClaimAll,

    // === Stealing Operations ===
    /// Request random targets from registry
    FindTargets {
        /// Number of targets to find
        count: u8,
    },

    /// Lock onto a specific target (commit phase)
    LockTarget {
        /// Target chain ID
        target_chain: ChainId,
        /// Commitment hash (for commit-reveal)
        commitment: [u8; 32],
    },

    /// Execute steal attempt (reveal phase)
    ExecuteSteal {
        /// Target page
        target_page: u8,
        /// Target plot
        target_plot: u8,
        /// Reveal nonce for commitment verification
        reveal_nonce: [u8; 32],
    },

    /// Cancel an ongoing raid (with penalty)
    CancelRaid,

    // === Admin Operations ===
    /// Update game parameters (admin only)
    UpdateConfig {
        new_yield_rate: Option<u64>,
        new_steal_rate: Option<u8>,
    },
}

/// Response from operation execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OperationResponse {
    /// Operation succeeded
    Success,

    /// Registration successful
    Registered { player_id: ChainId },

    /// Page created
    PageCreated { page_id: u8 },

    /// Deposit successful
    Deposited {
        page_id: u8,
        plot_id: u8,
        new_balance: u128,
    },

    /// Withdrawal successful
    Withdrawn {
        page_id: u8,
        plot_id: u8,
        amount: u128,
    },

    /// Yield claimed
    Claimed {
        page_id: u8,
        plot_id: u8,
        yield_amount: u128,
    },

    /// All yields claimed
    ClaimedAll { total_yield: u128 },

    /// Targets found
    TargetsFound { targets: Vec<TargetInfo> },

    /// Target locked
    TargetLocked {
        target_chain: ChainId,
        lock_until_block: u64,
    },

    /// Steal attempt result
    StealResult {
        success: bool,
        amount_stolen: u128,
    },

    /// Operation failed
    Error { message: String },
}

// ============================================================================
// MESSAGES (Cross-Chain Communication)
// ============================================================================

/// Cross-chain messages
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message {
    // === Registry Messages ===
    /// Register a player chain with registry
    RegisterPlayer {
        player_chain: ChainId,
        encrypted_name: Vec<u8>,
        timestamp: Timestamp,
    },

    /// Remove a player from registry
    UnregisterPlayer { player_chain: ChainId },

    /// Response with random targets
    TargetList {
        requester: ChainId,
        targets: Vec<TargetInfo>,
        request_id: u64,
    },

    /// Request targets from registry
    RequestTargets {
        requester: ChainId,
        count: u8,
        exclude_chains: Vec<ChainId>,
        request_id: u64,
    },

    // === Stealing Messages ===
    /// Incoming steal attempt (attacker -> victim)
    StealAttempt {
        attacker_chain: ChainId,
        target_page: u8,
        target_plot: u8,
        /// Random seed for RNG
        attack_seed: [u8; 32],
        /// Attack timestamp for verification
        attack_timestamp: Timestamp,
    },

    /// Steal result (victim -> attacker)
    StealOutcome {
        attacker_chain: ChainId,
        success: bool,
        amount_stolen: u128,
        /// Proof of RNG computation
        rng_proof: Vec<u8>,
    },

    /// Stolen funds transfer
    StolenFunds {
        from_chain: ChainId,
        amount: u128,
        original_page: u8,
        original_plot: u8,
    },

    // === Notification Messages ===
    /// Notify player of being attacked
    AttackNotification {
        attacker_chain: ChainId,
        success: bool,
        amount_lost: u128,
        page_id: u8,
        plot_id: u8,
    },

    /// Sync game state
    StateSync {
        from_chain: ChainId,
        state_hash: [u8; 32],
    },
}

// ============================================================================
// STATE STRUCTURES
// ============================================================================

/// Encrypted data wrapper for FHE-ready state
#[derive(Debug, Clone, Default, Serialize, Deserialize, async_graphql::SimpleObject)]
pub struct EncryptedData {
    /// Encrypted payload
    pub ciphertext: Vec<u8>,
    /// Encryption nonce/IV
    pub nonce: [u8; 12],
    /// Encryption version (for future FHE migration)
    pub version: u8,
}

impl EncryptedData {
    /// Create new encrypted data (mock encryption for now)
    pub fn new_mock(plaintext: &[u8], owner_key: &[u8]) -> Self {
        // TODO: Replace with actual encryption when FHE is available
        // For now, XOR with key-derived pad
        let mut ciphertext = plaintext.to_vec();
        for (i, byte) in ciphertext.iter_mut().enumerate() {
            *byte ^= owner_key[i % owner_key.len()];
        }

        Self {
            ciphertext,
            nonce: [0u8; 12], // Would be random in production
            version: 0,      // Version 0 = mock encryption
        }
    }

    /// Decrypt data (mock decryption)
    pub fn decrypt_mock(&self, owner_key: &[u8]) -> Vec<u8> {
        let mut plaintext = self.ciphertext.clone();
        for (i, byte) in plaintext.iter_mut().enumerate() {
            *byte ^= owner_key[i % owner_key.len()];
        }
        plaintext
    }
}

/// Single land plot within a page
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct LandPlot {
    /// Plot ID (0-4)
    pub id: u8,

    /// Is this plot active?
    pub is_active: bool,

    /// Deposited balance (encrypted for privacy)
    /// In production, this would be FHE-encrypted
    pub encrypted_balance: EncryptedData,

    /// Actual balance (only visible to owner via decryption)
    /// This field is for internal contract use only
    pub balance: u128,

    /// Block height when deposit was made
    pub deposit_block: u64,

    /// Last claim block height
    pub last_claim_block: u64,

    /// Accumulated unclaimed yield
    pub pending_yield: u128,

    /// Times this plot was successfully stolen from
    pub times_stolen: u32,

    /// Is this plot protected? (future feature)
    pub is_protected: bool,

    /// Custom metadata (encrypted)
    pub encrypted_metadata: Vec<u8>,
}

impl LandPlot {
    /// Calculate pending yield based on blocks elapsed
    pub fn calculate_yield(&self, current_block: u64, yield_rate_bps: u64) -> u128 {
        if !self.is_active || self.balance == 0 {
            return 0;
        }

        let blocks_elapsed = current_block.saturating_sub(self.last_claim_block);
        let yield_amount = (self.balance as u128)
            .saturating_mul(blocks_elapsed as u128)
            .saturating_mul(yield_rate_bps as u128)
            / 1_000_000; // basis points adjustment

        yield_amount
    }

    /// Update encrypted balance
    pub fn update_encrypted_balance(&mut self, new_balance: u128, owner_key: &[u8]) {
        self.balance = new_balance;
        self.encrypted_balance =
            EncryptedData::new_mock(&new_balance.to_le_bytes(), owner_key);
    }
}

/// A page containing multiple plots
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Page {
    /// Page ID
    pub id: u8,

    /// Is this page unlocked?
    pub is_unlocked: bool,

    /// Plots in this page (max 5)
    pub plots: Vec<LandPlot>,

    /// Page creation timestamp
    pub created_at: u64,

    /// Total deposits in this page (encrypted)
    pub encrypted_total: EncryptedData,
}

impl Page {
    /// Create a new page with empty plots
    pub fn new(id: u8, current_block: u64) -> Self {
        let plots = (0..MAX_PLOTS_PER_PAGE)
            .map(|i| LandPlot {
                id: i as u8,
                is_active: false,
                ..Default::default()
            })
            .collect();

        Self {
            id,
            is_unlocked: true,
            plots,
            created_at: current_block,
            encrypted_total: EncryptedData::default(),
        }
    }

    /// Get total balance across all plots
    pub fn total_balance(&self) -> u128 {
        self.plots.iter().map(|p| p.balance).sum()
    }

    /// Get total pending yield
    pub fn total_pending_yield(&self, current_block: u64, yield_rate_bps: u64) -> u128 {
        self.plots
            .iter()
            .map(|p| p.calculate_yield(current_block, yield_rate_bps))
            .sum()
    }
}

/// Raid state machine
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RaidState {
    /// Not currently raiding
    Idle,

    /// Searching for targets
    Searching { request_id: u64 },

    /// Targets received, choosing
    Choosing {
        targets: Vec<TargetInfo>,
        expires_at_block: u64,
    },

    /// Target locked (commit phase)
    Locked {
        target_chain: ChainId,
        commitment: [u8; 32],
        locked_at_block: u64,
        expires_at_block: u64,
    },

    /// Steal in progress
    Executing {
        target_chain: ChainId,
        target_page: u8,
        target_plot: u8,
        started_at_block: u64,
    },

    /// Cooldown after raid
    Cooldown { until_block: u64 },
}

impl Default for RaidState {
    fn default() -> Self {
        RaidState::Idle
    }
}

/// Information about a potential target
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TargetInfo {
    /// Target chain ID
    pub chain_id: ChainId,

    /// Obfuscated activity level (to help choose targets)
    pub activity_score: u32,

    /// Number of active pages (public info)
    pub active_pages: u8,

    /// Last active block
    pub last_active_block: u64,

    /// Is this target currently being raided?
    pub is_being_raided: bool,
}

/// Player statistics
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PlayerStats {
    /// Total deposits made
    pub total_deposited: u128,

    /// Total withdrawals made
    pub total_withdrawn: u128,

    /// Total yield earned
    pub total_yield_earned: u128,

    /// Total amount stolen from others
    pub total_stolen: u128,

    /// Total amount lost to thieves
    pub total_lost_to_theft: u128,

    /// Successful steals count
    pub successful_steals: u32,

    /// Failed steal attempts
    pub failed_steals: u32,

    /// Times been stolen from
    pub times_been_robbed: u32,

    /// Current streak
    pub current_streak: i32,

    /// Best streak ever
    pub best_streak: i32,
}

/// Attack log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttackLog {
    /// Attack timestamp
    pub timestamp: u64,

    /// Attacker or victim chain
    pub other_chain: ChainId,

    /// Was this player the attacker?
    pub was_attacker: bool,

    /// Attack succeeded?
    pub success: bool,

    /// Amount involved
    pub amount: u128,

    /// Target page
    pub page_id: u8,

    /// Target plot
    pub plot_id: u8,
}

/// Registry entry for a player
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryEntry {
    /// Player's chain ID
    pub chain_id: ChainId,

    /// Encrypted player name
    pub encrypted_name: Vec<u8>,

    /// Registration timestamp
    pub registered_at: Timestamp,

    /// Last activity timestamp
    pub last_active: Timestamp,

    /// Is currently active?
    pub is_active: bool,

    /// Activity score for matchmaking
    pub activity_score: u32,

    /// Number of pages (public)
    pub page_count: u8,
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/// Commitment for commit-reveal scheme
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StealCommitment {
    /// Hash of (target_page || target_plot || nonce)
    pub commitment_hash: [u8; 32],
    /// Block when commitment was made
    pub committed_at_block: u64,
}

impl StealCommitment {
    /// Create a new commitment
    pub fn new(target_page: u8, target_plot: u8, nonce: &[u8; 32], block: u64) -> Self {
        use sha2::{Digest, Sha256};

        let mut hasher = Sha256::new();
        hasher.update([target_page, target_plot]);
        hasher.update(nonce);

        let hash: [u8; 32] = hasher.finalize().into();

        Self {
            commitment_hash: hash,
            committed_at_block: block,
        }
    }

    /// Verify a commitment
    pub fn verify(&self, target_page: u8, target_plot: u8, nonce: &[u8; 32]) -> bool {
        use sha2::{Digest, Sha256};

        let mut hasher = Sha256::new();
        hasher.update([target_page, target_plot]);
        hasher.update(nonce);

        let hash: [u8; 32] = hasher.finalize().into();

        hash == self.commitment_hash
    }
}

/// Game configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameConfig {
    /// Yield rate in basis points per block
    pub yield_rate_bps: u64,

    /// Steal success rate percentage
    pub steal_success_rate: u8,

    /// Steal percentage on success
    pub steal_percentage: u8,

    /// Raid cooldown in blocks
    pub raid_cooldown_blocks: u64,

    /// Target lock duration in blocks
    pub target_lock_duration: u64,

    /// Minimum deposit amount
    pub min_deposit: u128,

    /// Maximum plots per page
    pub max_plots_per_page: u8,

    /// Maximum pages per player
    pub max_pages: u8,
}

impl Default for GameConfig {
    fn default() -> Self {
        Self {
            yield_rate_bps: BASE_YIELD_RATE_BPS,
            steal_success_rate: STEAL_SUCCESS_RATE,
            steal_percentage: STEAL_PERCENTAGE,
            raid_cooldown_blocks: RAID_COOLDOWN_BLOCKS,
            target_lock_duration: TARGET_LOCK_DURATION,
            min_deposit: 100,
            max_plots_per_page: MAX_PLOTS_PER_PAGE as u8,
            max_pages: MAX_PAGES_PER_PLAYER as u8,
        }
    }
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/// Application errors
#[derive(Debug, Clone, Serialize, Deserialize, thiserror::Error)]
pub enum GameError {
    #[error("Not registered as a player")]
    NotRegistered,

    #[error("Already registered")]
    AlreadyRegistered,

    #[error("Invalid page ID: {0}")]
    InvalidPageId(u8),

    #[error("Invalid plot ID: {0}")]
    InvalidPlotId(u8),

    #[error("Page not unlocked")]
    PageNotUnlocked,

    #[error("Plot not active")]
    PlotNotActive,

    #[error("Insufficient balance: have {have}, need {need}")]
    InsufficientBalance { have: u128, need: u128 },

    #[error("Already in raid state: {0}")]
    AlreadyRaiding(String),

    #[error("Not in raid state")]
    NotRaiding,

    #[error("Invalid raid state for this operation")]
    InvalidRaidState,

    #[error("Target lock expired")]
    TargetLockExpired,

    #[error("Invalid commitment")]
    InvalidCommitment,

    #[error("Cannot steal from self")]
    CannotStealFromSelf,

    #[error("Target is protected")]
    TargetProtected,

    #[error("In cooldown until block {0}")]
    InCooldown(u64),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Internal error: {0}")]
    Internal(String),
}
