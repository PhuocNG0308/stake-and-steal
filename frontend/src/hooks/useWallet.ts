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
  connectCheCko,
  disconnectCheCko,
  signWithCheCko,
  isCheCkoAvailable,
  checkCheCkoConnection,
  onCheCkoAccountChange,
  onCheCkoDisconnect
} from '@/lib/checko-wallet';
import {
  connectCroissant,
  disconnectCroissant,
  signWithCroissant,
  isCroissantAvailable,
  checkCroissantConnection,
  onCroissantAccountChange,
  onCroissantDisconnect
} from '@/lib/croissant-wallet';
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
    setWalletType: setStoreWalletType,
    disconnect: storeDisconnect,
  } = useWalletStore();

  // Get game data store for wallet-specific data management
  const { 
    initializePlayer, 
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
          // Sync to zustand store FIRST
          setStoreConnected(true);
          setStoreOwner(demoWallet.owner);
          setStoreChainId(demoWallet.chainId);
          setStoreBalance(demoWallet.balance);
          setStoreWalletType('demo');
          
          // Then update local state
          setState(s => ({
            ...s,
            walletType: 'demo',
            connected: true,
            owner: demoWallet.owner,
            chains: [demoWallet.chainId],
            balance: demoWallet.balance,
          }));
          return;
        }
      }

      // Check for Linera wallet connection
      if (isLineraWalletAvailable()) {
        const connection = await checkLineraConnection();
        if (connection) {
          // Sync to zustand store FIRST
          setStoreConnected(true);
          setStoreOwner(connection.owner);
          setStoreChainId(connection.chains[0] || null);
          setStoreWalletType('linera');
          
          // Then update local state
          setState(s => ({
            ...s,
            walletType: 'linera',
            connected: true,
            owner: connection.owner,
            chains: connection.chains,
          }));
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
          
          // Always initialize fresh data for this wallet connection
          // This ensures clean state when switching between wallets
          initializePlayer(parseInt(demoWallet?.balance || '10000'), 0, walletId);
          
          // Sync to zustand store FIRST (so other components can react immediately)
          setStoreConnected(true);
          setStoreOwner(connection.owner);
          setStoreChainId(connection.chains[0] || null);
          setStoreBalance(demoWallet?.balance || '10000');
          setStoreWalletType('demo');
          
          // Then update local state
          setState(s => ({
            ...s,
            walletType: 'demo',
            connected: true,
            owner: connection.owner,
            chains: connection.chains,
            balance: demoWallet?.balance || '10000',
            loading: false,
          }));
          return;

        case 'linera':
          if (!isLineraWalletAvailable()) {
            throw new Error('Linera wallet not found. Please install the extension.');
          }
          connection = await connectLineraWallet();
          break;

        case 'checko':
          if (!isCheCkoAvailable()) {
            throw new Error('CheCko wallet not found. Please install the CheCko browser extension from https://checko.linera.io');
          }
          connection = await connectCheCko();
          break;

        case 'croissant':
          if (!isCroissantAvailable()) {
            throw new Error('Croissant wallet not found. Please install Croissant from your app store or browser.');
          }
          connection = await connectCroissant();
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

      // Always initialize fresh game data for the newly connected wallet
      // This ensures clean state regardless of previous wallet state
      const newWalletId = connection.owner || `${type}-${Date.now()}`;
      initializePlayer(10000, 0, newWalletId);
      
      // Sync to zustand store FIRST (so other components can react immediately)
      setStoreConnected(true);
      setStoreOwner(connection.owner);
      setStoreChainId(connection.chains[0] || null);
      setStoreWalletType(type);
      
      // Then update local state
      setState(s => ({
        ...s,
        walletType: type,
        connected: true,
        owner: connection.owner,
        chains: connection.chains,
        loading: false,
      }));
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
      if (state.owner) {
        registerOnNetwork();
      }
      
      switch (walletType) {
        case 'demo':
          // Clear demo wallet from localStorage on logout
          clearDemoWallet();
          break;
        case 'linera':
          await disconnectLineraWallet();
          break;
        case 'checko':
          await disconnectCheCko();
          break;
        case 'croissant':
          await disconnectCroissant();
          break;
        case 'metamask':
          // MetaMask doesn't have a native disconnect
          break;
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }

    // IMPORTANT: Reset ALL game data for proper logout
    // This clears player farm, balances, inventory, etc.
    resetGameData();

    // Reset local state
    setState({
      walletType: null,
      connected: false,
      owner: null,
      chains: [],
      loading: false,
      error: null,
      balance: '0',
      faucetAvailable: state.faucetAvailable, // Keep faucet status
    });
    
    // Sync to zustand wallet store
    storeDisconnect();
  }, [state.walletType, state.owner, state.faucetAvailable, storeDisconnect, registerOnNetwork, resetGameData]);

  const sign = useCallback(async (message: string): Promise<string> => {
    const { walletType } = state;

    switch (walletType) {
      case 'demo':
        return signWithDemoWallet(message);
      case 'linera':
        return signWithLineraWallet(message);
      case 'checko':
        return signWithCheCko(message);
      case 'croissant':
        return signWithCroissant(message);
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
    isCheCkoAvailable: isCheCkoAvailable(),
    isCroissantAvailable: isCroissantAvailable(),
    isMetaMaskAvailable: isMetaMaskAvailable(),
  };
}
