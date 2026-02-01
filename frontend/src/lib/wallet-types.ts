// Stake and Steal - Wallet Types and Interfaces

export type WalletType = 'demo' | 'linera' | 'checko' | 'croissant' | 'metamask' | null;

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

// Wallet features support matrix
export interface WalletFeatures {
  crossChainMessaging: boolean;
  transactionSigning: boolean;
  nativeLinera: boolean;
  mobile: boolean;
}

// Get features for each wallet type
export function getWalletFeatures(type: WalletType): WalletFeatures {
  switch (type) {
    case 'demo':
      return { crossChainMessaging: true, transactionSigning: false, nativeLinera: false, mobile: false };
    case 'linera':
      return { crossChainMessaging: true, transactionSigning: true, nativeLinera: true, mobile: false };
    case 'checko':
      return { crossChainMessaging: true, transactionSigning: true, nativeLinera: true, mobile: false };
    case 'croissant':
      return { crossChainMessaging: true, transactionSigning: true, nativeLinera: true, mobile: true };
    case 'metamask':
      return { crossChainMessaging: false, transactionSigning: true, nativeLinera: false, mobile: false };
    default:
      return { crossChainMessaging: false, transactionSigning: false, nativeLinera: false, mobile: false };
  }
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
