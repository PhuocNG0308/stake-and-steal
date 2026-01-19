//! # Steal & Yield - Contract Implementation
//!
//! Handles all state mutations: operations and cross-chain messages.

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_sdk::{
    base::{ChainId, Owner, Timestamp, WithContractAbi},
    views::{RootView, View, ViewStorageContext},
    Contract, ContractRuntime,
};
use steal_and_yield::{
    ApplicationParameters, GameError, InstantiationArgument, Message, Operation,
    OperationResponse, StealAndYieldAbi, TargetInfo,
};

use crate::state::{PlayerState, RegistryState};

/// The contract implementation
pub struct StealAndYieldContract {
    /// Player state (used on player chains)
    state: PlayerState,
    /// Registry state (used on registry chain only)
    registry: RegistryState,
    /// Contract runtime
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(StealAndYieldContract);

impl WithContractAbi for StealAndYieldContract {
    type Abi = StealAndYieldAbi;
}

impl Contract for StealAndYieldContract {
    type Message = Message;
    type InstantiationArgument = InstantiationArgument;
    type Parameters = ApplicationParameters;

    /// Load contract state
    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = PlayerState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load player state");

        let registry = RegistryState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load registry state");

        StealAndYieldContract {
            state,
            registry,
            runtime,
        }
    }

    /// Initialize the application
    async fn instantiate(&mut self, argument: Self::InstantiationArgument) {
        let initial_balance = argument.initial_balance.unwrap_or(0);

        if argument.is_registry {
            // Initialize as registry chain
            self.registry
                .initialize()
                .await
                .expect("Failed to initialize registry");

            self.state
                .initialize(true, None, 0)
                .await
                .expect("Failed to initialize state");
        } else {
            // Initialize as player chain
            self.state
                .initialize(false, argument.registry_chain_id, initial_balance)
                .await
                .expect("Failed to initialize state");
        }
    }

    /// Execute an operation
    async fn execute_operation(&mut self, operation: Self::Operation) -> OperationResponse {
        // Update block height
        self.state.update_block(self.runtime.block_height().into());

        match operation {
            // ================================================================
            // REGISTRY OPERATIONS
            // ================================================================
            Operation::Register { encrypted_name } => {
                self.handle_register(encrypted_name).await
            }

            Operation::Unregister => self.handle_unregister().await,

            // ================================================================
            // LAND & DEPOSIT OPERATIONS
            // ================================================================
            Operation::CreatePage => self.handle_create_page().await,

            Operation::Deposit {
                page_id,
                plot_id,
                amount,
                encrypted_data,
            } => {
                self.handle_deposit(page_id, plot_id, amount, encrypted_data)
                    .await
            }

            Operation::Withdraw {
                page_id,
                plot_id,
                amount,
            } => self.handle_withdraw(page_id, plot_id, amount).await,

            Operation::Claim { page_id, plot_id } => {
                self.handle_claim(page_id, plot_id).await
            }

            Operation::ClaimAll => self.handle_claim_all().await,

            // ================================================================
            // STEALING OPERATIONS
            // ================================================================
            Operation::FindTargets { count } => self.handle_find_targets(count).await,

            Operation::LockTarget {
                target_chain,
                commitment,
            } => self.handle_lock_target(target_chain, commitment).await,

            Operation::ExecuteSteal {
                target_page,
                target_plot,
                reveal_nonce,
            } => {
                self.handle_execute_steal(target_page, target_plot, reveal_nonce)
                    .await
            }

            Operation::CancelRaid => self.handle_cancel_raid().await,

            // ================================================================
            // ADMIN OPERATIONS
            // ================================================================
            Operation::UpdateConfig {
                new_yield_rate,
                new_steal_rate,
            } => {
                self.handle_update_config(new_yield_rate, new_steal_rate)
                    .await
            }
        }
    }

