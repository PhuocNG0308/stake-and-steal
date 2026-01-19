//! # Steal & Yield - Application State
//!
//! Defines the persistent state stored on each microchain.

use crate::{
    AttackLog, EncryptedData, GameConfig, GameError, Page, PlayerStats, RaidState,
    RegistryEntry, TargetInfo, MAX_PAGES_PER_PLAYER,
};
use linera_sdk::{
    base::ChainId,
    views::{linera_views, MapView, QueueView, RegisterView, RootView, SetView, ViewStorageContext},
};

/// Main application state stored on each player's microchain
#[derive(RootView, async_graphql::SimpleObject)]
#[view(context = "ViewStorageContext")]
pub struct PlayerState {
    /// Is this player registered?
    pub is_registered: RegisterView<bool>,

    /// Player's encrypted name
    pub encrypted_name: RegisterView<Vec<u8>>,

    /// Player's owner key hash (for decryption verification)
    pub owner_key_hash: RegisterView<[u8; 32]>,

    /// Available balance (not deposited)
    pub available_balance: RegisterView<u128>,

    /// Player's land pages
    pub pages: MapView<u8, Page>,

    /// Number of pages owned
    pub page_count: RegisterView<u8>,

    /// Current raid state
    pub raid_state: RegisterView<RaidState>,

    /// Player statistics
    pub stats: RegisterView<PlayerStats>,

    /// Recent attack log (last 50)
    pub attack_log: QueueView<AttackLog>,

    /// Game configuration
    pub config: RegisterView<GameConfig>,

    /// Is this the registry chain?
    pub is_registry: RegisterView<bool>,

    /// Registry chain ID (if not registry)
    pub registry_chain_id: RegisterView<Option<ChainId>>,

    /// Current block height (updated on each operation)
    pub current_block: RegisterView<u64>,

    /// Request ID counter
    pub request_counter: RegisterView<u64>,

    /// Pending steal outcomes (waiting for response)
    pub pending_steals: MapView<u64, PendingSteal>,

    /// Is currently being raided by someone?
    pub is_being_raided: RegisterView<bool>,

    /// Raider chain (if being raided)
    pub current_raider: RegisterView<Option<ChainId>>,
}

/// Registry state (only used on registry chain)
#[derive(RootView, async_graphql::SimpleObject)]
#[view(context = "ViewStorageContext")]
pub struct RegistryState {
    /// Is this the registry?
    pub is_registry: RegisterView<bool>,

    /// All registered players
    pub players: MapView<ChainId, RegistryEntry>,

    /// Active player chain IDs (for random selection)
    pub active_players: SetView<ChainId>,

    /// Total player count
    pub player_count: RegisterView<u64>,

    /// Players currently in raid (cannot be targeted)
    pub players_in_raid: SetView<ChainId>,

    /// Request ID counter
    pub request_counter: RegisterView<u64>,

    /// Game config (master copy)
    pub master_config: RegisterView<GameConfig>,
}

/// Pending steal operation awaiting response
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, async_graphql::SimpleObject)]
pub struct PendingSteal {
    /// Target chain
    pub target_chain: ChainId,
    /// Target page
    pub target_page: u8,
    /// Target plot
    pub target_plot: u8,
    /// Started at block
    pub started_at_block: u64,
    /// Attack seed used
    pub attack_seed: [u8; 32],
}

impl PlayerState {
    /// Initialize player state
    pub async fn initialize(
        &mut self,
        is_registry: bool,
        registry_chain_id: Option<ChainId>,
        initial_balance: u128,
    ) -> Result<(), GameError> {
        self.is_registered.set(false);
        self.encrypted_name.set(Vec::new());
        self.owner_key_hash.set([0u8; 32]);
        self.available_balance.set(initial_balance);
        self.page_count.set(0);
        self.raid_state.set(RaidState::Idle);
        self.stats.set(PlayerStats::default());
        self.config.set(GameConfig::default());
        self.is_registry.set(is_registry);
        self.registry_chain_id.set(registry_chain_id);
        self.current_block.set(0);
        self.request_counter.set(0);
        self.is_being_raided.set(false);
        self.current_raider.set(None);

        Ok(())
    }

