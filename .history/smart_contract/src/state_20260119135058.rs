//! # Steal & Yield - Application State

use linera_sdk::{
    linera_base_types::ChainId,
    linera_views::{
        self,
        views::{MapView, RegisterView, RootView, ViewStorageContext},
    },
};
use steal_and_yield::{
    GameConfig, GameError, Page, PlayerStats, RaidState, RegistryEntry, TargetInfo,
    MAX_PAGES_PER_PLAYER,
};

/// Main application state
#[derive(RootView)]
#[linera_views::view(context = "ViewStorageContext")]
pub struct PlayerState {
    pub is_registered: RegisterView<bool>,
    pub encrypted_name: RegisterView<Vec<u8>>,
    pub available_balance: RegisterView<u128>,
    pub pages: MapView<u8, Page>,
    pub page_count: RegisterView<u8>,
    pub raid_state: RegisterView<RaidState>,
    pub stats: RegisterView<PlayerStats>,
    pub config: RegisterView<GameConfig>,
    pub is_registry: RegisterView<bool>,
    pub registry_chain_id: RegisterView<Option<ChainId>>,
    pub current_block: RegisterView<u64>,
    pub request_counter: RegisterView<u64>,
    pub last_raid_block: RegisterView<u64>,
}

/// Registry state
#[derive(RootView)]
#[linera_views::view(context = "ViewStorageContext")]
pub struct RegistryState {
    pub is_registry: RegisterView<bool>,
    pub players: MapView<ChainId, RegistryEntry>,
    pub player_count: RegisterView<u64>,
    pub request_counter: RegisterView<u64>,
}

impl PlayerState {
    pub async fn initialize(
        &mut self,
        is_registry: bool,
        registry_chain_id: Option<ChainId>,
        initial_balance: u128,
    ) -> Result<(), GameError> {
        self.is_registered.set(false);
        self.encrypted_name.set(Vec::new());
        self.available_balance.set(initial_balance);
        self.page_count.set(0);
        self.raid_state.set(RaidState::Idle);
        self.stats.set(PlayerStats::default());
        self.config.set(GameConfig::default());
        self.is_registry.set(is_registry);
        self.registry_chain_id.set(registry_chain_id);
        self.current_block.set(0);
        self.request_counter.set(0);
        self.last_raid_block.set(0);
        Ok(())
    }

    pub fn update_block(&mut self, block: u64) {
        self.current_block.set(block);
    }

    pub async fn register(&mut self, encrypted_name: Vec<u8>) -> Result<(), GameError> {
        if *self.is_registered.get() {
            return Err(GameError::AlreadyRegistered);
        }
        self.is_registered.set(true);
        self.encrypted_name.set(encrypted_name);
        Ok(())
    }

    pub async fn create_page(&mut self) -> Result<u8, GameError> {
        let page_count = *self.page_count.get();
        if page_count >= MAX_PAGES_PER_PLAYER as u8 {
            return Err(GameError::Internal("Max pages reached".to_string()));
        }

        let current_block = *self.current_block.get();
        let new_page = Page::new(page_count, current_block);

        self.pages
            .insert(&page_count, new_page)
            .map_err(|e| GameError::Internal(e.to_string()))?;

        self.page_count.set(page_count + 1);
        Ok(page_count)
    }

    pub async fn deposit(
        &mut self,
        page_id: u8,
        plot_id: u8,
        amount: u128,
    ) -> Result<u128, GameError> {
        let available = *self.available_balance.get();
        if available < amount {
            return Err(GameError::InsufficientBalance);
        }

        let mut page = self
            .pages
            .get(&page_id)
            .await
            .map_err(|e| GameError::Internal(e.to_string()))?
            .ok_or(GameError::InvalidPageId(page_id))?;

        let plot = page
            .plots
            .get_mut(plot_id as usize)
            .ok_or(GameError::InvalidPlotId(plot_id))?;

        let current_block = *self.current_block.get();
        
        if !plot.is_active {
            plot.is_active = true;
            plot.deposit_block = current_block;
            plot.last_claim_block = current_block;
        }

        plot.balance += amount;
        let new_balance = plot.balance;

        self.pages
            .insert(&page_id, page)
            .map_err(|e| GameError::Internal(e.to_string()))?;

        self.available_balance.set(available - amount);

        let mut stats = self.stats.get().clone();
        stats.total_deposited += amount;
        self.stats.set(stats);

        Ok(new_balance)
    }

