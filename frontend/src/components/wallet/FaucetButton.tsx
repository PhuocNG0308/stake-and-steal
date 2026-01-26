// Stake and Steal - Faucet Button Component

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  GiftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { useWallet } from '@/hooks/useWallet';
import { useGameDataStore } from '@/stores/gameDataStore';

export default function FaucetButton() {
  const { connected, walletType, faucetAvailable, requestFaucet } = useWallet();
  const { addSasBalance } = useGameDataStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleRequestFaucet = async () => {
    if (!connected) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      // Special handling for Demo Wallet - Give SAS instead of USDT
      if (walletType === 'demo') {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        addSasBalance(250);
        
        setResult({
          success: true,
          message: 'Received 250 SAS Tokens',
        });
        
        // Clear result after 5 seconds
        setTimeout(() => setResult(null), 5000);
        setLoading(false);
        return;
      }

      const response = await requestFaucet();
      setResult(response);
      
      // Clear result after 5 seconds
      setTimeout(() => setResult(null), 5000);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Faucet request failed',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return null;
  }

  const isDemoMode = walletType === 'demo';
  const isDisabled = loading || (!isDemoMode && !faucetAvailable);

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleRequestFaucet}
        disabled={isDisabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
          isDisabled
            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-500 hover:to-green-600'
        }`}
      >
        <GiftIcon className={`w-5 h-5 ${loading ? 'animate-pulse' : ''}`} />
        <span>
          {loading ? 'Requesting...' : isDemoMode ? 'Get Demo Tokens' : 'Claim Faucet'}
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

      {/* Faucet unavailable warning */}
      {!isDemoMode && !faucetAvailable && (
        <div className="absolute top-full mt-1 right-0 text-xs text-dark-500">
          Faucet unavailable
        </div>
      )}
    </div>
  );
}
