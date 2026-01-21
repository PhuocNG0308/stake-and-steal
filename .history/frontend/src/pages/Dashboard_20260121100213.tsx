/**
 * Dashboard - Royal Match Farm Style
 */

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  PlayIcon,
  WalletIcon,
} from '@heroicons/react/24/outline'
import { useWalletStore } from '../stores'
import { useGameData } from '../stores/gameDataStore'
import { useTestSettings } from '../hooks/useTestSettings'
import { useSettingsStore } from '../stores/settingsStore'
import { formatBalance } from '../utils/format'

export default function Dashboard() {
  const { connected } = useWalletStore()
  const { 
    playerFarm,
    balance, 
    stats, 
    isInitialized,
    winRate,
    initializePlayer,
    tickYield,
  } = useGameData()
  const { settings } = useTestSettings()
  const { showAnimations } = useSettingsStore()

  const springTransition = { type: "spring", stiffness: 300, damping: 20 }

  // Initialize player if connected but not initialized
  useEffect(() => {
    if (connected && !isInitialized) {
      initializePlayer(10000)
    }
  }, [connected, isInitialized, initializePlayer])

  // Yield ticking
  useEffect(() => {
    if (!playerFarm || playerFarm.totalStaked === 0) return

    const interval = setInterval(() => {
      tickYield({
        apyPercent: settings.apyPercent,
        dayDurationSeconds: settings.dayDurationSeconds,
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [playerFarm?.totalStaked, settings.apyPercent, settings.dayDurationSeconds, tickYield])

  // Not connected state
  if (!connected) {
    return (
      <motion.div
        initial={showAnimations ? { opacity: 0, scale: 0.95 } : {}}
        animate={{ opacity: 1, scale: 1 }}
        transition={springTransition}
        className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4"
      >
        <motion.div
          animate={showAnimations ? { 
            y: [0, -20, 0],
          } : {}}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="text-9xl mb-8 drop-shadow-royal"
        >
          🌾
        </motion.div>

        <h1 className="text-5xl font-black mb-4 text-white text-outline-royal">
          <span className="text-yellow-400 text-outline-royal">Welcome Farmer!</span>
        </h1>
        <p className="text-white text-outline-royal max-w-md mb-12 text-xl font-bold">
          Connect your wallet to start your Royal Farm adventure! 🚜
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-6xl mb-12">
          {[
            { title: 'Stake', desc: 'Grow royal crops for rewards', emoji: '🌱' },
            { title: 'Steal', desc: 'Raid rival farms', emoji: '⚔️' },
            { title: 'Defend', desc: 'Protect your harvest', emoji: '🛡️' },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={showAnimations ? { opacity: 0, y: 20 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, ...springTransition }}
              whileHover={showAnimations ? { scale: 1.08, y: -8 } : {}}
              className="card-panel text-center bg-slate-800/90 backdrop-blur-sm border-4 border-slate-600 rounded-2xl p-4 sm:p-6"
            >
              <div className="text-5xl sm:text-6xl mb-3 sm:mb-4 drop-shadow-lg">{item.emoji}</div>
              <h3 className="font-black text-xl sm:text-2xl mb-2 text-white text-outline-dark">{item.title}</h3>
              <p className="text-white text-outline-dark font-bold text-sm sm:text-base">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div 
          className="flex items-center gap-3 text-white font-black text-outline-royal"
          animate={showAnimations ? { opacity: [0.5, 1, 0.5] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <WalletIcon className="w-6 h-6" />
          <span className="text-lg">CONNECT WALLET TO START</span>
        </motion.div>
      </motion.div>
    )
  }

  // Loading state
  if (!isInitialized || !playerFarm) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="text-6xl drop-shadow-lg"
        >
          ⏳
        </motion.div>
        <p className="text-white font-black text-lg text-outline-royal">Loading your royal farm...</p>
      </div>
    )
  }

  const activePlots = playerFarm.plots.filter(p => p.hasTokens).length

  return (
    <motion.div
      initial={showAnimations ? { opacity: 0 } : {}}
      animate={{ opacity: 1 }}
      transition={springTransition}
      className="space-y-6 pb-24 px-2 pt-4"
    >
      {/* Welcome Banner - Royal Oak Panel */}
      <motion.div 
        initial={showAnimations ? { scale: 0.95, opacity: 0 } : {}}
        animate={{ scale: 1, opacity: 1 }}
        transition={springTransition}
        className="panel-oak relative overflow-hidden"
      >
        <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <motion.div 
              className="text-6xl drop-shadow-royal"
              animate={showAnimations ? { rotate: [0, 10, -10, 0] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              👑
            </motion.div>
            <div className="flex-1 min-w-0">
              <h2 className="text-3xl font-black mb-1 text-white text-outline-oak truncate">
                Royal Farm Dashboard
              </h2>
              <p className="text-white font-bold text-outline-oak text-sm sm:text-base">
                {activePlots > 0 
                  ? `${activePlots} royal plots are growing! 🌱`
                  : 'Start farming to grow your kingdom! 👑'}
              </p>
            </div>
          </div>
          {activePlots === 0 && (
            <Link to="/farm">
              <motion.button 
                whileHover={showAnimations ? { scale: 1.08, y: -4 } : {}}
                whileTap={showAnimations ? { scale: 0.95, y: 2 } : {}}
                transition={springTransition}
                className="btn-royal text-xl px-10 py-5 animate-pulse-royal"
              >
                <PlayIcon className="w-7 h-7" />
                Start Now!
              </motion.button>
            </Link>
          )}
        </div>
      </motion.div>

      {/* Stats Cards - Royal Medal Badges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          initial={showAnimations ? { scale: 0.8, opacity: 0 } : {}}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, ...springTransition }}
          whileHover={showAnimations ? { scale: 1.08, y: -6 } : {}}
          className="stat-badge-gold text-center"
        >
          <div className="text-5xl mb-2 drop-shadow-lg relative z-10">🪙</div>
          <p className="text-xs text-white font-black uppercase mb-1 relative z-10 text-outline-gold">Balance</p>
          <p className="text-2xl sm:text-3xl font-black text-white text-outline-gold relative z-10 truncate">
            {formatBalance(balance)}
          </p>
        </motion.div>

        <motion.div 
          initial={showAnimations ? { scale: 0.8, opacity: 0 } : {}}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, ...springTransition }}
          whileHover={showAnimations ? { scale: 1.08, y: -6 } : {}}
          className="stat-badge-green text-center"
        >
          <div className="text-5xl mb-2 drop-shadow-lg relative z-10">📦</div>
          <p className="text-xs text-white font-black uppercase mb-1 text-outline-green relative z-10">Staked</p>
          <p className="text-2xl sm:text-3xl font-black text-white text-outline-green relative z-10 truncate">
            {formatBalance(playerFarm.totalStaked)}
          </p>
        </motion.div>

        <motion.div 
          initial={showAnimations ? { scale: 0.8, opacity: 0 } : {}}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, ...springTransition }}
          whileHover={showAnimations ? { scale: 1.08, y: -6 } : {}}
          className="stat-badge-emerald text-center"
        >
          <div className="text-5xl mb-2 drop-shadow-lg relative z-10">💎</div>
          <p className="text-xs text-white font-black uppercase mb-1 text-outline-green relative z-10">Earned</p>
          <p className="text-2xl sm:text-3xl font-black text-white text-outline-green relative z-10 truncate">
            +{formatBalance(stats.totalYieldEarned)}
          </p>
        </motion.div>

        <motion.div 
          initial={showAnimations ? { scale: 0.8, opacity: 0 } : {}}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, ...springTransition }}
          whileHover={showAnimations ? { scale: 1.08, y: -6 } : {}}
          className="stat-badge-gold text-center animate-pulse-royal"
        >
          <div className="text-5xl mb-2 drop-shadow-lg relative z-10">✨</div>
          <p className="text-xs text-white font-black uppercase mb-1 relative z-10 text-outline-gold">Pending</p>
          <p className="text-2xl sm:text-3xl font-black text-white text-outline-gold relative z-10 truncate">
            +{formatBalance(playerFarm.pendingYield)}
          </p>
        </motion.div>
      </div>

      {/* Quick Actions - Royal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/farm">
          <motion.div 
            initial={showAnimations ? { y: 20, opacity: 0 } : {}}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, ...springTransition }}
            whileHover={showAnimations ? { scale: 1.05, y: -10 } : {}}
            whileTap={showAnimations ? { scale: 0.98 } : {}}
            className="card-panel cursor-pointer"
          >
            <div className="flex items-center gap-3 sm:gap-4 relative z-10">
              <div className="text-4xl sm:text-6xl drop-shadow-lg flex-shrink-0">🌾</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-xl sm:text-2xl mb-1 text-white text-outline-dark truncate">Farm</h3>
                <p className="text-white text-outline-dark font-bold text-sm sm:text-base">{activePlots}/5 plots active</p>
              </div>
              <motion.div 
                className="text-3xl sm:text-4xl drop-shadow-lg flex-shrink-0"
                animate={showAnimations ? { rotate: [0, 360] } : {}}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                💰
              </motion.div>
            </div>
          </motion.div>
        </Link>

        <Link to="/raid">
          <motion.div 
            initial={showAnimations ? { y: 20, opacity: 0 } : {}}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, ...springTransition }}
            whileHover={showAnimations ? { scale: 1.05, y: -10 } : {}}
            whileTap={showAnimations ? { scale: 0.98 } : {}}
            className="card-panel cursor-pointer"
          >
            <div className="flex items-center gap-3 sm:gap-4 relative z-10">
              <div className="text-4xl sm:text-6xl drop-shadow-lg flex-shrink-0">⚔️</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-xl sm:text-2xl mb-1 text-white text-outline-dark truncate">Raid</h3>
                <p className="text-white text-outline-dark font-bold text-sm sm:text-base">{stats.successfulRaids} wins, {stats.failedRaids} losses</p>
              </div>
              <motion.div 
                className="text-3xl sm:text-4xl drop-shadow-lg flex-shrink-0"
                animate={showAnimations ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              >
                💥
              </motion.div>
            </div>
          </motion.div>
        </Link>

        <Link to="/stats">
          <motion.div 
            initial={showAnimations ? { y: 20, opacity: 0 } : {}}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7, ...springTransition }}
            whileHover={showAnimations ? { scale: 1.05, y: -10 } : {}}
            whileTap={showAnimations ? { scale: 0.98 } : {}}
            className="card-panel cursor-pointer"
          >
            <div className="flex items-center gap-3 sm:gap-4 relative z-10">
              <div className="text-4xl sm:text-6xl drop-shadow-lg flex-shrink-0">📊</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-xl sm:text-2xl mb-1 text-white text-outline-dark truncate">Stats</h3>
                <p className="text-white text-outline-dark font-bold text-sm sm:text-base">Win rate: {winRate}%</p>
              </div>
              <motion.div 
                className="text-3xl sm:text-4xl drop-shadow-lg flex-shrink-0"
                animate={showAnimations ? { y: [0, -10, 0] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                📈
              </motion.div>
            </div>
          </motion.div>
        </Link>
      </div>

      {/* Combat Stats - Royal Panel */}
      {(stats.successfulRaids > 0 || stats.failedRaids > 0 || stats.timesDefended > 0) && (
        <motion.div
          initial={showAnimations ? { opacity: 0, y: 20 } : {}}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, ...springTransition }}
          className="panel-oak"
        >
          <h3 className="text-xl sm:text-2xl font-black mb-6 text-white text-outline-oak flex items-center gap-3 relative z-10">
            <span className="text-3xl sm:text-4xl drop-shadow-lg flex-shrink-0">🏆</span>
            <span className="truncate">Combat History</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 relative z-10">
            <div className="text-center p-2">
              <div className="text-4xl sm:text-5xl mb-2 sm:mb-3 drop-shadow-lg">⚔️</div>
              <p className="text-2xl sm:text-3xl font-black text-white text-outline-oak">{stats.successfulRaids}</p>
              <p className="text-xs sm:text-sm text-white font-bold text-outline-oak">Raids Won</p>
            </div>
            <div className="text-center p-2">
              <div className="text-4xl sm:text-5xl mb-2 sm:mb-3 drop-shadow-lg">💔</div>
              <p className="text-2xl sm:text-3xl font-black text-white text-outline-oak">{stats.failedRaids}</p>
              <p className="text-xs sm:text-sm text-white font-bold text-outline-oak">Raids Lost</p>
            </div>
            <div className="text-center p-2">
              <div className="text-4xl sm:text-5xl mb-2 sm:mb-3 drop-shadow-lg">🛡️</div>
              <p className="text-2xl sm:text-3xl font-black text-white text-outline-oak">{stats.timesDefended}</p>
              <p className="text-xs sm:text-sm text-white font-bold text-outline-oak">Defended</p>
            </div>
            <div className="text-center p-2">
              <div className="text-4xl sm:text-5xl mb-2 sm:mb-3 drop-shadow-lg">💰</div>
              <p className="text-2xl sm:text-3xl font-black text-white text-outline-oak truncate">{formatBalance(stats.totalStolen)}</p>
              <p className="text-xs sm:text-sm text-white font-bold text-outline-oak">Total Stolen</p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
