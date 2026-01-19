# Testing Linera Applications

Linera SDK provides testing utilities for unit tests and integration tests.

## Setup

### Cargo.toml Configuration

```toml
[dev-dependencies]
linera-sdk = { version = "0.15.8", features = ["test"] }
tokio = { version = "1.38", features = ["rt", "sync", "macros"] }
```

---

## Unit Tests

### Testing Application State

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use linera_sdk::views::memory::MemoryContext;
    
    #[tokio::test]
    async fn test_state_initialization() {
        // Create in-memory state
        let context = MemoryContext::new_for_testing();
        let mut state = ApplicationState::load(context).await.unwrap();
        
        // Test initial values
        assert_eq!(*state.counter.get(), 0);
        assert!(state.name.get().is_empty());
    }
    
    #[tokio::test]
    async fn test_state_mutations() {
        let context = MemoryContext::new_for_testing();
        let mut state = ApplicationState::load(context).await.unwrap();
        
        // Mutate state
        state.counter.set(42);
        state.name.set("Test".to_string());
        
        // Verify
        assert_eq!(*state.counter.get(), 42);
        assert_eq!(state.name.get(), "Test");
    }
    
    #[tokio::test]
    async fn test_map_view() {
        let context = MemoryContext::new_for_testing();
        let mut state = ApplicationState::load(context).await.unwrap();
        
        let owner = AccountOwner::User(create_test_owner());
        
        // Insert and retrieve
        state.balances.insert(&owner, 1000).await.unwrap();
        let balance = state.balances.get(&owner).await.unwrap();
        
        assert_eq!(balance, Some(1000));
    }
}

fn create_test_owner() -> Owner {
    // Create a test owner for testing purposes
    Owner::from([0u8; 32])
}
```

### Testing Business Logic

```rust
#[cfg(test)]
mod logic_tests {
    use super::*;
    
    #[test]
    fn test_operation_serialization() {
        let op = Operation::Transfer {
            to: AccountOwner::User(create_test_owner()),
            amount: 100,
        };
        
        // Test serialization
        let serialized = serde_json::to_string(&op).unwrap();
        let deserialized: Operation = serde_json::from_str(&serialized).unwrap();
        
        match deserialized {
            Operation::Transfer { amount, .. } => assert_eq!(amount, 100),
            _ => panic!("Wrong operation type"),
        }
    }
    
    #[test]
    fn test_message_serialization() {
        let msg = Message::Credit {
            recipient: AccountOwner::User(create_test_owner()),
            amount: 500,
        };
        
        let bytes = bcs::to_bytes(&msg).unwrap();
        let decoded: Message = bcs::from_bytes(&bytes).unwrap();
        
        match decoded {
            Message::Credit { amount, .. } => assert_eq!(amount, 500),
            _ => panic!("Wrong message type"),
        }
    }
}
```

---

## Integration Tests

### Using Test Runtime

```rust
#[cfg(test)]
mod integration_tests {
    use linera_sdk::test::{TestRuntime, TestValidator};
    use super::*;
    
    #[tokio::test]
    async fn test_full_contract_flow() {
        // Create test runtime
        let mut runtime = TestRuntime::new();
        
        // Deploy application
        let app_id = runtime
            .create_application::<MyContract>(
                InstantiationArgument {
                    initial_value: 100,
                },
                AppParameters::default(),
            )
            .await;
        
        // Execute operation
        let response = runtime
            .execute_operation(
                app_id,
                Operation::Increment { amount: 10 },
            )
            .await;
        
        assert_eq!(response, Response::Success);
        
        // Query state
        let value: u64 = runtime
            .query_service(app_id, "{ value }")
            .await;
        
        assert_eq!(value, 110);
    }
}
```

### Multi-Chain Testing

```rust
#[tokio::test]
async fn test_cross_chain_transfer() {
    let mut runtime = TestRuntime::new();
    
    // Create two chains
    let chain_a = runtime.create_chain().await;
    let chain_b = runtime.create_chain().await;
    
    // Deploy on chain A
    let app_a = runtime
        .create_application_on_chain::<TokenContract>(
            chain_a,
            TokenConfig {
                name: "Test Token".to_string(),
                symbol: "TST".to_string(),
                decimals: 18,
                initial_supply: 1000000,
            },
            TokenParameters::default(),
        )
        .await;
    
    // Register app on chain B
    let app_b = runtime.register_application(chain_b, app_a).await;
    
    // Execute cross-chain transfer
    let user_a = runtime.create_user().await;
    
    runtime
        .execute_operation_as(
            user_a,
            app_a,
            Operation::CrossChainTransfer {
                target_chain: chain_b,
                to: AccountOwner::User(user_a),
                amount: 100,
            },
        )
        .await;
    
    // Process cross-chain messages
    runtime.process_messages().await;
    
    // Verify balance on chain B
    let balance_b: u128 = runtime
        .query_service(
            app_b,
            "{ balance(owner: $owner) }",
            [("owner", &AccountOwner::User(user_a))],
        )
        .await;
    
    assert_eq!(balance_b, 100);
}
```

---

## Testing Patterns

### 1. Test Fixtures

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    struct TestFixture {
        runtime: TestRuntime,
        app_id: ApplicationId,
        admin: Owner,
        user: Owner,
    }
    
    impl TestFixture {
        async fn new() -> Self {
            let mut runtime = TestRuntime::new();
            let admin = runtime.create_user().await;
            let user = runtime.create_user().await;
            
            let app_id = runtime
                .create_application_as::<TokenContract>(
                    admin,
                    TokenConfig {
                        name: "Test".to_string(),
                        symbol: "TST".to_string(),
                        decimals: 18,
                        initial_supply: 1000000,
                    },
                    TokenParameters { max_supply: Some(10000000) },
                )
                .await;
            
            Self { runtime, app_id, admin, user }
        }
        
        async fn transfer(&mut self, from: Owner, to: AccountOwner, amount: u128) {
            self.runtime
                .execute_operation_as(
                    from,
                    self.app_id,
                    Operation::Transfer { to, amount },
                )
                .await;
        }
        
        async fn get_balance(&self, owner: &AccountOwner) -> u128 {
            self.runtime
                .query_service(
                    self.app_id,
                    "{ balance(owner: $owner) }",
                    [("owner", owner)],
                )
                .await
        }
    }
    
    #[tokio::test]
    async fn test_with_fixture() {
        let mut fixture = TestFixture::new().await;
        
        // Admin has initial supply
        let admin_balance = fixture.get_balance(&AccountOwner::User(fixture.admin)).await;
        assert_eq!(admin_balance, 1000000);
        
        // Transfer to user
        fixture.transfer(
            fixture.admin,
            AccountOwner::User(fixture.user),
            1000,
        ).await;
        
        // Check balances
        let user_balance = fixture.get_balance(&AccountOwner::User(fixture.user)).await;
        assert_eq!(user_balance, 1000);
    }
}
```

