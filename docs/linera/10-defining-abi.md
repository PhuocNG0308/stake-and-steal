# Defining the ABI (Application Binary Interface)

The ABI defines the interface between your Linera application and the outside world. It specifies the types for operations, messages, and queries.

## Overview

Every Linera application consists of:
1. **Contract binary** - Handles state mutations (operations & messages)
2. **Service binary** - Handles read-only queries (GraphQL)

The ABI connects these binaries with the SDK.

---

## Core ABI Traits

### ContractAbi

Defines the contract's interface:

```rust
use linera_sdk::base::{ContractAbi, ServiceAbi};
use serde::{Deserialize, Serialize};

pub struct MyAppAbi;

impl ContractAbi for MyAppAbi {
    /// Arguments for instantiating the application
    type InstantiationArgument = InitialConfig;
    
    /// Application parameters (set at deployment, immutable)
    type Parameters = AppParameters;
    
    /// Operations that users can submit
    type Operation = Operation;
    
    /// Messages for cross-chain communication
    type Message = Message;
    
    /// Response returned after operation execution
    type Response = OperationResponse;
}
```

### ServiceAbi

Defines the service's query interface:

```rust
impl ServiceAbi for MyAppAbi {
    /// Application parameters (same as contract)
    type Parameters = AppParameters;
    
    /// GraphQL query input
    type Query = async_graphql::Request;
    
    /// GraphQL query output
    type QueryResponse = async_graphql::Response;
}
```

---

## Type Definitions

### InstantiationArgument

Arguments passed when creating an application instance:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitialConfig {
    pub name: String,
    pub initial_supply: u128,
    pub admin: AccountOwner,
}
```

### Parameters

Immutable parameters set at deployment:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppParameters {
    pub max_supply: u128,
    pub decimals: u8,
    pub symbol: String,
}
```

### Operation

User-submitted operations (mutations):

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Operation {
    /// Transfer tokens to another account
    Transfer {
        recipient: AccountOwner,
        amount: u128,
    },
    
    /// Approve spender to transfer tokens
    Approve {
        spender: AccountOwner,
        amount: u128,
    },
    
    /// Mint new tokens (admin only)
    Mint {
        recipient: AccountOwner,
        amount: u128,
    },
    
    /// Cross-chain transfer
    CrossChainTransfer {
        target_chain: ChainId,
        recipient: AccountOwner,
        amount: u128,
    },
}
```

### Message

Cross-chain messages:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message {
    /// Credit tokens on target chain
    Credit {
        recipient: AccountOwner,
        amount: u128,
    },
    
    /// Notify about completed operation
    Notification {
        operation_id: u64,
        status: OperationStatus,
    },
}
```

### Response

Operation execution response:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OperationResponse {
    Success,
    TransferComplete { tx_id: u64 },
    Error { message: String },
}
```

---

## Complete ABI Example

```rust
// src/lib.rs
use linera_sdk::base::{ContractAbi, ServiceAbi, AccountOwner, ChainId};
use serde::{Deserialize, Serialize};

/// The application ABI marker type
pub struct FungibleTokenAbi;

/// Instantiation argument
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenConfig {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub initial_supply: u128,
}

/// Application parameters (immutable after deployment)
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TokenParameters {
    pub max_supply: Option<u128>,
}

/// Operations that can be executed
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Operation {
    Transfer { to: AccountOwner, amount: u128 },
    Approve { spender: AccountOwner, amount: u128 },
    TransferFrom { from: AccountOwner, to: AccountOwner, amount: u128 },
    Mint { to: AccountOwner, amount: u128 },
    Burn { amount: u128 },
    CrossChainTransfer { chain: ChainId, to: AccountOwner, amount: u128 },
}

/// Cross-chain messages
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message {
    Credit { to: AccountOwner, amount: u128 },
    Debit { from: AccountOwner, amount: u128 },
}

/// Operation response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Response {
    Ok,
    Balance(u128),
}

// Implement ABI traits
impl ContractAbi for FungibleTokenAbi {
    type InstantiationArgument = TokenConfig;
    type Parameters = TokenParameters;
    type Operation = Operation;
    type Message = Message;
    type Response = Response;
}

impl ServiceAbi for FungibleTokenAbi {
    type Parameters = TokenParameters;
    type Query = async_graphql::Request;
    type QueryResponse = async_graphql::Response;
}
```

---

## Using ABI in Contract

```rust
// src/contract.rs
use linera_sdk::base::WithContractAbi;

pub struct FungibleTokenContract {
    state: ApplicationState,
    runtime: ContractRuntime<Self>,
}

impl WithContractAbi for FungibleTokenContract {
    type Abi = crate::FungibleTokenAbi;
}

impl Contract for FungibleTokenContract {
    type Message = <Self::Abi as ContractAbi>::Message;
    type InstantiationArgument = <Self::Abi as ContractAbi>::InstantiationArgument;
    type Parameters = <Self::Abi as ContractAbi>::Parameters;

    // ... implementation
}
```

---

## Using ABI in Service

```rust
// src/service.rs
use linera_sdk::base::WithServiceAbi;

pub struct FungibleTokenService {
    state: ApplicationState,
}

impl WithServiceAbi for FungibleTokenService {
    type Abi = crate::FungibleTokenAbi;
}

impl Service for FungibleTokenService {
    type Parameters = <Self::Abi as ServiceAbi>::Parameters;

    // ... implementation
}
```

---

## ABI Versioning Considerations

When evolving your application:

### Adding new operations (backward compatible):

```rust
pub enum Operation {
    // Existing
    Transfer { to: AccountOwner, amount: u128 },
    
    // New (add at end)
    BatchTransfer { transfers: Vec<(AccountOwner, u128)> },
}
```

### Adding new messages (backward compatible):

```rust
pub enum Message {
    // Existing
    Credit { to: AccountOwner, amount: u128 },
    
    // New
    CreditBatch { credits: Vec<(AccountOwner, u128)> },
}
```

### Breaking changes require new application deployment

If you need to change existing variant structures, deploy a new application version.

---

## Best Practices

1. **Keep types simple** - Use primitive types and simple structs
2. **Derive necessary traits** - `Debug, Clone, Serialize, Deserialize`
3. **Document variants** - Add doc comments for each operation/message
4. **Use enums for variants** - Makes pattern matching explicit
5. **Consider versioning** - Plan for future additions
6. **Validate in contract** - ABI doesn't enforce business rules