    /// Handle incoming cross-chain message
    async fn execute_message(&mut self, message: Self::Message) {
        // Update block height
        self.state.update_block(self.runtime.block_height().into());

        // Check if message is bouncing
        if self.runtime.message_is_bouncing().unwrap_or(false) {
            self.handle_bounced_message(message).await;
            return;
        }

        match message {
            // ================================================================
            // REGISTRY MESSAGES
            // ================================================================
            Message::RegisterPlayer {
                player_chain,
                encrypted_name,
                timestamp,
            } => {
                self.handle_register_player_message(player_chain, encrypted_name, timestamp)
                    .await;
            }

            Message::UnregisterPlayer { player_chain } => {
                self.handle_unregister_player_message(player_chain).await;
            }

            Message::RequestTargets {
                requester,
                count,
                exclude_chains,
                request_id,
            } => {
                self.handle_request_targets_message(requester, count, exclude_chains, request_id)
                    .await;
            }

            Message::TargetList {
                requester,
                targets,
                request_id,
            } => {
                self.handle_target_list_message(requester, targets, request_id)
                    .await;
            }

            // ================================================================
            // STEALING MESSAGES
            // ================================================================
            Message::StealAttempt {
                attacker_chain,
                target_page,
                target_plot,
                attack_seed,
                attack_timestamp,
            } => {
                self.handle_steal_attempt_message(
                    attacker_chain,
                    target_page,
                    target_plot,
                    attack_seed,
                    attack_timestamp,
                )
                .await;
            }

            Message::StealOutcome {
                attacker_chain,
                success,
                amount_stolen,
                rng_proof,
            } => {
                self.handle_steal_outcome_message(attacker_chain, success, amount_stolen, rng_proof)
                    .await;
            }

            Message::StolenFunds {
                from_chain,
                amount,
                original_page,
                original_plot,
            } => {
                self.handle_stolen_funds_message(from_chain, amount, original_page, original_plot)
                    .await;
            }

            Message::AttackNotification {
                attacker_chain,
                success,
                amount_lost,
                page_id,
                plot_id,
            } => {
                // Just log - already handled in steal attempt
                log::info!(
                    "Attack notification: attacker={:?}, success={}, amount={}",
                    attacker_chain,
                    success,
                    amount_lost
                );
            }

            Message::StateSync {
                from_chain,
                state_hash,
            } => {
                log::info!(
                    "State sync from {:?}: hash={:?}",
                    from_chain,
                    hex::encode(state_hash)
                );
            }
        }
    }

    /// Store contract state
    async fn store(mut self) {
        self.state.save().await.expect("Failed to save player state");
        self.registry.save().await.expect("Failed to save registry state");
    }
}

// ============================================================================
// OPERATION HANDLERS
// ============================================================================

impl StealAndYieldContract {
    /// Get owner key for encryption (mock)
    fn get_owner_key(&self) -> Vec<u8> {
        // In production, this would derive from owner's public key
        let signer = self.runtime.authenticated_signer();
        match signer {
            Some(owner) => {
                let bytes = format!("{:?}", owner);
                bytes.as_bytes().to_vec()
            }
            None => vec![0u8; 32],
        }
    }

    /// Get current chain ID
    fn chain_id(&self) -> ChainId {
        self.runtime.chain_id()
    }

    /// Get current timestamp
    fn timestamp(&self) -> Timestamp {
        self.runtime.system_time()
    }

    // ========================================================================
    // REGISTRY HANDLERS
    // ========================================================================

    async fn handle_register(&mut self, encrypted_name: Vec<u8>) -> OperationResponse {
        let owner_key = self.get_owner_key();
        let owner_key_hash = {
            use sha2::{Digest, Sha256};
            let mut hasher = Sha256::new();
            hasher.update(&owner_key);
            hasher.finalize().into()
        };

        // Register locally
        if let Err(e) = self.state.register(encrypted_name.clone(), owner_key_hash).await {
            return OperationResponse::Error {
                message: e.to_string(),
            };
        }

        // Send registration to registry
        let registry_chain = match self.state.registry_chain_id.get() {
            Some(chain) => *chain,
            None => {
                // If no registry, we might be the registry
                if *self.state.is_registry.get() {
                    self.chain_id()
                } else {
                    return OperationResponse::Error {
                        message: "No registry configured".to_string(),
                    };
                }
            }
        };

        let player_chain = self.chain_id();
        let timestamp = self.timestamp();

        self.runtime
            .prepare_message(Message::RegisterPlayer {
                player_chain,
                encrypted_name,
                timestamp,
            })
            .send_to(registry_chain);

        OperationResponse::Registered {
            player_id: player_chain,
        }
    }

    async fn handle_unregister(&mut self) -> OperationResponse {
        self.state.is_registered.set(false);

        // Notify registry
        let registry_chain = match self.state.registry_chain_id.get() {
            Some(chain) => *chain,
            None => return OperationResponse::Success,
        };

        let player_chain = self.chain_id();

        self.runtime
            .prepare_message(Message::UnregisterPlayer { player_chain })
            .send_to(registry_chain);

        OperationResponse::Success
    }

    // ========================================================================
    // LAND & DEPOSIT HANDLERS
    // ========================================================================

    async fn handle_create_page(&mut self) -> OperationResponse {
        match self.state.create_page().await {
            Ok(page_id) => OperationResponse::PageCreated { page_id },
            Err(e) => OperationResponse::Error {
                message: e.to_string(),
            },
        }
    }

