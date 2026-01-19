# Writing the Service Binary

The service binary provides a read-only GraphQL API to query your application's state. It runs in a separate Wasm module from the contract.

## Service Structure

```rust
#![cfg_attr(target_arch = "wasm32", no_main)]

use async_graphql::{EmptySubscription, Object, Request, Response, Schema};
use linera_sdk::{
    base::WithServiceAbi,
    views::{View, ViewStorageContext},
    Service, ServiceRuntime,
};

pub struct MyService {
    state: ApplicationState,
    runtime: ServiceRuntime<Self>,
}

linera_sdk::service!(MyService);
```

---

## The Service Trait

```rust
impl Service for MyService {
    /// Immutable application parameters
    type Parameters = AppParameters;

    /// Create service instance
    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = ApplicationState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        MyService { state, runtime }
    }

    /// Handle GraphQL queries
    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot { service: self },
            MutationRoot,
            EmptySubscription,
        )
        .finish();
        
        schema.execute(request).await
    }
}
```

---

## GraphQL Schema

### Query Root

```rust
struct QueryRoot<'a> {
    service: &'a MyService,
}

#[Object]
impl QueryRoot<'_> {
    /// Get total supply
    async fn total_supply(&self) -> u128 {
        *self.service.state.total_supply.get()
    }
    
    /// Get token name
    async fn name(&self) -> String {
        self.service.state.name.get().clone()
    }
    
    /// Get token symbol
    async fn symbol(&self) -> String {
        self.service.state.symbol.get().clone()
    }
    
    /// Get decimals
    async fn decimals(&self) -> u8 {
        *self.service.state.decimals.get()
    }
    
    /// Get balance of an account
    async fn balance_of(&self, owner: AccountOwner) -> u128 {
        self.service.state.balances
            .get(&owner)
            .await
            .unwrap()
            .unwrap_or(0)
    }
    
    /// Get allowance
    async fn allowance(&self, owner: AccountOwner, spender: AccountOwner) -> u128 {
        self.service.state.allowances
            .get(&(owner, spender))
            .await
            .unwrap()
            .unwrap_or(0)
    }
    
    /// List all accounts with balances
    async fn accounts(&self) -> Vec<AccountBalance> {
        let owners = self.service.state.balances.indices().await.unwrap();
        let mut result = Vec::new();
        
        for owner in owners {
            let balance = self.service.state.balances
                .get(&owner)
                .await
                .unwrap()
                .unwrap_or(0);
            result.push(AccountBalance { owner, balance });
        }
        
        result
    }
}

#[derive(async_graphql::SimpleObject)]
struct AccountBalance {
    owner: AccountOwner,
    balance: u128,
}
```

### Mutation Root

Even though services are read-only, GraphQL requires a mutation root. Use placeholder:

```rust
struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Placeholder - actual mutations happen via contract operations
    async fn _placeholder(&self) -> bool {
        false
    }
}
```

### Custom Scalar Types

For Linera types, implement GraphQL scalars:

```rust
use async_graphql::{InputObject, Scalar, ScalarType, Value};
use linera_sdk::base::{AccountOwner, ChainId, Owner};

// AccountOwner is already implemented in linera-sdk
// But for custom types:

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomId(pub [u8; 32]);

#[Scalar]
impl ScalarType for CustomId {
    fn parse(value: Value) -> async_graphql::InputValueResult<Self> {
        if let Value::String(s) = &value {
            let bytes = hex::decode(s)
                .map_err(|_| async_graphql::InputValueError::custom("Invalid hex"))?;
            let arr: [u8; 32] = bytes.try_into()
                .map_err(|_| async_graphql::InputValueError::custom("Invalid length"))?;
            Ok(CustomId(arr))
        } else {
            Err(async_graphql::InputValueError::expected_type(value))
        }
    }

    fn to_value(&self) -> Value {
        Value::String(hex::encode(self.0))
    }
}
```

---

## Complete Service Example

