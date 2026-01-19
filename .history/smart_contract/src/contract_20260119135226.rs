//! # Steal & Yield - Contract Implementation

use linera_sdk::{
    linera_base_types::{ChainId, Timestamp, WithContractAbi},
    Contract, ContractRuntime,
};
use steal_and_yield::{Message, Operation, StealAndYieldAbi};

mod state;
use state::{PlayerState, RegistryState};

/// The contract implementation
pub struct StealAndYieldContract {
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(StealAndYieldContract);

impl WithContractAbi for StealAndYieldContract {
    type Abi = StealAndYieldAbi;
}

impl Contract for StealAndYieldContract {
    type Message = Message;
    type Parameters = ();
    type InstantiationArgument = bool; // true = registry, false = player
    type State = PlayerState;

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        StealAndYieldContract { runtime }
    }

    async fn instantiate(&mut self, is_registry: bool) {
        let chain_id = self.runtime.chain_id();
        let timestamp = self.runtime.system_time();
        
        if is_registry {
            // Initialize as registry chain
            let _ = self.state_mut().await.initialize(true, Some(chain_id), 0).await;
        } else {
            // Initialize as player chain with initial balance
            let _ = self.state_mut().await.initialize(false, None, 1000).await;
        }
    }

    async fn execute_operation(&mut self, operation: Operation) -> Vec<u8> {
        self.update_block_height();
        
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
            Operation::Claim { page_id, plot_id } => {
                self.handle_claim(page_id, plot_id).await
            }
            Operation::ClaimAll => {
                self.handle_claim_all().await
            }
            Operation::FindTargets { count } => {
                self.handle_find_targets(count).await
            }
            Operation::LockTarget { target_chain, commitment } => {
                self.handle_lock_target(target_chain, commitment).await
            }
            Operation::ExecuteSteal { target_page, target_plot, reveal_nonce } => {
                self.handle_execute_steal(target_page, target_plot, reveal_nonce).await
            }
            Operation::CancelRaid => {
                self.handle_cancel_raid().await
            }
            Operation::UpdateConfig { config } => {
                self.handle_update_config(config).await
            }
        }
    }

    async fn execute_message(&mut self, message: Message) {
        self.update_block_height();
        
        match message {
            Message::RegisterPlayer { player_chain, encrypted_name, timestamp } => {
                self.handle_register_player(player_chain, encrypted_name, timestamp).await;
            }
            Message::RequestTargets { requester, count, request_id: _ } => {
                self.handle_request_targets(requester, count).await;
            }
            Message::TargetsResponse { targets, request_id } => {
                self.handle_targets_response(targets, request_id).await;
            }
            Message::StealAttempt { attacker, target_page, target_plot, attack_seed: _ } => {
                self.handle_steal_attempt(attacker, target_page, target_plot).await;
            }
            Message::StealResult { success, amount } => {
                self.handle_steal_result(success, amount).await;
            }
        }
    }

    async fn store(mut self) {
        // State is automatically stored
    }
}

impl StealAndYieldContract {
    fn update_block_height(&mut self) {
        let height = self.runtime.block_height().0;
        // Update will happen via state access
    }

    async fn state_mut(&mut self) -> &mut PlayerState {
        self.runtime.state_mut()
    }

    async fn handle_register(&mut self, encrypted_name: Vec<u8>) -> Vec<u8> {
        let chain_id = self.runtime.chain_id();
        let timestamp = self.runtime.system_time();
        
        let result = self.state_mut().await.register(encrypted_name.clone()).await;
        
        if result.is_ok() {
            // Notify registry
            if let Some(registry) = *self.state_mut().await.registry_chain_id.get() {
                self.runtime.send_message(
                    registry,
                    Message::RegisterPlayer {
                        player_chain: chain_id,
                        encrypted_name,
                        timestamp,
                    },
                );
            }
        }
        
        encode_result(result.map(|_| "registered"))
    }

    async fn handle_create_page(&mut self) -> Vec<u8> {
        let result = self.state_mut().await.create_page().await;
        encode_result(result)
    }

    async fn handle_deposit(&mut self, page_id: u8, plot_id: u8, amount: u128) -> Vec<u8> {
        let result = self.state_mut().await.deposit(page_id, plot_id, amount).await;
        encode_result(result)
    }

    async fn handle_withdraw(&mut self, page_id: u8, plot_id: u8, amount: u128) -> Vec<u8> {
        let result = self.state_mut().await.withdraw(page_id, plot_id, amount).await;
        encode_result(result)
    }