    async fn handle_deposit(
        &mut self,
        page_id: u8,
        plot_id: u8,
        amount: u128,
        encrypted_data: Vec<u8>,
    ) -> OperationResponse {
        let owner_key = self.get_owner_key();

        match self
            .state
            .deposit(page_id, plot_id, amount, encrypted_data, &owner_key)
            .await
        {
            Ok(new_balance) => OperationResponse::Deposited {
                page_id,
                plot_id,
                new_balance,
            },
            Err(e) => OperationResponse::Error {
                message: e.to_string(),
            },
        }
    }

    async fn handle_withdraw(
        &mut self,
        page_id: u8,
        plot_id: u8,
        amount: u128,
    ) -> OperationResponse {
        let owner_key = self.get_owner_key();

        match self.state.withdraw(page_id, plot_id, amount, &owner_key).await {
            Ok(withdrawn) => OperationResponse::Withdrawn {
                page_id,
                plot_id,
                amount: withdrawn,
            },
            Err(e) => OperationResponse::Error {
                message: e.to_string(),
            },
        }
    }

    async fn handle_claim(&mut self, page_id: u8, plot_id: u8) -> OperationResponse {
        match self.state.claim(page_id, plot_id).await {
            Ok(yield_amount) => OperationResponse::Claimed {
                page_id,
                plot_id,
                yield_amount,
            },
            Err(e) => OperationResponse::Error {
                message: e.to_string(),
            },
        }
    }

    async fn handle_claim_all(&mut self) -> OperationResponse {
        match self.state.claim_all().await {
            Ok(total_yield) => OperationResponse::ClaimedAll { total_yield },
            Err(e) => OperationResponse::Error {
                message: e.to_string(),
            },
        }
    }

    // ========================================================================
    // STEALING HANDLERS
    // ========================================================================

    async fn handle_find_targets(&mut self, count: u8) -> OperationResponse {
        // Start finding targets
        let request_id = match self.state.start_find_targets(count).await {
            Ok(id) => id,
            Err(e) => {
                return OperationResponse::Error {
                    message: e.to_string(),
                };
            }
        };

        // Request targets from registry
        let registry_chain = match self.state.registry_chain_id.get() {
            Some(chain) => *chain,
            None => {
                return OperationResponse::Error {
                    message: "No registry configured".to_string(),
                };
            }
        };

        let requester = self.chain_id();

        self.runtime
            .prepare_message(Message::RequestTargets {
                requester,
                count,
                exclude_chains: Vec::new(),
                request_id,
            })
            .send_to(registry_chain);

        OperationResponse::TargetsFound {
            targets: Vec::new(), // Will be populated by message response
        }
    }

    async fn handle_lock_target(
        &mut self,
        target_chain: ChainId,
        commitment: [u8; 32],
    ) -> OperationResponse {
        let own_chain = self.chain_id();

        match self.state.lock_target(target_chain, commitment, own_chain).await {
            Ok(lock_until) => OperationResponse::TargetLocked {
                target_chain,
                lock_until_block: lock_until,
            },
            Err(e) => OperationResponse::Error {
                message: e.to_string(),
            },
        }
    }

    async fn handle_execute_steal(
        &mut self,
        target_page: u8,
        target_plot: u8,
        reveal_nonce: [u8; 32],
    ) -> OperationResponse {
        let (attack_seed, target_chain) = match self
            .state
            .execute_steal(target_page, target_plot, reveal_nonce)
            .await
        {
            Ok(result) => result,
            Err(e) => {
                return OperationResponse::Error {
                    message: e.to_string(),
                };
            }
        };

        // Send steal attempt to target chain
        let attacker_chain = self.chain_id();
        let attack_timestamp = self.timestamp();

        self.runtime
            .prepare_message(Message::StealAttempt {
                attacker_chain,
                target_page,
                target_plot,
                attack_seed,
                attack_timestamp,
            })
            .with_tracking()
            .send_to(target_chain);

        OperationResponse::StealResult {
            success: false, // Will be updated by message response
            amount_stolen: 0,
        }
    }

    async fn handle_cancel_raid(&mut self) -> OperationResponse {
        match self.state.cancel_raid().await {
            Ok(()) => OperationResponse::Success,
            Err(e) => OperationResponse::Error {
                message: e.to_string(),
            },
        }
    }

    // ========================================================================
    // ADMIN HANDLERS
    // ========================================================================

    async fn handle_update_config(
        &mut self,
        new_yield_rate: Option<u64>,
        new_steal_rate: Option<u8>,
    ) -> OperationResponse {
        // TODO: Add admin authorization check

        let mut config = self.state.config.get().clone();

        if let Some(rate) = new_yield_rate {
            config.yield_rate_bps = rate;
        }

        if let Some(rate) = new_steal_rate {
            config.steal_success_rate = rate;
        }

        self.state.config.set(config);

        OperationResponse::Success
    }
}

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

