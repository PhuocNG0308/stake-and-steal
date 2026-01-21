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
      <div className="flex items-center gap-3">
        <div className="hidden sm:block text-right">
          <div className="text-xs text-dark-400">
            {walletType === 'demo' && (
              <span className="text-yellow-400">Demo Mode</span>
            )}
            {walletType === 'linera' && 'Linera Wallet'}
            {walletType === 'metamask' && 'MetaMask'}
          </div>
          <div className="text-sm font-mono">
            {owner.slice(0, 10)}...{owner.slice(-6)}
          </div>
          {walletType === 'demo' && (
            <div className="text-xs text-primary-400">
              Balance: {balance}
            </div>
          )}
        </div>
        <button
          onClick={disconnect}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <WalletIcon className="w-4 h-4" />
          Disconnect
        </button>
      </div>
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
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                onClick={() => setShowModal(false)}
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-dark-900 border border-dark-700 rounded-2xl p-6 z-50 shadow-xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Connect Wallet</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-danger-900/30 border border-danger-600/30 rounded-lg">
                    <p className="text-danger-400 text-sm">{error}</p>
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
                          ? 'border-dark-700 hover:border-primary-500 hover:bg-dark-800'
                          : 'border-dark-800 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${
                          option.available ? 'bg-primary-600/20 text-primary-400' : 'bg-dark-800 text-dark-500'
                        }`}>
                          {option.icon}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold flex items-center gap-2">
                            {option.name}
                            {!option.available && (
                              <span className="text-xs text-dark-500">(Not installed)</span>
                            )}
                          </div>
                          <div className="text-sm text-dark-400">{option.description}</div>
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
                  <div className="mt-4 text-center text-dark-400">
                    Connecting...
                  </div>
                )}

                {/* Detected Wallets Info */}
                {detectedWallets.length > 0 && (
                  <div className="mt-4 p-3 bg-dark-800 rounded-lg">
                    <p className="text-xs text-dark-400 mb-2">Detected Ethereum wallets:</p>
                    <div className="flex flex-wrap gap-2">
                      {detectedWallets.map((wallet, idx) => (
                        <span 
                          key={idx}
                          className={`px-2 py-1 rounded text-xs ${
                            wallet.name === 'MetaMask' 
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                              : 'bg-dark-700 text-dark-300'
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

                <p className="mt-6 text-xs text-dark-500 text-center">
                  By connecting, you agree to the terms of service and acknowledge this is experimental software.
                </p>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