    /// Register as a player
    pub async fn register(
        &mut self,
        encrypted_name: Vec<u8>,
        owner_key_hash: [u8; 32],
    ) -> Result<(), GameError> {
        if *self.is_registered.get() {
            return Err(GameError::AlreadyRegistered);
        }

        self.is_registered.set(true);
        self.encrypted_name.set(encrypted_name);
        self.owner_key_hash.set(owner_key_hash);

        // Create first page automatically
        self.create_page_internal().await?;

        Ok(())
    }

    /// Create a new page
    pub async fn create_page(&mut self) -> Result<u8, GameError> {
        if !*self.is_registered.get() {
            return Err(GameError::NotRegistered);
        }

        self.create_page_internal().await
    }

    async fn create_page_internal(&mut self) -> Result<u8, GameError> {
        let page_count = *self.page_count.get();

        if page_count >= MAX_PAGES_PER_PLAYER as u8 {
            return Err(GameError::Internal("Max pages reached".to_string()));
        }

        let current_block = *self.current_block.get();
        let new_page = Page::new(page_count, current_block);

        self.pages.insert(&page_count, new_page).await.map_err(|e| {
            GameError::Internal(format!("Failed to create page: {}", e))
        })?;

        self.page_count.set(page_count + 1);

        Ok(page_count)
    }

    /// Deposit tokens into a plot
    pub async fn deposit(
        &mut self,
        page_id: u8,
        plot_id: u8,
        amount: u128,
        encrypted_data: Vec<u8>,
        owner_key: &[u8],
    ) -> Result<u128, GameError> {
        if !*self.is_registered.get() {
            return Err(GameError::NotRegistered);
        }

        let config = self.config.get().clone();
        if amount < config.min_deposit {
            return Err(GameError::InsufficientBalance {
                have: amount,
                need: config.min_deposit,
            });
        }

        let available = *self.available_balance.get();
        if available < amount {
            return Err(GameError::InsufficientBalance {
                have: available,
                need: amount,
            });
        }

        let mut page = self
            .pages
            .get(&page_id)
            .await
            .map_err(|e| GameError::Internal(e.to_string()))?
            .ok_or(GameError::InvalidPageId(page_id))?;

        if !page.is_unlocked {
            return Err(GameError::PageNotUnlocked);
        }

        if plot_id >= page.plots.len() as u8 {
            return Err(GameError::InvalidPlotId(plot_id));
        }

        let plot = &mut page.plots[plot_id as usize];
        let current_block = *self.current_block.get();

        // Claim any pending yield first
        if plot.is_active && plot.balance > 0 {
            let pending = plot.calculate_yield(current_block, config.yield_rate_bps);
            if pending > 0 {
                let mut stats = self.stats.get().clone();
                stats.total_yield_earned += pending;
                self.stats.set(stats);
                self.available_balance.set(available + pending);
            }
        }

        // Update plot
        plot.is_active = true;
        plot.balance += amount;
        plot.deposit_block = current_block;
        plot.last_claim_block = current_block;
        plot.encrypted_metadata = encrypted_data;
        plot.update_encrypted_balance(plot.balance, owner_key);

        let new_balance = plot.balance;

        // Update page totals
        page.encrypted_total = EncryptedData::new_mock(
            &page.total_balance().to_le_bytes(),
            owner_key,
        );

        self.pages.insert(&page_id, page).await.map_err(|e| {
            GameError::Internal(format!("Failed to update page: {}", e))
        })?;

        // Deduct from available balance
        self.available_balance.set(available - amount);

        // Update stats
        let mut stats = self.stats.get().clone();
        stats.total_deposited += amount;
        self.stats.set(stats);

        Ok(new_balance)
    }

