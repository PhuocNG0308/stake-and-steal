# 🎮 Stake and Steal - GameFi on Linera

> **A decentralized yield farming game with cross-chain PvP stealing mechanics, built on Linera Protocol.**

[![Linera](https://img.shields.io/badge/Built%20on-Linera-blue)](https://linera.io)
[![Testnet](https://img.shields.io/badge/Network-Testnet%20Conway-green)](https://explorer.testnet-conway.linera.net)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

## 📖 Table of Contents

- [Overview](#-overview)
- [Quick Start](#-quick-start)
- [Demo Wallet](#-demo-wallet)
- [Self-Deployment Guide](#-self-deployment-guide)
- [Project Structure](#-project-structure)
- [Smart Contract API](#-smart-contract-api)
- [Configuration](#-configuration)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## 🌐 Live Demo

**Testnet Conway Deployment:**
| Item | Value |
|------|-------|
| **App ID** | `d9bb9c6addc854108bcf5aa1b9439f92f11e09fb6fb3e902a5abbee1345c390b` |
| **Chain ID** | `af4551f49b4984389cc26c716635e77ae436cf877e386b34d57833372dd17a41` |
| **Explorer** | [View on Explorer](https://explorer.testnet-conway.linera.net) |

---

## 📖 Overview

**Stake and Steal** is a GameFi application where players:
1. **Stake** funds into Land Plots to earn yield (dual-token: USDT + SAS rewards)
2. **Steal** from other players on **different microchains** - guess their hidden plot!
3. **Defend** their assets with shields purchased using SAS governance tokens

### 🔑 Key Features

| Feature | Description |
|---------|-------------|
| 🎮 **Demo Wallet** | Try the game instantly with test tokens (250 SAS + 100 USDT) |
| 🔗 **Cross-Chain Raiding** | Attack players on different Linera microchains |
| 💰 **Dual-Token System** | USDT (staking) + SAS (governance/utility) |
| 🛡️ **Shield System** | Buy shields with SAS to block incoming raids |
| 📊 **Hidden Plots** | Raiders must guess which plot contains your tokens |

### 🎯 Game Mechanics

```
┌─────────────────────────────────────────────────────────────────┐
│                      GAME FLOW                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. STAKE           2. EARN              3. DEFEND/RAID         │
│  ┌─────────┐        ┌─────────┐          ┌─────────────┐        │
│  │ Deposit │───────►│ Yield   │          │ Buy Shields │        │
│  │ USDT    │        │ USDT+SAS│          │ (SAS cost)  │        │
│  └─────────┘        └─────────┘          └─────────────┘        │
│                                                  │               │
│                     ┌────────────────────────────┼───────┐      │
│                     │                            ▼       │      │
│                     │     CROSS-CHAIN RAIDING           │      │
│                     │  ┌─────────┐      ┌──────────┐    │      │
│                     │  │ Attack  │─────►│ Target's │    │      │
│                     │  │ Other   │      │ Hidden   │    │      │
│                     │  │ Players │◄─────│ Plots    │    │      │
│                     │  └─────────┘      └──────────┘    │      │
│                     │  Guess correctly = Steal 15%!    │      │
│                     └───────────────────────────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 💵 Token System

| Token | Symbol | Purpose | How to Get |
|-------|--------|---------|------------|
| **Token A** | USDT | Staking token - deposit to earn yield | Demo Faucet, Testnet Faucet |
| **Token B** | SAS | Governance token - buy plots, shields | Yield rewards, Demo Faucet |

---

## 🚀 Quick Start

### Option 1: Try Instantly (Demo Mode)

```bash
# Clone repository
git clone https://github.com/PhuocNG0308/stake-and-steal.git
cd stake-and-steal

# Install dependencies
cd frontend
npm install

# Start dev server
npm run dev
```

Open `http://localhost:3000` → Click **"Connect Demo Wallet"** → Start playing!

### Option 2: Connect to Live Testnet

See [Self-Deployment Guide](#-self-deployment-guide) below.

---

## 🎮 Demo Wallet

The Demo Wallet lets you test all game features without deploying anything:

### Test Tokens

Click **"Get Demo Tokens"** button to receive:
- **250 SAS** - Governance tokens for buying plots and shields
- **100 USDT** - Staking tokens for yield farming

### Features Available

| Feature | Demo Support |
|---------|--------------|
| Stake USDT in plots | ✅ Full |
| Earn USDT yield | ✅ Simulated (accelerated) |
| Earn SAS rewards | ✅ Simulated (accelerated) |
| Buy plots with SAS | ✅ Full |
| Buy shields with SAS | ✅ Full |
| Raid other players | ✅ Simulated network players |
| Cross-chain discovery | ✅ Simulated |

> ⚠️ **Note**: Demo data is stored in browser localStorage. Clearing browser data will reset your progress.

---

## 🛠️ Self-Deployment Guide

Follow these steps to deploy your own instance of Stake and Steal.

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 18+ | For frontend |
| **Rust** | **1.86.0** | ⚠️ MUST use 1.86.0, NOT newer |
| **Linera CLI** | v0.15.10 | Install with cargo |
| **LLVM** | 18.x | For building Linera CLI |

> ⚠️ **CRITICAL**: Rust 1.87+ produces WASM that Linera cannot execute!  
> See [GitHub Issue #4742](https://github.com/linera-io/linera-protocol/issues/4742)

### Step 1: Install Dependencies

```powershell
# Install Rust 1.86.0
rustup install 1.86.0
rustup target add wasm32-unknown-unknown --toolchain 1.86.0

# Verify version
rustup run 1.86.0 rustc --version
# Expected: rustc 1.86.0 (05f9846f8 2025-03-31)

# Install Linera CLI (requires LLVM)
$env:LIBCLANG_PATH = "C:\Program Files\LLVM\bin"
cargo install linera-service@0.15.10 --locked

# Verify Linera
linera --version
# Expected: linera-service 0.15.10
```

### Step 2: Initialize Linera Wallet

```powershell
# Create wallet and get testnet tokens
linera wallet init --faucet https://faucet.testnet-conway.linera.net --with-new-chain

# View your chain info
linera wallet show
# Note your Chain ID for later
```

### Step 3: Build Smart Contract

```powershell
cd smart_contract

# Build with Rust 1.86.0 (REQUIRED!)
cargo +1.86.0 build --release --target wasm32-unknown-unknown
```

**Expected output:**
```
   Compiling stake-and-steal v0.1.0
    Finished `release` profile [optimized] target(s)
```

### Step 4: Deploy to Testnet

```powershell
# Publish module
linera publish-module `
    target/wasm32-unknown-unknown/release/stake_and_steal_contract.wasm `
    target/wasm32-unknown-unknown/release/stake_and_steal_service.wasm

# Save the MODULE_ID from output
# Example: e371a5bd6b040261d409303ec7a06f9240e...

# Create application
linera create-application <MODULE_ID> --json-argument 0

# Save the APP_ID from output
# Example: d9bb9c6addc854108bcf5aa1b9439f92f1...
```

### Step 5: Configure Frontend

Create `frontend/.env.local`:
```env
VITE_NETWORK=testnet
VITE_APP_ID=<YOUR_APP_ID>
VITE_CHAIN_ID=<YOUR_CHAIN_ID>
VITE_USE_MOCK=false
```

### Step 6: Start Services

```powershell
# Terminal 1: Start Linera node service
linera service --port 8080

# Terminal 2: Start frontend
cd frontend
npm install
npm run dev
```

### Step 7: Verify Deployment

Open GraphiQL at:
```
http://localhost:8080/chains/<CHAIN_ID>/applications/<APP_ID>
```

Run test query:
```graphql
query {
  config {
    yieldRateBps
    sasRewardRateBps
    plotCostSas
    shieldCostSas
    minStealStake
  }
}
```

---

## 📁 Project Structure

```
stake-and-steal/
├── smart_contract/           # Linera smart contract (Rust)
│   ├── Cargo.toml           # Dependencies (linera-sdk = "=0.15.8")
│   └── src/
│       ├── lib.rs           # Types, ABI, Operations, Messages
│       ├── state.rs         # State management
│       ├── contract.rs      # Contract logic
│       └── service.rs       # GraphQL service
├── frontend/                 # React + TypeScript frontend
│   ├── package.json
│   ├── .env.development     # Development config
│   ├── .env.production      # Production config
│   └── src/
│       ├── components/      # React components
│       │   ├── wallet/      # Wallet connection components
│       │   └── ui/          # Shared UI components
│       ├── hooks/           # Custom React hooks
│       ├── graphql/         # GraphQL queries & client
│       ├── lib/             # Wallet integrations
│       │   ├── demo-wallet.ts       # Demo wallet implementation
│       │   ├── linera-client.ts     # Linera Web Client
│       │   └── wallet-types.ts      # Wallet type definitions
│       ├── stores/          # Zustand state management
│       │   └── gameDataStore.ts     # Main game state
│       ├── pages/           # Route pages
│       │   ├── Dashboard.tsx        # Main dashboard
│       │   ├── Farm.tsx            # Land/Staking page
│       │   └── Raid.tsx            # PvP raiding page
│       └── config/          # Network configuration
├── scripts/
│   └── deploy-testnet.ps1   # Automated deployment script
├── docs/
│   ├── DEPLOYMENT.md        # Detailed deployment guide
│   └── linera/              # Linera documentation
├── vercel.json              # Vercel deployment config
└── netlify.toml             # Netlify deployment config
```

---

## 📜 Smart Contract API

### Operations

| Operation | Description | Cost |
|-----------|-------------|------|
| `Register` | Register player with encrypted name | Free |
| `CreatePage` | Create a new page (5 plots) | Free |
| `Deposit(page, plot, amount)` | Deposit USDT into a plot | USDT |
| `Withdraw(page, plot)` | Withdraw USDT from a plot | Free |
| `ClaimYield(page, plot)` | Claim USDT yield from a plot | Free |
| `ClaimAllYield` | Claim all pending USDT yield | Free |
| `ClaimSasRewards(page, plot)` | Claim SAS rewards from a plot | Free |
| `BuyPlot` | Buy a new plot | 500 SAS |
| `BuyShield(count)` | Buy shields | 100 SAS each |
| `ExecuteSteal(target, page, plot)` | Raid another player | USDT stake |

### GraphQL Queries

```graphql
# Get player info
query {
  player {
    isRegistered
    tokenABalance    # USDT balance
    tokenBBalance    # SAS balance
    pageCount
    raidState
  }
}

# Get all pages with plots
query {
  pages {
    pageId
    plots {
      plotId
      tokenABalance
      pendingTokenAYield
      pendingSasRewards
      isActive
    }
    totalBalance
    totalPendingYield
    totalPendingSas
  }
}

# Get inventory
query {
  inventory {
    totalPlots
    shields
  }
}

# Get game config
query {
  config {
    yieldRateBps
    sasRewardRateBps
    plotCostSas
    shieldCostSas
    minStealStake
  }
}
```

---

## ⚙️ Configuration

### Default Game Parameters

```rust
GameConfig {
    yield_rate_bps: 10,        // 0.1% USDT yield per block
    sas_reward_rate_bps: 5,    // 0.05% SAS rewards per block
    min_steal_stake: 1000,     // Minimum USDT stake for raid
    min_deposit: 100,          // Minimum deposit: 100 USDT
    max_deposit: 100000,       // Maximum deposit: 100,000 USDT
    raid_cooldown_blocks: 100, // Blocks between raids
    plot_cost_sas: 500,        // Cost to buy a plot: 500 SAS
    shield_cost_sas: 100,      // Cost to buy a shield: 100 SAS
}
```

### Frontend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_NETWORK` | Network type (`testnet` or `devnet`) | `testnet` |
| `VITE_APP_ID` | Deployed application ID | - |
| `VITE_CHAIN_ID` | Chain ID for service | - |
| `VITE_USE_MOCK` | Use mock data for development | `true` |
| `VITE_FAUCET_URL` | Faucet URL | `https://faucet.testnet-conway.linera.net` |
| `VITE_RPC_URL` | RPC URL | `https://rpc.testnet-conway.linera.net` |

---

## 🔧 Troubleshooting

### Common Issues

#### ❌ "unknown opcode 252" when loading application

**Cause**: Built with Rust 1.87 or newer.

**Solution**: 
```powershell
# Rebuild with Rust 1.86.0
cargo +1.86.0 build --release --target wasm32-unknown-unknown
```

#### ❌ "async-graphql-value version mismatch"

**Cause**: Cargo pulling wrong version of async-graphql-value.

**Solution**:
```powershell
# Pin version in Cargo.toml
async-graphql = "=7.0.17"

# Or copy Cargo.lock from linera-protocol repo
```

#### ❌ "Failed to connect to testnet"

**Cause**: Network issues or testnet maintenance.

**Solution**:
1. Check testnet status at https://explorer.testnet-conway.linera.net
2. Try `linera sync` to resync wallet
3. Use Demo Wallet for testing

#### ❌ "Module not found" after deployment

**Cause**: Module ID incorrect or not synced.

**Solution**:
```powershell
linera sync
linera wallet show
```

### Build Requirements Summary

| Component | Required Version | Command to Check |
|-----------|------------------|------------------|
| Rust | **1.86.0** | `rustup run 1.86.0 rustc --version` |
| Linera SDK | **=0.15.8** | Check `Cargo.toml` |
| async-graphql | **=7.0.17** | Check `Cargo.toml` |
| Linera CLI | **v0.15.10** | `linera --version` |

---

## 🌐 Deploy to Cloud

### Vercel

```bash
npm i -g vercel
cd stake-and-steal
vercel
```

### Netlify

```bash
npm i -g netlify-cli
cd stake-and-steal
netlify deploy --prod
```

---

## 🗺️ Roadmap

- [x] Cross-chain raiding between microchains
- [x] Demo wallet with test tokens (250 SAS + 100 USDT)
- [x] Linera Web Client integration
- [x] Dual-token economy (USDT + SAS)
- [ ] CheCko Wallet integration
- [ ] Real FHE encryption for hidden balances
- [ ] Guild/team mechanics
- [ ] On-chain leaderboards
- [ ] NFT land plots
- [ ] Mobile app (React Native)

---

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

## 🏆 Linera Buildathon Submission

**Project**: Stake and Steal - Cross-Chain GameFi on Linera

**Features Demonstrated**:
- ✅ Cross-chain messaging between microchains
- ✅ GraphQL service for frontend integration
- ✅ Dual-token economic model (USDT + SAS)
- ✅ Hidden state with raid mechanics
- ✅ Linera Web Client library integration
- ✅ Demo wallet with faucet (250 SAS + 100 USDT)
- ✅ Live demo on Testnet Conway

**Tech Stack**:
- Smart Contract: Rust + Linera SDK 0.15.8
- Frontend: React + TypeScript + Vite + TailwindCSS
- State: Zustand
- Blockchain: Linera Testnet Conway
- Wallet: Demo Wallet / Linera Web Client / CheCko / Croissant
