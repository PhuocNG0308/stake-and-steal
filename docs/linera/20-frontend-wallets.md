# Wallet Integration

Guide for integrating wallet providers with your Linera frontend application.

## Overview

Linera supports multiple wallet integration options:

1. **Linera Wallet** - Native wallet for Linera
2. **MetaMask** - Via adapter/bridge
3. **Dynamic** - Multi-wallet aggregator
4. **WalletConnect** - Universal wallet connection

---

## Linera Wallet Integration

### Basic Setup

```typescript
// src/lib/wallet.ts

interface LineraWallet {
  connect(): Promise<WalletConnection>;
  disconnect(): Promise<void>;
  sign(message: string): Promise<string>;
  getOwner(): Promise<string>;
  getChains(): Promise<string[]>;
}

interface WalletConnection {
  owner: string;
  chains: string[];
  publicKey: string;
}

// Check if Linera wallet is available
export function isLineraWalletAvailable(): boolean {
  return typeof window !== 'undefined' && 'lineraWallet' in window;
}

// Get wallet instance
export function getLineraWallet(): LineraWallet | null {
  if (isLineraWalletAvailable()) {
    return (window as any).lineraWallet;
  }
  return null;
}
```

### Wallet Hook

```typescript
// src/hooks/useWallet.ts
import { useState, useEffect, useCallback } from 'react';
import { getLineraWallet, isLineraWalletAvailable } from '@/lib/wallet';

interface WalletState {
  connected: boolean;
  owner: string | null;
  chains: string[];
  loading: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    connected: false,
    owner: null,
    chains: [],
    loading: false,
    error: null,
  });

  const connect = useCallback(async () => {
    const wallet = getLineraWallet();
    if (!wallet) {
      setState(s => ({ ...s, error: 'Linera wallet not found' }));
      return;
    }

    setState(s => ({ ...s, loading: true, error: null }));

    try {
      const connection = await wallet.connect();
      setState({
        connected: true,
        owner: connection.owner,
        chains: connection.chains,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      setState(s => ({
        ...s,
        loading: false,
        error: error.message || 'Failed to connect',
      }));
    }
  }, []);

  const disconnect = useCallback(async () => {
    const wallet = getLineraWallet();
    if (wallet) {
      await wallet.disconnect();
    }
    setState({
      connected: false,
      owner: null,
      chains: [],
      loading: false,
      error: null,
    });
  }, []);

  const sign = useCallback(async (message: string): Promise<string> => {
    const wallet = getLineraWallet();
    if (!wallet || !state.connected) {
      throw new Error('Wallet not connected');
    }
    return wallet.sign(message);
  }, [state.connected]);

  // Check connection on mount
  useEffect(() => {
    const wallet = getLineraWallet();
    if (wallet) {
      wallet.getOwner().then(owner => {
        if (owner) {
          wallet.getChains().then(chains => {
            setState({
              connected: true,
              owner,
              chains,
              loading: false,
              error: null,
            });
          });
        }
      }).catch(() => {
        // Not connected
      });
    }
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    sign,
    isAvailable: isLineraWalletAvailable(),
  };
}
```

### Wallet Connect Button

```tsx
// src/components/wallet/WalletConnect.tsx
import { useWallet } from '@/hooks/useWallet';

export function WalletConnect() {
  const {
    connected,
    owner,
    loading,
    error,
    connect,
    disconnect,
    isAvailable,
  } = useWallet();

  if (!isAvailable) {
    return (
      <div className="wallet-connect">
        <a
          href="https://linera.dev/wallet"
          target="_blank"
          rel="noopener noreferrer"
        >
          Install Linera Wallet
        </a>
      </div>
    );
  }

  if (connected && owner) {
    return (
      <div className="wallet-connect wallet-connected">
        <span className="wallet-address">
          {`${owner.slice(0, 8)}...${owner.slice(-6)}`}
        </span>
        <button onClick={disconnect} className="btn-disconnect">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-connect">
      <button
        onClick={connect}
        disabled={loading}
        className="btn-connect"
      >
        {loading ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {error && <span className="error">{error}</span>}
    </div>
  );
}
```

---

## MetaMask Integration (Via Adapter)

### Ethereum-Linera Bridge

