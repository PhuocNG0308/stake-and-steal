# Calling Other Applications (Composition)

Linera applications can call each other within the same chain, enabling composability and code reuse.

## Overview

```
┌─────────────────────────────────────────────────────┐
│                     Chain                           │
│  ┌─────────────┐        ┌─────────────┐            │
│  │   App A     │ ─────► │   App B     │            │
│  │ (caller)    │ calls  │ (callee)    │            │
│  └─────────────┘        └─────────────┘            │
└─────────────────────────────────────────────────────┘
```

---

## Making Cross-Application Calls

### Basic Call

```rust
use linera_sdk::base::ApplicationId;

impl Contract for MyContract {
    async fn execute_operation(&mut self, operation: Operation) -> Response {
        match operation {
            Operation::UseOtherApp { app_id, action } => {
                // Call another application
                let response: OtherAppResponse = self.runtime
                    .call_application(
                        true,  // authenticated (forward caller identity)
                        app_id,
                        &OtherAppOperation::DoSomething { action },
                    )
                    .await;
                
                // Use the response
                self.process_response(response).await;
                
                Response::Ok
            }
        }
    }
}
```

### Call Parameters

```rust
// Authenticated call - forwards caller's identity
let response = self.runtime
    .call_application(true, app_id, &operation)
    .await;

// Unauthenticated call - callee sees our app as caller
let response = self.runtime
    .call_application(false, app_id, &operation)
    .await;
```

---

## Common Patterns

### 1. Token Transfer via Fungible Token App

```rust
use fungible::{FungibleTokenAbi, Operation as FungibleOp};

impl Contract for MyContract {
    async fn execute_operation(&mut self, operation: Operation) -> Response {
        match operation {
            Operation::PayForService { amount } => {
                let sender = self.runtime.authenticated_signer().unwrap();
                let token_app_id = self.get_token_app_id();
                
                // Transfer tokens from user to this app
                self.runtime
                    .call_application(
                        true,  // Forward user's authentication
                        token_app_id,
                        &FungibleOp::Transfer {
                            to: AccountOwner::Application(self.runtime.application_id()),
                            amount,
                        },
                    )
                    .await;
                
                // Service is now paid for
                self.provide_service(sender).await;
                
                Response::Ok
            }
        }
    }
}
```

### 2. NFT Ownership Check

```rust
use nft::{NftAbi, Operation as NftOp, Response as NftResponse};

impl Contract for MyContract {
    async fn execute_operation(&mut self, operation: Operation) -> Response {
        match operation {
            Operation::UseNft { nft_app_id, token_id } => {
                let caller = self.runtime.authenticated_signer().unwrap();
                
                // Query NFT ownership
                let owner: Option<AccountOwner> = self.runtime
                    .call_application(
                        false,
                        nft_app_id,
                        &NftOp::GetOwner { token_id },
                    )
                    .await;
                
                // Verify caller owns the NFT
                match owner {
                    Some(AccountOwner::User(o)) if o == caller => {
                        self.grant_nft_holder_access(token_id).await;
                        Response::Ok
                    }
                    _ => {
                        panic!("Caller does not own this NFT");
                    }
                }
            }
        }
    }
}
```

### 3. Oracle Data Fetch

```rust
impl Contract for MyContract {
    async fn execute_operation(&mut self, operation: Operation) -> Response {
        match operation {
            Operation::GetPrice { asset } => {
                let oracle_app_id = self.state.oracle_app.get();
                
                // Fetch price from oracle
                let price: u128 = self.runtime
                    .call_application(
                        false,
                        oracle_app_id,
                        &OracleOp::GetPrice { asset },
                    )
                    .await;
                
                // Use the price
                self.state.cached_price.set(price);
                
                Response::Price(price)
            }
        }
    }
}
```

---

## Receiving Calls

Your application can receive calls from other applications:

```rust
impl Contract for MyContract {
    async fn execute_operation(&mut self, operation: Operation) -> Response {
        // Check if this is a cross-app call
        let caller_app = self.runtime.authenticated_caller_id();
        
        match operation {
            Operation::TransferFrom { from, to, amount } => {
                // For sensitive operations, verify the caller
                if let Some(app_id) = caller_app {
                    // Called by another application
                    self.handle_app_transfer(app_id, from, to, amount).await
                } else {
                    // Called directly by a user
                    let user = self.runtime.authenticated_signer()
                        .expect("Must be authenticated");
                    assert!(from == AccountOwner::User(user), "Can only transfer own tokens");
                    self.do_transfer(from, to, amount).await
                }
            }
            
            Operation::GetBalance { account } => {
                // Public query - anyone can call
                let balance = self.get_balance(&account).await;
                Response::Balance(balance)
            }
        }
    }
}
```

---

## Application Permissions

