// Stake and Steal - Unified Wallet Hook

import { useState, useCallback, useEffect } from 'react';
import type { WalletType, WalletConnection } from '@/lib/wallet-types';
import { useWalletStore } from '@/stores';
import { useGameDataStore } from '@/stores/gameDataStore';
import { 
  connectDemoWallet, 
  signWithDemoWallet, 
  clearDemoWallet,
  loadDemoWallet,
  updateDemoWalletBalance,
  hasDemoWallet 
} from '@/lib/demo-wallet';
import { 
  connectLineraWallet, 
  disconnectLineraWallet, 
  signWithLineraWallet,
  isLineraWalletAvailable,
  checkLineraConnection
} from '@/lib/linera-wallet';
import {
  connectMetaMask,
  signWithMetaMask,
  isMetaMaskAvailable,
  onMetaMaskAccountChange
} from '@/lib/metamask-adapter';
import { 
  requestFaucetTokens, 
  simulateFaucetForDemo,
  checkFaucetStatus 
} from '@/lib/faucet';

export interface WalletState {
  walletType: WalletType;
  connected: boolean;
  owner: string | null;
  chains: string[];
  loading: boolean;
  error: string | null;
  balance: string;
  faucetAvailable: boolean;
}

export function useWallet() {
  // Get zustand store setters to sync state
  const {
    setConnected: setStoreConnected,
    setChainId: setStoreChainId,
    setOwner: setStoreOwner,
    setBalance: setStoreBalance,
    disconnect: storeDisconnect,
  } = useWalletStore();

  // Get game data store for wallet-specific data management
  const { 
    currentWalletId,
    initializePlayer, 
    switchWallet, 
    reset: resetGameData,
    registerOnNetwork 
  } = useGameDataStore();

  const [state, setState] = useState<WalletState>({
    walletType: null,
    connected: false,
    owner: null,
    chains: [],
    loading: false,
    error: null,
    balance: '0',
    faucetAvailable: false,
  });

  // Check for existing connections on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      // Check for existing demo wallet first
      if (hasDemoWallet()) {
        const demoWallet = loadDemoWallet();
        if (demoWallet) {
          setState(s => ({
            ...s,
            walletType: 'demo',
            connected: true,
            owner: demoWallet.owner,
            chains: [demoWallet.chainId],
            balance: demoWallet.balance,
          }));
          // Sync to zustand store
          setStoreConnected(true);
          setStoreOwner(demoWallet.owner);
          setStoreChainId(demoWallet.chainId);
          setStoreBalance(demoWallet.balance);
          return;
        }
      }

      // Check for Linera wallet connection
      if (isLineraWalletAvailable()) {
        const connection = await checkLineraConnection();
        if (connection) {
          setState(s => ({
            ...s,
            walletType: 'linera',
            connected: true,
            owner: connection.owner,
            chains: connection.chains,
          }));
          // Sync to zustand store
          setStoreConnected(true);
          setStoreOwner(connection.owner);
          setStoreChainId(connection.chains[0] || null);
        }
      }
    };

    checkExistingConnection();
    
    // Check faucet availability
    checkFaucetStatus().then(available => {
      setState(s => ({ ...s, faucetAvailable: available }));
    });
  }, []);

  // Listen for MetaMask account changes
  useEffect(() => {
    if (state.walletType === 'metamask') {
      const cleanup = onMetaMaskAccountChange((accounts) => {
        if (accounts.length === 0) {
          // Disconnected
          setState(s => ({
            ...s,
            walletType: null,
            connected: false,
            owner: null,
            chains: [],
          }));
        }
      });
      return cleanup;
    }
  }, [state.walletType]);

  const connect = useCallback(async (type: WalletType) => {
    if (!type) return;

    setState(s => ({ ...s, loading: true, error: null }));

    try {
      let connection: WalletConnection;

      switch (type) {
        case 'demo':
          connection = await connectDemoWallet();
          const demoWallet = loadDemoWallet();
          const walletId = connection.owner || `demo-${Date.now()}`;
          
          // Initialize or switch game data for this wallet
          if (currentWalletId !== walletId) {
            if (!currentWalletId) {
              initializePlayer(parseInt(demoWallet?.balance || '10000'), 0, walletId);
            } else {
              // Register current wallet before switching (for cross-wallet discovery)
              registerOnNetwork();
              switchWallet(walletId);
            }
          }
          
          setState(s => ({
            ...s,
            walletType: 'demo',
            connected: true,
            owner: connection.owner,
            chains: connection.chains,
            balance: demoWallet?.balance || '10000',
            loading: false,
          }));
          // Sync to zustand store
          setStoreConnected(true);
          setStoreOwner(connection.owner);
          setStoreChainId(connection.chains[0] || null);
          setStoreBalance(demoWallet?.balance || '10000');
          return;

        case 'linera':
          if (!isLineraWalletAvailable()) {
            throw new Error('Linera wallet not found. Please install the extension.');
          }
          connection = await connectLineraWallet();
          break;

        case 'metamask':
          if (!isMetaMaskAvailable()) {
            throw new Error('MetaMask not found. Please install the extension.');
          }
          connection = await connectMetaMask();
          break;

        default:
          throw new Error('Unknown wallet type');
      }

      setState(s => ({
        ...s,
        walletType: type,
        connected: true,
        owner: connection.owner,
        chains: connection.chains,
        loading: false,
      }));
      
      // Initialize or switch game data for this wallet
      const newWalletId = connection.owner || `${type}-${Date.now()}`;
      if (currentWalletId !== newWalletId) {
        if (!currentWalletId) {
          initializePlayer(10000, newWalletId);
        } else {
          registerOnNetwork();
          switchWallet(newWalletId);
        }
      }
      
      // Sync to zustand store
      setStoreConnected(true);
      setStoreOwner(connection.owner);
      setStoreChainId(connection.chains[0] || null);
    } catch (error) {
      setState(s => ({
        ...s,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to connect',
      }));
    }
  }, []);

  const disconnect = useCallback(async () => {
    const { walletType } = state;

    try {
      // Register current wallet on network before disconnecting (for cross-wallet discovery)
      registerOnNetwork();
      
      switch (walletType) {
        case 'demo':
          // Optionally keep demo wallet data
          // clearDemoWallet();
          break;
        case 'linera':
          await disconnectLineraWallet();
          break;
        case 'metamask':
          // MetaMask doesn't have a native disconnect
          break;
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }

    // Reset game data for this wallet (but keep networkPlayers for cross-wallet discovery)
    resetGameData();

    setState(s => ({
      ...s,
      walletType: null,
      connected: false,
      owner: null,
      chains: [],
      balance: '0',
    }));
    // Sync to zustand store
    storeDisconnect();
  }, [state.walletType, storeDisconnect, registerOnNetwork, resetGameData]);

  const sign = useCallback(async (message: string): Promise<string> => {
    const { walletType } = state;

    switch (walletType) {
      case 'demo':
        return signWithDemoWallet(message);
      case 'linera':
        return signWithLineraWallet(message);
      case 'metamask':
        return signWithMetaMask(message);
      default:
        throw new Error('No wallet connected');
    }
  }, [state.walletType]);

  const requestFaucet = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    const { walletType, chains } = state;

    if (walletType === 'demo') {
      // Simulate faucet for demo wallet
      const demoWallet = loadDemoWallet();
      if (demoWallet) {
        const newBalance = simulateFaucetForDemo(demoWallet.balance);
        updateDemoWalletBalance(newBalance);
        setState(s => ({ ...s, balance: newBalance }));
        return { success: true, message: 'Demo tokens added! (+10000)' };
      }
      return { success: false, message: 'No demo wallet found' };
    }

    // Real faucet request
    if (chains.length === 0) {
      return { success: false, message: 'No chain selected' };
    }

    const result = await requestFaucetTokens(chains[0]);
    return { success: result.success, message: result.message };
  }, [state.walletType, state.chains]);

  const clearDemoData = useCallback(() => {
    clearDemoWallet();
    if (state.walletType === 'demo') {
      setState(s => ({
        ...s,
        walletType: null,
        connected: false,
        owner: null,
        chains: [],
        balance: '0',
      }));
    }
  }, [state.walletType]);

  return {
    ...state,
    connect,
    disconnect,
    sign,
    requestFaucet,
    clearDemoData,
    isLineraAvailable: isLineraWalletAvailable(),
    isMetaMaskAvailable: isMetaMaskAvailable(),
  };
}
