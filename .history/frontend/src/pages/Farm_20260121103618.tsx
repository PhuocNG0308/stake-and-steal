/**
 * Farm Page - Hidden Plot System
 * 
 * Each farm has 5 plots. Players can deposit tokens into any plot.
 * The key mechanic: Only the owner can see which plots have tokens.
 * Raiders must guess which plot has tokens - more risk, more reward!
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWalletStore } from '../stores'
import { useGameData } from '../stores/gameDataStore'
import { useTestSettings } from '../hooks/useTestSettings'
import {
  SparklesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  WalletIcon,
} from '@heroicons/react/24/outline'
import { formatBalance } from '../utils/format'

const PLOTS_COUNT = 5

// Plot visualization component
interface PlotCardProps {
  plot: {
    plotId: number
    hasTokens: boolean
    balance: number
    depositTime: number
  }
  isOwnerView: boolean
  onOpenDeposit: () => void
  onWithdraw: () => void
  pendingYieldShare: number
}

function PlotCard({ plot, isOwnerView, onOpenDeposit, onWithdraw, pendingYieldShare }: PlotCardProps) {
  const hasContent = plot.hasTokens && plot.balance > 0

  return (
    <motion.div
      className={`relative rounded-xl border-2 p-3 h-[200px] flex flex-col ${
        hasContent
          ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-orange-500/10'
          : 'border-slate-600/50 bg-slate-800/50'
      }`}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      {/* Plot Number */}
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-700 rounded-full text-xs font-bold text-white">
        #{plot.plotId + 1}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center mt-2">
        {isOwnerView ? (
          // Owner can see everything
          hasContent ? (
            <div className="text-center space-y-1">
              <div className="text-2xl">🌱</div>
              <div className="text-sm font-bold text-white text-outline-gold truncate max-w-full">
                {formatBalance(plot.balance)}
              </div>
              {pendingYieldShare > 0 && (
                <div className="text-xs text-white text-outline-green">
                  +{formatBalance(pendingYieldShare)}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center space-y-1">
              <div className="text-2xl opacity-30">🕳️</div>
              <div className="text-xs text-white text-outline-dark">Empty</div>
            </div>
          )
        ) : (
          // Non-owner view - everything is hidden
          <div className="text-center space-y-1">
            <QuestionMarkCircleIcon className="w-10 h-10 mx-auto text-slate-400" />
            <div className="text-xs text-white text-outline-dark">???</div>
          </div>
        )}
      </div>

      {/* Actions (only for owner) */}
      {isOwnerView && (
        <div className="mt-auto">
          {hasContent ? (
            <button
              onClick={onWithdraw}
              className="w-full px-2 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
            >
              <ArrowUpIcon className="w-3 h-3" />
              Withdraw
            </button>
          ) : (
            <button
              onClick={onOpenDeposit}
              className="w-full px-2 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
            >
              <ArrowDownIcon className="w-3 h-3" />
              Deposit
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

export default function Farm() {
  const { connected } = useWalletStore()
  const { 
    playerFarm, 
    stats,
    isInitialized,
    balance,
    setupPlot, 
    withdrawFromPlot, 
    claimYield,
    tickYield,
    initializePlayer,
  } = useGameData()
  const { settings } = useTestSettings()
  
  const [showRaiderView, setShowRaiderView] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Initialize player if not already
  useEffect(() => {
    if (connected && !isInitialized) {
      initializePlayer(10000) // Start with 10k tokens for testing
    }
  }, [connected, isInitialized, initializePlayer])

  // Yield ticking - updates every second
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

  const handleDeposit = useCallback((plotId: number, amount: number) => {
    const success = setupPlot(plotId, amount)
    if (success) {
      setNotification({ type: 'success', message: `Deposited ${formatBalance(amount)} tokens to Plot #${plotId + 1}` })
    } else {
      setNotification({ type: 'error', message: 'Deposit failed. Check your balance.' })
    }
    setTimeout(() => setNotification(null), 3000)
  }, [setupPlot])

  const handleWithdraw = useCallback((plotId: number) => {
    const amount = withdrawFromPlot(plotId)
    if (amount > 0) {
      setNotification({ type: 'success', message: `Withdrew ${formatBalance(amount)} tokens from Plot #${plotId + 1}` })
    } else {
      setNotification({ type: 'error', message: 'Nothing to withdraw from this plot.' })
    }
    setTimeout(() => setNotification(null), 3000)
  }, [withdrawFromPlot])

  const handleClaimYield = useCallback(() => {
    const amount = claimYield()
    if (amount > 0) {
      setNotification({ type: 'success', message: `Claimed ${formatBalance(amount)} yield!` })
    } else {
      setNotification({ type: 'error', message: 'No yield to claim.' })
    }
    setTimeout(() => setNotification(null), 3000)
  }, [claimYield])

  // Not connected state
  if (!connected) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center mb-6 border border-yellow-500/30">
          <SparklesIcon className="w-10 h-10 text-yellow-400" />
        </div>
        <h2 className="text-2xl font-bold mb-3 text-white text-outline-royal">Ready to Stake?</h2>
        <p className="text-white text-outline-royal max-w-md mb-6">
          Connect your wallet to view and manage your staking plots.
          Stake coins to earn yield! 💰
        </p>
        <div className="flex items-center gap-2 text-white text-outline-royal">
          <WalletIcon className="w-5 h-5" />
          <span>Connect wallet to continue</span>
        </div>
      </motion.div>
    )
  }

  // Loading/Initializing state
  if (!isInitialized || !playerFarm) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  const pendingYield = playerFarm.pendingYield
  const yieldPerPlot = playerFarm.plots.filter(p => p.hasTokens).length > 0
    ? pendingYield / playerFarm.plots.filter(p => p.hasTokens).length
    : 0

  return (
    <div className="min-h-screen pb-24 px-4 pt-4">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg flex items-center gap-2 ${
              notification.type === 'success' ? 'bg-green-500/90' : 'bg-red-500/90'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircleIcon className="w-5 h-5" />
            ) : (
              <XCircleIcon className="w-5 h-5" />
            )}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Stats */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white text-outline-royal">Your Stakes</h1>
          <button
            onClick={() => setShowRaiderView(!showRaiderView)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              showRaiderView
                ? 'bg-red-500/20 text-red-400'
                : 'bg-slate-700 text-slate-300'
            }`}
          >
            {showRaiderView ? (
              <>
                <EyeSlashIcon className="w-4 h-4" />
                Thief View
              </>
            ) : (
              <>
                <EyeIcon className="w-4 h-4" />
                Owner View
              </>
            )}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-600">
            <div className="text-xs text-white text-outline-dark mb-1">Total Staked</div>
            <div className="text-xl font-bold text-white text-outline-gold truncate">
              {formatBalance(playerFarm.totalStaked)}
            </div>
          </div>
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-600">
            <div className="text-xs text-white text-outline-dark mb-1">Pending Yield</div>
            <div className="text-xl font-bold text-white text-outline-green truncate">
              {formatBalance(pendingYield)}
            </div>
          </div>
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-600">
            <div className="text-xs text-white text-outline-dark mb-1">APY</div>
            <div className="text-xl font-bold text-white text-outline-dark">
              {settings.apyPercent}%
            </div>
          </div>
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-600">
            <div className="text-xs text-white text-outline-dark mb-1">Active Plots</div>
            <div className="text-xl font-bold text-white text-outline-dark">
              {playerFarm.plots.filter(p => p.hasTokens).length} / {PLOTS_COUNT}
            </div>
          </div>
        </div>
      </div>

      {/* Claim Yield Button */}
      {pendingYield > 0 && (
        <motion.button
          onClick={handleClaimYield}
          className="w-full mb-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-bold text-lg flex items-center justify-center gap-2 text-white text-outline-green"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <SparklesIcon className="w-6 h-6" />
          <span className="truncate">Claim {formatBalance(pendingYield)} Yield</span>
        </motion.button>
      )}

      {/* Raider View Warning */}
      {showRaiderView && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <EyeSlashIcon className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-white text-outline-dark mb-1">Raider View Mode</h3>
              <p className="text-sm text-white text-outline-dark">
                This is how other players (raiders) see your farm. They cannot tell which plots have tokens - 
                they must guess! The more you spread your tokens, the harder it is for them to steal.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Plots Grid - Centered Responsive Layout */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white text-outline-royal text-center">Your Plots</h2>
        <div className="flex flex-wrap gap-4 justify-center items-stretch">
          {playerFarm.plots.map((plot) => (
            <div key={plot.plotId} className="w-[160px] min-w-[160px]">
              <PlotCard
                plot={plot}
                isOwnerView={!showRaiderView}
                onDeposit={(amount) => handleDeposit(plot.plotId, amount)}
                onWithdraw={() => handleWithdraw(plot.plotId)}
                pendingYieldShare={plot.hasTokens ? yieldPerPlot : 0}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-8 p-4 bg-slate-800/60 rounded-xl border border-slate-600">
        <h3 className="font-bold mb-2 flex items-center gap-2 text-white text-outline-dark">
          <QuestionMarkCircleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          <span>How Hidden Plots Work</span>
        </h3>
        <ul className="text-sm text-white text-outline-dark space-y-2">
          <li>• You have 5 plots to hide your tokens</li>
          <li>• Only YOU can see which plots have tokens</li>
          <li>• Raiders must guess the correct plot to steal</li>
          <li>• Spread tokens across plots = lower risk per raid</li>
          <li>• Concentrate in one plot = higher yield but higher risk</li>
        </ul>
      </div>

      {/* Stats Summary */}
      <div className="mt-6 p-4 bg-slate-800/60 rounded-xl border border-slate-600">
        <h3 className="font-bold mb-3 text-white text-outline-dark">Your Stats</h3>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-white text-outline-dark">Total Deposited:</span>
          <span className="text-right text-white text-outline-dark">{formatBalance(stats.totalDeposited)}</span>
          <span className="text-white text-outline-dark">Total Withdrawn:</span>
          <span className="text-right text-white text-outline-dark">{formatBalance(stats.totalWithdrawn)}</span>
          <span className="text-white text-outline-dark">Total Yield Earned:</span>
          <span className="text-right text-white text-outline-green">{formatBalance(stats.totalYieldEarned)}</span>
          <span className="text-white text-outline-dark">Lost to Raids:</span>
          <span className="text-right text-white text-outline-dark">{formatBalance(stats.totalLostToRaids)}</span>
        </div>
      </div>
    </div>
  )
}
