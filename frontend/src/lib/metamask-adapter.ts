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

// Linera Testnet Conway network configuration for MetaMask
// Note: Linera is not an EVM chain, but we can use MetaMask for signing
// This network info is for reference and wallet identification
export const LINERA_TESTNET_CONWAY = {
  chainId: '0x' + (59141).toString(16), // Custom chain ID for Linera Testnet Conway
  chainName: 'Linera Testnet Conway',
  nativeCurrency: {
    name: 'LINERA',
    symbol: 'LNRA',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.testnet-conway.linera.net'],
  blockExplorerUrls: ['https://explorer.testnet-conway.linera.net'],
};

/**
 * Try to switch MetaMask to Linera Testnet Conway network
 * If the network doesn't exist, add it first
 */
export async function switchToLineraTestnet(provider: any): Promise<boolean> {
  try {
    // Try to switch to the network
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: LINERA_TESTNET_CONWAY.chainId }],
    });
    return true;
  } catch (switchError: any) {
    // Error code 4902 means the chain hasn't been added to MetaMask
    if (switchError.code === 4902) {
      try {
        // Add the network
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: LINERA_TESTNET_CONWAY.chainId,
            chainName: LINERA_TESTNET_CONWAY.chainName,
            nativeCurrency: LINERA_TESTNET_CONWAY.nativeCurrency,
            rpcUrls: LINERA_TESTNET_CONWAY.rpcUrls,
            blockExplorerUrls: LINERA_TESTNET_CONWAY.blockExplorerUrls,
          }],
        });
        return true;
      } catch (addError) {
        console.error('Failed to add Linera network:', addError);
        // Network add failed, but we can still use the wallet for signing
        return false;
      }
    }
    // User rejected or other error - continue without switching
    console.warn('Network switch skipped:', switchError.message);
    return false;
  }
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
// This performs an authentication by signing a message to prove ownership
export async function connectMetaMask(): Promise<WalletConnection> {
  const metamaskProvider = getMetaMaskProvider();
  if (!metamaskProvider) {
    throw new Error('MetaMask not installed. Please install MetaMask extension.');
  }
  
  const adapter = createMetaMaskAdapter();
  const { address, signer } = await adapter.connect();
  
  // Try to switch to Linera Testnet Conway (optional - doesn't block connection)
  const networkSwitched = await switchToLineraTestnet(metamaskProvider);
  console.log('Linera network switch:', networkSwitched ? 'success' : 'skipped');
  
  // Sign a message to authenticate the user (proves wallet ownership)
  const timestamp = Date.now();
  const networkInfo = networkSwitched ? 'Connected to Linera Testnet Conway' : 'Using MetaMask for signing';
  const authMessage = `Sign this message to authenticate with Stake and Steal.\n\nNetwork: Linera Testnet Conway\nWallet: ${address}\nTimestamp: ${timestamp}\n\n${networkInfo}\n\nThis signature does not trigger any blockchain transaction or cost any gas fees.`;
  
  try {
    const signature = await signer.signMessage(authMessage);
    console.log('MetaMask authentication signature:', signature);
    
    // In production, you would verify this signature on the backend
    // For now, we just confirm the user signed the message
  } catch (error) {
    throw new Error('Authentication cancelled. Please sign the message to connect.');
  }
  
  return {
    owner: adapter.getLineraOwner(address),
    chains: [], // MetaMask doesn't provide Linera chains directly
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