### Allowing Specific Apps

```rust
impl Contract for MyContract {
    async fn execute_operation(&mut self, operation: Operation) -> Response {
        match operation {
            Operation::PrivilegedAction => {
                // Only allow specific approved apps
                let caller = self.runtime.authenticated_caller_id()
                    .expect("Must be called by an application");
                
                let is_approved = self.state.approved_apps
                    .contains(&caller)
                    .await
                    .unwrap();
                
                assert!(is_approved, "Caller not approved");
                
                self.do_privileged_action().await;
                Response::Ok
            }
            
            Operation::ApproveApp { app_id } => {
                // Admin function to approve apps
                self.check_admin();
                self.state.approved_apps.insert(&app_id).await.unwrap();
                Response::Ok
            }
        }
    }
}
```

---

## Composing Multiple Apps

```rust
impl Contract for DefiAggregator {
    async fn execute_operation(&mut self, operation: Operation) -> Response {
        match operation {
            Operation::SwapTokens { 
                from_token, 
                to_token, 
                amount,
                min_received,
            } => {
                let user = self.runtime.authenticated_signer().unwrap();
                
                // 1. Transfer input tokens from user to aggregator
                self.runtime
                    .call_application(
                        true,
                        from_token,
                        &FungibleOp::Transfer {
                            to: AccountOwner::Application(self.runtime.application_id()),
                            amount,
                        },
                    )
                    .await;
                
                // 2. Find best DEX and execute swap
                let dex_app = self.find_best_dex(from_token, to_token, amount).await;
                
                let received: u128 = self.runtime
                    .call_application(
                        false,  // Aggregator is the caller
                        dex_app,
                        &DexOp::Swap {
                            from: from_token,
                            to: to_token,
                            amount,
                        },
                    )
                    .await;
                
                assert!(received >= min_received, "Slippage too high");
                
                // 3. Transfer output tokens to user
                self.runtime
                    .call_application(
                        false,
                        to_token,
                        &FungibleOp::Transfer {
                            to: AccountOwner::User(user),
                            amount: received,
                        },
                    )
                    .await;
                
                Response::Swapped { received }
            }
        }
    }
}
```

---

## Error Handling in Composition

```rust
impl Contract for MyContract {
    async fn execute_operation(&mut self, operation: Operation) -> Response {
        match operation {
            Operation::CompositeAction { token_app, amount } => {
                let user = self.runtime.authenticated_signer().unwrap();
                
                // All operations in execute_operation are atomic
                // If any call panics, the entire transaction is reverted
                
                // Step 1: Take tokens
                self.runtime
                    .call_application(
                        true,
                        token_app,
                        &FungibleOp::Transfer {
                            to: AccountOwner::Application(self.runtime.application_id()),
                            amount,
                        },
                    )
                    .await;
                // If transfer fails (e.g., insufficient balance),
                // panic propagates and entire tx is reverted
                
                // Step 2: Do something
                let result = self.do_something(amount).await;
                
                // Step 3: Return tokens if result indicates failure
                if !result.success {
                    self.runtime
                        .call_application(
                            false,
                            token_app,
                            &FungibleOp::Transfer {
                                to: AccountOwner::User(user),
                                amount,
                            },
                        )
                        .await;
                }
                
                Response::Result(result)
            }
        }
    }
}
```

---

## Registering Application Dependencies

When deploying, specify required applications:

```bash
# Deploy with dependencies
linera project publish-and-create \
  --required-application-ids <token_app_id>,<nft_app_id>
```

Or in code:

```rust
impl Contract for MyContract {
    async fn instantiate(&mut self, args: InstantiationArgs) {
        // Store dependency app IDs
        self.state.token_app.set(args.token_app_id);
        self.state.nft_app.set(args.nft_app_id);
    }
}
```

---

## Best Practices

### 1. Validate Callers

```rust
fn validate_caller(&self) {
    if let Some(app_id) = self.runtime.authenticated_caller_id() {
        assert!(
            self.is_approved_app(&app_id),
            "Unauthorized application"
        );
    }
}
```

### 2. Use Authentication Appropriately

```rust
// Forward auth when user action required
self.runtime.call_application(true, app_id, &op).await;

// Don't forward when acting as the app itself
self.runtime.call_application(false, app_id, &op).await;
```

### 3. Handle Return Values

```rust
// Always handle the response properly
let result: AppResponse = self.runtime
    .call_application(false, app_id, &operation)
    .await;

match result {
    AppResponse::Success(data) => self.handle_success(data),
    AppResponse::Error(e) => panic!("Cross-app call failed: {}", e),
}
```

### 4. Document Dependencies

In your application's README:

```markdown
## Dependencies

This application requires:
- Fungible Token App: For payment processing
- NFT App: For access control
```