    pub async fn withdraw(
        &mut self,
        page_id: u8,
        plot_id: u8,
        amount: u128,
    ) -> Result<u128, GameError> {
        let mut page = self
            .pages
            .get(&page_id)
            .await
            .map_err(|e| GameError::Internal(e.to_string()))?
            .ok_or(GameError::InvalidPageId(page_id))?;

        let plot = page
            .plots
            .get_mut(plot_id as usize)
            .ok_or(GameError::InvalidPlotId(plot_id))?;

        if plot.balance < amount {
            return Err(GameError::InsufficientBalance);
        }

        plot.balance -= amount;
        if plot.balance == 0 {
            plot.is_active = false;
        }

        self.pages
            .insert(&page_id, page)
            .map_err(|e| GameError::Internal(e.to_string()))?;

        let available = *self.available_balance.get();
        self.available_balance.set(available + amount);

        let mut stats = self.stats.get().clone();
        stats.total_withdrawn += amount;
        self.stats.set(stats);

        Ok(amount)
    }

    pub async fn claim(&mut self, page_id: u8, plot_id: u8) -> Result<u128, GameError> {
        let mut page = self
            .pages
            .get(&page_id)
            .await
            .map_err(|e| GameError::Internal(e.to_string()))?
            .ok_or(GameError::InvalidPageId(page_id))?;

        let config = self.config.get();
        let current_block = *self.current_block.get();

        let plot = page
            .plots
            .get_mut(plot_id as usize)
            .ok_or(GameError::InvalidPlotId(plot_id))?;

        let yield_amount = plot.calculate_yield(current_block, config.yield_rate_bps);
        plot.last_claim_block = current_block;
        plot.pending_yield = 0;

        self.pages
            .insert(&page_id, page)
            .map_err(|e| GameError::Internal(e.to_string()))?;

        let available = *self.available_balance.get();
        self.available_balance.set(available + yield_amount);

        let mut stats = self.stats.get().clone();
        stats.total_yield_earned += yield_amount;
        self.stats.set(stats);

        Ok(yield_amount)
    }

    pub async fn claim_all(&mut self) -> Result<u128, GameError> {
        let page_count = *self.page_count.get();
        let config = self.config.get().clone();
        let current_block = *self.current_block.get();
        let mut total_yield = 0u128;

        for page_id in 0..page_count {
            if let Ok(Some(mut page)) = self.pages.get(&page_id).await {
                for plot in page.plots.iter_mut() {
                    if plot.is_active {
                        let yield_amount = plot.calculate_yield(current_block, config.yield_rate_bps);
                        plot.last_claim_block = current_block;
                        total_yield += yield_amount;
                    }
                }
                let _ = self.pages.insert(&page_id, page);
            }
        }

        let available = *self.available_balance.get();
        self.available_balance.set(available + total_yield);

        let mut stats = self.stats.get().clone();
        stats.total_yield_earned += total_yield;
        self.stats.set(stats);

        Ok(total_yield)
    }

    pub async fn start_find_targets(&mut self, _count: u8) -> Result<u64, GameError> {
        match self.raid_state.get() {
            RaidState::Idle => {}
            RaidState::Cooldown { until_block } => {
                let current = *self.current_block.get();
                if current < *until_block {
                    return Err(GameError::InCooldown(*until_block));
                }
            }
            _ => return Err(GameError::AlreadyRaiding),
        }

        let request_id = *self.request_counter.get();
        self.request_counter.set(request_id + 1);
        self.raid_state.set(RaidState::Searching { request_id });

        Ok(request_id)
    }

    pub async fn receive_targets(
        &mut self,
        targets: Vec<TargetInfo>,
        _request_id: u64,
    ) -> Result<(), GameError> {
        let current_block = *self.current_block.get();
        self.raid_state.set(RaidState::Choosing {
            targets,
            expires_at_block: current_block + 50,
        });
        Ok(())
    }

