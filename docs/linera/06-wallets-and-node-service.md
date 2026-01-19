# Wallets and Node Service

## Wallets

Linera wallets hold user private keys. Instead of signing transactions, Linera wallets sign blocks and propose them to extend the chains owned by their users.

Wallets include a node which tracks a subset of Linera chains.

### Creating a developer wallet

```bash
linera wallet init --faucet $FAUCET_URL
linera wallet request-chain --faucet $FAUCET_URL
```

### Wallet files

| File | Description |
|------|-------------|
| `wallet.json` | Private state |
| `keystore.db` | Keys |
| `wallet.db` | Node state |

### Selecting a wallet

Using command-line options:
```bash
linera --wallet wallet2.json --keystore keystore2.json --storage rocksdb:wallet2.db:runtime:default
```

Using environment variables:
```bash
export LINERA_STORAGE=rocksdb:$PWD/wallet2.db:runtime:default
export LINERA_WALLET=$PWD/wallet2.json
export LINERA_KEYSTORE=$PWD/keystore2.json
```

Using numbered wallets:
```bash
linera --with-wallet $I  # or linera -w $I
```

### Chain Management

#### Listing chains
```bash
linera wallet show
```

#### Setting default chain
```bash
linera wallet set-default <chain-id>
```

#### Creating a new chain
```bash
linera open-chain
```

#### Creating a multi-owner chain
```bash
linera open-multi-owner-chain \
    --chain-id <chain-id> \
    --owner-public-keys <pubkey1> <pubkey2> \
    --multi-leader-rounds 2
```

#### Changing chain ownership
```bash
linera change-ownership --chain-id <chain-id> --owner-public-keys <keys>
```

---

## Node Service

The Linera client also acts as a node which:
1. Executes blocks
2. Exposes a GraphQL API and IDE
3. Listens for notifications from validators and automatically updates local chains

### Starting the service

```bash
linera service
```

This runs on port 8080 by default (use `--port` to override).

### GraphQL

Linera uses GraphQL as the query language for interfacing with different parts of the system. GraphQL enables clients to craft queries such that they receive exactly what they want.

### GraphiQL IDE

Access the GraphiQL IDE at `localhost:8080/` to dynamically explore the state of the system and your applications.

### GraphQL System API

The node service exposes a GraphQL API for system operations. Explore by clicking on `MutationRoot` in GraphiQL.

### GraphQL Application API

Access application APIs at:
```
localhost:8080/chains/<chain-id>/applications/<application-id>
```

### Connecting AI Agents (MCP)

Most AI agents understand the Model Context Protocol (MCP). GraphQL services can be turned into MCP servers using [Apollo MCP Server](https://www.apollographql.com/docs/apollo-mcp-server).

See the [mcp-demo](https://github.com/linera-io/mcp-demo) repository for more information.
