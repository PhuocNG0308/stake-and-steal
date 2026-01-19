// Stake and Steal - Wallet Types and Interfaces

export type WalletType = 'demo' | 'linera' | 'metamask' | null;

export interface WalletConnection {
  owner: string;
  chains: string[];
  publicKey?: string;
}

export interface LineraWallet {
  connect(): Promise<WalletConnection>;
  disconnect(): Promise<void>;
  sign(message: string): Promise<string>;
  getOwner(): Promise<string>;
  getChains(): Promise<string[]>;
}

export interface DemoWalletData {
  owner: string;
  chainId: string;
  privateKey: string;
  balance: string;
  createdAt: number;
}

declare global {
  interface Window {
    lineraWallet?: LineraWallet;
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}
