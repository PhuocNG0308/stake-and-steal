# Linera Documentation Index

Comprehensive documentation for building dApps on Linera blockchain.

## Overview

- [01 - Overview](01-overview.md) - Introduction to Linera protocol and microchains
- [02 - Installation](02-installation.md) - Setting up development environment
- [03 - Hello Linera](03-hello-linera.md) - Quick start guide

## Core Concepts

- [04 - Microchains](04-microchains.md) - Understanding Linera's microchain architecture
- [05 - Applications](05-applications.md) - Application structure and lifecycle
- [06 - Wallets and Node Service](06-wallets-and-node-service.md) - Wallet management and GraphQL API
- [07 - Design Patterns](07-design-patterns.md) - Common architecture patterns

## Smart Contract Development

- [08 - Creating a Project](08-creating-project.md) - Setting up a new Linera project
- [09 - Application State](09-application-state.md) - Views and state management
- [10 - Defining the ABI](10-defining-abi.md) - Application Binary Interface
- [11 - Writing the Contract](11-writing-contract.md) - Contract binary implementation
- [12 - Writing the Service](12-writing-service.md) - Service binary and GraphQL
- [13 - Deploying Applications](13-deploying-applications.md) - Building and deploying
- [14 - Cross-Chain Messages](14-cross-chain-messages.md) - Inter-chain communication
- [15 - Calling Other Apps](15-calling-other-apps.md) - Application composability
- [16 - Testing](16-testing.md) - Unit and integration testing

## Frontend Development

- [17 - Frontend Overview](17-frontend-overview.md) - Frontend architecture overview
- [18 - Frontend Setup](18-frontend-setup.md) - Project setup and configuration
- [19 - Interacting with Linera](19-frontend-interacting.md) - Queries and operations
- [20 - Wallet Integration](20-frontend-wallets.md) - Connecting user wallets

## Deployment and Operations

- [21 - Running Devnet](21-running-devnet.md) - Local development network
- [22 - Connecting to Testnet](22-connecting-testnet.md) - Testnet deployment

## Advanced Topics

- [23 - EVM Contracts](23-evm-contracts.md) - Running Solidity on Linera (experimental)

## Reference

- [24 - CLI Reference](24-cli-reference.md) - Command-line interface
- [25 - Glossary](25-glossary.md) - Terms and definitions

---

## Quick Links

### Getting Started

```bash
# Install
cargo install linera-service linera-storage-service

# Initialize wallet on testnet
linera wallet init --with-new-chain --faucet https://faucet.testnet-conway.linera.net

# Create new project
linera project new my_app
```

### Key Resources

- **GitHub**: https://github.com/linera-io/linera-protocol
- **Documentation**: https://linera.dev
- **Testnet Faucet**: https://faucet.testnet-conway.linera.net
- **Examples**: https://github.com/linera-io/linera-protocol/tree/main/examples

### Version Info

- **SDK Version**: 0.15.8
- **Testnet**: Conway
- **Rust**: 1.86.0
- **Wasm Target**: wasm32-unknown-unknown

---

## Document Structure

This documentation is organized for building a complete Linera dApp:

1. **Understanding** (01-07): Learn core concepts
2. **Building Backend** (08-16): Create smart contracts
3. **Building Frontend** (17-20): Create user interfaces
4. **Deploying** (21-22): Run locally and on testnet
5. **Advanced** (23): Experimental features
6. **Reference** (24-25): Quick lookups

Each document is self-contained with code examples and can be used as a reference during development.