    /// Withdraw tokens from a plot
    pub async fn withdraw(
        &mut self,
        page_id: u8,
        plot_id: u8,
        amount: u128,
        owner_key: &[u8],
    ) -> Result<u128, GameError> {
        if !*self.is_registered.get() {
            return Err(GameError::NotRegistered);
        }

        let config = self.config.get().clone();

        let mut page = self
            .pages
            .get(&page_id)
            .await
            .map_err(|e| GameError::Internal(e.to_string()))?
            .ok_or(GameError::InvalidPageId(page_id))?;

        if plot_id >= page.plots.len() as u8 {
            return Err(GameError::InvalidPlotId(plot_id));
        }

        let plot = &mut page.plots[plot_id as usize];

        if !plot.is_active {
            return Err(GameError::PlotNotActive);
        }

        if plot.balance < amount {
            return Err(GameError::InsufficientBalance {
                have: plot.balance,
                need: amount,
            });
        }

        let current_block = *self.current_block.get();

        // Claim pending yield first
        let pending = plot.calculate_yield(current_block, config.yield_rate_bps);

        // Update plot
        plot.balance -= amount;
        plot.last_claim_block = current_block;
        plot.update_encrypted_balance(plot.balance, owner_key);

        if plot.balance == 0 {
            plot.is_active = false;
        }

        // Update page totals
        page.encrypted_total = EncryptedData::new_mock(
            &page.total_balance().to_le_bytes(),
            owner_key,
        );

        self.pages.insert(&page_id, page).await.map_err(|e| {
            GameError::Internal(format!("Failed to update page: {}", e))
        })?;

        // Add to available balance (withdrawal + yield)
        let available = *self.available_balance.get();
        self.available_balance.set(available + amount + pending);

        // Update stats
        let mut stats = self.stats.get().clone();
        stats.total_withdrawn += amount;
        stats.total_yield_earned += pending;
        self.stats.set(stats);

        Ok(amount)
    }

    /// Claim yield from a specific plot
    pub async fn claim(
        &mut self,
        page_id: u8,
        plot_id: u8,
    ) -> Result<u128, GameError> {
        if !*self.is_registered.get() {
            return Err(GameError::NotRegistered);
        }

        let config = self.config.get().clone();

        let mut page = self
            .pages
            .get(&page_id)
            .await
            .map_err(|e| GameError::Internal(e.to_string()))?
            .ok_or(GameError::InvalidPageId(page_id))?;

        if plot_id >= page.plots.len() as u8 {
            return Err(GameError::InvalidPlotId(plot_id));
        }

        let plot = &mut page.plots[plot_id as usize];

        if !plot.is_active {
            return Err(GameError::PlotNotActive);
        }

        let current_block = *self.current_block.get();
        let yield_amount = plot.calculate_yield(current_block, config.yield_rate_bps);

        plot.last_claim_block = current_block;
        plot.pending_yield = 0;

        self.pages.insert(&page_id, page).await.map_err(|e| {
            GameError::Internal(format!("Failed to update page: {}", e))
        })?;

        // Add to available balance
        let available = *self.available_balance.get();
        self.available_balance.set(available + yield_amount);

        // Update stats
        let mut stats = self.stats.get().clone();
        stats.total_yield_earned += yield_amount;
        self.stats.set(stats);

        Ok(yield_amount)
    }

    /// Claim all yields from all plots
    pub async fn claim_all(&mut self) -> Result<u128, GameError> {
        if !*self.is_registered.get() {
            return Err(GameError::NotRegistered);
        }

        let config = self.config.get().clone();
        let current_block = *self.current_block.get();
        let page_count = *self.page_count.get();
        let mut total_yield = 0u128;

        for page_id in 0..page_count {
            if let Some(mut page) = self.pages.get(&page_id).await.ok().flatten() {
                for plot in &mut page.plots {
                    if plot.is_active {
                        let yield_amount = plot.calculate_yield(current_block, config.yield_rate_bps);
                        total_yield += yield_amount;
                        plot.last_claim_block = current_block;
                        plot.pending_yield = 0;
                    }
                }
                let _ = self.pages.insert(&page_id, page).await;
            }
        }

        // Add to available balance
        let available = *self.available_balance.get();
        self.available_balance.set(available + total_yield);

        // Update stats
        let mut stats = self.stats.get().clone();
        stats.total_yield_earned += total_yield;
        self.stats.set(stats);

        Ok(total_yield)
    }

    /// Start searching for targets
    pub async fn start_find_targets(&mut self, count: u8) -> Result<u64, GameError> {
        if !*self.is_registered.get() {
            return Err(GameError::NotRegistered);
        }

        let raid_state = self.raid_state.get().clone();

        match raid_state {
            RaidState::Idle => {}
            RaidState::Cooldown { until_block } => {
                let current = *self.current_block.get();
                if current < until_block {
                    return Err(GameError::InCooldown(until_block));
                }
            }
            _ => {
                return Err(GameError::AlreadyRaiding(format!("{:?}", raid_state)));
            }
        }

        let request_id = *self.request_counter.get() + 1;
        self.request_counter.set(request_id);

        self.raid_state.set(RaidState::Searching { request_id });

        Ok(request_id)
    }