```typescript
// src/lib/metamask-adapter.ts
import { ethers } from 'ethers';

interface MetaMaskAdapter {
  connect(): Promise<{ address: string; signer: ethers.Signer }>;
  signMessage(message: string): Promise<string>;
  getLineraOwner(address: string): string;
}

export function createMetaMaskAdapter(): MetaMaskAdapter {
  return {
    async connect() {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      return { address, signer };
    },

    async signMessage(message: string): Promise<string> {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      return signer.signMessage(message);
    },

    // Convert Ethereum address to Linera owner format
    getLineraOwner(address: string): string {
      // Linera uses different address format
      // This is a placeholder - actual conversion depends on Linera's implementation
      return `User:${address.toLowerCase().replace('0x', '')}`;
    },
  };
}
```

### MetaMask Hook

```typescript
// src/hooks/useMetaMask.ts
import { useState, useCallback, useEffect } from 'react';
import { createMetaMaskAdapter } from '@/lib/metamask-adapter';

export function useMetaMask() {
  const [address, setAddress] = useState<string | null>(null);
  const [lineraOwner, setLineraOwner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adapter = createMetaMaskAdapter();

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { address } = await adapter.connect();
      setAddress(address);
      setLineraOwner(adapter.getLineraOwner(address));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const signForLinera = useCallback(async (operation: any): Promise<string> => {
    const message = JSON.stringify(operation);
    return adapter.signMessage(message);
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          setAddress(null);
          setLineraOwner(null);
        } else {
          setAddress(accounts[0]);
          setLineraOwner(adapter.getLineraOwner(accounts[0]));
        }
      });
    }
  }, []);

  return {
    address,
    lineraOwner,
    loading,
    error,
    connect,
    signForLinera,
    isAvailable: typeof window !== 'undefined' && Boolean(window.ethereum),
  };
}
```

---

## Dynamic Wallet Integration

### Setup

```bash
npm install @dynamic-labs/sdk-react-core @dynamic-labs/ethereum
```

### Configuration

```tsx
// src/lib/dynamic.ts
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';

export const DynamicConfig = {
  environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID!,
  walletConnectors: [EthereumWalletConnectors],
};
```

### Provider Setup

```tsx
// src/App.tsx or _app.tsx
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { DynamicConfig } from '@/lib/dynamic';

function App({ children }) {
  return (
    <DynamicContextProvider settings={DynamicConfig}>
      {children}
    </DynamicContextProvider>
  );
}
```

### Using Dynamic

```tsx
// src/components/wallet/DynamicConnect.tsx
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

export function DynamicConnect() {
  const { user, handleLogOut, setShowAuthFlow, primaryWallet } = useDynamicContext();

  if (user && primaryWallet) {
    return (
      <div className="wallet-connected">
        <span>{primaryWallet.address?.slice(0, 8)}...</span>
        <button onClick={handleLogOut}>Disconnect</button>
      </div>
    );
  }

  return (
    <button onClick={() => setShowAuthFlow(true)}>
      Connect Wallet
    </button>
  );
}
```

---

## Universal Wallet Context

### Unified Wallet Provider

```tsx
// src/contexts/WalletContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';

type WalletType = 'linera' | 'metamask' | 'dynamic' | null;

interface WalletContextValue {
  walletType: WalletType;
  connected: boolean;
  owner: string | null;
  chains: string[];
  connect: (type: WalletType) => Promise<void>;
  disconnect: () => Promise<void>;
  sign: (message: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletType, setWalletType] = useState<WalletType>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [chains, setChains] = useState<string[]>([]);

  const connect = useCallback(async (type: WalletType) => {
    switch (type) {
      case 'linera': {
        const wallet = getLineraWallet();
        if (wallet) {
          const connection = await wallet.connect();
          setOwner(connection.owner);
          setChains(connection.chains);
          setWalletType('linera');
        }
        break;
      }
      case 'metamask': {
        const adapter = createMetaMaskAdapter();
        const { address } = await adapter.connect();
        setOwner(adapter.getLineraOwner(address));
        setChains([]);
        setWalletType('metamask');
        break;
      }
      // Add more wallet types...
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (walletType === 'linera') {
      const wallet = getLineraWallet();
      await wallet?.disconnect();
    }
    setWalletType(null);
    setOwner(null);
    setChains([]);
  }, [walletType]);

  const sign = useCallback(async (message: string): Promise<string> => {
    switch (walletType) {
      case 'linera': {
        const wallet = getLineraWallet();
        if (!wallet) throw new Error('Wallet not available');
        return wallet.sign(message);
      }
      case 'metamask': {
        const adapter = createMetaMaskAdapter();
        return adapter.signMessage(message);
      }
      default:
        throw new Error('No wallet connected');
    }
  }, [walletType]);

  return (
    <WalletContext.Provider
      value={{
        walletType,
        connected: Boolean(owner),
        owner,
        chains,
        connect,
        disconnect,
        sign,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within WalletProvider');
  }
  return context;
}
```

