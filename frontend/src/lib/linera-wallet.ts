// Stake and Steal - Linera Native Wallet Integration

import type { LineraWallet, WalletConnection } from './wallet-types';

// Check if Linera wallet is available
export function isLineraWalletAvailable(): boolean {
  return typeof window !== 'undefined' && 'lineraWallet' in window;
}

// Get Linera wallet instance
export function getLineraWallet(): LineraWallet | null {
  if (isLineraWalletAvailable()) {
    return window.lineraWallet!;
  }
  return null;
}

// Connect to Linera wallet
export async function connectLineraWallet(): Promise<WalletConnection> {
  const wallet = getLineraWallet();
  if (!wallet) {
    throw new Error('Linera wallet not found. Please install the Linera wallet extension.');
  }

  return wallet.connect();
}

// Disconnect from Linera wallet
export async function disconnectLineraWallet(): Promise<void> {
  const wallet = getLineraWallet();
  if (wallet) {
    await wallet.disconnect();
  }
}

// Sign message with Linera wallet
export async function signWithLineraWallet(message: string): Promise<string> {
  const wallet = getLineraWallet();
  if (!wallet) {
    throw new Error('Linera wallet not connected');
  }
  return wallet.sign(message);
}

// Check if connected (non-blocking)
export async function checkLineraConnection(): Promise<{ owner: string; chains: string[] } | null> {
  const wallet = getLineraWallet();
  if (!wallet) return null;

  try {
    const owner = await wallet.getOwner();
    if (owner) {
      const chains = await wallet.getChains();
      return { owner, chains };
    }
  } catch {
    // Not connected
  }
  return null;
}