    pub async fn lock_target(
        &mut self,
        target_chain: ChainId,
        commitment: [u8; 32],
    ) -> Result<u64, GameError> {
        let current_block = *self.current_block.get();
        let expires_at_block = current_block + 50;

        self.raid_state.set(RaidState::Locked {
            target_chain,
            commitment,
            expires_at_block,
        });

        Ok(expires_at_block)
    }

    pub async fn execute_steal(
        &mut self,
        target_page: u8,
        target_plot: u8,
        _reveal_nonce: [u8; 32],
    ) -> Result<([u8; 32], ChainId), GameError> {
        let raid_state = self.raid_state.get().clone();

        match raid_state {
            RaidState::Locked { target_chain, .. } => {
                // Generate attack seed
                let current_block = *self.current_block.get();
                let mut attack_seed = [0u8; 32];
                attack_seed[0..8].copy_from_slice(&current_block.to_le_bytes());

                self.raid_state.set(RaidState::Executing {
                    target_chain: target_chain.clone(),
                    target_page,
                    target_plot,
                });

                Ok((attack_seed, target_chain))
            }
            _ => Err(GameError::NotRaiding),
        }
    }

    pub async fn process_steal_outcome(
        &mut self,
        success: bool,
        amount: u128,
    ) -> Result<(), GameError> {
        let current_block = *self.current_block.get();
        let config = self.config.get();

        // Update stats
        let mut stats = self.stats.get().clone();
        if success {
            stats.successful_steals += 1;
            stats.total_stolen += amount;
            let available = *self.available_balance.get();
            self.available_balance.set(available + amount);
        } else {
            stats.failed_steals += 1;
        }
        self.stats.set(stats);

        // Enter cooldown
        self.raid_state.set(RaidState::Cooldown {
            until_block: current_block + config.raid_cooldown_blocks,
        });
        self.last_raid_block.set(current_block);

        Ok(())
    }

    pub async fn cancel_raid(&mut self) -> Result<(), GameError> {
        self.raid_state.set(RaidState::Idle);
        Ok(())
    }
}

impl RegistryState {
    pub async fn initialize(&mut self) -> Result<(), GameError> {
        self.is_registry.set(true);
        self.player_count.set(0);
        self.request_counter.set(0);
        Ok(())
    }

    pub async fn register_player(
        &mut self,
        player_chain: ChainId,
        encrypted_name: Vec<u8>,
        timestamp: linera_sdk::linera_base_types::Timestamp,
    ) -> Result<(), GameError> {
        if self.players.contains_key(&player_chain).await.unwrap_or(false) {
            return Err(GameError::AlreadyRegistered);
        }

        let entry = RegistryEntry {
            chain_id: player_chain.clone(),
            encrypted_name,
            registered_at: timestamp,
            is_active: true,
            page_count: 0,
        };

        self.players
            .insert(&player_chain, entry)
            .map_err(|e| GameError::Internal(e.to_string()))?;

        let count = *self.player_count.get();
        self.player_count.set(count + 1);

        Ok(())
    }

    pub async fn unregister_player(&mut self, player_chain: ChainId) -> Result<(), GameError> {
        self.players
            .remove(&player_chain)
            .map_err(|e| GameError::Internal(e.to_string()))?;

        let count = *self.player_count.get();
        self.player_count.set(count.saturating_sub(1));

        Ok(())
    }

    pub async fn get_random_targets(
        &mut self,
        requester: ChainId,
        count: u8,
    ) -> Result<Vec<TargetInfo>, GameError> {
        let mut targets = Vec::new();
        let request_id = *self.request_counter.get();

        // Simple iteration to get targets (in production, use better randomization)
        self.players
            .for_each_key_value(|chain_id, entry| {
                if targets.len() >= count as usize {
                    return Ok(());
                }
                if *chain_id != requester && entry.is_active {
                    targets.push(TargetInfo {
                        chain_id: chain_id.clone(),
                        activity_score: 100,
                        active_pages: entry.page_count,
                        last_active_block: request_id,
                    });
                }
                Ok(())
            })
            .await
            .map_err(|e| GameError::Internal(e.to_string()))?;

        self.request_counter.set(request_id + 1);
        Ok(targets)
    }
}
