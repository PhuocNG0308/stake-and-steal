# Writing the Contract Binary

The contract binary handles all state mutations in a Linera application. It processes operations from users and messages from other chains.

## Contract Structure

```rust
#![cfg_attr(target_arch = "wasm32", no_main)]

use linera_sdk::{
    base::{WithContractAbi, AccountOwner},
    views::{RootView, View, ViewStorageContext},
    Contract, ContractRuntime,
};

pub struct MyContract {
    state: ApplicationState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(MyContract);
```

---

## The Contract Trait

```rust
impl Contract for MyContract {
    /// Message type for cross-chain communication
    type Message = Message;
    
    /// Arguments for application instantiation
    type InstantiationArgument = InitialConfig;
    
    /// Immutable application parameters
    type Parameters = AppParameters;

    /// Load contract state
    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = ApplicationState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        MyContract { state, runtime }
    }

    /// Initialize application (called once on creation)
    async fn instantiate(&mut self, argument: Self::InstantiationArgument) {
        // Set initial state
    }

    /// Execute a user operation
    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        // Handle operations
    }

    /// Execute a cross-chain message
    async fn execute_message(&mut self, message: Self::Message) {
        // Handle messages
    }

    /// Save state after execution
    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}
```

---

## Lifecycle Methods

### `load` - Loading State

Called at the start of every block execution:

```rust
async fn load(runtime: ContractRuntime<Self>) -> Self {
    let state = ApplicationState::load(runtime.root_view_storage_context())
        .await
        .expect("Failed to load state");
    
    MyContract { state, runtime }
}
```

### `instantiate` - Initialization

Called once when the application is created:

```rust
async fn instantiate(&mut self, config: Self::InstantiationArgument) {
    // Validate config
    assert!(config.initial_supply > 0, "Supply must be positive");
    
    // Initialize state
    self.state.name.set(config.name);
    self.state.symbol.set(config.symbol);
    self.state.total_supply.set(config.initial_supply);
    
    // Set initial balance to creator
    let creator = self.runtime.authenticated_signer()
        .expect("Missing signer");
    self.state.balances
        .insert(&AccountOwner::User(creator), config.initial_supply)
        .await
        .unwrap();
}
```

### `execute_operation` - Handling Operations

Processes user-submitted operations:

```rust
async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
    match operation {
        Operation::Transfer { to, amount } => {
            self.transfer(to, amount).await
        }
        Operation::Approve { spender, amount } => {
            self.approve(spender, amount).await
        }
        Operation::Mint { to, amount } => {
            self.mint(to, amount).await
        }
        Operation::CrossChainTransfer { chain, to, amount } => {
            self.cross_chain_transfer(chain, to, amount).await
        }
    }
}
```

### `execute_message` - Handling Messages

Processes messages from other chains:

```rust
async fn execute_message(&mut self, message: Self::Message) {
    // Verify message source if needed
    let source_chain = self.runtime.message_id()
        .expect("Missing message id")
        .chain_id;
    
    match message {
        Message::Credit { to, amount } => {
            // Credit tokens on this chain
            let current = self.get_balance(&to).await;
            self.state.balances
                .insert(&to, current + amount)
                .await
                .unwrap();
        }
        Message::Notification { status, .. } => {
            // Handle notifications
        }
    }
}
```

### `store` - Saving State

Called after all operations/messages in a block:

```rust
async fn store(mut self) {
    self.state.save().await.expect("Failed to save state");
}
```

---

## Runtime Access

The `ContractRuntime` provides access to system information:

### Authentication

```rust
// Get the authenticated user
let signer = self.runtime.authenticated_signer()
    .expect("Operation requires authentication");

// Get the authenticated application (for cross-app calls)
let caller_app = self.runtime.authenticated_caller_id();
```

### Chain Information

```rust
// Current chain ID
let chain_id = self.runtime.chain_id();

// Application ID
let app_id = self.runtime.application_id();

// Current block height
let height = self.runtime.block_height();

// Current timestamp
let timestamp = self.runtime.system_time();
```

### Application Parameters

```rust
// Get immutable parameters
let params = self.runtime.application_parameters();
let max_supply = params.max_supply;
```

### Message Context

```rust
// When handling a message, get its origin
if let Some(message_id) = self.runtime.message_id() {
    let source_chain = message_id.chain_id;
    let source_height = message_id.height;
}
```

---

## Complete Contract Example

