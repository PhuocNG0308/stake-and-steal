// Stake and Steal - Faucet Button Component
// Unified "Get Free Tokens" for all wallet types

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  GiftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { useWallet } from '@/hooks/useWallet';
import { useWalletStore } from '@/stores';
import { useGameDataStore } from '@/stores/gameDataStore';

// Free Token amounts (same for all wallet types in test mode)
const FREE_TOKENS_SAS = 250;   // SAS governance tokens
const FREE_TOKENS_USDT = 100;  // USDT staking tokens

export default function FaucetButton() {
  // Use both hook and store to ensure we catch connected state
  const walletHook = useWallet();
  const walletStore = useWalletStore();
  const { addSasBalance, addUsdtBalance } = useGameDataStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Use either source for connected state (hook or store)
  const connected = walletHook.connected || walletStore.connected;
  const walletType = walletStore.walletType || walletHook.walletType;

  const handleGetFreeTokens = async () => {
    if (!connected) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      // Simulate network delay for all wallet types
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Give SAS + USDT tokens for testing
      // In production with real testnet, this would call the actual Linera faucet
      // For now, all wallets get test tokens locally for gameplay testing
      addSasBalance(FREE_TOKENS_SAS);
      addUsdtBalance(FREE_TOKENS_USDT);
      
      setResult({
        success: true,
        message: `Received ${FREE_TOKENS_SAS} SAS + ${FREE_TOKENS_USDT} USDT`,
      });
      
      // Clear result after 5 seconds
      setTimeout(() => setResult(null), 5000);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get tokens',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return null;
  }

  // Always enabled when connected (no faucet availability check needed for test tokens)
  const isDisabled = loading;

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleGetFreeTokens}
        disabled={isDisabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
          isDisabled
            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-500 hover:to-green-600'
        }`}
      >
        <GiftIcon className={`w-5 h-5 ${loading ? 'animate-pulse' : ''}`} />
        <span>
          {loading ? 'Getting...' : 'Get Free Tokens'}
        </span>
      </motion.button>

      {/* Result Toast */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`absolute top-full mt-2 right-0 p-3 rounded-lg shadow-lg min-w-[200px] ${
            result.success
              ? 'bg-green-900/90 border border-green-600/50'
              : 'bg-danger-900/90 border border-danger-600/50'
          }`}
        >
          <div className="flex items-center gap-2">
            {result.success ? (
              <CheckCircleIcon className="w-5 h-5 text-green-400" />
            ) : (
              <ExclamationCircleIcon className="w-5 h-5 text-danger-400" />
            )}
            <span className={result.success ? 'text-green-300' : 'text-danger-300'}>
              {result.message}
            </span>
          </div>
        </motion.div>
      )}

      {/* Wallet type indicator */}
      {walletType && walletType !== 'demo' && (
        <div className="absolute top-full mt-1 right-0 text-xs text-slate-400">
          Test mode • {walletType}
        </div>
      )}
    </div>
  );
}
