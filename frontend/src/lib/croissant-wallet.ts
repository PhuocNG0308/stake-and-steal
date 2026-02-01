/**
 * Croissant Wallet Integration for Linera
 * 
 * Croissant is a mobile-first wallet for Linera Protocol.
 * It can connect via:
 * - WalletConnect protocol
 * - Deep links (mobile)
 * - Browser extension (desktop)
 * 
 * Features:
 * - Cross-platform support (iOS, Android, Web)
 * - QR code connection
 * - Native Linera support
 */

import type { WalletConnection } from './wallet-types';

// Croissant wallet interface
export interface CroissantWallet {
  isCroissant: boolean;
  version: string;
  connect(): Promise<{ owner: string; chains: string[] }>;
  disconnect(): Promise<void>;
  sign(message: string): Promise<string>;
  getOwner(): Promise<string>;
  getChains(): Promise<string[]>;
  // Mobile-specific
  getDeepLink(action: string, params?: Record<string, string>): string;
  // Transaction methods
  submitOperation(chainId: string, appId: string, operation: unknown): Promise<{ hash: string }>;
  // Events
  on(event: 'connect' | 'disconnect' | 'accountsChanged', callback: (...args: unknown[]) => void): void;
  removeListener(event: string, callback: (...args: unknown[]) => void): void;
}

// WalletConnect-style session for Croissant
export interface CroissantSession {
  topic: string;
  owner: string;
  chains: string[];
  expiry: number;
}

// Extend Window interface
declare global {
  interface Window {
    croissant?: CroissantWallet;
  }
}

// Check if Croissant is available
export function isCroissantAvailable(): boolean {
  return typeof window !== 'undefined' && 'croissant' in window && window.croissant?.isCroissant === true;
}

// Check if on mobile
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Get Croissant wallet instance
export function getCroissant(): CroissantWallet | null {
  if (isCroissantAvailable()) {
    return window.croissant!;
  }
  return null;
}

// Connect to Croissant wallet
export async function connectCroissant(): Promise<WalletConnection> {
  const wallet = getCroissant();
  if (!wallet) {
    // If on mobile, try to open Croissant app
    if (isMobileDevice()) {
      const deepLink = getCroissantDeepLink('connect');
      window.location.href = deepLink;
      throw new Error('Opening Croissant app...');
    }
    throw new Error('Croissant wallet not found. Please install Croissant wallet.');
  }

  try {
    const result = await wallet.connect();
    return {
      owner: result.owner,
      chains: result.chains,
    };
  } catch (error) {
    throw new Error(`Croissant connection failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Get Croissant deep link for mobile
export function getCroissantDeepLink(action: string, params?: Record<string, string>): string {
  const baseUrl = 'croissant://';
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return `${baseUrl}${action}${query}`;
}

// Get Croissant app store link
export function getCroissantAppLink(): string {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    return 'https://apps.apple.com/app/croissant-linera-wallet/id0000000000'; // Placeholder
  }
  return 'https://play.google.com/store/apps/details?id=io.linera.croissant'; // Placeholder
}

// Disconnect from Croissant wallet
export async function disconnectCroissant(): Promise<void> {
  const wallet = getCroissant();
  if (wallet) {
    try {
      await wallet.disconnect();
    } catch (error) {
      console.error('Croissant disconnect error:', error);
    }
  }
}

// Sign message with Croissant wallet
export async function signWithCroissant(message: string): Promise<string> {
  const wallet = getCroissant();
  if (!wallet) {
    throw new Error('Croissant wallet not connected');
  }
  return wallet.sign(message);
}

// Check current connection status
export async function checkCroissantConnection(): Promise<WalletConnection | null> {
  const wallet = getCroissant();
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

// Submit operation via Croissant
export async function submitOperationViaCroissant(
  chainId: string,
  appId: string,
  operation: unknown
): Promise<{ success: boolean; hash?: string; error?: string }> {
  const wallet = getCroissant();
  if (!wallet) {
    return { success: false, error: 'Croissant wallet not connected' };
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
export function onCroissantAccountChange(callback: (owner: string | null) => void): () => void {
  const wallet = getCroissant();
  if (!wallet) return () => {};

  const handler = (owner: unknown) => {
    callback(owner as string | null);
  };

  wallet.on('accountsChanged', handler);
  return () => wallet.removeListener('accountsChanged', handler);
}

// Listen for connect event
export function onCroissantConnect(callback: (session: CroissantSession) => void): () => void {
  const wallet = getCroissant();
  if (!wallet) return () => {};

  const handler = (session: unknown) => {
    callback(session as CroissantSession);
  };

  wallet.on('connect', handler);
  return () => wallet.removeListener('connect', handler);
}

// Listen for disconnect
export function onCroissantDisconnect(callback: () => void): () => void {
  const wallet = getCroissant();
  if (!wallet) return () => {};

  wallet.on('disconnect', callback);
  return () => wallet.removeListener('disconnect', callback);
}

// Generate QR code data for mobile connection
export function getCroissantQRCodeData(appId: string, chainId: string): string {
  return JSON.stringify({
    protocol: 'croissant',
    version: '1.0',
    appId,
    chainId,
    timestamp: Date.now(),
  });
}
