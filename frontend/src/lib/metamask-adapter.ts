// Stake and Steal - MetaMask Adapter
// Allows using MetaMask for signing operations on Linera

import { ethers } from 'ethers';
import type { WalletConnection } from './wallet-types';

export interface MetaMaskAdapter {
  connect(): Promise<{ address: string; signer: ethers.Signer }>;
  signMessage(message: string): Promise<string>;
  getLineraOwner(address: string): string;
  disconnect(): Promise<void>;
}

// Detect available Ethereum wallets
export interface DetectedWallet {
  name: string;
  provider: any;
  icon?: string;
}

// Extended ethereum provider type for detection
interface ExtendedEthereumProvider {
  isMetaMask?: boolean;
  isOKExWallet?: boolean;
  providers?: ExtendedEthereumProvider[];
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
}

export function detectEthereumWallets(): DetectedWallet[] {
  const wallets: DetectedWallet[] = [];
  
  if (typeof window === 'undefined' || !window.ethereum) {
    return wallets;
  }

  const ethereum = window.ethereum as ExtendedEthereumProvider;

  // Check for MetaMask specifically
  if (ethereum.isMetaMask && !ethereum.isOKExWallet) {
    wallets.push({
      name: 'MetaMask',
      provider: ethereum,
      icon: 'metamask',
    });
  }

  // Check for OKX Wallet
  const okxwallet = (window as any).okxwallet;
  if (okxwallet) {
    wallets.push({
      name: 'OKX Wallet',
      provider: okxwallet,
      icon: 'okx',
    });
  }

  // Check if window.ethereum has providers array (EIP-6963 style)
  if (ethereum.providers && Array.isArray(ethereum.providers)) {
    for (const provider of ethereum.providers) {
      if (provider.isMetaMask && !provider.isOKExWallet) {
        // Only add if MetaMask not already added
        if (!wallets.find(w => w.name === 'MetaMask')) {
          wallets.push({
            name: 'MetaMask',
            provider,
            icon: 'metamask',
          });
        }
      }
    }
  }

  // Fallback: if no specific wallets detected but ethereum exists
  if (wallets.length === 0 && ethereum) {
    wallets.push({
      name: ethereum.isOKExWallet ? 'OKX Wallet' : 'Browser Wallet',
      provider: ethereum,
      icon: 'default',
    });
  }

  return wallets;
}

// Get specific MetaMask provider (avoiding OKX override)
export function getMetaMaskProvider(): any {
  if (typeof window === 'undefined') return null;
  
  const ethereum = window.ethereum as ExtendedEthereumProvider | undefined;
  if (!ethereum) return null;
  
  // Check providers array first (EIP-6963)
  if (ethereum.providers && Array.isArray(ethereum.providers)) {
    const metamask = ethereum.providers.find(
      (p) => p.isMetaMask && !p.isOKExWallet
    );
    if (metamask) return metamask;
  }
  
  // Direct check
  if (ethereum.isMetaMask && !ethereum.isOKExWallet) {
    return ethereum;
  }
  
  return null;
}

// Check if MetaMask is available (not overridden by OKX)
export function isMetaMaskAvailable(): boolean {
  return getMetaMaskProvider() !== null;
}

// Create MetaMask adapter instance - uses specific MetaMask provider
export function createMetaMaskAdapter(): MetaMaskAdapter {
  const metamaskProvider = getMetaMaskProvider();
  
  return {
    async connect() {
      if (!metamaskProvider) {
        throw new Error('MetaMask not installed. Please install MetaMask extension.');
      }

      const provider = new ethers.BrowserProvider(metamaskProvider);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      return { address, signer };
    },

    async signMessage(message: string): Promise<string> {
      if (!metamaskProvider) {
        throw new Error('MetaMask not installed');
      }

      const provider = new ethers.BrowserProvider(metamaskProvider);
      const signer = await provider.getSigner();
      return signer.signMessage(message);
    },

    // Convert Ethereum address to Linera owner format
    getLineraOwner(address: string): string {
      // Linera uses a different address format
      // We derive a Linera-compatible owner from the Ethereum address
      return `User:${address.toLowerCase().replace('0x', '')}${'0'.repeat(24)}`;
    },

    async disconnect(): Promise<void> {
      // MetaMask doesn't have a native disconnect, but we can clear local state
      // The actual disconnection happens in the wallet store
    },
  };
}

// Connect via MetaMask and return Linera-compatible connection
export async function connectMetaMask(): Promise<WalletConnection> {
  const adapter = createMetaMaskAdapter();
  const { address } = await adapter.connect();
  
  return {
    owner: adapter.getLineraOwner(address),
    chains: [], // MetaMask doesn't provide Linera chains
    publicKey: address,
  };
}

// Sign message with MetaMask
export async function signWithMetaMask(message: string): Promise<string> {
  const adapter = createMetaMaskAdapter();
  return adapter.signMessage(message);
}

// Listen for MetaMask account changes
export function onMetaMaskAccountChange(callback: (accounts: string[]) => void): () => void {
  const metamaskProvider = getMetaMaskProvider();
  if (!metamaskProvider) return () => {};
  
  const handler = (accounts: unknown) => {
    callback(accounts as string[]);
  };
  
  metamaskProvider.on('accountsChanged', handler);
  
  // Return cleanup function
  return () => {
    metamaskProvider?.removeListener('accountsChanged', handler);
  };
}
