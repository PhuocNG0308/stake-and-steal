# Connecting to Linera Testnet

Guide for deploying and testing applications on Linera's public testnet.

## Current Testnet: Conway

The active testnet is **Testnet Conway**.

- **Faucet URL**: https://faucet.testnet-conway.linera.net
- **Explorer**: https://explorer.testnet-conway.linera.net
- **GitHub Branch**: `testnet_conway`

---

## Getting Started

### Initialize Wallet

```bash
# Create new wallet and chain on testnet
linera wallet init \
  --with-new-chain \
  --faucet https://faucet.testnet-conway.linera.net
```

### Verify Connection

```bash
# Show wallet info
linera wallet show

# Check balance
linera query-balance
```

### Request Test Tokens

```bash
# Request tokens from faucet
linera wallet request-tokens \
  --faucet https://faucet.testnet-conway.linera.net
```

---

## Testnet Configuration

### Environment Variables

```bash
# .env
LINERA_NETWORK=testnet
LINERA_FAUCET_URL=https://faucet.testnet-conway.linera.net
LINERA_RPC_URL=https://rpc.testnet-conway.linera.net
```

### Frontend Configuration

```typescript
// config/testnet.ts
export const testnetConfig = {
  network: 'testnet-conway',
  faucetUrl: 'https://faucet.testnet-conway.linera.net',
  rpcUrl: 'https://rpc.testnet-conway.linera.net',
  explorerUrl: 'https://explorer.testnet-conway.linera.net',
};
```

---

## Building for Testnet

### Use Testnet Branch

```bash
# Clone with testnet branch
git clone -b testnet_conway https://github.com/linera-io/linera-protocol.git

# Or checkout if already cloned
git checkout testnet_conway
```

### Build from Testnet Source

```bash
cd linera-protocol
cargo install --path linera-service
cargo install --path linera-storage-service
```

### Verify Version

```bash
linera --version
# Should show version compatible with testnet
```

---

## Deploying to Testnet

### Build Application

```bash
cd my-application
cargo build --release --target wasm32-unknown-unknown
```

### Deploy

```bash
# Ensure wallet is connected to testnet
linera wallet show

# Deploy application
linera project publish-and-create \
  --json-argument '{"name": "My Token", "symbol": "MTK"}'
```

### Verify Deployment

```bash
# List applications
linera wallet show-applications

# Query application
linera query --app <app_id> "{ tokenInfo { name symbol } }"
```

---

## Running Node Service

### Connect to Testnet

```bash
# Start local node service connected to testnet
linera service
```

### Configure for Testnet

```bash
# With explicit testnet config
linera service \
  --external-url https://rpc.testnet-conway.linera.net
```

---

## Cross-Chain on Testnet

### Create Additional Chains

```bash
# Open new chain
linera open-chain

# Request tokens on new chain
linera wallet request-tokens \
  --chain <new_chain_id> \
  --faucet https://faucet.testnet-conway.linera.net
```

### Cross-Chain Transfer

```bash
# Transfer tokens to another chain
linera transfer \
  --from <source_chain> \
  --to <target_chain> \
  --amount 100
```

---

## Testnet Limitations

### Current Constraints

- **Block Time**: May vary based on network load
- **Transaction Size**: Limited blob sizes
- **Rate Limits**: Faucet has request limits
- **Data Persistence**: Data may be cleared during testnet updates

### Best Practices

1. **Don't store valuable data** - Testnet may be reset
2. **Use faucet sparingly** - Rate limits apply
3. **Monitor announcements** - Testnet may be upgraded
4. **Report bugs** - Help improve the network

---

## Monitoring

### Check Testnet Status

```bash
# Via CLI
linera wallet show

# Via Explorer
# Visit: https://explorer.testnet-conway.linera.net
```

### Application Monitoring

```typescript
// Frontend: Check app health
async function checkAppHealth(appId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://rpc.testnet-conway.linera.net/chains/${chainId}/applications/${appId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ __typename }' }),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}
```

---

## Troubleshooting

### Faucet Issues

```bash
# If faucet is unavailable, wait and retry
sleep 60
linera wallet request-tokens --faucet https://faucet.testnet-conway.linera.net
```

### Connection Issues

```bash
# Check network connectivity
curl https://rpc.testnet-conway.linera.net/health

# Re-initialize wallet if needed
rm -rf ~/.linera
linera wallet init --with-new-chain --faucet https://faucet.testnet-conway.linera.net
```

### Version Mismatch

```bash
# Ensure using testnet-compatible version
linera --version

# Update if needed
cargo install --git https://github.com/linera-io/linera-protocol.git \
  --branch testnet_conway \
  linera-service
```

---

## Migrating from Local to Testnet

### Checklist

1. ✅ Update configuration to use testnet URLs
2. ✅ Initialize testnet wallet
3. ✅ Request testnet tokens
4. ✅ Redeploy application
5. ✅ Update frontend configuration
6. ✅ Test all functionality

### Configuration Changes

```typescript
// Local config
const localConfig = {
  nodeServiceUrl: 'http://localhost:8080',
  faucetUrl: 'http://localhost:8080/faucet',
};

// Testnet config
const testnetConfig = {
  nodeServiceUrl: 'https://rpc.testnet-conway.linera.net',
  faucetUrl: 'https://faucet.testnet-conway.linera.net',
};

// Use environment variable to switch
const config = process.env.NETWORK === 'testnet' ? testnetConfig : localConfig;
```
