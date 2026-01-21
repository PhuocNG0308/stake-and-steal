//! # Stake and Steal - Contract Implementation
//!
//! Dual-Token Liquidity Providing GameFi:
//! - Stake Token A (USDT) to earn Token A yield + Token B (SAS) rewards
//! - Use Token B (SAS) to buy plots and shields
//! - Raid other players to steal their Token A!

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_sdk::{
    linera_base_types::WithContractAbi,
    views::{RootView, View},
    Contract, ContractRuntime,
};
use stake_and_steal::{
    GameConfig, GameError, Message, Operation, OperationResponse, Page, PlayerInventory, PlayerStats, RaidState,
    StakeAndStealAbi, MAX_PAGES_PER_PLAYER, MAX_PLOTS_PER_PAGE, BASE_PLOTS_COUNT,
};

use self::state::StakeAndStealState;

pub struct StakeAndStealContract {
    state: StakeAndStealState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(StakeAndStealContract);

impl WithContractAbi for StakeAndStealContract {
    type Abi = StakeAndStealAbi;
}

impl Contract for StakeAndStealContract {
    type Message = Message;
    type Parameters = ();
    type InstantiationArgument = u128; // Initial balance
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = StakeAndStealState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        StakeAndStealContract { state, runtime }
    }

    async fn instantiate(&mut self, initial_balance: u128) {
        self.runtime.application_parameters();
        
        // Initialize state
        self.state.is_registered.set(false);
        self.state.encrypted_name.set(Vec::new());
        self.state.token_a_balance.set(initial_balance);
        self.state.token_b_balance.set(0); // Start with 0 SAS
        self.state.inventory.set(PlayerInventory {
            shields: 0,
            total_plots: BASE_PLOTS_COUNT as u8,
        });
        self.state.page_count.set(0);
        self.state.raid_state.set(RaidState::Idle);
        self.state.stats.set(PlayerStats::default());
        self.state.config.set(GameConfig::default());
        self.state.current_block.set(0);
        self.state.last_raid_block.set(0);
    }

    async fn execute_operation(&mut self, operation: Operation) -> OperationResponse {
        // Update block height
        let height = self.runtime.block_height().0;
        self.state.current_block.set(height);

        match operation {
            Operation::Register { encrypted_name } => {
                self.handle_register(encrypted_name).await
            }
            Operation::CreatePage => {
                self.handle_create_page().await
            }
            Operation::Deposit { page_id, plot_id, amount } => {
                self.handle_deposit(page_id, plot_id, amount).await
            }
            Operation::Withdraw { page_id, plot_id, amount } => {
                self.handle_withdraw(page_id, plot_id, amount).await
            }
            Operation::ClaimYield { page_id, plot_id } => {
                self.handle_claim_yield(page_id, plot_id).await
            }
            Operation::ClaimAllYield => {
                self.handle_claim_all_yield().await
            }
            Operation::ClaimSasRewards { page_id, plot_id } => {
                self.handle_claim_sas_rewards(page_id, plot_id).await
            }
            Operation::ClaimAllSasRewards => {
                self.handle_claim_all_sas_rewards().await
            }
            Operation::BuyPlot { page_id } => {
                self.handle_buy_plot(page_id).await
            }
            Operation::BuyShield { count } => {
                self.handle_buy_shield(count).await
            }
            Operation::ActivateShield { page_id, plot_id } => {
                self.handle_activate_shield(page_id, plot_id).await
            }
            Operation::FindTargets { count: _ } => {
                OperationResponse::TargetsFound { targets: vec![] }
            }
            Operation::LockTarget { target_chain, commitment: _ } => {
                let current_block = *self.state.current_block.get();
                self.state.raid_state.set(RaidState::Locked {
                    target_chain: target_chain.clone(),
                    commitment: [0u8; 32],
                    expires_at_block: current_block + 50,
                });
                OperationResponse::TargetLocked {
                    target_chain,
                    lock_until_block: current_block + 50,
                }
            }
            Operation::ExecuteSteal { attacker_page, attacker_plot, target_page: _, target_plot: _ , reveal_nonce: _ } => {
                self.handle_execute_steal(attacker_page, attacker_plot).await
            }
            Operation::CancelRaid => {
                self.state.raid_state.set(RaidState::Idle);
                OperationResponse::Success
            }
            Operation::UpdateConfig { config } => {
                self.state.config.set(config);
                OperationResponse::Success
            }
        }
    }

