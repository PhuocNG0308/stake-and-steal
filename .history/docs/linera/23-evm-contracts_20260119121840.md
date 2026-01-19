# EVM Smart Contracts on Linera (Experimental)

Linera provides experimental support for running EVM (Ethereum Virtual Machine) smart contracts through integration with Revm.

> ⚠️ **Note**: This feature is experimental and may change.

## Overview

Linera can execute Solidity/EVM smart contracts within its microchain architecture, allowing:

- Deploy existing Ethereum contracts
- Use familiar Solidity development tools
- Benefit from Linera's scalability
- Cross-chain messaging between EVM and native apps

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Linera Microchain                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              EVM Application (Wasm)                  │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │                   Revm                         │  │   │
│  │  │  ┌─────────────┐    ┌─────────────┐          │  │   │
│  │  │  │  Solidity   │    │  Solidity   │          │  │   │
│  │  │  │ Contract A  │    │ Contract B  │          │  │   │
│  │  │  └─────────────┘    └─────────────┘          │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

The EVM runs inside a Linera application, which compiles to WebAssembly.

---

## Setup

### Prerequisites

- Rust with wasm32 target
- Solidity compiler (solc)
- Foundry (optional, for testing)

### Project Structure

```
evm-app/
├── Cargo.toml
├── src/
│   ├── lib.rs          # State definitions
│   ├── contract.rs     # Linera contract wrapping EVM
│   └── service.rs      # GraphQL service
├── contracts/
│   ├── Token.sol       # Solidity contracts
│   └── compiled/       # Compiled bytecode
└── tests/
```

### Dependencies

```toml
# Cargo.toml
[dependencies]
linera-sdk = "0.15.8"
revm = { version = "8.0", default-features = false, features = ["std"] }
alloy-primitives = "0.7"
alloy-sol-types = "0.7"
hex = "0.4"
```

---

## Writing the EVM Application

### State Definition

```rust
// src/lib.rs
use linera_sdk::views::{RootView, RegisterView, MapView, ViewStorageContext};
use alloy_primitives::{Address, U256};

#[derive(RootView)]
#[view(context = "ViewStorageContext")]
pub struct EvmState {
    /// Deployed contract bytecodes
    pub contracts: MapView<Address, Vec<u8>>,
    
    /// Contract storage
    pub storage: MapView<(Address, U256), U256>,
    
    /// Account balances (ETH-equivalent)
    pub balances: MapView<Address, U256>,
    
    /// Account nonces
    pub nonces: MapView<Address, u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum Operation {
    /// Deploy a contract
    Deploy {
        bytecode: Vec<u8>,
        value: U256,
    },
    
    /// Call a contract
    Call {
        to: Address,
        data: Vec<u8>,
        value: U256,
    },
    
    /// Transfer ETH-equivalent
    Transfer {
        to: Address,
        value: U256,
    },
}
```

### EVM Executor

```rust
// src/evm.rs
use revm::{
    primitives::{
        AccountInfo, Bytecode, ExecutionResult, Output, TransactTo, TxEnv,
        CfgEnv, BlockEnv, Env,
    },
    Database, DatabaseCommit, Evm,
};
use alloy_primitives::{Address, U256, Bytes};

pub struct LineraEvmDb<'a> {
    state: &'a mut EvmState,
}

impl<'a> Database for LineraEvmDb<'a> {
    type Error = String;

    fn basic(&mut self, address: Address) -> Result<Option<AccountInfo>, Self::Error> {
        let balance = self.state.balances
            .get(&address)
            .await
            .map_err(|e| e.to_string())?
            .unwrap_or(U256::ZERO);
        
        let nonce = self.state.nonces
            .get(&address)
            .await
            .map_err(|e| e.to_string())?
            .unwrap_or(0);
        
        let code = self.state.contracts
            .get(&address)
            .await
            .map_err(|e| e.to_string())?;
        
        let code_hash = code.as_ref()
            .map(|c| keccak256(c))
            .unwrap_or(KECCAK_EMPTY);
        
        Ok(Some(AccountInfo {
            balance,
            nonce,
            code_hash,
            code: code.map(|c| Bytecode::new_raw(c.into())),
        }))
    }

    fn storage(&mut self, address: Address, index: U256) -> Result<U256, Self::Error> {
        self.state.storage
            .get(&(address, index))
            .await
            .map_err(|e| e.to_string())
            .map(|v| v.unwrap_or(U256::ZERO))
    }

    // ... other Database trait methods
}

pub async fn execute_evm_tx(
    state: &mut EvmState,
    from: Address,
    to: Option<Address>,
    data: Vec<u8>,
    value: U256,
) -> Result<ExecutionResult, String> {
    let mut db = LineraEvmDb { state };
    
    let env = Env {
        cfg: CfgEnv::default(),
        block: BlockEnv::default(),
        tx: TxEnv {
            caller: from,
            transact_to: match to {
                Some(addr) => TransactTo::Call(addr),
                None => TransactTo::Create,
            },
            data: data.into(),
            value,
            ..Default::default()
        },
    };
    
    let mut evm = Evm::builder()
        .with_env(Box::new(env))
        .with_db(&mut db)
        .build();
    
    let result = evm.transact().map_err(|e| format!("{:?}", e))?;
    
    // Commit state changes
    db.commit(result.state);
    
    Ok(result.result)
}
```

