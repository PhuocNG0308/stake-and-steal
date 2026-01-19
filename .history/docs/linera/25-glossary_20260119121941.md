# Linera Glossary

Key terms and concepts in the Linera ecosystem.

---

## A

### Application
A smart contract deployed on Linera, consisting of a contract binary (handles mutations) and a service binary (handles queries). Applications are identified by a unique `ApplicationId`.

### Application Binary Interface (ABI)
Defines the interface for Linera applications, including operation types, message types, and query interfaces. Implemented via `ContractAbi` and `ServiceAbi` traits.

### Application ID
Unique identifier for a deployed application instance, derived from the bytecode ID and instantiation parameters.

---

## B

### Block
A unit of state change on a microchain containing operations, messages, and their execution results.

### Block Height
Sequential number identifying a block's position in a chain's history.

### Bytecode ID
Identifier for published application bytecode (contract.wasm + service.wasm) before instantiation.

### Bouncing
When a cross-chain message is rejected by the target chain and returned to the sender.

---

## C

### Chain ID
Unique identifier for a microchain.

### Chain Owner
The entity that controls a microchain and can propose new blocks.

### CollectionView
A View type for storing multiple sub-views indexed by key, enabling nested data structures.

### Composability
The ability for applications to call and interact with other applications on the same chain.

### Contract
The mutable part of an application that handles operations and messages, compiled to WebAssembly.

### Cross-Chain Message
A message sent from one microchain to another, enabling inter-chain communication.

---

## D

### Devnet
A local development network for testing Linera applications.

### Dynamic Multi-Owner Chain
A chain type where ownership can be transferred or shared between multiple parties.

---

## E

### Execute Operation
Process a user-submitted operation that modifies application state.

### Execute Message
Process an incoming cross-chain message.

---

## F

### Faucet
A service that provides test tokens for development and testnet use.

---

## G

### Genesis
The initial configuration of a Linera network, including initial validators and chains.

### GraphQL
Query language used by Linera services to expose application state to frontends.

---

## I

### Instantiate
Initialize an application instance with initial arguments and parameters.

### InstantiationArgument
Arguments passed when creating a new application instance.

---

## L

### LogView
A View type for append-only sequences of data.

---

## M

### MapView
A View type for key-value mappings.

### Message
Data sent between microchains, processed by `execute_message` in contracts.

### Microchain
An individual blockchain in Linera, owned and operated by specific users or applications. Microchains can communicate via cross-chain messages.

### Multi-Owner Chain
A chain controlled by multiple owners who can independently propose blocks.

---

## N

### Node Service
The GraphQL API server that exposes Linera functionality to applications and users.

---

## O

### Operation
A user action submitted to an application, processed by `execute_operation` in contracts.

### Owner
An entity (user or application) that can control chains and hold assets. Identified by `AccountOwner` type.

---

## P

### Parameters
Immutable configuration values set when deploying an application.

### Permissioned Chain
A chain where only specific parties can propose blocks or submit operations.

### Public Chain
A chain where anyone can submit operations (but block production may still be restricted).

---

## Q

### QueueView
A View type for FIFO (first-in-first-out) data structures.

---

## R

### RegisterView
A View type for storing single values.

### Response
The return value from `execute_operation`, sent back to the operation submitter.

### RootView
The top-level View that contains all application state.

### Runtime
The execution environment provided to contracts and services, offering access to chain context, messaging, and cross-app calls.

---

## S

### Service
The read-only part of an application that handles GraphQL queries, compiled to WebAssembly.

### SetView
A View type for storing unique values in a set.

### Shard
A partition of validator state for horizontal scaling.

### Single-Owner Chain
A chain controlled by a single owner who is the only one able to propose blocks.

---

## T

### Testnet
A public test network for deploying and testing applications before mainnet.

### Testnet Conway
The current active Linera testnet.

---

## U

### User Chain
A microchain owned by a user for personal transactions and application interactions.

---

## V

### Validator
A node that validates and executes blocks across all microchains it's responsible for.

### View
Linera's abstraction for persistent state storage. Different View types (RegisterView, MapView, etc.) provide different data structures.

### ViewStorageContext
The context used by Views to interact with underlying storage.

---

## W

### Wallet
Software that manages user keys, chains, and interacts with the Linera network.

### WebAssembly (Wasm)
The compilation target for Linera applications. Both contract and service binaries are compiled to `wasm32-unknown-unknown`.

---

## Type Reference

### Common Types

```rust
// Chain and Block
type ChainId = CryptoHash;
type BlockHeight = u64;

// Ownership
type Owner = CryptoHash;
enum AccountOwner {
    User(Owner),
    Application(ApplicationId),
}

// Application
struct ApplicationId {
    bytecode_id: BytecodeId,
    creation: MessageId,
}

// Time
struct Timestamp(u64); // Microseconds since Unix epoch
```

### View Types

```rust
RegisterView<T>         // Single value storage
MapView<K, V>           // Key-value mapping
SetView<T>              // Unique value set
LogView<T>              // Append-only log
QueueView<T>            // FIFO queue
CollectionView<K, V>    // Nested view collection
```

### ABI Types

```rust
trait ContractAbi {
    type InstantiationArgument;
    type Parameters;
    type Operation;
    type Message;
    type Response;
}

trait ServiceAbi {
    type Parameters;
    type Query;
    type QueryResponse;
}
```

---

## Version Information

- **SDK Version**: linera-sdk 0.15.8
- **Testnet**: Conway
- **Rust Toolchain**: 1.86.0
- **Wasm Target**: wasm32-unknown-unknown