    /// Receive targets from registry
    pub async fn receive_targets(&mut self, targets: Vec<TargetInfo>, request_id: u64) -> Result<(), GameError> {
        let raid_state = self.raid_state.get().clone();

        match raid_state {
            RaidState::Searching { request_id: rid } if rid == request_id => {
                let current_block = *self.current_block.get();
                let config = self.config.get();

                self.raid_state.set(RaidState::Choosing {
                    targets,
                    expires_at_block: current_block + config.target_lock_duration,
                });

                Ok(())
            }
            _ => Err(GameError::InvalidRaidState),
        }
    }

    /// Lock onto a target (commit phase)
    pub async fn lock_target(
        &mut self,
        target_chain: ChainId,
        commitment: [u8; 32],
        own_chain: ChainId,
    ) -> Result<u64, GameError> {
        if target_chain == own_chain {
            return Err(GameError::CannotStealFromSelf);
        }

        let raid_state = self.raid_state.get().clone();
        let current_block = *self.current_block.get();
        let config = self.config.get();

        match raid_state {
            RaidState::Choosing { targets, expires_at_block } => {
                if current_block >= expires_at_block {
                    self.raid_state.set(RaidState::Idle);
                    return Err(GameError::TargetLockExpired);
                }

                // Verify target is in the list
                if !targets.iter().any(|t| t.chain_id == target_chain) {
                    return Err(GameError::Internal("Target not in list".to_string()));
                }

                let lock_until = current_block + config.target_lock_duration;

                self.raid_state.set(RaidState::Locked {
                    target_chain,
                    commitment,
                    locked_at_block: current_block,
                    expires_at_block: lock_until,
                });

                Ok(lock_until)
            }
            _ => Err(GameError::InvalidRaidState),
        }
    }

    /// Execute steal (reveal phase)
    pub async fn execute_steal(
        &mut self,
        target_page: u8,
        target_plot: u8,
        reveal_nonce: [u8; 32],
    ) -> Result<([u8; 32], ChainId), GameError> {
        let raid_state = self.raid_state.get().clone();
        let current_block = *self.current_block.get();

        match raid_state {
            RaidState::Locked {
                target_chain,
                commitment,
                expires_at_block,
                ..
            } => {
                if current_block >= expires_at_block {
                    self.raid_state.set(RaidState::Idle);
                    return Err(GameError::TargetLockExpired);
                }

                // Verify commitment
                let expected = crate::StealCommitment::new(
                    target_page,
                    target_plot,
                    &reveal_nonce,
                    0, // block doesn't matter for hash
                );

                if expected.commitment_hash != commitment {
                    return Err(GameError::InvalidCommitment);
                }

                // Generate attack seed
                use sha2::{Digest, Sha256};
                let mut hasher = Sha256::new();
                hasher.update(&commitment);
                hasher.update(&current_block.to_le_bytes());
                hasher.update(&reveal_nonce);
                let attack_seed: [u8; 32] = hasher.finalize().into();

                // Update state to executing
                self.raid_state.set(RaidState::Executing {
                    target_chain,
                    target_page,
                    target_plot,
                    started_at_block: current_block,
                });

                // Store pending steal
                let request_id = *self.request_counter.get() + 1;
                self.request_counter.set(request_id);

                self.pending_steals.insert(&request_id, PendingSteal {
                    target_chain,
                    target_page,
                    target_plot,
                    started_at_block: current_block,
                    attack_seed,
                }).await.map_err(|e| GameError::Internal(e.to_string()))?;

                Ok((attack_seed, target_chain))
            }
            _ => Err(GameError::InvalidRaidState),
        }
    }

