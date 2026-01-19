# Linera Installation Guide

## Overview

The Linera toolchain consists of several crates:

- **`linera-sdk`**: The main library used to program Linera applications in Rust
- **`linera-service`**: Defines a number of binaries, notably `linera` - the main client tool used to operate developer wallets and start local testing networks
- **`linera-storage-service`**: Provides a simple database used to run local validator nodes for testing and development purposes

## Requirements

### Supported Operating Systems

| Linux | macOS | Windows | Windows WSL |
|-------|-------|---------|-------------|
| ✓ Main platform | ✓ Working | ✓ Working | Untested |

### Prerequisites

The main prerequisites to install the Linera toolchain are **Rust**, **Wasm**, and **Protoc**.

#### Linux Installation

**Rust and Wasm:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
```

**Protoc:**
```bash
curl -LO https://github.com/protocolbuffers/protobuf/releases/download/v21.11/protoc-21.11-linux-x86_64.zip
unzip protoc-21.11-linux-x86_64.zip -d $HOME/.local
export PATH="$HOME/.local/bin:$PATH"
```

**Additional packages (on some Linux distributions):**
```bash
sudo apt install g++ libclang-dev libssl-dev
```

### Rust Toolchain

The recommended Rust toolchain configuration (`rust-toolchain.toml`):

```toml
[toolchain]
channel = "1.86.0"
components = [ "clippy", "rustfmt", "rust-src" ]
targets = [ "wasm32-unknown-unknown" ]
profile = "minimal"
```

## Installing from crates.io

You may install the Linera binaries with:

```bash
cargo install --locked linera-storage-service@0.15.8
cargo install --locked linera-service@0.15.8
```

And use `linera-sdk` as a library for Linera Wasm applications:

```bash
cargo add linera-sdk@0.15.8
```

> The version number `0.15.8` corresponds to the current Testnet of Linera. The minor version may change frequently but should not induce breaking changes.

## Installing from GitHub

Download the source from GitHub:

```bash
git clone https://github.com/linera-io/linera-protocol.git
cd linera-protocol
git checkout -t origin/testnet_conway  # Current release branch
```

To install the Linera toolchain locally from source:

```bash
cargo install --locked --path linera-storage-service
cargo install --locked --path linera-service
```

Alternatively, for developing and debugging, you may use the binaries compiled in debug mode:

```bash
export PATH="$PWD/target/debug:$PATH"
```

## Getting help

If installation fails:
- Reach out to the team on [Discord](https://discord.gg/linera)
- [Create an issue](https://github.com/linera-io/linera-protocol/issues) on GitHub
