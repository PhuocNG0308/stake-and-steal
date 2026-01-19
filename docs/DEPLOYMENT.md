# Steal & Yield - Linera Deployment Guide

## Prerequisites

1. **Rust** - with `wasm32-unknown-unknown` target
2. **LLVM** - for building Linera CLI (libclang.dll)
3. **Linera CLI** - v0.15.10

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

### 3. Initialize Wallet

```powershell
# Connect to Testnet and get tokens from faucet
linera wallet init --faucet https://faucet.testnet-babylonbee.linera.net --with-new-chain

# View your chain info
linera wallet show
```

### 4. Build Smart Contract

```powershell
cd smart_contract
cargo build --release --target wasm32-unknown-unknown
```

### 5. Deploy to Testnet

```powershell
# Publish bytecode
linera publish-bytecode `
    target/wasm32-unknown-unknown/release/steal_and_yield_contract.wasm `
    target/wasm32-unknown-unknown/release/steal_and_yield_service.wasm

# Create application (1000 = initial balance)
linera create-application <BYTECODE_ID> --json-argument "1000"
```

### 6. Start Local Service

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
    availableBalance
    pageCount
    raidState
  }
}
```

### Get Statistics
```graphql
query {
  stats {
    totalDeposited
    totalWithdrawn
    totalYieldEarned
    totalStolen
    totalLostToSteals
    successfulSteals
    failedSteals
    timesRaided
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
      balance
      pendingYield
      isActive
    }
    totalBalance
    totalPendingYield
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

## Testnet Info

- **Network**: Linera Testnet (BabylonBee)
- **Faucet**: https://faucet.testnet-babylonbee.linera.net
- **Explorer**: https://explorer.testnet-babylonbee.linera.net

## Troubleshooting

### "libclang not found"
Set `LIBCLANG_PATH` environment variable:
```powershell
$env:LIBCLANG_PATH = "C:\Program Files\LLVM\bin"
```

### "wallet not found"
Initialize wallet first:
```powershell
linera wallet init --faucet https://faucet.testnet-babylonbee.linera.net --with-new-chain
```

### Build errors
Make sure Rust wasm target is installed:
```powershell
rustup target add wasm32-unknown-unknown
```