    async fn execute_message(&mut self, message: Message) {
        // Update block height
        let height = self.runtime.block_height().0;
        self.state.current_block.set(height);

        match message {
            Message::RegisterPlayer { .. } => {
                // Handle cross-chain registration (simplified)
            }
            Message::UnregisterPlayer { .. } => {
                // Handle cross-chain unregistration
            }
            Message::RequestTargets { .. } => {
                // Handle target request from another chain
            }
            Message::TargetsResponse { targets, request_id: _ } => {
                let current_block = *self.state.current_block.get();
                self.state.raid_state.set(RaidState::Choosing {
                    targets,
                    expires_at_block: current_block + 50,
                });
            }
            Message::StealAttempt { attacker: _, target_page, target_plot, attack_seed: _ } => {
                // Process steal attempt on this chain with 15% steal rate
                let _ = self.process_steal_on_victim(target_page, target_plot, 15).await;
            }
            Message::StealResult { success, amount, blocked_by_shield: _ } => {
                // Process steal result
                let mut stats = self.state.stats.get().clone();
                if success {
                    stats.successful_steals += 1;
                    stats.total_stolen += amount;
                    let balance = *self.state.token_a_balance.get();
                    self.state.token_a_balance.set(balance + amount);
                } else {
                    stats.failed_steals += 1;
                }
                self.state.stats.set(stats);
                self.state.raid_state.set(RaidState::Idle);
            }
            Message::StolenFunds { from_chain: _, amount } => {
                let balance = *self.state.token_a_balance.get();
                self.state.token_a_balance.set(balance + amount);
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl StakeAndStealContract {
    async fn handle_register(&mut self, encrypted_name: Vec<u8>) -> OperationResponse {
        if *self.state.is_registered.get() {
            return OperationResponse::Error {
                message: "Already registered".to_string(),
            };
        }

        self.state.is_registered.set(true);
        self.state.encrypted_name.set(encrypted_name);

        OperationResponse::Registered {
            player_id: self.runtime.chain_id(),
        }
    }

    async fn handle_create_page(&mut self) -> OperationResponse {
        let page_count = *self.state.page_count.get();

        if page_count >= MAX_PAGES_PER_PLAYER as u8 {
            return OperationResponse::Error {
                message: "Maximum pages reached".to_string(),
            };
        }

        let current_block = *self.state.current_block.get();
        let new_page = Page::new(page_count, current_block);
        
        self.state.pages.insert(&page_count, new_page).expect("Failed to insert page");
        self.state.page_count.set(page_count + 1);

        OperationResponse::PageCreated { page_id: page_count }
    }

    async fn handle_deposit(&mut self, page_id: u8, plot_id: u8, amount: u128) -> OperationResponse {
        let available = *self.state.token_a_balance.get();

        if available < amount {
            return OperationResponse::Error {
                message: "Insufficient Token A balance".to_string(),
            };
        }

        let page_result = self.state.pages.get(&page_id).await;
        let mut page = match page_result {
            Ok(Some(p)) => p,
            _ => {
                return OperationResponse::Error {
                    message: format!("Invalid page ID: {}", page_id),
                };
            }
        };

        if plot_id as usize >= page.plots.len() {
            return OperationResponse::Error {
                message: format!("Invalid plot ID: {}", plot_id),
            };
        }

        // Check if plot is purchased (base plots are always purchased)
        let plot = &page.plots[plot_id as usize];
        if !plot.is_purchased {
            return OperationResponse::Error {
                message: "Plot not purchased. Buy it with SAS tokens first.".to_string(),
            };
        }

        let current_block = *self.state.current_block.get();
        let plot = &mut page.plots[plot_id as usize];

        if !plot.is_active {
            plot.is_active = true;
            plot.deposit_block = current_block;
            plot.last_claim_block = current_block;
        }

        plot.token_a_balance += amount;
        let new_balance = plot.token_a_balance;

        self.state.pages.insert(&page_id, page).expect("Failed to update page");
        self.state.token_a_balance.set(available - amount);

        let mut stats = self.state.stats.get().clone();
        stats.total_deposited += amount;
        self.state.stats.set(stats);

        OperationResponse::Deposited {
            page_id,
            plot_id,
            new_balance,
        }
    }

    async fn handle_withdraw(&mut self, page_id: u8, plot_id: u8, amount: u128) -> OperationResponse {
        let page_result = self.state.pages.get(&page_id).await;
        let mut page = match page_result {
            Ok(Some(p)) => p,
            _ => {
                return OperationResponse::Error {
                    message: format!("Invalid page ID: {}", page_id),
                };
            }
        };

        if plot_id as usize >= page.plots.len() {
            return OperationResponse::Error {
                message: format!("Invalid plot ID: {}", plot_id),
            };
        }

        let plot = &mut page.plots[plot_id as usize];

        if plot.token_a_balance < amount {
            return OperationResponse::Error {
                message: "Insufficient plot balance".to_string(),
            };
        }

        plot.token_a_balance -= amount;
        if plot.token_a_balance == 0 {
            plot.is_active = false;
        }

        self.state.pages.insert(&page_id, page).expect("Failed to update page");

        let available = *self.state.token_a_balance.get();
        self.state.token_a_balance.set(available + amount);

        let mut stats = self.state.stats.get().clone();
        stats.total_withdrawn += amount;
        self.state.stats.set(stats);

        OperationResponse::Withdrawn {
            page_id,
            plot_id,
            amount,
        }
    }

    async fn handle_claim_yield(&mut self, page_id: u8, plot_id: u8) -> OperationResponse {
        let page_result = self.state.pages.get(&page_id).await;
        let mut page = match page_result {
            Ok(Some(p)) => p,
            _ => {
                return OperationResponse::Error {
                    message: format!("Invalid page ID: {}", page_id),
                };
            }
        };

        if plot_id as usize >= page.plots.len() {
            return OperationResponse::Error {
                message: format!("Invalid plot ID: {}", plot_id),
            };
        }

        let config = self.state.config.get();
        let current_block = *self.state.current_block.get();
        let plot = &mut page.plots[plot_id as usize];

        let yield_amount = plot.calculate_token_a_yield(current_block, config.yield_rate_bps);
        plot.last_claim_block = current_block;
        plot.pending_token_a_yield = 0;

        self.state.pages.insert(&page_id, page).expect("Failed to update page");

        let available = *self.state.token_a_balance.get();
        self.state.token_a_balance.set(available + yield_amount);

        let mut stats = self.state.stats.get().clone();
        stats.total_token_a_yield_earned += yield_amount;
        self.state.stats.set(stats);

        OperationResponse::YieldClaimed {
            page_id,
            plot_id,
            yield_amount,
        }
    }

    async fn handle_claim_all_yield(&mut self) -> OperationResponse {
        let page_count = *self.state.page_count.get();
        let config = self.state.config.get().clone();
        let current_block = *self.state.current_block.get();
        let mut total_yield = 0u128;

        for page_id in 0..page_count {
            if let Ok(Some(mut page)) = self.state.pages.get(&page_id).await {
                for plot in page.plots.iter_mut() {
                    if plot.is_active {
                        let yield_amount = plot.calculate_token_a_yield(current_block, config.yield_rate_bps);
                        plot.last_claim_block = current_block;
                        plot.pending_token_a_yield = 0;
                        total_yield += yield_amount;
                    }
                }
                let _ = self.state.pages.insert(&page_id, page);
            }
        }

        let available = *self.state.token_a_balance.get();
        self.state.token_a_balance.set(available + total_yield);

        let mut stats = self.state.stats.get().clone();
        stats.total_token_a_yield_earned += total_yield;
        self.state.stats.set(stats);

        OperationResponse::AllYieldClaimed { total_yield }
    }

    async fn handle_claim_sas_rewards(&mut self, page_id: u8, plot_id: u8) -> OperationResponse {
        let page_result = self.state.pages.get(&page_id).await;
        let mut page = match page_result {
            Ok(Some(p)) => p,
            _ => {
                return OperationResponse::Error {
                    message: format!("Invalid page ID: {}", page_id),
                };
            }
        };

        if plot_id as usize >= page.plots.len() {
            return OperationResponse::Error {
                message: format!("Invalid plot ID: {}", plot_id),
            };
        }

        let config = self.state.config.get();
        let current_block = *self.state.current_block.get();
        let plot = &mut page.plots[plot_id as usize];

        let sas_amount = plot.calculate_sas_rewards(current_block, config.sas_reward_rate_bps);
        plot.pending_sas_rewards = 0;

        self.state.pages.insert(&page_id, page).expect("Failed to update page");

        let sas_balance = *self.state.token_b_balance.get();
        self.state.token_b_balance.set(sas_balance + sas_amount);

        let mut stats = self.state.stats.get().clone();
        stats.total_sas_earned += sas_amount;
        self.state.stats.set(stats);

        OperationResponse::SasRewardsClaimed {
            page_id,
            plot_id,
            sas_amount,
        }
    }

    async fn handle_claim_all_sas_rewards(&mut self) -> OperationResponse {
        let page_count = *self.state.page_count.get();
        let config = self.state.config.get().clone();
        let current_block = *self.state.current_block.get();
        let mut total_sas = 0u128;

        for page_id in 0..page_count {
            if let Ok(Some(mut page)) = self.state.pages.get(&page_id).await {
                for plot in page.plots.iter_mut() {
                    if plot.is_active {
                        let sas_amount = plot.calculate_sas_rewards(current_block, config.sas_reward_rate_bps);
                        plot.pending_sas_rewards = 0;
                        total_sas += sas_amount;
                    }
                }
                let _ = self.state.pages.insert(&page_id, page);
            }
        }

        let sas_balance = *self.state.token_b_balance.get();
        self.state.token_b_balance.set(sas_balance + total_sas);

        let mut stats = self.state.stats.get().clone();
        stats.total_sas_earned += total_sas;
        self.state.stats.set(stats);

        OperationResponse::AllSasRewardsClaimed { total_sas }
    }

    async fn handle_buy_plot(&mut self, page_id: u8) -> OperationResponse {
        let config = self.state.config.get().clone();
        let sas_balance = *self.state.token_b_balance.get();

        if sas_balance < config.plot_cost_sas {
            return OperationResponse::Error {
                message: format!("Insufficient SAS balance. Need {} but have {}", config.plot_cost_sas, sas_balance),
            };
        }

        let page_result = self.state.pages.get(&page_id).await;
        let mut page = match page_result {
            Ok(Some(p)) => p,
            _ => {
                return OperationResponse::Error {
                    message: format!("Invalid page ID: {}", page_id),
                };
            }
        };

        // Find first unpurchased plot
        let plot_id = page.plots.iter().position(|p| !p.is_purchased);
        let plot_id = match plot_id {
            Some(id) => id,
            None => {
                return OperationResponse::Error {
                    message: "All plots on this page are already purchased".to_string(),
                };
            }
        };

        // Purchase the plot
        page.plots[plot_id].is_purchased = true;
        self.state.pages.insert(&page_id, page).expect("Failed to update page");

        // Deduct SAS
        self.state.token_b_balance.set(sas_balance - config.plot_cost_sas);

        // Update inventory and stats
        let mut inventory = self.state.inventory.get().clone();
        inventory.total_plots += 1;
        self.state.inventory.set(inventory);

        let mut stats = self.state.stats.get().clone();
        stats.total_sas_spent += config.plot_cost_sas;
        stats.plots_purchased += 1;
        self.state.stats.set(stats);

        OperationResponse::PlotPurchased {
            page_id,
            plot_id: plot_id as u8,
            sas_cost: config.plot_cost_sas,
        }
    }

    async fn handle_buy_shield(&mut self, count: u8) -> OperationResponse {
        let config = self.state.config.get().clone();
        let total_cost = config.shield_cost_sas * count as u128;
        let sas_balance = *self.state.token_b_balance.get();

        if sas_balance < total_cost {
            return OperationResponse::Error {
                message: format!("Insufficient SAS balance. Need {} but have {}", total_cost, sas_balance),
            };
        }

        // Deduct SAS
        self.state.token_b_balance.set(sas_balance - total_cost);

        // Add shields to inventory
        let mut inventory = self.state.inventory.get().clone();
        inventory.shields += count;
        self.state.inventory.set(inventory);

        let mut stats = self.state.stats.get().clone();
        stats.total_sas_spent += total_cost;
        self.state.stats.set(stats);

        OperationResponse::ShieldPurchased {
            count,
            total_cost,
        }
    }

    async fn handle_activate_shield(&mut self, page_id: u8, plot_id: u8) -> OperationResponse {
        let inventory = self.state.inventory.get().clone();
        
        if inventory.shields == 0 {
            return OperationResponse::Error {
                message: "No shields available".to_string(),
            };
        }

        let page_result = self.state.pages.get(&page_id).await;
        let mut page = match page_result {
            Ok(Some(p)) => p,
            _ => {
                return OperationResponse::Error {
                    message: format!("Invalid page ID: {}", page_id),
                };
            }
        };

        if plot_id as usize >= page.plots.len() {
            return OperationResponse::Error {
                message: format!("Invalid plot ID: {}", plot_id),
            };
        }

        // Activate shield on plot
        page.plots[plot_id as usize].shield_active = true;
        self.state.pages.insert(&page_id, page).expect("Failed to update page");

        // Consume shield
        let mut inventory = inventory;
        inventory.shields -= 1;
        self.state.inventory.set(inventory.clone());

        OperationResponse::ShieldActivated {
            page_id,
            plot_id,
            shields_remaining: inventory.shields,
        }
    }

    /// Execute steal: If attacker has staked >= min_steal_stake on their plot, steal is GUARANTEED!
    /// Steal steals Token A from victim's random plot
    async fn handle_execute_steal(&mut self, attacker_page: u8, attacker_plot: u8) -> OperationResponse {
        let config = self.state.config.get().clone();
        
        // Check attacker's stake on their plot
        let page_result = self.state.pages.get(&attacker_page).await;
        let page = match page_result {
            Ok(Some(p)) => p,
            _ => {
                self.state.raid_state.set(RaidState::Idle);
                return OperationResponse::Error {
                    message: format!("Invalid attacker page ID: {}", attacker_page),
                };
            }
        };

        if attacker_plot as usize >= page.plots.len() {
            self.state.raid_state.set(RaidState::Idle);
            return OperationResponse::Error {
                message: format!("Invalid attacker plot ID: {}", attacker_plot),
            };
        }

        let attacker_stake = page.plots[attacker_plot as usize].token_a_balance;
        
        // NEW MECHANIC: If attacker has staked enough, steal is GUARANTEED!
        if attacker_stake >= config.min_steal_stake {
            // Steal is successful! Take 15% from attacker's own stake as "payment"
            let steal_cost = attacker_stake * 15 / 100;
            let amount_stolen = attacker_stake - steal_cost;
            
            // For now, this is a simplified local steal (cross-chain would need messages)
            let mut updated_page = page.clone();
            updated_page.plots[attacker_plot as usize].token_a_balance = 0; // Use up the stake
            self.state.pages.insert(&attacker_page, updated_page).expect("Failed to update page");
            
            // Add stolen amount to Token A balance
            let available = *self.state.token_a_balance.get();
            self.state.token_a_balance.set(available + amount_stolen);
            
            // Update stats
            let mut stats = self.state.stats.get().clone();
            stats.successful_steals += 1;
            stats.total_stolen += amount_stolen;
            self.state.stats.set(stats);
            
            // Set cooldown
            let current_block = *self.state.current_block.get();
            self.state.raid_state.set(RaidState::Cooldown { 
                until_block: current_block + config.raid_cooldown_blocks 
            });
            
            OperationResponse::StealResult {
                success: true,
                amount_stolen,
                blocked_by_shield: false,
            }
        } else {
            // Not enough stake - steal fails
            self.state.raid_state.set(RaidState::Idle);
            
            let mut stats = self.state.stats.get().clone();
            stats.failed_steals += 1;
            self.state.stats.set(stats);
            
            OperationResponse::Error {
                message: format!(
                    "Insufficient stake for guaranteed steal. Need {} but have {}",
                    config.min_steal_stake, attacker_stake
                ),
            }
        }
    }

    /// Process steal on victim's side - called when receiving a steal message
    async fn process_steal_on_victim(&mut self, target_page: u8, target_plot: u8, steal_percentage: u8) -> Result<(u128, bool), GameError> {
        let page_result = self.state.pages.get(&target_page).await;
        let mut page = match page_result {
            Ok(Some(p)) => p,
            _ => return Err(GameError::InvalidPageId(target_page)),
        };

        if target_plot as usize >= page.plots.len() {
            return Err(GameError::InvalidPlotId(target_plot));
        }

        let plot = &mut page.plots[target_plot as usize];
        
        // Check if plot has shield active
        if plot.shield_active {
            // Shield blocks the attack and is consumed
            plot.shield_active = false;
            self.state.pages.insert(&target_page, page).expect("Failed to update page");
            
            let mut stats = self.state.stats.get().clone();
            stats.shields_consumed += 1;
            self.state.stats.set(stats);
            
            return Ok((0, true)); // blocked_by_shield = true
        }
        
        // No shield - steal succeeds
        let stolen_amount = plot.token_a_balance * steal_percentage as u128 / 100;
        plot.token_a_balance -= stolen_amount;
        
        // Update stats
        let mut stats = self.state.stats.get().clone();
        stats.total_lost_to_steals += stolen_amount;
        stats.times_raided += 1;
        self.state.stats.set(stats);
        
        self.state.pages.insert(&target_page, page).expect("Failed to update page");
        
        Ok((stolen_amount, false)) // blocked_by_shield = false
    }
}
