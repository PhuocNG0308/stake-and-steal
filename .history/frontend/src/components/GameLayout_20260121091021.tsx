import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HomeIcon,
  SparklesIcon,
  BoltIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  WalletIcon,
} from '@heroicons/react/24/solid'
import { useWallet } from '@/hooks/useWallet'
import { useUIStore } from '@/stores'
import { useGameData } from '@/stores/gameDataStore'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useSettingsStore } from '@/stores/settingsStore'
import { formatBalance } from '@/utils/format'
import WalletConnect from '@/components/wallet/WalletConnect'
import FaucetButton from '@/components/wallet/FaucetButton'
import { GAME_NAME } from '@/config'
import { useEffect } from 'react'
import { updateDemoWalletBalance } from '@/lib/demo-wallet'
import bgImage from '../../assets/Background.jpg'

// Navigation Items
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
  const { isConnected: networkConnected, isMockMode } = useNetworkStatus()
  const { showAnimations } = useSettingsStore()

  // Game Data
  const displayBalance = gameBalance
  const totalStaked = playerFarm?.totalStaked ?? 0
  const pendingYield = playerFarm?.pendingYield ?? 0

  // Sync demo wallet logic
  useEffect(() => {
    if (walletType === 'demo' && connected) {
      updateDemoWalletBalance(gameBalance.toString())
    }
  }, [gameBalance, walletType, connected])

  // Framer Motion
  const buttonTap = { scale: 0.92 }
  const springConfig = { type: "spring", stiffness: 300, damping: 20 }

  // Shortened wallet address
  const shortAddress = owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : ''

  return (
    <div className="min-h-screen relative overflow-hidden font-game">
      {/* BACKGROUND IMAGE */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* Dark overlay for better contrast */}
      <div className="fixed inset-0 z-0 bg-black/30" />

      {/* TOP HUD - Game Stats Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 pt-3 px-3">
        <div className="max-w-4xl mx-auto">
          {/* Game Title + Stats Row */}
          <div className="flex items-center justify-between gap-2">
            
            {/* LEFT: Game Logo/Title */}
            <motion.div 
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-sm border border-white/20 shadow-lg"
              whileHover={showAnimations ? { scale: 1.02 } : {}}
              whileTap={showAnimations ? buttonTap : {}}
            >
              <span className="text-2xl">🎮</span>
              <span className="font-black text-white text-shadow hidden sm:block">{GAME_NAME}</span>
            </motion.div>

            {/* CENTER: Balance Display (only when connected) */}
            {connected && (
              <motion.div 
                className="flex items-center gap-3 px-5 py-2 rounded-2xl bg-black/60 backdrop-blur-sm border border-yellow-500/40 shadow-lg"
                initial={showAnimations ? { y: -20, opacity: 0 } : {}}
                animate={{ y: 0, opacity: 1 }}
              >
                {/* Gold Balance */}
                <div className="flex items-center gap-2">
                  <span className="text-xl">🪙</span>
                  <span className="font-black text-yellow-400 text-lg">{formatBalance(displayBalance)}</span>
                </div>

                {/* Staked (if any) */}
                {totalStaked > 0 && (
                  <>
                    <div className="w-px h-6 bg-white/30" />
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📦</span>
                      <span className="font-bold text-green-400 text-sm">{formatBalance(totalStaked)}</span>
                    </div>
                  </>
                )}

                {/* Pending Yield (if any) */}
                {pendingYield > 0 && (
                  <>
                    <div className="w-px h-6 bg-white/30" />
                    <div className="flex items-center gap-2 animate-pulse">
                      <span className="text-lg">✨</span>
                      <span className="font-bold text-yellow-300 text-sm">+{formatBalance(pendingYield)}</span>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* RIGHT: Network Status + Faucet */}
            <div className="flex items-center gap-2">
              {/* Network Badge */}
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                networkConnected 
                  ? 'bg-green-500/80 text-white' 
                  : 'bg-yellow-500/80 text-black'
              }`}>
                {isMockMode ? '🧪 TEST' : networkConnected ? '🟢 LIVE' : '⚠️ OFFLINE'}
              </div>

              {/* Wallet Integration */}
              {connected ? (
                <motion.button
                  onClick={() => openModal('wallet')}
                  className="p-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 transition-all border border-green-500/30"
                  whileTap={showAnimations ? buttonTap : {}}
                >
                  <WalletIcon className="w-5 h-5 text-green-400" />
                </motion.button>
              ) : (
                <div className="scale-90 origin-right">
                   <WalletConnect />
                </div>
              )}
              
              {connected && <FaucetButton />}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 flex-1 pt-20 pb-28 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={showAnimations ? { opacity: 0, y: 15 } : {}}
              animate={{ opacity: 1, y: 0 }}
              exit={showAnimations ? { opacity: 0, y: -15 } : {}}
              transition={springConfig}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-gradient-to-t from-black/90 via-black/80 to-transparent pt-6 pb-2">
          <div className="max-w-lg mx-auto px-4">
            <div className="flex items-end justify-around bg-slate-900/90 backdrop-blur-md rounded-2xl border border-white/10 p-2 shadow-2xl">
              
              {/* Nav Items */}
              {navItems.map(({ to, icon: Icon, label }) => {
                const isActive = location.pathname === to
                return (
                  <NavLink key={to} to={to} className="flex-1">
                    <motion.div
                      className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all ${
                        isActive 
                          ? 'bg-yellow-500/20' 
                          : 'hover:bg-white/5'
                      }`}
                      whileTap={showAnimations ? buttonTap : {}}
                    >
                      <Icon className={`w-6 h-6 ${isActive ? 'text-yellow-400' : 'text-slate-400'}`} />
                      <span className={`text-[10px] mt-1 font-bold ${isActive ? 'text-yellow-400' : 'text-slate-500'}`}>
                        {label}
                      </span>
                    </motion.div>
                  </NavLink>
                )
              })}

              {/* Settings */}
              <NavLink to="/settings" className="flex-1">
                <motion.div
                  className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all ${
                    location.pathname === '/settings' 
                      ? 'bg-yellow-500/20' 
                      : 'hover:bg-white/5'
                  }`}
                  whileTap={showAnimations ? buttonTap : {}}
                >
                  <Cog6ToothIcon className={`w-6 h-6 ${location.pathname === '/settings' ? 'text-yellow-400' : 'text-slate-400'}`} />
                  <span className={`text-[10px] mt-1 font-bold ${location.pathname === '/settings' ? 'text-yellow-400' : 'text-slate-500'}`}>
                    Settings
                  </span>
                </motion.div>
              </NavLink>

              {/* Divider */}
              <div className="w-px h-10 bg-white/10 mx-1" />

              {/* WALLET SECTION - Always visible */}
              <div className="flex-1 min-w-[80px]">
                {connected ? (
                  <motion.button
                    onClick={() => openModal('wallet')}
                    className="w-full flex flex-col items-center py-2 px-1 rounded-xl bg-green-500/20 hover:bg-green-500/30 transition-all"
                    whileTap={showAnimations ? buttonTap : {}}
                  >
                    <WalletIcon className="w-6 h-6 text-green-400" />
                    <span className="text-[10px] mt-1 font-bold text-green-400 truncate max-w-[70px]">
                      {shortAddress}
                    </span>
                  </motion.button>
                ) : (
                  <WalletConnect compact />
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>
  )
}