### 2. Error Testing

```rust
#[tokio::test]
#[should_panic(expected = "Insufficient balance")]
async fn test_insufficient_balance() {
    let mut runtime = TestRuntime::new();
    let user = runtime.create_user().await;
    
    let app_id = runtime
        .create_application::<TokenContract>(
            TokenConfig { initial_supply: 100, ..Default::default() },
            TokenParameters::default(),
        )
        .await;
    
    // Try to transfer more than balance
    runtime
        .execute_operation_as(
            user,
            app_id,
            Operation::Transfer {
                to: AccountOwner::User(user),
                amount: 1000, // More than initial supply
            },
        )
        .await;
}
```

### 3. Mocking Time

```rust
#[tokio::test]
async fn test_time_dependent_logic() {
    let mut runtime = TestRuntime::new();
    
    // Set initial time
    runtime.set_time(1000000);
    
    let app_id = runtime.create_application::<VestingContract>(
        VestingConfig {
            start_time: 1000000,
            duration: 86400, // 1 day
            amount: 1000,
        },
        Default::default(),
    ).await;
    
    // Check vested amount at start
    let vested: u128 = runtime.query_service(app_id, "{ vestedAmount }").await;
    assert_eq!(vested, 0);
    
    // Advance time by half duration
    runtime.advance_time(43200);
    
    let vested: u128 = runtime.query_service(app_id, "{ vestedAmount }").await;
    assert_eq!(vested, 500);
    
    // Advance to end
    runtime.advance_time(43200);
    
    let vested: u128 = runtime.query_service(app_id, "{ vestedAmount }").await;
    assert_eq!(vested, 1000);
}
```

---

## Running Tests

### Basic Test Run

```bash
# Run all tests
cargo test

# Run specific test
cargo test test_transfer

# Run with output
cargo test -- --nocapture

# Run tests in release mode (faster)
cargo test --release
```

### Coverage

```bash
# Install coverage tool
cargo install cargo-tarpaulin

# Run with coverage
cargo tarpaulin --out Html
```

---

## Best Practices

### 1. Test Each Operation

```rust
#[tokio::test]
async fn test_transfer_operation() { /* ... */ }

#[tokio::test]
async fn test_approve_operation() { /* ... */ }

#[tokio::test]
async fn test_mint_operation() { /* ... */ }
```

### 2. Test Edge Cases

```rust
#[tokio::test]
async fn test_transfer_zero_amount() { /* ... */ }

#[tokio::test]
async fn test_transfer_max_amount() { /* ... */ }

#[tokio::test]
async fn test_transfer_to_self() { /* ... */ }
```

### 3. Test Error Conditions

```rust
#[tokio::test]
#[should_panic(expected = "Insufficient balance")]
async fn test_overdraft() { /* ... */ }

#[tokio::test]
#[should_panic(expected = "Unauthorized")]
async fn test_unauthorized_mint() { /* ... */ }
```

### 4. Test Cross-Chain Scenarios

```rust
#[tokio::test]
async fn test_cross_chain_success() { /* ... */ }

#[tokio::test]
async fn test_cross_chain_bounce() { /* ... */ }

#[tokio::test]
async fn test_message_ordering() { /* ... */ }
```

### 5. Clean Test Output

```rust
#[tokio::test]
async fn test_example() {
    // Arrange
    let mut fixture = TestFixture::new().await;
    
    // Act
    fixture.transfer(fixture.admin, fixture.user, 100).await;
    
    // Assert
    let balance = fixture.get_balance(&fixture.user).await;
    assert_eq!(balance, 100, "User should receive transferred amount");
}
```