```rust
#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use self::state::ApplicationState;
use linera_sdk::{
    base::{AccountOwner, ChainId, WithContractAbi},
    views::{RootView, View, ViewStorageContext},
    Contract, ContractRuntime,
};

pub struct TokenContract {
    state: ApplicationState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(TokenContract);

impl WithContractAbi for TokenContract {
    type Abi = fungible_token::FungibleTokenAbi;
}

impl Contract for TokenContract {
    type Message = fungible_token::Message;
    type InstantiationArgument = fungible_token::TokenConfig;
    type Parameters = fungible_token::TokenParameters;

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = ApplicationState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        TokenContract { state, runtime }
    }

    async fn instantiate(&mut self, config: Self::InstantiationArgument) {
        self.state.name.set(config.name);
        self.state.symbol.set(config.symbol);
        self.state.decimals.set(config.decimals);
        self.state.total_supply.set(config.initial_supply);
        
        let creator = self.runtime.authenticated_signer()
            .expect("Missing creator");
        self.state.balances
            .insert(&AccountOwner::User(creator), config.initial_supply)
            .await
            .unwrap();
    }

    async fn execute_operation(
        &mut self, 
        operation: fungible_token::Operation
    ) -> fungible_token::Response {
        use fungible_token::Operation::*;
        
        let sender = AccountOwner::User(
            self.runtime.authenticated_signer().expect("Missing signer")
        );
        
        match operation {
            Transfer { to, amount } => {
                self.do_transfer(sender, to, amount).await;
                fungible_token::Response::Ok
            }
            
            Approve { spender, amount } => {
                self.state.allowances
                    .insert(&(sender.clone(), spender), amount)
                    .await
                    .unwrap();
                fungible_token::Response::Ok
            }
            
            TransferFrom { from, to, amount } => {
                // Check allowance
                let allowance = self.get_allowance(&from, &sender).await;
                assert!(allowance >= amount, "Insufficient allowance");
                
                // Update allowance
                self.state.allowances
                    .insert(&(from.clone(), sender), allowance - amount)
                    .await
                    .unwrap();
                
                // Transfer
                self.do_transfer(from, to, amount).await;
                fungible_token::Response::Ok
            }
            
            Mint { to, amount } => {
                self.check_admin(&sender);
                
                // Check max supply
                if let Some(max) = self.runtime.application_parameters().max_supply {
                    let new_supply = *self.state.total_supply.get() + amount;
                    assert!(new_supply <= max, "Exceeds max supply");
                }
                
                let balance = self.get_balance(&to).await;
                self.state.balances.insert(&to, balance + amount).await.unwrap();
                self.state.total_supply.set(*self.state.total_supply.get() + amount);
                
                fungible_token::Response::Ok
            }
            
            Burn { amount } => {
                let balance = self.get_balance(&sender).await;
                assert!(balance >= amount, "Insufficient balance");
                
                self.state.balances.insert(&sender, balance - amount).await.unwrap();
                self.state.total_supply.set(*self.state.total_supply.get() - amount);
                
                fungible_token::Response::Ok
            }
            
            CrossChainTransfer { chain, to, amount } => {
                // Debit from sender
                let balance = self.get_balance(&sender).await;
                assert!(balance >= amount, "Insufficient balance");
                self.state.balances.insert(&sender, balance - amount).await.unwrap();
                
                // Send message to target chain
                self.runtime
                    .prepare_message(fungible_token::Message::Credit { to, amount })
                    .send_to(chain);
                
                fungible_token::Response::Ok
            }
        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        use fungible_token::Message::*;
        
        match message {
            Credit { to, amount } => {
                let balance = self.get_balance(&to).await;
                self.state.balances.insert(&to, balance + amount).await.unwrap();
            }
            Debit { from, amount } => {
                let balance = self.get_balance(&from).await;
                assert!(balance >= amount, "Insufficient balance for debit");
                self.state.balances.insert(&from, balance - amount).await.unwrap();
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

// Helper methods
impl TokenContract {
    async fn get_balance(&self, owner: &AccountOwner) -> u128 {
        self.state.balances.get(owner).await.unwrap().unwrap_or(0)
    }
    
    async fn get_allowance(&self, owner: &AccountOwner, spender: &AccountOwner) -> u128 {
        self.state.allowances
            .get(&(owner.clone(), spender.clone()))
            .await
            .unwrap()
            .unwrap_or(0)
    }
    
    async fn do_transfer(&mut self, from: AccountOwner, to: AccountOwner, amount: u128) {
        let from_balance = self.get_balance(&from).await;
        assert!(from_balance >= amount, "Insufficient balance");
        
        let to_balance = self.get_balance(&to).await;
        
        self.state.balances.insert(&from, from_balance - amount).await.unwrap();
        self.state.balances.insert(&to, to_balance + amount).await.unwrap();
    }
    
    fn check_admin(&self, account: &AccountOwner) {
        // Implement admin check
    }
}
```

---

## Error Handling

### Using `assert!` and `panic!`

```rust
async fn execute_operation(&mut self, operation: Operation) -> Response {
    // Validation with assert
    assert!(amount > 0, "Amount must be positive");
    
    // Validation with panic
    if balance < amount {
        panic!("Insufficient balance: {} < {}", balance, amount);
    }
    
    // On panic, the transaction is reverted
}
```

### Using Result (for better errors)

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ContractError {
    #[error("Insufficient balance: {available} < {required}")]
    InsufficientBalance { available: u128, required: u128 },
    
    #[error("Unauthorized")]
    Unauthorized,
}

// Handle errors gracefully
impl TokenContract {
    fn transfer(&mut self, to: AccountOwner, amount: u128) -> Result<(), ContractError> {
        let balance = self.get_balance(&self.sender()).await;
        if balance < amount {
            return Err(ContractError::InsufficientBalance {
                available: balance,
                required: amount,
            });
        }
        // ...
        Ok(())
    }
}
```
