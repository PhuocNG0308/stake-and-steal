# Deploying Applications

This guide covers how to compile and deploy Linera applications to a chain.

## Building the Application

### Compile to WebAssembly

```bash
cd my_application
cargo build --release --target wasm32-unknown-unknown
```

This produces two Wasm binaries:
- `target/wasm32-unknown-unknown/release/my_application_contract.wasm`
- `target/wasm32-unknown-unknown/release/my_application_service.wasm`

---

## Deployment Methods

### Method 1: Using `linera project publish-and-create`

The simplest method for development:

```bash
# Compile and deploy in one command
linera project publish-and-create

# With instantiation argument
linera project publish-and-create \
  --json-argument '{"name": "MyToken", "symbol": "MTK", "decimals": 18, "initial_supply": "1000000"}'
```

### Method 2: Two-Step Deployment

#### Step 1: Publish Bytecode

```bash
# Publish the bytecode and get a bytecode ID
linera publish-bytecode \
  target/wasm32-unknown-unknown/release/my_application_contract.wasm \
  target/wasm32-unknown-unknown/release/my_application_service.wasm
```

Output:
```
Bytecode published: e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65010000000000000000000000
```

#### Step 2: Create Application Instance

```bash
# Create application from published bytecode
linera create-application \
  e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65010000000000000000000000 \
  --json-argument '{"name": "MyToken", "symbol": "MTK"}'
```

---

## Instantiation Arguments

### JSON Format

```bash
# Simple argument
linera project publish-and-create \
  --json-argument '{"value": 42}'

# Complex argument
linera project publish-and-create \
  --json-argument '{
    "name": "My Token",
    "symbol": "MTK",
    "decimals": 18,
    "initial_supply": "1000000000000000000000000",
    "admin": "User:e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65"
  }'
```

### With Parameters

```bash
# Application parameters (immutable after deployment)
linera project publish-and-create \
  --json-argument '{"initial_value": 100}' \
  --json-parameters '{"max_value": 1000}'
```

---

## Deployment to Different Chains

### Deploy to Default Chain

```bash
linera project publish-and-create
```

### Deploy to Specific Chain

```bash
# First, set the default chain or specify it
linera wallet set-default <chain_id>

# Or use --chain flag if available
linera project publish-and-create
```

---

## Verifying Deployment

### Check Application ID

After deployment, you'll receive an application ID:

```
Application created: e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65010000000000000001000000e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65030000000000000000000000
```

### Query the Application

```bash
# Start node service
linera service

# In another terminal, query via GraphQL
curl -X POST http://localhost:8080/chains/<chain_id>/applications/<app_id> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ tokenInfo { name symbol } }"}'
```

---

## Application Dependencies

If your application depends on other applications:

### Declare Dependencies in Cargo.toml

```toml
[dependencies]
fungible_token = { path = "../fungible_token" }
```

### Specify Required Applications

```bash
linera project publish-and-create \
  --required-application-ids <app_id_1>,<app_id_2>
```

---

## Deployment Scripts

### Bash Script Example

```bash
#!/bin/bash

# deploy.sh
set -e

APP_NAME="my_application"
CHAIN_ID=${1:-$(linera wallet show | grep "Default chain" | cut -d' ' -f3)}

echo "Building $APP_NAME..."
cargo build --release --target wasm32-unknown-unknown

echo "Publishing bytecode..."
BYTECODE_ID=$(linera publish-bytecode \
  target/wasm32-unknown-unknown/release/${APP_NAME}_contract.wasm \
  target/wasm32-unknown-unknown/release/${APP_NAME}_service.wasm \
  2>&1 | grep "Bytecode published" | cut -d' ' -f3)

echo "Bytecode ID: $BYTECODE_ID"

echo "Creating application..."
APP_ID=$(linera create-application $BYTECODE_ID \
  --json-argument '{"name": "Test Token", "symbol": "TST"}' \
  2>&1 | grep "Application created" | cut -d' ' -f3)

echo "Application ID: $APP_ID"
echo "Deployment complete!"
```

---

## Testnet Deployment

### Connect to Testnet

```bash
# Initialize wallet for testnet
linera wallet init --with-new-chain --faucet https://faucet.testnet-conway.linera.net
```

### Deploy to Testnet

```bash
# Same commands work on testnet
linera project publish-and-create \
  --json-argument '{"name": "My Token", "symbol": "MTK"}'
```

---

## Upgrading Applications

Linera applications are **immutable** once deployed. To upgrade:

1. **Deploy new version** with a new application ID
2. **Migrate data** if needed (via cross-app calls or messages)
3. **Update frontend** to use new application ID

### Migration Pattern

```rust
// In new version's contract
impl Contract for NewVersionContract {
    async fn execute_operation(&mut self, operation: Operation) {
        match operation {
            Operation::Migrate { old_app_id } => {
                // Call old application to get data
                let old_data: OldData = self.runtime
                    .call_application(true, old_app_id, &OldOperation::ExportData)
                    .await;
                
                // Import into new state
                self.import_data(old_data).await;
            }
            // ...
        }
    }
}
```

---

## Troubleshooting

### Common Errors

#### "Bytecode not found"
```bash
# Ensure bytecode is published first
linera publish-bytecode contract.wasm service.wasm
```

#### "Invalid instantiation argument"
```bash
# Check JSON format matches your InstantiationArgument type
# Use proper quoting in shell
linera create-application <bytecode_id> \
  --json-argument '{"field": "value"}'
```

#### "Insufficient balance"
```bash
# Request tokens from faucet
linera wallet request-tokens --faucet https://faucet.testnet-conway.linera.net
```

### Debug Build

For better error messages during development:

```bash
# Build with debug info
cargo build --target wasm32-unknown-unknown

# Use the debug binaries
linera publish-bytecode \
  target/wasm32-unknown-unknown/debug/my_app_contract.wasm \
  target/wasm32-unknown-unknown/debug/my_app_service.wasm
```
