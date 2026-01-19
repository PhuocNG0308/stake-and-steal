/**
 * Dashboard - Live Game Stats Overview
 * 
 * Shows all live game data including:
 * - Balance and staked amounts
 * - Pending yield (updates in real-time)
 * - Combat statistics (wins, losses, stolen amounts)
 */

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  BanknotesIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ShieldCheckIcon,
  BoltIcon,
  ClockIcon,
  PlayIcon,
  WalletIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { useWalletStore } from '../stores'
import { useGameData } from '../stores/gameDataStore'
import { useTestSettings } from '../hooks/useTestSettings'
import { formatBalance, formatPercentage } from '../utils/format'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

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

  // Initialize player if connected but not initialized
  useEffect(() => {
    if (connected && !isInitialized) {
      initializePlayer(10000) // Start with 10k tokens for testing
    }
  }, [connected, isInitialized, initializePlayer])

  // Yield ticking - updates every second for live display
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

  // Not connected state - show connect prompt
  if (!connected) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4"
      >
        <motion.div
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-24 h-24 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center mb-6 shadow-2xl shadow-yellow-600/30"
        >
          <SparklesIcon className="w-12 h-12 text-white" />
        </motion.div>

        <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
          Welcome to Stake & Steal
        </h1>
        <p className="text-slate-400 max-w-md mb-8">
          Connect your wallet to start staking and stealing! 
          Stake your coins wisely - or they might get stolen! 🏴‍☠️
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="bg-slate-800/60 rounded-xl p-6 text-center border border-slate-700/50">
            <SparklesIcon className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Stake</h3>
            <p className="text-sm text-slate-400">Stake coins to earn passive income</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-6 text-center border border-slate-700/50">
            <BoltIcon className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Steal</h3>
            <p className="text-sm text-slate-400">Steal yield from other players</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-6 text-center border border-slate-700/50">
            <ShieldCheckIcon className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Defend</h3>
            <p className="text-sm text-slate-400">Hide your stakes across 5 plots</p>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2 text-slate-500">
          <WalletIcon className="w-5 h-5" />
          <span>Connect wallet above to get started</span>
        </div>
      </motion.div>
    )
  }

  // Loading state
  if (!isInitialized || !playerFarm) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  const activePlots = playerFarm.plots.filter(p => p.hasTokens).length

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-24 px-4 pt-4"
    >
      {/* Welcome Banner - Game style */}
      <motion.div 
        variants={item} 
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-600/20 via-orange-600/10 to-slate-900 border border-yellow-500/30 p-6"
      >
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              🎮 Ready to Play!
            </h2>
            <p className="text-slate-300">
              {activePlots > 0 
                ? `Your farm has ${activePlots} active plots growing yield!`
                : 'Start by depositing tokens to your farm plots.'}
            </p>
          </div>
          {activePlots === 0 && (
            <Link to="/farm">
              <button className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded-xl font-bold text-lg flex items-center gap-2">
                <PlayIcon className="w-5 h-5" />
                Start Farming
              </button>
            </Link>
          )}
        </div>
      </motion.div>

      {/* Stats Grid - Live Data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={item} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <BanknotesIcon className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Balance</p>
              <p className="text-xl font-bold text-yellow-400">
                {formatBalance(balance)}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Staked</p>
              <p className="text-xl font-bold text-blue-400">
                {formatBalance(playerFarm.totalStaked)}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <ArrowTrendingUpIcon className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Earned</p>
              <p className="text-xl font-bold text-green-400">
                +{formatBalance(stats.totalYieldEarned)}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="bg-slate-800/60 rounded-xl p-4 border border-yellow-500/30 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Pending</p>
              <p className="text-xl font-bold text-yellow-400">
                +{formatBalance(playerFarm.pendingYield)}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions - Game buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/farm">
          <motion.div 
            variants={item} 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-4 p-5 bg-slate-800/60 rounded-xl border border-slate-700/50 hover:border-yellow-500/50 transition-colors cursor-pointer"
          >
            <SparklesIcon className="w-10 h-10 text-yellow-400" />
            <div>
              <h3 className="font-bold text-lg">Stake</h3>
              <p className="text-sm text-slate-400">{activePlots}/5 plots active</p>
            </div>
            <div className="ml-auto text-2xl">💰</div>
          </motion.div>
        </Link>

        <Link to="/raid">
          <motion.div 
            variants={item}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-4 p-5 bg-slate-800/60 rounded-xl border border-slate-700/50 hover:border-red-500/50 transition-colors cursor-pointer"
          >
            <BoltIcon className="w-10 h-10 text-red-400" />
            <div>
              <h3 className="font-bold text-lg">Steal</h3>
              <p className="text-sm text-slate-400">
                {stats.successfulRaids + stats.failedRaids} steals attempted
              </p>
            </div>
            <div className="ml-auto text-2xl">⚔️</div>
          </motion.div>
        </Link>

        <Link to="/farm">
          <motion.div 
            variants={item}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-4 p-5 bg-slate-800/60 rounded-xl border transition-colors cursor-pointer ${
              playerFarm.pendingYield > 0 
                ? 'border-green-500/50 hover:border-green-500' 
                : 'border-slate-700/50'
            }`}
          >
            <BanknotesIcon className="w-10 h-10 text-green-400" />
            <div>
              <h3 className="font-bold text-lg">Claim Yield</h3>
              <p className="text-sm text-slate-400">
                {playerFarm.pendingYield > 0 
                  ? `${formatBalance(playerFarm.pendingYield)} available`
                  : 'No yield pending'}
              </p>
            </div>
            <div className="ml-auto text-2xl">💰</div>
          </motion.div>
        </Link>
      </div>

      {/* Combat Stats */}
      <motion.div variants={item} className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrophyIcon className="w-5 h-5 text-yellow-400" />
          Combat Record
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-slate-900/50 rounded-xl">
            <p className="text-3xl font-bold text-green-400">{stats.successfulRaids}</p>
            <p className="text-xs text-slate-400">Successful Raids</p>
          </div>
          <div className="text-center p-4 bg-slate-900/50 rounded-xl">
            <p className="text-3xl font-bold text-red-400">{stats.failedRaids}</p>
            <p className="text-xs text-slate-400">Failed Raids</p>
          </div>
          <div className="text-center p-4 bg-slate-900/50 rounded-xl">
            <p className="text-3xl font-bold text-blue-400">{winRate}%</p>
            <p className="text-xs text-slate-400">Win Rate</p>
          </div>
          <div className="text-center p-4 bg-slate-900/50 rounded-xl">
            <p className="text-3xl font-bold text-yellow-400">{stats.timesRaided}</p>
            <p className="text-xs text-slate-400">Times Raided</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Total Stolen</span>
            <span className="font-semibold text-green-400">
              +{formatBalance(stats.totalStolen)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Total Lost</span>
            <span className="font-semibold text-red-400">
              -{formatBalance(stats.totalLostToRaids)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Game Settings Info */}
      <motion.div variants={item} className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <ShieldCheckIcon className="w-5 h-5 text-blue-400" />
          Current Game Settings
        </h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-slate-400">APY:</span>{' '}
            <span className="font-semibold text-yellow-400">{settings.apyPercent}%</span>
          </div>
          <div>
            <span className="text-slate-400">Game Day:</span>{' '}
            <span className="font-semibold">{settings.dayDurationSeconds}s</span>
          </div>
          <div>
            <span className="text-slate-400">Steal Rate:</span>{' '}
            <span className="font-semibold text-red-400">{settings.stealPercent}%</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