    /// Process incoming steal attempt (victim side)
    pub async fn process_steal_attempt(
        &mut self,
        attacker_chain: ChainId,
        target_page: u8,
        target_plot: u8,
        attack_seed: [u8; 32],
        owner_key: &[u8],
    ) -> Result<(bool, u128, Vec<u8>), GameError> {
        // Get plot
        let mut page = self
            .pages
            .get(&target_page)
            .await
            .map_err(|e| GameError::Internal(e.to_string()))?
            .ok_or(GameError::InvalidPageId(target_page))?;

        if target_plot >= page.plots.len() as u8 {
            return Err(GameError::InvalidPlotId(target_plot));
        }

        let plot = &mut page.plots[target_plot as usize];

        if !plot.is_active || plot.balance == 0 {
            // Nothing to steal
            return Ok((false, 0, Vec::new()));
        }

        if plot.is_protected {
            return Err(GameError::TargetProtected);
        }

        // Calculate RNG result using attack_seed and plot state
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(&attack_seed);
        hasher.update(&plot.balance.to_le_bytes());
        hasher.update(&target_page.to_le_bytes());
        hasher.update(&target_plot.to_le_bytes());
        let rng_hash: [u8; 32] = hasher.finalize().into();

        let config = self.config.get();

        // Success check: first byte mod 100 < success rate
        let roll = rng_hash[0] as u8 % 100;
        let success = roll < config.steal_success_rate;

        let amount_stolen = if success {
            let steal_amount = (plot.balance * config.steal_percentage as u128) / 100;
            plot.balance -= steal_amount;
            plot.times_stolen += 1;
            plot.update_encrypted_balance(plot.balance, owner_key);

            // Update stats
            let mut stats = self.stats.get().clone();
            stats.total_lost_to_theft += steal_amount;
            stats.times_been_robbed += 1;
            self.stats.set(stats);

            steal_amount
        } else {
            0
        };

        // Update page
        page.encrypted_total = EncryptedData::new_mock(
            &page.total_balance().to_le_bytes(),
            owner_key,
        );

        self.pages.insert(&target_page, page).await.map_err(|e| {
            GameError::Internal(format!("Failed to update page: {}", e))
        })?;

        // Log attack
        let current_block = *self.current_block.get();
        let log_entry = AttackLog {
            timestamp: current_block,
            other_chain: attacker_chain,
            was_attacker: false,
            success,
            amount: amount_stolen,
            page_id: target_page,
            plot_id: target_plot,
        };

        self.attack_log.push_back(log_entry).await.map_err(|e| {
            GameError::Internal(format!("Failed to log attack: {}", e))
        })?;

        // Trim log to last 50 entries
        while self.attack_log.count() > 50 {
            let _ = self.attack_log.pop_front().await;
        }

        Ok((success, amount_stolen, rng_hash.to_vec()))
    }

    /// Process steal outcome (attacker side)
    pub async fn process_steal_outcome(
        &mut self,
        success: bool,
        amount_stolen: u128,
    ) -> Result<(), GameError> {
        let raid_state = self.raid_state.get().clone();
        let current_block = *self.current_block.get();
        let config = self.config.get();

        match raid_state {
            RaidState::Executing {
                target_chain,
                target_page,
                target_plot,
                ..
            } => {
                // Update stats
                let mut stats = self.stats.get().clone();

                if success {
                    stats.total_stolen += amount_stolen;
                    stats.successful_steals += 1;
                    stats.current_streak += 1;
                    if stats.current_streak > stats.best_streak {
                        stats.best_streak = stats.current_streak;
                    }

                    // Add stolen amount to balance
                    let available = *self.available_balance.get();
                    self.available_balance.set(available + amount_stolen);
                } else {
                    stats.failed_steals += 1;
                    stats.current_streak = 0;
                }

                self.stats.set(stats);

                // Log attack
                let log_entry = AttackLog {
                    timestamp: current_block,
                    other_chain: target_chain,
                    was_attacker: true,
                    success,
                    amount: amount_stolen,
                    page_id: target_page,
                    plot_id: target_plot,
                };

                self.attack_log.push_back(log_entry).await.map_err(|e| {
                    GameError::Internal(format!("Failed to log attack: {}", e))
                })?;

                // Enter cooldown
                self.raid_state.set(RaidState::Cooldown {
                    until_block: current_block + config.raid_cooldown_blocks,
                });

                Ok(())
            }
            _ => Err(GameError::InvalidRaidState),
        }
    }

    /// Cancel ongoing raid
    pub async fn cancel_raid(&mut self) -> Result<(), GameError> {
        let raid_state = self.raid_state.get().clone();
        let current_block = *self.current_block.get();
        let config = self.config.get();

        match raid_state {
            RaidState::Idle | RaidState::Cooldown { .. } => {
                Err(GameError::NotRaiding)
            }
            _ => {
                // Apply penalty cooldown
                self.raid_state.set(RaidState::Cooldown {
                    until_block: current_block + config.raid_cooldown_blocks * 2, // Double cooldown as penalty
                });

                Ok(())
            }
        }
    }

