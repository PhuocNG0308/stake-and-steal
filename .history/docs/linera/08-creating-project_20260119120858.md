# Creating a Linera Project

## Using `linera project new`

The `linera` CLI tool provides a command to initialize a new Linera project structure:

```bash
linera project new my_project
```

This creates a directory with the following structure:

```
my_project/
├── Cargo.toml
├── src/
│   ├── lib.rs          # Application state definitions
│   ├── contract.rs     # Contract binary logic
│   └── service.rs      # Service binary logic (GraphQL)
```

## Generated Files

### Cargo.toml

```toml
[package]
name = "my_project"
version = "0.1.0"
edition = "2021"

[dependencies]
async-graphql = { version = "7.0.11", default-features = false }
linera-sdk = "0.15.8"
serde = { version = "1.0.130", features = ["derive"] }

[dev-dependencies]
linera-sdk = { version = "0.15.8", features = ["test"] }

[[bin]]
name = "my_project_contract"
path = "src/contract.rs"

[[bin]]
name = "my_project_service"
path = "src/service.rs"
```

### src/lib.rs

Contains shared types and state definitions:

```rust
use linera_sdk::views::{linera_views, RootView, View, RegisterView};
use serde::{Deserialize, Serialize};

/// The application state.
#[derive(RootView, async_graphql::SimpleObject)]
#[view(context = "ViewStorageContext")]
pub struct ApplicationState {
    pub value: RegisterView<u64>,
}

/// Operations that can be executed on the application.
#[derive(Debug, Deserialize, Serialize)]
pub enum Operation {
    // Define operations here
}

/// Messages that can be sent between chains.
#[derive(Debug, Deserialize, Serialize)]
pub enum Message {
    // Define messages here
}
```

### src/contract.rs

The contract handles operations and messages:

```rust
#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use self::state::ApplicationState;
use linera_sdk::{
    base::WithContractAbi,
    views::{RootView, View, ViewStorageContext},
    Contract, ContractRuntime,
};

pub struct MyProjectContract {
    state: ApplicationState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(MyProjectContract);

impl WithContractAbi for MyProjectContract {
    type Abi = my_project::MyProjectAbi;
}

impl Contract for MyProjectContract {
    type Message = my_project::Message;
    type InstantiationArgument = ();
    type Parameters = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = ApplicationState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        MyProjectContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: Self::InstantiationArgument) {
        // Initialize state if needed
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        // Handle operations
    }

    async fn execute_message(&mut self, message: Self::Message) {
        // Handle messages from other chains
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}
```

### src/service.rs

The service exposes a GraphQL API:

```rust
#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use self::state::ApplicationState;
use async_graphql::{EmptySubscription, Object, Schema};
use linera_sdk::{
    base::WithServiceAbi,
    views::View,
    Service, ServiceRuntime,
};

pub struct MyProjectService {
    state: ApplicationState,
}

linera_sdk::service!(MyProjectService);

impl WithServiceAbi for MyProjectService {
    type Abi = my_project::MyProjectAbi;
}

impl Service for MyProjectService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = ApplicationState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        MyProjectService { state }
    }

    async fn handle_query(&self, query: Self::Query) -> Self::QueryResponse {
        let schema = Schema::build(
            QueryRoot { state: &self.state },
            MutationRoot,
            EmptySubscription,
        )
        .finish();
        schema.execute(query).await
    }
}

struct QueryRoot<'a> {
    state: &'a ApplicationState,
}

#[Object]
impl QueryRoot<'_> {
    async fn value(&self) -> u64 {
        *self.state.value.get()
    }
}

struct MutationRoot;

#[Object]
impl MutationRoot {
    async fn placeholder(&self) -> bool {
        true
    }
}
```

---

## Building the Application

### Compile to WebAssembly

```bash
cd my_project
cargo build --release --target wasm32-unknown-unknown
```

### Using linera project

You can also publish directly using:

```bash
linera project publish-and-create
```

This command:
1. Compiles the contract and service to Wasm
2. Publishes the bytecode to the chain
3. Creates an application instance

---

## Project Configuration

### Rust Toolchain

Make sure you have the required Rust toolchain:

```bash
rustup default 1.86.0
rustup target add wasm32-unknown-unknown
```

### Dependencies

Key dependencies to include:

```toml
[dependencies]
# Core SDK
linera-sdk = "0.15.8"

# Serialization
serde = { version = "1.0", features = ["derive"] }

# GraphQL (for service)
async-graphql = { version = "7.0.11", default-features = false }

[dev-dependencies]
# Testing utilities
linera-sdk = { version = "0.15.8", features = ["test"] }
tokio = { version = "1.38", features = ["rt", "sync"] }
```
