# Hello, Linera - Quick Start Guide

This guide will help you initialize a developer wallet, interact with the current Testnet, run a local development network, and compile and deploy your first application.

## Creating a wallet on the latest Testnet

To interact with the latest Testnet, you will need a developer wallet, a new microchain, and some tokens:

```bash
linera wallet init --faucet https://faucet.testnet-conway.linera.net
linera wallet request-chain --faucet https://faucet.testnet-conway.linera.net
```

> A Linera Testnet is a deployment of the Linera protocol used for testing. A deployment consists of validators, each running a frontend service (`linera-proxy`), workers (`linera-server`), and a shared database (`linera-storage-service`).

## Using a local test network

Another option is to start your own local development network:

```bash
linera net up --with-faucet --faucet-port 8080
```

This will start a validator with the default number of shards and start a faucet.

Then, create a developer wallet in a separate shell:

```bash
linera wallet init --faucet http://localhost:8080
linera wallet request-chain --faucet http://localhost:8080
```

> **Note:** A wallet is valid for the lifetime of its network. Every time a local network is restarted, the wallet needs to be removed and created again.

## Working with several developer wallets

You can set environment variables to choose the location of your wallet files:

```bash
DIR=$HOME/my_directory
mkdir -p $DIR
export LINERA_WALLET="$DIR/wallet.json"
export LINERA_KEYSTORE="$DIR/keystore.json"
export LINERA_STORAGE="rocksdb:$DIR/wallet.db"
```

## Interacting with the Linera network

To check that the network is working:

```bash
linera sync
linera query-balance
```

You should see an output number, e.g. `10`.

## Building an example application

Applications running on Linera are Wasm bytecode. Let's build the `counter` application:

```bash
cd examples/counter && cargo build --release --target wasm32-unknown-unknown
```

## Publishing your application

Use the `publish-and-create` command:

1. The location of the contract bytecode
2. The location of the service bytecode
3. The JSON encoded initialization arguments

```bash
linera publish-and-create \
  target/wasm32-unknown-unknown/release/counter_{contract,service}.wasm \
  --json-argument "42"
```

Congratulations! You've published your first application on Linera!

## Querying your application

Start the client in service mode:

```bash
linera service --port 8080
```

Navigate to `http://localhost:8080` in your browser to access GraphiQL.

List the applications deployed on your default chain:

```graphql
query {
  applications(chainId: "...") {
    id
    description
    link
  }
}
```

Replace `...` with the chain ID shown by `linera wallet show`.

To query the counter value:

```graphql
query {
  value
}
```

This will return a value of `42`, which is the initialization argument we specified when deploying our application.

## Summary

By the end of this guide, you should have:
- A microchain on the Testnet and/or on your local network
- A working application that can be queried using GraphQL
