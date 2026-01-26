import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  PlayIcon,
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
  BoltIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  CubeIcon,
  BeakerIcon
} from '@heroicons/react/24/outline'
import { useWalletStore, useUIStore } from '../stores'
import { useGameData } from '../stores/gameDataStore'
import { useTestSettings } from '../hooks/useTestSettings'
import { useSettingsStore } from '../stores/settingsStore'
import { formatBalance } from '../utils/format'

export default function Dashboard() {
  const { connected } = useWalletStore()
  const { 
    playerFarm,
    usdtBalance,
    sasBalance, 
    inventory,
    isInitialized,
    winRate,
    initializePlayer,
    tickYield,
    hasShieldProtection,
  } = useGameData()
  const { settings } = useTestSettings()
  const { showAnimations } = useSettingsStore()
  const { openModal } = useUIStore()

  const [showSasInfo, setShowSasInfo] = useState(false)

  useEffect(() => {
    if (connected && !isInitialized) {
      initializePlayer(10000, 0)
    }
  }, [connected, isInitialized, initializePlayer])

  useEffect(() => {
    if (!playerFarm || playerFarm.totalStaked === 0) return
    const interval = setInterval(() => {
      tickYield({
        apyPercent: settings.apyPercent,
        sasApyPercent: settings.apyPercent / 2,
        dayDurationSeconds: settings.dayDurationSeconds,
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [playerFarm?.totalStaked, settings.apyPercent, settings.dayDurationSeconds, tickYield])

  if (!connected) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-700/20 flex items-center justify-center mb-6 border border-yellow-500/30">
          <PlayIcon className="w-10 h-10 text-yellow-400" />
        </div>
        <h2 className="text-2xl font-bold mb-3 text-white text-outline-royal">Welcome, Ruler!</h2>
        <p className="text-white text-outline-royal max-w-md mb-6">
          Connect your wallet to manage your kingdom, farm yield, and defend against raiders.
        </p>
      </motion.div>
    )
  }

  if (!isInitialized || !playerFarm) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 rounded-full border-4 border-yellow-500/30 border-t-yellow-500 mb-6"
        />
        <h2 className="text-xl font-bold text-white text-outline-royal">Loading Kingdom...</h2>
      </div>
    )
  }

  const activePlots = playerFarm.plots.filter(p => p.hasTokens).length

  return (
    <motion.div
      initial={showAnimations ? { opacity: 0 } : {}}
      animate={{ opacity: 1 }}
      className="min-h-screen pb-24 px-4 pt-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-3 text-white text-outline-royal">
          <span className="text-3xl">👑</span>
          <span>Royal Dashboard</span>
        </h1>
        <button 
          onClick={() => openModal('tester-settings')}
          className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-600 text-slate-400 hover:text-white transition-colors"
          title="Tester Settings"
        >
          <BeakerIcon className="w-5 h-5" />
        </button>
      </div>

      {activePlots === 0 && (
        <Link to="/farm" className="block mb-4">
          <div className="bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 rounded-xl p-3 flex items-center justify-center gap-2 text-yellow-400 font-bold animate-pulse">
            <PlayIcon className="w-5 h-5" />
            <span>Start Farming Now</span>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-600 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <CurrencyDollarIcon className="w-5 h-5 text-yellow-400" />
            <div className="text-xs text-white text-outline-dark">USDT Balance</div>
          </div>
          <div className="text-xl font-bold text-white text-outline-gold truncate">
            {formatBalance(usdtBalance)}
          </div>
        </div>

        <div className="bg-slate-800/80 rounded-xl p-4 border border-purple-500/30 relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CubeIcon className="w-5 h-5 text-purple-400" />
              <div className="text-xs text-white text-outline-dark">SAS Token</div>
            </div>
            <button onClick={() => setShowSasInfo(!showSasInfo)}>
              <QuestionMarkCircleIcon className="w-4 h-4 text-slate-400 hover:text-white" />
            </button>
          </div>
          <div className="text-xl font-bold text-white text-outline-royal truncate">
            {formatBalance(sasBalance)}
          </div>

          <AnimatePresence>
            {showSasInfo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-full right-0 mt-2 z-50 w-48 bg-slate-900 border border-purple-500 rounded-xl p-3 shadow-xl"
              >
                <p className="text-xs text-white text-outline-dark mb-2">
                  SAS is the native governance token. Earn it by staking USDT!
                </p>
                <button 
                  onClick={() => setShowSasInfo(false)}
                  className="text-[10px] text-purple-400 font-bold uppercase"
                >
                  Close
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-600">
          <div className="text-xs text-white text-outline-dark mb-2 opacity-80">Total Staked</div>
          <div className="text-lg font-bold text-white text-outline-green truncate">
            {formatBalance(playerFarm.totalStaked)}
          </div>
        </div>
        <div className="bg-slate-800/80 rounded-xl p-4 border border-yellow-500/30">
          <div className="flex items-center gap-1 mb-2">
            <SparklesIcon className="w-3 h-3 text-yellow-400 animate-pulse" />
            <div className="text-xs text-white text-outline-dark opacity-80">Pending Yield</div>
          </div>
          <div className="text-lg font-bold text-yellow-400 text-outline-dark truncate">
            +{formatBalance(playerFarm.pendingYield)}
          </div>
        </div>
      </div>

      <motion.div 
        className={`mb-6 p-4 rounded-xl border flex items-center justify-between ${
          hasShieldProtection()
          ? 'bg-blue-900/20 border-blue-500/30'
          : 'bg-red-900/20 border-red-500/30'
        }`}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
            hasShieldProtection() ? 'bg-blue-500/20 border-blue-500/50' : 'bg-red-500/20 border-red-500/50'
          }`}>
            <ShieldCheckIcon className={`w-6 h-6 ${hasShieldProtection() ? 'text-blue-400' : 'text-red-400'}`} />
          </div>
          <div>
            <p className="text-sm font-bold text-white text-outline-dark">
              {hasShieldProtection() ? 'Kingdom Protected' : 'Vulnerable!'}
            </p>
            <p className="text-xs text-white/70">
              {hasShieldProtection() ? 'Your yield is safe.' : 'Raiders can steal yield!'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-white text-outline-dark">Shields</p>
          <p className="text-xl font-bold text-white text-outline-gold">{inventory.shields}</p>
        </div>
      </motion.div>

      <h2 className="text-lg font-semibold flex items-center gap-2 text-white text-outline-dark mb-3">
        <span className="text-yellow-400">⚡</span>
        <span>Actions</span>
      </h2>

      <div className="space-y-3">
        <Link to="/farm">
          <motion.div 
            className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 hover:bg-slate-700/50 flex items-center justify-between group"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center border border-green-500/30 group-hover:border-green-400 transition-colors">
                <span className="text-2xl">🌾</span>
              </div>
              <div>
                <p className="font-bold text-white text-lg">Manage Farm</p>
                <p className="text-xs text-white/70">Active Plots: <span className="text-green-400 font-bold">{activePlots}/{inventory.totalPlots}</span></p>
              </div>
            </div>
            <div className="text-slate-400 group-hover:text-white transition-colors">→</div>
          </motion.div>
        </Link>

        <Link to="/raid">
          <motion.div 
            className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 hover:bg-slate-700/50 flex items-center justify-between group"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30 group-hover:border-red-400 transition-colors">
                <BoltIcon className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <p className="font-bold text-white text-lg">Raid Enemies</p>
                <p className="text-xs text-white/70">Steal yield from others</p>
              </div>
            </div>
            <div className="text-slate-400 group-hover:text-white transition-colors">→</div>
          </motion.div>
        </Link>

        <Link to="/stats">
          <motion.div 
            className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 hover:bg-slate-700/50 flex items-center justify-between group"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30 group-hover:border-blue-400 transition-colors">
                <ChartBarIcon className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <p className="font-bold text-white text-lg">Leaderboard</p>
                <p className="text-xs text-white/70">Current Win Rate: <span className="text-blue-400 font-bold">{winRate}%</span></p>
              </div>
            </div>
            <div className="text-slate-400 group-hover:text-white transition-colors">→</div>
          </motion.div>
        </Link>
      </div>

    </motion.div>
  )
}