    async fn handle_claim(&mut self, page_id: u8, plot_id: u8) -> Vec<u8> {
        let result = self.state_mut().await.claim(page_id, plot_id).await;
        encode_result(result)
    }

    async fn handle_claim_all(&mut self) -> Vec<u8> {
        let result = self.state_mut().await.claim_all().await;
        encode_result(result)
    }

    async fn handle_find_targets(&mut self, count: u8) -> Vec<u8> {
        let chain_id = self.runtime.chain_id();
        
        let result = self.state_mut().await.start_find_targets(count).await;
        
        if let Ok(request_id) = result {
            // Send request to registry
            if let Some(registry) = *self.state_mut().await.registry_chain_id.get() {
                self.runtime.send_message(
                    registry,
                    Message::RequestTargets {
                        requester: chain_id,
                        count,
                        request_id,
                    },
                );
            }
        }
        
        encode_result(result)
    }

    async fn handle_lock_target(&mut self, target_chain: ChainId, commitment: [u8; 32]) -> Vec<u8> {
        let result = self.state_mut().await.lock_target(target_chain, commitment).await;
        encode_result(result)
    }

    async fn handle_execute_steal(
        &mut self,
        target_page: u8,
        target_plot: u8,
        reveal_nonce: [u8; 32],
    ) -> Vec<u8> {
        let attacker = self.runtime.chain_id();
        
        let result = self.state_mut().await.execute_steal(target_page, target_plot, reveal_nonce).await;
        
        if let Ok((attack_seed, target_chain)) = &result {
            self.runtime.send_message(
                target_chain.clone(),
                Message::StealAttempt {
                    attacker,
                    target_page,
                    target_plot,
                    attack_seed: *attack_seed,
                },
            );
        }
        
        encode_result(result.map(|(_, _)| "steal_initiated"))
    }

    async fn handle_cancel_raid(&mut self) -> Vec<u8> {
        let result = self.state_mut().await.cancel_raid().await;
        encode_result(result.map(|_| "cancelled"))
    }

    async fn handle_update_config(&mut self, config: steal_and_yield::GameConfig) -> Vec<u8> {
        self.state_mut().await.config.set(config);
        encode_result::<&str, steal_and_yield::GameError>(Ok("config_updated"))
    }

    async fn handle_register_player(
        &mut self,
        player_chain: ChainId,
        encrypted_name: Vec<u8>,
        timestamp: Timestamp,
    ) {
        // This should only be called on registry chain
        // We'd need to use RegistryState here, but for simplicity
        // we'll handle it in PlayerState for now
    }

    async fn handle_request_targets(&mut self, requester: ChainId, count: u8) {
        // This runs on the registry chain
        // Generate random targets and send back
        let targets = vec![]; // In production, query from registry state
        
        self.runtime.send_message(
            requester.clone(),
            Message::TargetsResponse {
                targets,
                request_id: 0,
            },
        );
    }

    async fn handle_targets_response(
        &mut self,
        targets: Vec<steal_and_yield::TargetInfo>,
        request_id: u64,
    ) {
        let _ = self.state_mut().await.receive_targets(targets, request_id).await;
    }

    async fn handle_steal_attempt(
        &mut self,
        attacker: ChainId,
        target_page: u8,
        target_plot: u8,
    ) {
        // Calculate if steal succeeds (simplified)
        // In production, use proper VRF-based verification
        let success = target_plot % 2 == 0; // Simple mock
        let amount = if success { 10u128 } else { 0u128 };
        
        if success {
            // Deduct from victim
            let _ = self.state_mut().await.withdraw(target_page, target_plot, amount).await;
            
            // Update victim stats
            let mut stats = self.state_mut().await.stats.get().clone();
            stats.total_lost_to_steals += amount;
            stats.times_raided += 1;
            self.state_mut().await.stats.set(stats);
        }
        
        // Send result back to attacker
        self.runtime.send_message(
            attacker,
            Message::StealResult { success, amount },
        );
    }

    async fn handle_steal_result(&mut self, success: bool, amount: u128) {
        let _ = self.state_mut().await.process_steal_outcome(success, amount).await;
    }
}

fn encode_result<T: serde::Serialize, E: std::fmt::Debug>(result: Result<T, E>) -> Vec<u8> {
    match result {
        Ok(val) => serde_json::to_vec(&val).unwrap_or_default(),
        Err(e) => format!("{{\"error\":\"{:?}\"}}", e).into_bytes(),
    }
}