impl StealAndYieldContract {
    async fn handle_bounced_message(&mut self, message: Message) {
        match message {
            Message::StealAttempt { attacker_chain, .. } => {
                log::warn!("Steal attempt bounced for {:?}", attacker_chain);
                // Reset raid state on bounce
                self.state.raid_state.set(steal_and_yield::RaidState::Idle);
            }
            Message::RegisterPlayer { player_chain, .. } => {
                log::warn!("Registration bounced for {:?}", player_chain);
                self.state.is_registered.set(false);
            }
            _ => {
                log::warn!("Message bounced: {:?}", message);
            }
        }
    }

    // ========================================================================
    // REGISTRY MESSAGE HANDLERS
    // ========================================================================

    async fn handle_register_player_message(
        &mut self,
        player_chain: ChainId,
        encrypted_name: Vec<u8>,
        timestamp: Timestamp,
    ) {
        if !*self.registry.is_registry.get() {
            log::warn!("Not a registry chain, ignoring register message");
            return;
        }

        if let Err(e) = self
            .registry
            .register_player(player_chain, encrypted_name, timestamp)
            .await
        {
            log::error!("Failed to register player: {}", e);
        }
    }

    async fn handle_unregister_player_message(&mut self, player_chain: ChainId) {
        if !*self.registry.is_registry.get() {
            return;
        }

        if let Err(e) = self.registry.unregister_player(player_chain).await {
            log::error!("Failed to unregister player: {}", e);
        }
    }

    async fn handle_request_targets_message(
        &mut self,
        requester: ChainId,
        count: u8,
        exclude_chains: Vec<ChainId>,
        request_id: u64,
    ) {
        if !*self.registry.is_registry.get() {
            return;
        }

        let targets = match self
            .registry
            .get_random_targets(requester, count, &exclude_chains)
            .await
        {
            Ok(t) => t,
            Err(e) => {
                log::error!("Failed to get targets: {}", e);
                return;
            }
        };

        // Send targets back to requester
        self.runtime
            .prepare_message(Message::TargetList {
                requester,
                targets,
                request_id,
            })
            .send_to(requester);
    }

    async fn handle_target_list_message(
        &mut self,
        _requester: ChainId,
        targets: Vec<TargetInfo>,
        request_id: u64,
    ) {
        if let Err(e) = self.state.receive_targets(targets, request_id).await {
            log::error!("Failed to receive targets: {}", e);
        }
    }

    // ========================================================================
    // STEALING MESSAGE HANDLERS
    // ========================================================================

    async fn handle_steal_attempt_message(
        &mut self,
        attacker_chain: ChainId,
        target_page: u8,
        target_plot: u8,
        attack_seed: [u8; 32],
        _attack_timestamp: Timestamp,
    ) {
        let owner_key = self.get_owner_key();

        let (success, amount_stolen, rng_proof) = match self
            .state
            .process_steal_attempt(
                attacker_chain,
                target_page,
                target_plot,
                attack_seed,
                &owner_key,
            )
            .await
        {
            Ok(result) => result,
            Err(e) => {
                log::error!("Failed to process steal attempt: {}", e);
                (false, 0, Vec::new())
            }
        };

        // Send outcome back to attacker
        self.runtime
            .prepare_message(Message::StealOutcome {
                attacker_chain,
                success,
                amount_stolen,
                rng_proof,
            })
            .send_to(attacker_chain);

        // If successful, send the stolen funds
        if success && amount_stolen > 0 {
            self.runtime
                .prepare_message(Message::StolenFunds {
                    from_chain: self.chain_id(),
                    amount: amount_stolen,
                    original_page: target_page,
                    original_plot: target_plot,
                })
                .send_to(attacker_chain);
        }
    }

    async fn handle_steal_outcome_message(
        &mut self,
        _attacker_chain: ChainId,
        success: bool,
        amount_stolen: u128,
        _rng_proof: Vec<u8>,
    ) {
        // TODO: Verify RNG proof

        if let Err(e) = self.state.process_steal_outcome(success, amount_stolen).await {
            log::error!("Failed to process steal outcome: {}", e);
        }
    }

    async fn handle_stolen_funds_message(
        &mut self,
        _from_chain: ChainId,
        amount: u128,
        _original_page: u8,
        _original_plot: u8,
    ) {
        // Add funds to available balance
        let current = *self.state.available_balance.get();
        self.state.available_balance.set(current + amount);

        log::info!("Received {} stolen funds", amount);
    }
}
