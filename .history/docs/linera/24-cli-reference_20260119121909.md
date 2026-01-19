# Linera CLI Reference

Complete reference for Linera command-line interface commands.

## Installation

```bash
# From cargo
cargo install linera-service

# From source
git clone https://github.com/linera-io/linera-protocol.git
cd linera-protocol
cargo install --path linera-service
```

---

## Wallet Commands

### Initialize Wallet

```bash
# New wallet with local devnet
linera wallet init

# New wallet with chain from faucet
linera wallet init --with-new-chain --faucet <faucet_url>

# With specific genesis file
linera wallet init --genesis /path/to/genesis.json

# Specify wallet path
linera wallet init --wallet-path ~/.linera-wallet
```

### Show Wallet Info

```bash
# Show all wallet info
linera wallet show

# Show specific chain
linera wallet show --chain <chain_id>

# Show applications
linera wallet show-applications
```

### Request Tokens

```bash
# From faucet
linera wallet request-tokens --faucet <faucet_url>

# Specify amount
linera wallet request-tokens --faucet <faucet_url> --amount 1000

# For specific chain
linera wallet request-tokens --faucet <faucet_url> --chain <chain_id>
```

### Set Default Chain

```bash
linera wallet set-default <chain_id>
```

---

## Chain Commands

### Query Balance

```bash
# Default chain
linera query-balance

# Specific chain
linera query-balance --chain <chain_id>

# Specific owner
linera query-balance --owner <owner_id>
```

### Open New Chain

```bash
# Open chain with default owner
linera open-chain

# With initial balance
linera open-chain --initial-balance 100
```

### Transfer

```bash
# Transfer between chains
linera transfer --from <source_chain> --to <target_chain> --amount 100

# Transfer to owner on same chain
linera transfer --to <owner> --amount 100
```

### Synchronize Chain

```bash
# Sync default chain
linera sync

# Sync specific chain
linera sync --chain <chain_id>
```

---

## Application Commands

### Publish Bytecode

```bash
# Publish contract and service bytecode
linera publish-bytecode \
  path/to/contract.wasm \
  path/to/service.wasm

# Returns bytecode ID
```

### Create Application

```bash
# Create from bytecode ID
linera create-application <bytecode_id>

# With instantiation argument
linera create-application <bytecode_id> \
  --json-argument '{"name": "MyToken"}'

# With parameters
linera create-application <bytecode_id> \
  --json-argument '{"name": "MyToken"}' \
  --json-parameters '{"max_supply": 1000000}'
```

### Execute Operation

```bash
# Execute operation on application
linera execute-operation <app_id> '<operation_json>'

# Example
linera execute-operation e476187f... '{"Transfer": {"to": "User:abc...", "amount": "100"}}'
```

### Query Application

```bash
# GraphQL query
linera query --app <app_id> "{ value }"

# Query with variables
linera query --app <app_id> \
  --query "query GetBalance(\$owner: String!) { balance(owner: \$owner) }" \
  --variables '{"owner": "User:abc..."}'
```

---

## Project Commands

### Create New Project

```bash
# Create new Linera project
linera project new <project_name>

# With specific template
linera project new <project_name> --template fungible
```

### Build Project

```bash
# Build current project
linera project build

# Build release
linera project build --release
```

### Publish and Create

```bash
# Compile, publish, and create application
linera project publish-and-create

# With arguments
linera project publish-and-create \
  --json-argument '{"initial_value": 100}'
```

### Test Project

```bash
# Run project tests
linera project test
```

---

## Network Commands

### Start Local Network

```bash
# Start with defaults
linera net up

# With specific validators
linera net up --validators 4

# With shards
linera net up --validators 4 --shards 2
```

### Network Status

```bash
# Check status
linera net status

# View logs
linera net logs

# View specific service logs
linera net logs validator-1
```

### Stop Network

```bash
# Stop network
linera net down

# Stop and clean data
linera net down --clean
```

### Restart Network

```bash
linera net restart
```

---

## Service Commands

### Start Node Service

```bash
# Start local node service
linera service

# With specific port
linera service --port 8080

# With external storage
linera service --storage service:http://127.0.0.1:8942
```

---

## Storage Service Commands

```bash
# Start storage service
linera-storage-service \
  --storage rocksdb:/path/to/data \
  --listen 127.0.0.1:8942
```

---

## Common Options

### Global Options

```bash
--wallet-path <PATH>    # Path to wallet file
--storage <URI>         # Storage URI
--chain <CHAIN_ID>      # Target chain
--verbose               # Verbose output
--quiet                 # Minimal output
--help                  # Show help
--version               # Show version
```

### Environment Variables

```bash
LINERA_WALLET_PATH      # Wallet file path
LINERA_STORAGE          # Storage URI
RUST_LOG                # Log level (info, debug, trace)
```

---

## Examples

### Complete Deployment Flow

```bash
# 1. Initialize wallet on testnet
linera wallet init \
  --with-new-chain \
  --faucet https://faucet.testnet-conway.linera.net

# 2. Check balance
linera query-balance

# 3. Create project
linera project new my_token

# 4. Build and deploy
cd my_token
linera project publish-and-create \
  --json-argument '{"name": "MyToken", "symbol": "MTK", "initial_supply": "1000000"}'

# 5. Query deployed app
linera query --app <app_id> "{ tokenInfo { name symbol } }"

# 6. Execute transfer
linera execute-operation <app_id> \
  '{"Transfer": {"to": "User:recipient_owner", "amount": "100"}}'
```

### Multi-Chain Setup

```bash
# Create additional chain
linera open-chain --initial-balance 100

# List chains
linera wallet show

# Set new chain as default
linera wallet set-default <new_chain_id>

# Transfer between chains
linera transfer --from <chain_1> --to <chain_2> --amount 50
```

### Local Development

```bash
# Start local network
linera net up

# Deploy app
linera project publish-and-create

# Start node service for frontend
linera service --port 8080

# Test queries
curl -X POST http://localhost:8080/chains/<chain>/applications/<app> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ value }"}'
```

---

## Troubleshooting

### Debug Mode

```bash
# Enable debug logging
RUST_LOG=debug linera <command>

# Enable trace logging
RUST_LOG=trace linera <command>
```

### Common Issues

```bash
# Reset wallet
rm -rf ~/.linera
linera wallet init --with-new-chain --faucet <faucet_url>

# Check service health
curl http://localhost:8080/health

# Verify storage connection
linera net status
```
