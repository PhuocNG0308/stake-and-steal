// Stake and Steal - Demo Wallet Implementation
// WARNING: Demo wallet is for testing only. Data is stored locally and may be lost!

import type { DemoWalletData, WalletConnection } from './wallet-types';

const DEMO_WALLET_KEY = 'stake-and-steal-demo-wallet';
const DEMO_CHAIN_PREFIX = 'demo-chain-';

// Generate a random hex string
function generateRandomHex(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate demo wallet data
export function generateDemoWallet(): DemoWalletData {
  const owner = `User:${generateRandomHex(32)}`;
  const chainId = `${DEMO_CHAIN_PREFIX}${generateRandomHex(16)}`;
  const privateKey = generateRandomHex(32);
  
  return {
    owner,
    chainId,
    privateKey,
    balance: '10000', // Start with 10000 tokens for testing
    createdAt: Date.now(),
  };
}

// Save demo wallet to localStorage
export function saveDemoWallet(wallet: DemoWalletData): void {
  try {
    localStorage.setItem(DEMO_WALLET_KEY, JSON.stringify(wallet));
  } catch (error) {
    console.error('Failed to save demo wallet:', error);
  }
}

// Load demo wallet from localStorage
export function loadDemoWallet(): DemoWalletData | null {
  try {
    const data = localStorage.getItem(DEMO_WALLET_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load demo wallet:', error);
  }
  return null;
}

// Clear demo wallet from localStorage
export function clearDemoWallet(): void {
  try {
    localStorage.removeItem(DEMO_WALLET_KEY);
  } catch (error) {
    console.error('Failed to clear demo wallet:', error);
  }
}

// Check if demo wallet exists
export function hasDemoWallet(): boolean {
  return loadDemoWallet() !== null;
}

// Update demo wallet balance
export function updateDemoWalletBalance(newBalance: string): void {
  const wallet = loadDemoWallet();
  if (wallet) {
    wallet.balance = newBalance;
    saveDemoWallet(wallet);
  }
}

// Demo wallet connect function
export async function connectDemoWallet(): Promise<WalletConnection> {
  let wallet = loadDemoWallet();
  
  if (!wallet) {
    wallet = generateDemoWallet();
    saveDemoWallet(wallet);
  }
  
  return {
    owner: wallet.owner,
    chains: [wallet.chainId],
  };
}

// Demo wallet sign function (simplified - just returns a mock signature)
export async function signWithDemoWallet(message: string): Promise<string> {
  const wallet = loadDemoWallet();
  if (!wallet) {
    throw new Error('Demo wallet not found');
  }
  
  // Create a simple hash-based signature (NOT cryptographically secure - demo only!)
  const encoder = new TextEncoder();
  const data = encoder.encode(message + wallet.privateKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Export demo wallet info
export function exportDemoWallet(): string | null {
  const wallet = loadDemoWallet();
  if (wallet) {
    return JSON.stringify(wallet, null, 2);
  }
  return null;
}

// Import demo wallet from JSON
export function importDemoWallet(jsonString: string): boolean {
  try {
    const wallet = JSON.parse(jsonString) as DemoWalletData;
    if (wallet.owner && wallet.chainId && wallet.privateKey) {
      saveDemoWallet(wallet);
      return true;
    }
  } catch (error) {
    console.error('Failed to import demo wallet:', error);
  }
  return false;
}