```rust
#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use self::state::ApplicationState;
use async_graphql::{
    EmptySubscription, InputObject, Object, Request, Response, Schema, SimpleObject,
};
use linera_sdk::{
    base::{AccountOwner, WithServiceAbi},
    views::{View, ViewStorageContext},
    Service, ServiceRuntime,
};

pub struct TokenService {
    state: ApplicationState,
    runtime: ServiceRuntime<Self>,
}

linera_sdk::service!(TokenService);

impl WithServiceAbi for TokenService {
    type Abi = fungible_token::FungibleTokenAbi;
}

impl Service for TokenService {
    type Parameters = fungible_token::TokenParameters;

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = ApplicationState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        TokenService { state, runtime }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot { service: self },
            MutationRoot,
            EmptySubscription,
        )
        .data(self.runtime.clone())
        .finish();
        
        schema.execute(request).await
    }
}

// === GraphQL Types ===

#[derive(SimpleObject)]
struct TokenInfo {
    name: String,
    symbol: String,
    decimals: u8,
    total_supply: u128,
}

#[derive(SimpleObject)]
struct AccountInfo {
    owner: String,
    balance: u128,
}

#[derive(InputObject)]
struct TransferInput {
    to: String,
    amount: u128,
}

// === Query Root ===

struct QueryRoot<'a> {
    service: &'a TokenService,
}

#[Object]
impl QueryRoot<'_> {
    /// Get token information
    async fn token_info(&self) -> TokenInfo {
        TokenInfo {
            name: self.service.state.name.get().clone(),
            symbol: self.service.state.symbol.get().clone(),
            decimals: *self.service.state.decimals.get(),
            total_supply: *self.service.state.total_supply.get(),
        }
    }
    
    /// Get balance of specific account
    async fn balance(&self, owner: AccountOwner) -> u128 {
        self.service.state.balances
            .get(&owner)
            .await
            .unwrap()
            .unwrap_or(0)
    }
    
    /// Get all account balances
    async fn all_balances(&self) -> Vec<AccountInfo> {
        let owners = self.service.state.balances.indices().await.unwrap();
        let mut accounts = Vec::new();
        
        for owner in owners {
            let balance = self.service.state.balances
                .get(&owner)
                .await
                .unwrap()
                .unwrap_or(0);
            
            if balance > 0 {
                accounts.push(AccountInfo {
                    owner: format!("{:?}", owner),
                    balance,
                });
            }
        }
        
        accounts
    }
    
    /// Get allowance for spender
    async fn allowance(&self, owner: AccountOwner, spender: AccountOwner) -> u128 {
        self.service.state.allowances
            .get(&(owner, spender))
            .await
            .unwrap()
            .unwrap_or(0)
    }
    
    /// Get application parameters
    async fn parameters(&self) -> Option<u128> {
        self.service.runtime.application_parameters().max_supply
    }
    
    /// Get chain ID
    async fn chain_id(&self) -> String {
        format!("{:?}", self.service.runtime.chain_id())
    }
    
    /// Get application ID
    async fn application_id(&self) -> String {
        format!("{:?}", self.service.runtime.application_id())
    }
}

// === Mutation Root (placeholder) ===

struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Request operation serialization (helper for frontend)
    async fn serialize_transfer(&self, to: AccountOwner, amount: u128) -> String {
        let operation = fungible_token::Operation::Transfer { to, amount };
        serde_json::to_string(&operation).unwrap()
    }
    
    /// Request operation serialization for approve
    async fn serialize_approve(&self, spender: AccountOwner, amount: u128) -> String {
        let operation = fungible_token::Operation::Approve { spender, amount };
        serde_json::to_string(&operation).unwrap()
    }
}
```

---

## GraphQL Queries Examples

### Simple Queries

```graphql
# Get token info
query {
  tokenInfo {
    name
    symbol
    decimals
    totalSupply
  }
}

# Get specific balance
query {
  balance(owner: "User:e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65")
}

# Get all balances
query {
  allBalances {
    owner
    balance
  }
}
```

### With Variables

```graphql
query GetBalance($owner: AccountOwner!) {
  balance(owner: $owner)
}

# Variables:
{
  "owner": "User:e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65"
}
```

---

## Pagination and Filtering

For large datasets, implement pagination:

```rust
#[Object]
impl QueryRoot<'_> {
    /// Get accounts with pagination
    async fn accounts_paginated(
        &self,
        skip: Option<usize>,
        take: Option<usize>,
    ) -> Vec<AccountInfo> {
        let skip = skip.unwrap_or(0);
        let take = take.unwrap_or(100);
        
        let owners = self.service.state.balances.indices().await.unwrap();
        
        owners
            .into_iter()
            .skip(skip)
            .take(take)
            .map(|owner| async move {
                let balance = self.service.state.balances
                    .get(&owner)
                    .await
                    .unwrap()
                    .unwrap_or(0);
                AccountInfo {
                    owner: format!("{:?}", owner),
                    balance,
                }
            })
            .collect::<Vec<_>>()
            // Note: In practice, you'd use futures to resolve these concurrently
    }
    
    /// Filter accounts by minimum balance
    async fn rich_accounts(&self, min_balance: u128) -> Vec<AccountInfo> {
        let owners = self.service.state.balances.indices().await.unwrap();
        let mut result = Vec::new();
        
        for owner in owners {
            let balance = self.service.state.balances
                .get(&owner)
                .await
                .unwrap()
                .unwrap_or(0);
            
            if balance >= min_balance {
                result.push(AccountInfo {
                    owner: format!("{:?}", owner),
                    balance,
                });
            }
        }
        
        result
    }
}
```

---

## Accessing Runtime Context

```rust
#[Object]
impl QueryRoot<'_> {
    /// Get current chain context
    async fn context(&self) -> ChainContext {
        ChainContext {
            chain_id: format!("{:?}", self.service.runtime.chain_id()),
            application_id: format!("{:?}", self.service.runtime.application_id()),
        }
    }
}

#[derive(SimpleObject)]
struct ChainContext {
    chain_id: String,
    application_id: String,
}
```
