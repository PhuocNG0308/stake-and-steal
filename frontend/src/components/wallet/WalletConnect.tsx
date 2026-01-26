// Stake and Steal - Wallet Connect Component

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  WalletIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  BeakerIcon,
  CubeIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useWallet } from '@/hooks/useWallet';
import type { WalletType } from '@/lib/wallet-types';
import { detectEthereumWallets, type DetectedWallet } from '@/lib/metamask-adapter';

interface WalletOption {
  type: WalletType;
  name: string;
  icon: React.ReactNode;
  description: string;
  available: boolean;
  warning?: string;
  subOptions?: DetectedWallet[];
}

interface WalletConnectProps {
  compact?: boolean;
}

export default function WalletConnect({ compact = false }: WalletConnectProps) {
  const {
    connected,
    owner,
    walletType,
    loading,
    error,
    balance,
    connect,
    disconnect,
    isLineraAvailable,
    isMetaMaskAvailable,
  } = useWallet();

  const [showModal, setShowModal] = useState(false);
  const [detectedWallets, setDetectedWallets] = useState<DetectedWallet[]>([]);

  // Detect available wallets when modal opens
  useEffect(() => {
    if (showModal) {
      const wallets = detectEthereumWallets();
      setDetectedWallets(wallets);
    }
  }, [showModal]);

  const walletOptions: WalletOption[] = [
    {
      type: 'demo',
      name: 'Demo Wallet',
      icon: <BeakerIcon className="w-6 h-6" />,
      description: 'Try the game without real tokens',
      available: true,
      warning: 'Demo wallet data is stored locally and will NOT sync to testnet. Use for testing only!',
    },
    {
      type: 'linera',
      name: 'Linera Wallet',
      icon: <CubeIcon className="w-6 h-6" />,
      description: 'Connect with native Linera wallet',
      available: isLineraAvailable,
    },
    {
      type: 'metamask',
      name: 'MetaMask',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.77 5.24l-9.01-4.71c-.47-.25-1.03-.25-1.51 0L2.24 5.24c-.47.25-.76.73-.76 1.26v10.99c0 .52.29 1.01.76 1.26l9.01 4.71c.24.12.51.19.78.19s.54-.06.78-.19l9.01-4.71c.47-.25.76-.73.76-1.26V6.5c-.02-.53-.31-1.01-.79-1.26z"/>
        </svg>
      ),
      description: isMetaMaskAvailable 
        ? 'Connect via MetaMask (adapter)' 
        : detectedWallets.length > 0 
          ? `${detectedWallets.length} wallet(s) detected - select one`
          : 'No Ethereum wallet detected',
      available: isMetaMaskAvailable || detectedWallets.length > 0,
      subOptions: detectedWallets.length > 1 ? detectedWallets : undefined,
    },
  ];

  const handleConnect = async (type: WalletType) => {
    await connect(type);
    setShowModal(false);
  };

  if (connected && owner) {
    return (
      <button
        onClick={disconnect}
        className="text-sm flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors border shadow-sm
          bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300
          dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white dark:border-slate-600"
      >
        <WalletIcon className="w-4 h-4" />
        Log Out
      </button>
    );
  }

  return (
    <>
      {compact ? (
        <motion.button
          onClick={() => setShowModal(true)}
          className="w-full flex flex-col items-center py-2 px-1 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 transition-all"
          whileTap={{ scale: 0.92 }}
        >
          <WalletIcon className="w-6 h-6 text-yellow-400" />
          <span className="text-[10px] mt-1 font-bold text-yellow-400">Connect</span>
        </motion.button>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <WalletIcon className="w-5 h-5" />
          Connect Wallet
        </button>
      )}

      {createPortal(
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowModal(false)}
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl text-white"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold font-game">Connect Wallet</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-900/30 border border-red-600/30 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <div className="space-y-3">
                  {walletOptions.map((option) => (
                    <button
                      key={option.type}
                      onClick={() => handleConnect(option.type)}
                      disabled={!option.available || loading}
                      className={`w-full p-4 rounded-xl border transition-all text-left ${
                        option.available
                          ? 'border-slate-700 hover:border-blue-500 hover:bg-slate-800'
                          : 'border-slate-800 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${
                          option.available ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-800 text-slate-500'
                        }`}>
                          {option.icon}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold flex items-center gap-2 text-slate-100">
                            {option.name}
                            {!option.available && (
                              <span className="text-xs text-slate-500">(Not installed)</span>
                            )}
                          </div>
                          <div className="text-sm text-slate-400">{option.description}</div>
                        </div>
                      </div>
                      
                      {option.warning && option.available && (
                        <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded-lg flex items-start gap-2">
                          <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-yellow-300">{option.warning}</p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {loading && (
                  <div className="mt-4 text-center text-slate-400">
                    Connecting...
                  </div>
                )}

                {/* Detected Wallets Info */}
                {detectedWallets.length > 0 && (
                  <div className="mt-4 p-3 bg-slate-800 rounded-lg">
                    <p className="text-xs text-slate-400 mb-2">Detected Ethereum wallets:</p>
                    <div className="flex flex-wrap gap-2">
                      {detectedWallets.map((wallet, idx) => (
                        <span 
                          key={idx}
                          className={`px-2 py-1 rounded text-xs ${
                            wallet.name === 'MetaMask' 
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {wallet.name === 'MetaMask' && <CheckIcon className="w-3 h-3 inline mr-1" />}
                          {wallet.name}
                        </span>
                      ))}
                    </div>
                    {detectedWallets.length > 1 && !isMetaMaskAvailable && (
                      <p className="text-xs text-yellow-400 mt-2">
                        ⚠️ Multiple wallets detected. MetaMask may be overridden by another wallet.
                      </p>
                    )}
                  </div>
                )}

                <p className="mt-6 text-xs text-slate-500 text-center">
                  By connecting, you agree to the terms of service and acknowledge this is experimental software.
                </p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
