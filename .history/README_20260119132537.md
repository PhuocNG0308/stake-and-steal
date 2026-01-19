# Steal & Yield - GameFi on Linera

A decentralized yield farming game with PvP stealing mechanics, built on Linera Protocol.

## Overview

**Steal & Yield** is a GameFi application where players:
1. **Deposit** funds into Land Plots to earn yield
2. **Steal** from other players using a commit-reveal mechanism
3. **Defend** their assets with encrypted state

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      LINERA NETWORK                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    Cross-chain     ┌──────────────────────┐   │
│  │   Registry   │◄──────────────────►│   Player Chain #1    │   │
│  │    Chain     │    Messages        │   ┌──────────────┐   │   │
│  │              │                    │   │   Page 0     │   │   │
│  │ - Players[]  │                    │   │  ┌────┬────┐ │   │   │
│  │ - Balances   │    ┌──────────────►│   │  │Plot│Plot│ │   │   │
│  │ - Random     │    │               │   │  │ 0  │ 1  │ │   │   │
│  └──────┬───────┘    │               │   │  └────┴────┘ │   │   │
│         │            │               │   └──────────────┘   │   │
│         │            │               │   ┌──────────────┐   │   │
│         ▼            │               │   │   Page 1     │   │   │
│  ┌──────────────┐    │               │   │  ┌────┬────┐ │   │   │
│  │ Player Chain │◄───┘               │   │  │Plot│Plot│ │   │   │
│  │     #2       │                    │   │  │ 0  │ 1  │ │   │   │
│  └──────────────┘                    │   │  └────┴────┘ │   │   │
│                                      │   └──────────────┘   │   │
│                                      └──────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Game Mechanics

### 1. Land & Deposit (Yield Farming)

- Each player has their own **microchain**
- Players can create up to 5 **Pages** (expandable)
- Each Page contains up to 5 **Plots**
- Deposit funds into Plots to earn **yield** over time
- Yield rate: 5% APY (configurable)

### 2. Stealing Mechanism (PvP)

```
Player A                    Registry                    Player B
    │                          │                            │
    │── FindTargets(3) ───────►│                            │
    │◄── TargetList[B,C,D] ────│                            │
    │                          │                            │
    │── LockTarget(B, hash) ──►│                            │
    │◄── TargetLocked ─────────│                            │
    │                          │                            │
    │── ExecuteSteal(page,plot,nonce) ─────────────────────►│
    │                          │                            │
    │◄─────────────────────────────── StealOutcome(result) ─│
    │                          │                            │
    │◄─────────────────────────────── StolenFunds (if win) ─│
```

- **Find Targets**: Request random targets from Registry
- **Lock Target**: Commit to target using hash(target + nonce)
- **Execute Steal**: Reveal nonce, RNG determines success
- **Success Rate**: 30% base rate (configurable)
- **Cooldown**: 100 blocks between steals

### 3. Encryption (FHE-Ready)

All sensitive data is encrypted:
- Plot balances use `EncryptedData` struct
- Currently uses XOR-based mock encryption
- Designed for future FHE integration
- Version field enables smooth migration

## Project Structure

```
stake-and-yield/
├── smart_contract/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs         # Types, ABI, Operations, Messages
│       ├── state.rs       # State management
│       ├── contract.rs    # Contract logic
│       └── service.rs     # GraphQL service
├── frontend/
│   ├── package.json
│   └── src/
│       ├── components/    # React components
│       ├── hooks/         # Custom hooks
│       ├── graphql/       # Queries & mutations
│       └── utils/         # Helpers
└── docs/
    └── linera/           # Linera documentation
```

## Smart Contract API

### Operations

| Operation | Description |
|-----------|-------------|
| `Register` | Register player with encrypted name |
| `CreatePage` | Create a new page (max 5) |
| `Deposit` | Deposit funds into a plot |
| `Withdraw` | Withdraw funds from a plot |
| `Claim` | Claim yield from a plot |
| `ClaimAll` | Claim all pending yield |
| `FindTargets` | Request random targets |
| `LockTarget` | Lock onto a target with commitment |
| `ExecuteSteal` | Execute the steal attempt |
| `CancelRaid` | Cancel ongoing raid |

### GraphQL Queries

```graphql
# Get player status
query {
  isRegistered
  availableBalance
  totalDeposited
  totalYieldEarned
}

# Get all pages with plots
query {
  allPages {
    pageId
    plots {
      plotId
      balance
      estimatedYield
      isLocked
    }
    totalBalance
  }
}

# Get raid state
query {
  raidState {
    state
    targets {
      chainId
      estimatedValue
    }
    lockedTarget
    lockUntil
  }
}

# Get player stats
query {
  stats {
    successfulSteals
    failedSteals
    totalStolenFromOthers
    totalLostToThieves
    winRate
  }
}
```

## Building

```bash
cd smart_contract

# Build for WASM
cargo build --release --target wasm32-unknown-unknown

# Run tests
cargo test

# Generate GraphQL schema
cargo run --bin schema
```

## Deployment

```bash
# Deploy registry chain first
linera publish-bytecode target/wasm32-unknown-unknown/release/steal_and_yield_contract.wasm \
    target/wasm32-unknown-unknown/release/steal_and_yield_service.wasm

# Create application on registry chain
linera create-application <BYTECODE_ID> \
    --json-argument '{"is_registry": true}'

# Create player chain
linera create-application <BYTECODE_ID> \
    --json-argument '{"is_registry": false, "registry_chain_id": "<REGISTRY_CHAIN_ID>"}'
```

## Configuration

Default game config:
```rust
GameConfig {
    yield_rate_bps: 500,           // 5% APY
    steal_success_rate: 30,        // 30%
    steal_cooldown_blocks: 100,
    max_pages: 5,
    max_plots_per_page: 5,
    min_deposit: 1_000_000,        // 1 token
    max_steal_percentage: 10,      // Max 10% per steal
}
```

## Security Considerations

1. **Commit-Reveal**: Prevents front-running of steal targets
2. **Encrypted State**: Balances are encrypted, hiding true values
3. **Cross-chain Verification**: All steals verified on victim's chain
4. **Cooldown Mechanism**: Prevents spam attacks
5. **RNG Proof**: Steal success is provably random

## Future Improvements

- [ ] Integrate real FHE encryption
- [ ] Add guild/team mechanics
- [ ] Implement leaderboards
- [ ] Add NFT land plots
- [ ] Cross-application composability
- [ ] Mobile-friendly frontend

## License

MIT License