### Multi-Wallet Connect UI

```tsx
// src/components/wallet/MultiWalletConnect.tsx
import { useWalletContext } from '@/contexts/WalletContext';

const WALLET_OPTIONS = [
  { type: 'linera' as const, name: 'Linera Wallet', icon: '🔷' },
  { type: 'metamask' as const, name: 'MetaMask', icon: '🦊' },
];

export function MultiWalletConnect() {
  const { connected, owner, walletType, connect, disconnect } = useWalletContext();

  if (connected && owner) {
    return (
      <div className="wallet-connected">
        <span className="wallet-type">{walletType}</span>
        <span className="wallet-address">
          {`${owner.slice(0, 10)}...${owner.slice(-8)}`}
        </span>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    );
  }

  return (
    <div className="wallet-options">
      <h3>Connect Wallet</h3>
      {WALLET_OPTIONS.map((option) => (
        <button
          key={option.type}
          onClick={() => connect(option.type)}
          className="wallet-option"
        >
          <span className="icon">{option.icon}</span>
          <span className="name">{option.name}</span>
        </button>
      ))}
    </div>
  );
}
```

---

## Signed Transactions

### Signing Operations

```typescript
// src/lib/signedOperations.ts
import { useWalletContext } from '@/contexts/WalletContext';

export function useSignedOperation() {
  const { sign, owner } = useWalletContext();

  const submitSignedOperation = async (
    chainId: string,
    operation: any
  ) => {
    if (!owner) {
      throw new Error('Wallet not connected');
    }

    // Serialize operation
    const payload = {
      operation,
      owner,
      timestamp: Date.now(),
    };
    const message = JSON.stringify(payload);

    // Sign with wallet
    const signature = await sign(message);

    // Submit to node service
    const response = await fetch(
      `${config.nodeServiceUrl}/chains/${chainId}/signed-operations`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: message,
          signature,
        }),
      }
    );

    return response.json();
  };

  return { submitSignedOperation };
}
```

### Using Signed Operations

```tsx
function SecureTransfer() {
  const { connected, owner } = useWalletContext();
  const { submitSignedOperation } = useSignedOperation();
  const [loading, setLoading] = useState(false);

  const handleTransfer = async (to: string, amount: bigint) => {
    if (!connected) {
      alert('Please connect wallet first');
      return;
    }

    setLoading(true);
    try {
      const operation = {
        Transfer: {
          to,
          amount: amount.toString(),
        },
      };

      const result = await submitSignedOperation(config.chainId, operation);
      console.log('Transfer result:', result);
    } catch (error) {
      console.error('Transfer failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    // ... form UI
  );
}
```

---

## Security Considerations

### 1. Validate Signatures Server-Side

Always verify signatures on the backend/contract before processing.

### 2. Message Replay Protection

Include timestamps and nonces in signed messages:

```typescript
const payload = {
  operation,
  owner,
  timestamp: Date.now(),
  nonce: crypto.randomUUID(),
};
```

### 3. Domain Binding

Include app-specific data to prevent cross-app attacks:

```typescript
const payload = {
  domain: 'my-linera-app.com',
  chainId: config.chainId,
  appId: config.appId,
  operation,
  // ...
};
```

### 4. Clear Session on Disconnect

```typescript
const disconnect = async () => {
  await wallet.disconnect();
  // Clear any cached data
  localStorage.removeItem('wallet_session');
  // Reset app state
  setOwner(null);
  setChains([]);
};
```
