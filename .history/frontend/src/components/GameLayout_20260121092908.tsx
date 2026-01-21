import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HomeIcon,
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
  { to: '/farm', icon: ChartBarIcon, label: 'Stake' },
  { to: '/raid', icon: BoltIcon, label: 'Steal' },
  { to: '/', icon: HomeIcon, label: 'Home' },
  { to: '/stats', icon: ChartBarIcon, label: 'Stats' },
  { to: '/settings', icon: Cog6ToothIcon, label: 'Settings' },
]

export default function GameLayout() {
  const location = useLocation()
  const { connected, walletType } = useWallet()
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
        {/* Main Bar Container - Deep Blue with Orange Top Border */}
        <div className="h-20 w-full bg-[#0D47A1] border-t-[3px] border-[#FF9800] flex items-stretch shadow-[0_-4px_10px_rgba(0,0,0,0.5)] relative">
          
          {navItems.map(({ to, icon: Icon, label }, index) => {
            // Determine if separator is needed (right side) - except for the last item
            const showSeparator = index < navItems.length - 1;

            return (
              <div key={to} className="flex-1 relative flex justify-center z-10">
                 {/* Clickable Area */}
                <NavLink 
                  to={to} 
                  className={({ isActive }) => 
                    `absolute transition-all duration-300 ease-spring outline-none flex flex-col items-center justify-center 
                    ${isActive ? '-top-6' : 'top-0 h-full w-full'}`
                  }
                >
                  {({ isActive }) => (
                    <motion.div 
                      className={`
                        flex flex-col items-center justify-center shadow-2xl transition-all duration-300
                        ${isActive 
                          ? 'w-20 h-20 rounded-full border-[4px] border-[#FF9800] bg-gradient-to-br from-[#42A5F5] to-[#1565C0]' 
                          : 'w-full h-full hover:bg-white/5'
                        }
                      `}
                      whileTap={showAnimations ? buttonTap : {}}
                      style={isActive ? { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.2)' } : {}}
                    >
                      <Icon className={`transition-all duration-300 ${isActive ? 'w-9 h-9 text-white' : 'w-7 h-7 text-white/50'}`} />
                      
                      {/* Label - Only Visible When Active */}
                      {isActive && (
                        <motion.span 
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-[10px] uppercase font-black text-white leading-none mt-1"
                          style={{ 
                            textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
                          }}
                        >
                          {label}
                        </motion.span>
                      )}
                    </motion.div>
                  )}
                </NavLink>

                {/* Separator (Background only) */}
                {showSeparator && (
                  <div className="absolute inset-y-4 right-0 w-px bg-black/20 pointer-events-none" />
                )}
              </div>
            )
          })}

        </div>
      </nav>
    </div>
  )
}
