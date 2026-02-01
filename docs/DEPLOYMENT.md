# Stake and Steal - Linera Deployment Guide

## Prerequisites

1. **Rust 1.86.0** - MUST use this version (Rust 1.87+ produces incompatible WASM)
2. **LLVM** - for building Linera CLI (libclang.dll)
3. **Linera CLI** - v0.15.10
4. **wasm32-unknown-unknown** target for Rust

> ⚠️ **IMPORTANT**: Linera network does NOT support WASM built with Rust 1.87 or later.
> See [GitHub Issue #4742](https://github.com/linera-io/linera-protocol/issues/4742).

## Current Testnet: Conway

### Latest Deployment
- **App ID**: `d9bb9c6addc854108bcf5aa1b9439f92f11e09fb6fb3e902a5abbee1345c390b`
- **Chain ID**: `af4551f49b4984389cc26c716635e77ae436cf877e386b34d57833372dd17a41`
- **Module ID**: `e371a5bd6b040261d409303ec7a06f9240e479407ee931897bc69cdea595de07ae51c96ae2dd73310dc14458c13942ec7e95458302e00579e1bc2f48fec0c0e100`

- **Faucet URL**: https://faucet.testnet-conway.linera.net
- **RPC URL**: https://rpc.testnet-conway.linera.net
- **Explorer**: https://explorer.testnet-conway.linera.net

## Installation Steps

### 1. Install LLVM (if not already installed)

Download and install LLVM from: https://github.com/llvm/llvm-project/releases

Or use the PowerShell command:
```powershell
$llvmUrl = "https://github.com/llvm/llvm-project/releases/download/llvmorg-18.1.8/LLVM-18.1.8-win64.exe"
Invoke-WebRequest -Uri $llvmUrl -OutFile "$env:TEMP\llvm.exe"
Start-Process "$env:TEMP\llvm.exe" -ArgumentList "/S" -Wait
```

### 2. Install Linera CLI

```powershell
$env:LIBCLANG_PATH = "C:\Program Files\LLVM\bin"
cargo install linera-service@0.15.10 --locked
```

### 3. Install Rust 1.86.0

```powershell
# Install Rust 1.86.0 toolchain
rustup install 1.86.0

# Add wasm target
rustup target add wasm32-unknown-unknown --toolchain 1.86.0

# Verify
rustup run 1.86.0 rustc --version
```

### 4. Initialize Wallet

```powershell
# Connect to Testnet Conway and get tokens from faucet
linera wallet init --faucet https://faucet.testnet-conway.linera.net --with-new-chain

# View your chain info
linera wallet show

# Request more tokens if needed
linera wallet request-tokens --faucet https://faucet.testnet-conway.linera.net
```

### 5. Build Smart Contract

> ⚠️ **CRITICAL**: MUST use Rust 1.86.0 for building!

```powershell
cd smart_contract

# Copy Cargo.lock from linera-protocol if needed (ensures correct async-graphql-value version)
# See Build Requirements section below

# Build with Rust 1.86.0
cargo +1.86.0 build --release --target wasm32-unknown-unknown
```

### 6. Deploy to Testnet

```powershell
# Publish module (new name in Linera 0.15.x)
linera publish-module `
    target/wasm32-unknown-unknown/release/stake_and_steal_contract.wasm `
    target/wasm32-unknown-unknown/release/stake_and_steal_service.wasm

# Create application (InstantiationArgument is u128 initial balance)
linera create-application <MODULE_ID> --json-argument 0
```

### 6. Configure Frontend

After deployment, update the frontend environment:
```powershell
# frontend/.env.local
VITE_NETWORK=testnet
VITE_APP_ID=<YOUR_APP_ID>
```

### 7. Start Local Service

```powershell
linera service --port 8080
```

Then open GraphiQL:
```
http://localhost:8080/chains/<CHAIN_ID>/applications/<APP_ID>
```

## Quick Deploy Script

Run the automated deployment script:
```powershell
.\scripts\deploy-testnet.ps1
```

## GraphQL Queries

### Get Player Info
```graphql
query {
  player {
    isRegistered
    encryptedName
    tokenABalance
    tokenBBalance
    pageCount
    raidState
  }
}
```

### Get Inventory
```graphql
query {
  inventory {
    totalPlots
    shields
  }
}
```

### Get Statistics
```graphql
query {
  stats {
    totalDeposited
    totalWithdrawn
    totalTokenAYieldEarned
    totalSasEarned
    totalSasSpent
    totalStolen
    totalLostToSteals
    successfulSteals
    failedSteals
    timesRaided
    shieldsUsed
    plotsPurchased
  }
}
```

### Get Pages
```graphql
query {
  pages {
    pageId
    plots {
      plotId
      tokenABalance
      pendingTokenAYield
      pendingSasRewards
      isActive
      isPurchased
    }
    totalBalance
    totalPendingYield
    totalPendingSas
  }
}
```

### Get Configuration
```graphql
query {
  config {
    yieldRateBps
    sasRewardRateBps
    minStealStake
    minDeposit
    maxDeposit
    raidCooldownBlocks
    maxTargetsPerRequest
    plotCostSas
    shieldCostSas
  }
}
```

## Operations (via Frontend or CLI)

### Register
```json
{ "Register": { "encrypted_name": [1, 2, 3] } }
```

### Create Page
```json
{ "CreatePage": null }
```

### Deposit
```json
{ "Deposit": { "page_id": 0, "plot_id": 0, "amount": 100 } }
```

### Withdraw
```json
{ "Withdraw": { "page_id": 0, "plot_id": 0, "amount": 50 } }
```

### Claim
```json
{ "Claim": { "page_id": 0, "plot_id": 0 } }
```

### Claim All
```json
{ "ClaimAll": null }
```

### Buy Plot (with SAS tokens)
```json
{ "BuyPlot": { "page_id": 0, "plot_id": 1 } }
```

### Buy Shield (with SAS tokens)
```json
{ "BuyShield": null }
```

## Testnet Info

- **Network**: Linera Testnet Conway (Current Active)
- **Faucet**: https://faucet.testnet-conway.linera.net
- **RPC**: https://rpc.testnet-conway.linera.net
- **Explorer**: https://explorer.testnet-conway.linera.net

## Troubleshooting

### "libclang not found"
Set `LIBCLANG_PATH` environment variable:
```powershell
$env:LIBCLANG_PATH = "C:\Program Files\LLVM\bin"
```

### "wallet not found"
Initialize wallet first:
```powershell
linera wallet init --faucet https://faucet.testnet-conway.linera.net --with-new-chain
```

### Build errors
Make sure Rust wasm target is installed:
```powershell
rustup target add wasm32-unknown-unknown --toolchain 1.86.0
```

### "Unknown opcode 252" or "Invalid Wasm module"
This error occurs when using Rust 1.87 or later. The newer Rust versions produce WASM with bulk-memory operations that Linera's Wasmer VM doesn't support yet.

**Solution**: Use Rust 1.86.0 for building:
```powershell
cargo +1.86.0 build --release --target wasm32-unknown-unknown
```

### async-graphql-value compilation errors
If you see errors about `let` expressions being experimental, your Cargo.lock has async-graphql-value 7.2.x which requires Rust 1.89+.

**Solution**: Copy Cargo.lock from linera-protocol repository:
```powershell
git clone https://github.com/linera-io/linera-protocol --branch testnet_conway
Copy-Item linera-protocol/Cargo.lock smart_contract/Cargo.lock
cargo clean
cargo +1.86.0 build --release --target wasm32-unknown-unknown
```

## Build Requirements Summary

| Component | Version | Notes |
|-----------|---------|-------|
| Rust | 1.86.0 | **MUST NOT use 1.87+** |
| linera-sdk | =0.15.8 | Pinned exact version |
| async-graphql | =7.0.17 | Must pin to avoid 7.2.x |
| async-graphql-value | 7.0.17 | Via Cargo.lock from linera-protocol |
| WASM target | wasm32-unknown-unknown | Standard target |

## Known Issues

- **Rust 1.87+ incompatibility**: [GitHub #4742](https://github.com/linera-io/linera-protocol/issues/4742) - Applications don't load with Rust 1.87 or later due to WASM opcode compatibility
