/**
 * CheCko Wallet Integration for Linera
 * 
 * CheCko is a browser extension wallet for Linera Protocol.
 * It injects `window.checko` into the page.
 * 
 * Features:
 * - Native Linera support
 * - Cross-chain messaging
 * - Transaction signing
 */

import type { WalletConnection } from './wallet-types';

// CheCko wallet interface
export interface CheCkoWallet {
  isCheCko: boolean;
  connect(): Promise<{ owner: string; chains: string[] }>;
  disconnect(): Promise<void>;
  sign(message: string): Promise<string>;
  getOwner(): Promise<string>;
  getChains(): Promise<string[]>;
  requestChain(chainId: string): Promise<boolean>;
  // Transaction methods
  submitOperation(chainId: string, appId: string, operation: unknown): Promise<{ hash: string }>;
  // Events
  on(event: 'accountsChanged' | 'chainsChanged' | 'disconnect', callback: (...args: unknown[]) => void): void;
  removeListener(event: string, callback: (...args: unknown[]) => void): void;
}

// Extend Window interface
declare global {
  interface Window {
    checko?: CheCkoWallet;
  }
}

// Check if CheCko is available
export function isCheCkoAvailable(): boolean {
  return typeof window !== 'undefined' && 'checko' in window && window.checko?.isCheCko === true;
}

// Get CheCko wallet instance
export function getCheCko(): CheCkoWallet | null {
  if (isCheCkoAvailable()) {
    return window.checko!;
  }
  return null;
}

// Connect to CheCko wallet
export async function connectCheCko(): Promise<WalletConnection> {
  const wallet = getCheCko();
  if (!wallet) {
    throw new Error('CheCko wallet not found. Please install the CheCko browser extension.');
  }

  try {
    const result = await wallet.connect();
    return {
      owner: result.owner,
      chains: result.chains,
    };
  } catch (error) {
    throw new Error(`CheCko connection failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Disconnect from CheCko wallet
export async function disconnectCheCko(): Promise<void> {
  const wallet = getCheCko();
  if (wallet) {
    try {
      await wallet.disconnect();
    } catch (error) {
      console.error('CheCko disconnect error:', error);
    }
  }
}

// Sign message with CheCko wallet
export async function signWithCheCko(message: string): Promise<string> {
  const wallet = getCheCko();
  if (!wallet) {
    throw new Error('CheCko wallet not connected');
  }
  return wallet.sign(message);
}

// Check current connection status
export async function checkCheCkoConnection(): Promise<WalletConnection | null> {
  const wallet = getCheCko();
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

// Submit operation via CheCko
export async function submitOperationViaCheCko(
  chainId: string,
  appId: string,
  operation: unknown
): Promise<{ success: boolean; hash?: string; error?: string }> {
  const wallet = getCheCko();
  if (!wallet) {
    return { success: false, error: 'CheCko wallet not connected' };
  }

  try {
    const result = await wallet.submitOperation(chainId, appId, operation);
    return { success: true, hash: result.hash };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// Listen for account changes
export function onCheCkoAccountChange(callback: (owner: string | null) => void): () => void {
  const wallet = getCheCko();
  if (!wallet) return () => {};

  const handler = (owner: unknown) => {
    callback(owner as string | null);
  };

  wallet.on('accountsChanged', handler);
  return () => wallet.removeListener('accountsChanged', handler);
}

// Listen for chain changes
export function onCheCkoChainChange(callback: (chains: string[]) => void): () => void {
  const wallet = getCheCko();
  if (!wallet) return () => {};

  const handler = (chains: unknown) => {
    callback(chains as string[]);
  };

  wallet.on('chainsChanged', handler);
  return () => wallet.removeListener('chainsChanged', handler);
}

// Listen for disconnect
export function onCheCkoDisconnect(callback: () => void): () => void {
  const wallet = getCheCko();
  if (!wallet) return () => {};

  wallet.on('disconnect', callback);
  return () => wallet.removeListener('disconnect', callback);
}
