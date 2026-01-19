# Linera Applications

## Overview

The programming model of Linera is designed so that developers can take advantage of microchains to scale their applications.

Linera uses the **WebAssembly (Wasm)** Virtual Machine to execute user applications.

### Supported Languages

| Component | Language |
|-----------|----------|
| Backend (contract & service) | Rust |
| Frontend | TypeScript |

Linera applications are structured using Rust crates:
- External interfaces (parameters, operations, messages) go into the library part
- Core application code is compiled into binary files for the Wasm architecture

## The Application Deployment Lifecycle

1. **Build bytecode** from a Rust project with the `linera-sdk` dependency
2. **Publish bytecode** to the network on a microchain, receiving an identifier
3. **Create application instance** by providing the bytecode identifier and instantiation arguments
4. **Reuse bytecode** - the same bytecode identifier can be used by as many users as needed

### Deploy with a single command

```bash
linera publish-and-create <contract-path> <service-path> <init-args>
```

## Anatomy of an Application

An application is broken into two major components:

### Contract
- **Gas-metered**
- Executes operations and messages
- Makes cross-application calls
- Modifies application state

### Service
- **Non-metered** and **read-only**
- Used to query application state
- Populates the presentation layer (frontend)

## Operations and Messages

### Operations

Operations are defined by an application developer. Chain owners create operations and put them in block proposals.

Example operation for a fungible token:

```rust
#[derive(Debug, Deserialize, Serialize)]
pub enum Operation {
    /// A transfer from a (locally owned) account to a (possibly remote) account.
    Transfer {
        owner: AccountOwner,
        amount: Amount,
        target_account: Account,
    },
    // Meant to be extended here
}
```

### Messages

Messages result from the execution of operations or other messages. They can be sent from one chain to another, always within the same application.

Example message:

```rust
#[derive(Debug, Deserialize, Serialize)]
pub enum Message {
    Credit { owner: AccountOwner, amount: Amount },
    // Meant to be extended here
}
```

> Messages can be marked as **tracked**. When a tracked message is rejected, it's marked as bouncing and sent back to the sender chain.

## Composing Applications

Within a chain, Linera applications call each other **synchronously**. The atomicity of message bundles ensures that messages created by a transaction are either all received or all rejected.

### Cross-application call flow example

```
Crowdfunding app chain          User chain

Execution state                 Execution state
    │                               │
    │ calls (with signer) (1)       │
    │◄──────────────────────────────┤
    │                               │
    │ calls (with signer) (2)       │
    │                               │
    │ send pledge (4)               │
    │───────────────────────────────►
    │                               │
    │ receive pledge (6)            │
    │◄──────────────────────────────┤
```

## Authentication

Operations in a block are always authenticated. The signer of a block becomes the authenticator of all operations in that block.

### Authentication propagation

The block signer can have its authority propagated across chains through series of messages. This allows:
- Applications to store user state on chains the user may not control
- Only the authorized user to change that state (not even the chain owner can override)

### Example: Fungible Token Claim

The `Claim` operation allows retrieving money from a chain the user does not control:

```
Chain A owned by (a)  ─► Operation 1 (a) ─► Message to chain B (a)
                                                    │
                                                    ▼
Chain B owned by (b)          ◄────── Message from chain A (a)
                                      Message from chain C (d)
                                      Operation 3 (b)
```

## Application Examples

- [Counter](https://github.com/linera-io/linera-protocol/tree/main/examples/counter) - Simple counter application
- [Fungible](https://github.com/linera-io/linera-protocol/tree/main/examples/fungible) - Token transfers
- [Crowd-funding](https://github.com/linera-io/linera-protocol/tree/main/examples/crowd-funding) - Crowdfunding campaigns
- [Hex-game](https://github.com/linera-io/linera-protocol/tree/main/examples/hex-game) - Turn-based game
- [Non-fungible](https://github.com/linera-io/linera-protocol/tree/main/examples/non-fungible) - NFT application
