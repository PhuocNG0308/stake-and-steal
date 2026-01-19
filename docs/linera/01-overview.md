# Linera Protocol Overview

## Introduction

Linera is a decentralized protocol optimized for real-time, agentic Web3 applications that require guaranteed performance for an unlimited number of active users.

The core idea of the Linera protocol is to run many chains of blocks, called **microchains**, in parallel in one set of validators.

## How do microchains work?

Linera users propose blocks directly to the chains that they own. Chains may also be shared with other users. Linera validators ensure that all blocks are validated and finalized in the same way across all the chains.

### Types of chains:

- **Personal chains (user chains)**: Those with a single owner, i.e. a single user proposing blocks
- **Temporary chains**: Shared between a few users
- **Public chains**: Usually dedicated to a particular task in the Linera infrastructure, fully managed by Linera validators
- **App chains**: Chains dedicated to a particular application, may use either their own infrastructure for block production, a permissionless solution using proof-of-work, or a rotating set of trusted providers

> In order to validate all the chains reliably and at minimal cost, Linera validators are designed to be **elastic**, meaning that they can independently add or remove computational power (e.g. cloud workers) on demand whenever needed.

## What makes Linera real-time and agent-friendly?

### Connected clients

To propose blocks and provide APIs to frontends, Linera users rely on a **Linera client**. Clients synchronize on-chain data in real-time, without trusting third parties, thanks to local VMs and Linera's native support for notifications.

User interfaces interact with Linera applications by querying and sending high-level commands to local GraphQL services running securely inside the Linera client.

Similarly, discussions between AI agents and Linera applications stay local, hence private and free of charge. This also protects agents against compromised external RPC services.

> Linera is the first Layer-1 to allow trustless real-time synchronization of user data on their devices.

### Geographic sharding

In the future, Linera validators will be incentivized to operate machines and maintain a presence in a number of key regions. Most microchains will be pinned explicitly to a specific region, giving users of this region the lowest latency possible in their on-chain interactions.

## How do Linera microchains compare to traditional multi-chain protocols?

Linera is the first blockchain designed to run a virtually unlimited number of chains in parallel, including one dedicated user chain per user wallet.

**Key differences from traditional multi-chain protocols:**

- Users only create blocks in their chain when needed
- Creating a microchain does not require onboarding validators
- All chains have the same level of security
- Microchains communicate efficiently using the internal networks of validators
- Validators are internally sharded (like a regular web service) and may adjust their capacity elastically
- Users may run heavy transactions in their microchain without affecting other users

## Main protocol features

### Infrastructure

- Finality time under 0.5 seconds for most blocks, including a certificate of execution
- New microchains created in one transaction from an existing chain
- No theoretical limit in the number of microchains, hence the number of transactions per second (TPS)
- Bridge-friendly block headers compatible with EVM signatures

### On-chain applications

- Rich programming model allowing applications to distribute computation across chains using asynchronous messages, shared immutable data, and event streams
- Full synchronous composability inside each microchain
- Support for heavy (multi-second) transactions and direct oracle queries to external web services and data storage layers

### Web client and wallet infrastructure

- Real-time push-notifications from validators to web clients
- Block synchronization and VM execution for selected microchains, allowing instant pre-confirmation of user transactions
- Trustless reactive programming using familiar Web2 frameworks
- On-chain applications programmed in Rust to run on Wasm, or Solidity on EVM (experimental)

## Resources

- [Whitepaper](https://linera.io/whitepaper)
- [GitHub Repository](https://github.com/linera-io/linera-protocol)
- [Developer Documentation](https://linera.dev/)
- [Discord](https://discord.gg/linera)