### Contract Implementation

```rust
// src/contract.rs
#![cfg_attr(target_arch = "wasm32", no_main)]

use linera_sdk::{Contract, ContractRuntime, base::WithContractAbi};
use alloy_primitives::{Address, U256};

pub struct EvmContract {
    state: EvmState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(EvmContract);

impl Contract for EvmContract {
    // ... standard contract methods
    
    async fn execute_operation(&mut self, operation: Operation) -> Response {
        let sender = self.get_evm_address();
        
        match operation {
            Operation::Deploy { bytecode, value } => {
                let result = execute_evm_tx(
                    &mut self.state,
                    sender,
                    None, // Create
                    bytecode,
                    value,
                ).await.expect("EVM execution failed");
                
                match result {
                    ExecutionResult::Success { output, .. } => {
                        if let Output::Create(_, Some(address)) = output {
                            Response::Deployed { address }
                        } else {
                            Response::Error { message: "Deploy failed".into() }
                        }
                    }
                    ExecutionResult::Revert { output, .. } => {
                        Response::Error { message: format!("Reverted: {:?}", output) }
                    }
                    ExecutionResult::Halt { reason, .. } => {
                        Response::Error { message: format!("Halted: {:?}", reason) }
                    }
                }
            }
            
            Operation::Call { to, data, value } => {
                let result = execute_evm_tx(
                    &mut self.state,
                    sender,
                    Some(to),
                    data,
                    value,
                ).await.expect("EVM execution failed");
                
                match result {
                    ExecutionResult::Success { output, .. } => {
                        if let Output::Call(data) = output {
                            Response::CallResult { data: data.to_vec() }
                        } else {
                            Response::Success
                        }
                    }
                    // ... handle other cases
                }
            }
            
            // ... other operations
        }
    }
}

impl EvmContract {
    /// Convert Linera owner to EVM address
    fn get_evm_address(&self) -> Address {
        let signer = self.runtime.authenticated_signer().unwrap();
        let bytes = signer.as_bytes();
        // Take first 20 bytes for EVM address
        Address::from_slice(&bytes[..20])
    }
}
```

---

## Writing Solidity Contracts

### Example: ERC20 Token

```solidity
// contracts/Token.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LineraToken is ERC20 {
    constructor(string memory name, string memory symbol, uint256 initialSupply) 
        ERC20(name, symbol) 
    {
        _mint(msg.sender, initialSupply);
    }
}
```

### Compile Solidity

```bash
# Using solc
solc --bin --abi contracts/Token.sol -o contracts/compiled/

# Using Foundry
forge build
```

---

## Deploying EVM Contracts

### From CLI

```bash
# Deploy Linera EVM app first
linera project publish-and-create

# Then deploy Solidity contract via operation
linera execute-operation <evm_app_id> '{
  "Deploy": {
    "bytecode": "<hex_bytecode>",
    "value": "0"
  }
}'
```

### From Frontend

```typescript
const deployContract = async (bytecode: string) => {
  const operation = {
    Deploy: {
      bytecode: Array.from(Buffer.from(bytecode, 'hex')),
      value: '0',
    },
  };
  
  const result = await submitOperation(chainId, operation);
  return result.Deployed?.address;
};
```

---

## Calling EVM Contracts

### Encoding Call Data

```typescript
import { Interface } from 'ethers';

const tokenAbi = ['function transfer(address to, uint256 amount)'];
const iface = new Interface(tokenAbi);

const callData = iface.encodeFunctionData('transfer', [
  '0x1234...', // recipient
  ethers.parseEther('100'), // amount
]);

const operation = {
  Call: {
    to: contractAddress,
    data: Array.from(Buffer.from(callData.slice(2), 'hex')),
    value: '0',
  },
};
```

### Decoding Results

```typescript
const resultHex = Buffer.from(result.CallResult.data).toString('hex');
const decoded = iface.decodeFunctionResult('balanceOf', '0x' + resultHex);
console.log('Balance:', decoded[0].toString());
```

---

## Limitations

### Current Limitations

1. **No native ETH** - Must use app-specific token
2. **Limited precompiles** - Some Ethereum precompiles not available
3. **Block context** - Block info differs from Ethereum
4. **Gas metering** - Different from Ethereum gas
5. **State size** - Subject to Linera state limits

### Not Supported

- CREATE2 opcode (limited support)
- SELFDESTRUCT
- Some precompiles (ecrecover, etc.)
- External calls to Ethereum mainnet

---

## Best Practices

### 1. Keep Contracts Simple

```solidity
// Prefer simple state management
contract SimpleStorage {
    mapping(address => uint256) public values;
    
    function set(uint256 value) external {
        values[msg.sender] = value;
    }
}
```

### 2. Handle Address Conversion

```rust
// Always validate address conversions
fn linera_to_evm_address(owner: &Owner) -> Address {
    let bytes = owner.as_bytes();
    assert!(bytes.len() >= 20, "Invalid owner bytes");
    Address::from_slice(&bytes[..20])
}
```

### 3. Test Thoroughly

Test on local devnet before testnet:

```bash
# Local testing
linera net up
# Deploy and test EVM app
linera project publish-and-create
```

---

## Example: Full ERC20 on Linera

See the [linera-protocol examples](https://github.com/linera-io/linera-protocol/tree/main/examples) for complete implementations.