    /// Update current block height
    pub fn update_block(&mut self, block: u64) {
        self.current_block.set(block);
    }

    /// Get target info for registry
    pub async fn get_target_info(&self) -> TargetInfo {
        TargetInfo {
            chain_id: ChainId::root(0), // Will be set by caller
            activity_score: self.stats.get().successful_steals + self.stats.get().times_been_robbed,
            active_pages: *self.page_count.get(),
            last_active_block: *self.current_block.get(),
            is_being_raided: *self.is_being_raided.get(),
        }
    }
}

impl RegistryState {
    /// Initialize registry state
    pub async fn initialize(&mut self) -> Result<(), GameError> {
        self.is_registry.set(true);
        self.player_count.set(0);
        self.request_counter.set(0);
        self.master_config.set(GameConfig::default());
        Ok(())
    }

    /// Register a new player
    pub async fn register_player(
        &mut self,
        player_chain: ChainId,
        encrypted_name: Vec<u8>,
        timestamp: linera_sdk::base::Timestamp,
    ) -> Result<(), GameError> {
        if self.players.contains_key(&player_chain).await.unwrap_or(false) {
            return Err(GameError::AlreadyRegistered);
        }

        let entry = RegistryEntry {
            chain_id: player_chain,
            encrypted_name,
            registered_at: timestamp,
            last_active: timestamp,
            is_active: true,
            activity_score: 0,
            page_count: 1,
        };

        self.players.insert(&player_chain, entry).await.map_err(|e| {
            GameError::Internal(format!("Failed to register: {}", e))
        })?;

        self.active_players.insert(&player_chain).await.map_err(|e| {
            GameError::Internal(format!("Failed to add to active: {}", e))
        })?;

        let count = *self.player_count.get();
        self.player_count.set(count + 1);

        Ok(())
    }

    /// Unregister a player
    pub async fn unregister_player(&mut self, player_chain: ChainId) -> Result<(), GameError> {
        self.players.remove(&player_chain).await.map_err(|e| {
            GameError::Internal(format!("Failed to remove: {}", e))
        })?;

        self.active_players.remove(&player_chain).await.map_err(|e| {
            GameError::Internal(format!("Failed to remove from active: {}", e))
        })?;

        let count = *self.player_count.get();
        if count > 0 {
            self.player_count.set(count - 1);
        }

        Ok(())
    }

    /// Get random targets for a player
    pub async fn get_random_targets(
        &self,
        requester: ChainId,
        count: u8,
        exclude: &[ChainId],
    ) -> Result<Vec<TargetInfo>, GameError> {
        let mut targets = Vec::new();
        let mut seen = std::collections::HashSet::new();
        seen.insert(requester);
        for chain in exclude {
            seen.insert(*chain);
        }

        // Get all active players
        let active_keys = self.active_players.indices().await.map_err(|e| {
            GameError::Internal(format!("Failed to get players: {}", e))
        })?;

        // Filter and convert to target info
        for chain_id in active_keys {
            if seen.contains(&chain_id) {
                continue;
            }

            if let Some(entry) = self.players.get(&chain_id).await.ok().flatten() {
                if entry.is_active && !self.players_in_raid.contains(&chain_id).await.unwrap_or(true) {
                    targets.push(TargetInfo {
                        chain_id,
                        activity_score: entry.activity_score,
                        active_pages: entry.page_count,
                        last_active_block: 0, // Would need timestamp conversion
                        is_being_raided: false,
                    });

                    if targets.len() >= count as usize {
                        break;
                    }
                }
            }
        }

        Ok(targets)
    }

    /// Mark player as in raid
    pub async fn set_player_raiding(&mut self, player: ChainId, is_raiding: bool) -> Result<(), GameError> {
        if is_raiding {
            self.players_in_raid.insert(&player).await.map_err(|e| {
                GameError::Internal(e.to_string())
            })?;
        } else {
            self.players_in_raid.remove(&player).await.map_err(|e| {
                GameError::Internal(e.to_string())
            })?;
        }
        Ok(())
    }
}
