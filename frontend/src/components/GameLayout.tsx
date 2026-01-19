import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HomeIcon,
  SparklesIcon,
  BoltIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BeakerIcon,
  SignalIcon,
  SignalSlashIcon,
} from '@heroicons/react/24/outline'
import { useWallet } from '@/hooks/useWallet'
import { useUIStore } from '@/stores'
import { useGameData } from '@/stores/gameDataStore'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { formatBalance } from '@/utils/format'
import WalletConnect from '@/components/wallet/WalletConnect'
import FaucetButton from '@/components/wallet/FaucetButton'
import { GAME_NAME } from '@/config'
import { useEffect } from 'react'
import { updateDemoWalletBalance } from '@/lib/demo-wallet'

const navItems = [
  { to: '/', icon: HomeIcon, label: 'Home' },
  { to: '/farm', icon: SparklesIcon, label: 'Stake' },
  { to: '/raid', icon: BoltIcon, label: 'Steal' },
  { to: '/stats', icon: ChartBarIcon, label: 'Stats' },
]

export default function GameLayout() {
  const location = useLocation()
  const { connected, walletType, owner } = useWallet()
  const { balance: gameBalance, playerFarm } = useGameData()
  const { openModal } = useUIStore()
  const { isConnected: networkConnected, networkName, isMockMode, latency } = useNetworkStatus()

  // Use live balance from game data store
  const displayBalance = gameBalance
  const totalStaked = playerFarm?.totalStaked ?? 0
  const pendingYield = playerFarm?.pendingYield ?? 0

  // Sync demo wallet balance when game balance changes
  useEffect(() => {
    if (walletType === 'demo' && connected) {
      updateDemoWalletBalance(gameBalance.toString())
    }
  }, [gameBalance, walletType, connected])

  // Short address display
  const shortAddress = owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : ''

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950">
      {/* TOP BAR - Game HUD style */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 glass border-b border-white/10">
        <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
          {/* Left: Logo & Balance */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-600/30">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl gradient-text hidden sm:block">{GAME_NAME}</span>
            </div>

            {connected && (
              <div className="hidden md:flex items-center gap-4 ml-4 pl-4 border-l border-white/10">
                <div className="flex flex-col">
                  <span className="text-xs text-dark-400">Balance</span>
                  <span className="text-lg font-bold text-yellow-400">
                    {formatBalance(displayBalance)} 🪙
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-dark-400">Staked</span>
                  <span className="text-lg font-bold text-blue-400">
                    {formatBalance(totalStaked)} 📦
                  </span>
                </div>
                {pendingYield > 0 && (
                  <div className="flex flex-col animate-pulse">
                    <span className="text-xs text-dark-400">Yield</span>
                    <span className="text-lg font-bold text-green-400">
                      +{formatBalance(pendingYield)} ✨
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Network Status Indicator */}
            <div 
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
                networkConnected 
                  ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
                  : 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
              }`}
              title={networkConnected ? `Connected to ${networkName} (${latency}ms)` : 'Running in mock mode'}
            >
              {networkConnected ? (
                <SignalIcon className="w-4 h-4" />
              ) : (
                <SignalSlashIcon className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {isMockMode ? 'Mock' : networkName}
              </span>
            </div>

            {/* Tester Settings Button */}
            <button
              onClick={() => openModal('tester-settings')}
              className="p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 hover:bg-yellow-500/30 transition-all group"
              title="Tester Settings"
            >
              <BeakerIcon className="w-5 h-5 text-yellow-400 group-hover:scale-110 transition-transform" />
            </button>

            {connected && <FaucetButton />}
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 pt-16 pb-20 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* BOTTOM BAR - Mobile game navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 glass border-t border-white/10 safe-area-bottom">
        <div className="h-full max-w-lg mx-auto px-2 flex items-center justify-around">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to
            return (
              <NavLink
                key={to}
                to={to}
                className="flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all"
              >
                <motion.div
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    y: isActive ? -4 : 0,
                  }}
                  className={`p-2 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-primary-600 shadow-lg shadow-primary-600/50'
                      : 'bg-dark-800/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-dark-400'}`} />
                </motion.div>
                <span className={`text-xs font-medium ${isActive ? 'text-primary-400' : 'text-dark-500'}`}>
                  {label}
                </span>
              </NavLink>
            )
          })}

          {/* Settings icon */}
          <NavLink
            to="/settings"
            className="flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all"
          >
            <motion.div
              animate={{
                scale: location.pathname === '/settings' ? 1.1 : 1,
                y: location.pathname === '/settings' ? -4 : 0,
              }}
              className={`p-2 rounded-xl transition-colors ${
                location.pathname === '/settings'
                  ? 'bg-primary-600 shadow-lg shadow-primary-600/50'
                  : 'bg-dark-800/50'
              }`}
            >
              <Cog6ToothIcon className={`w-5 h-5 ${location.pathname === '/settings' ? 'text-white' : 'text-dark-400'}`} />
            </motion.div>
            <span className={`text-xs font-medium ${location.pathname === '/settings' ? 'text-primary-400' : 'text-dark-500'}`}>
              More
            </span>
          </NavLink>
        </div>
      </nav>

      {/* Connection Status Indicator */}
      {connected && (
        <div className="fixed bottom-20 right-4 z-40">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs"
          >
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-dark-300">{shortAddress}</span>
            {walletType === 'demo' && (
              <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px]">
                DEMO
              </span>
            )}
          </motion.div>
        </div>
      )}
    </div>
  )
}
