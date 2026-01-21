/**
 * Farm Page - Hidden Plot System with Dual-Token
 * 
 * Each farm starts with 5 plots. Players can buy more (up to 15).
 * Stake USDT -> Earn USDT yield + SAS rewards
 * Use SAS to buy plots and shields for protection.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWalletStore } from '../stores'
import { useGameData, PLOT_COST_SAS, SHIELD_COST_SAS, MAX_PLOTS_PER_PLAYER } from '../stores/gameDataStore'
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
  ShieldCheckIcon,
  PlusCircleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'
import { formatBalance } from '../utils/format'

// Plot visualization component
interface PlotCardProps {
  plot: {
    plotId: number
    hasTokens: boolean
    balance: number
    depositTime: number
    isPurchased: boolean
  }
  isOwnerView: boolean
  onOpenDeposit: () => void
  onWithdraw: () => void
  onBuyPlot?: () => void
  pendingYieldShare: number
  pendingSasShare: number
  canBuyPlot: boolean
}

function PlotCard({ plot, isOwnerView, onOpenDeposit, onWithdraw, onBuyPlot, pendingYieldShare, pendingSasShare, canBuyPlot }: PlotCardProps) {
  const hasContent = plot.hasTokens && plot.balance > 0
  const isLocked = !plot.isPurchased

  // Locked plot - needs to be purchased
  if (isLocked) {
    return (
      <motion.div
        className="relative rounded-xl border-2 p-3 h-[200px] flex flex-col border-slate-700/50 bg-slate-900/50"
        whileHover={{ scale: canBuyPlot ? 1.02 : 1 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-700 rounded-full text-xs font-bold text-white">
          #{plot.plotId + 1}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center mt-2">
          <LockClosedIcon className="w-10 h-10 text-slate-500 mb-2" />
          <div className="text-xs text-white text-outline-dark mb-1">Locked</div>
          <div className="text-xs text-yellow-500">{PLOT_COST_SAS} SAS</div>
        </div>
        {canBuyPlot && onBuyPlot && (
          <button
            onClick={onBuyPlot}
            className="w-full px-2 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
          >
            <PlusCircleIcon className="w-3 h-3" />
            Unlock
          </button>
        )}
      </motion.div>
    )
  }

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
                  +{formatBalance(pendingYieldShare)} USDT
                </div>
              )}
              {pendingSasShare > 0 && (
                <div className="text-xs text-purple-400">
                  +{formatBalance(pendingSasShare)} SAS
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
    usdtBalance,
    sasBalance,
    inventory,
    setupPlot, 
    withdrawFromPlot, 
    claimYield,
    claimSasRewards,
    tickYield,
    initializePlayer,
    buyPlot,
    buyShield,
    hasShieldProtection,
    calculatePendingSasRewards,
  } = useGameData()
  const { settings } = useTestSettings()
  
  const [showRaiderView, setShowRaiderView] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  
  // Deposit Modal State (lifted to page level)
  const [depositModalPlotId, setDepositModalPlotId] = useState<number | null>(null)
  const [depositAmount, setDepositAmount] = useState('')

  // Initialize player if not already
  useEffect(() => {
    if (connected && !isInitialized) {
      initializePlayer(10000) // Start with 10k USDT for testing
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
      setNotification({ type: 'success', message: `Deposited ${formatBalance(amount)} USDT to Plot #${plotId + 1}` })
    } else {
      setNotification({ type: 'error', message: 'Deposit failed. Check your balance.' })
    }
    setTimeout(() => setNotification(null), 3000)
  }, [setupPlot])

  const handleDepositConfirm = useCallback(() => {
    if (depositModalPlotId === null) return
    const amount = parseFloat(depositAmount)
    if (amount > 0 && amount <= usdtBalance) {
      handleDeposit(depositModalPlotId, amount)
      setDepositAmount('')
      setDepositModalPlotId(null)
    }
  }, [depositModalPlotId, depositAmount, usdtBalance, handleDeposit])

  const openDepositModal = useCallback((plotId: number) => {
    setDepositModalPlotId(plotId)
    setDepositAmount('')
  }, [])

  const handleWithdraw = useCallback((plotId: number) => {
    const amount = withdrawFromPlot(plotId)
    if (amount > 0) {
      setNotification({ type: 'success', message: `Withdrew ${formatBalance(amount)} USDT from Plot #${plotId + 1}` })
    } else {
      setNotification({ type: 'error', message: 'Nothing to withdraw from this plot.' })
    }
    setTimeout(() => setNotification(null), 3000)
  }, [withdrawFromPlot])

  const handleClaimYield = useCallback(() => {
    const amount = claimYield()
    if (amount > 0) {
      setNotification({ type: 'success', message: `Claimed ${formatBalance(amount)} USDT yield!` })
    } else {
      setNotification({ type: 'error', message: 'No yield to claim.' })
    }
    setTimeout(() => setNotification(null), 3000)
  }, [claimYield])

  const handleClaimSasRewards = useCallback(() => {
    const amount = claimSasRewards()
    if (amount > 0) {
      setNotification({ type: 'success', message: `Claimed ${formatBalance(amount)} SAS rewards!` })
    } else {
      setNotification({ type: 'error', message: 'No SAS rewards to claim.' })
    }
    setTimeout(() => setNotification(null), 3000)
  }, [claimSasRewards])

  const handleBuyPlot = useCallback(() => {
    const success = buyPlot()
    if (success) {
      setNotification({ type: 'success', message: `Purchased new plot for ${PLOT_COST_SAS} SAS!` })
    } else {
      setNotification({ type: 'error', message: `Not enough SAS (need ${PLOT_COST_SAS}) or max plots reached.` })
    }
    setTimeout(() => setNotification(null), 3000)
  }, [buyPlot])

  const handleBuyShield = useCallback(() => {
    const success = buyShield()
    if (success) {
      setNotification({ type: 'success', message: `Purchased shield for ${SHIELD_COST_SAS} SAS!` })
    } else {
      setNotification({ type: 'error', message: `Not enough SAS (need ${SHIELD_COST_SAS}).` })
    }
    setTimeout(() => setNotification(null), 3000)
  }, [buyShield])

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
  const pendingSasRewards = calculatePendingSasRewards()
  const activePlots = playerFarm.plots.filter(p => p.hasTokens)
  const yieldPerPlot = activePlots.length > 0
    ? pendingYield / activePlots.length
    : 0
  const sasPerPlot = activePlots.length > 0
    ? pendingSasRewards / activePlots.length
    : 0
  const canBuyMorePlots = inventory.totalPlots < MAX_PLOTS_PER_PLAYER && sasBalance >= PLOT_COST_SAS

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
          <div className="flex items-center gap-2">
            {/* Shield Status */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
              hasShieldProtection() 
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                : 'bg-slate-700/50 text-slate-400'
            }`}>
              <ShieldCheckIcon className="w-4 h-4" />
              <span>{inventory.shields}</span>
            </div>
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
        </div>

        {/* Balances Row */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl p-3 border border-yellow-500/30">
            <div className="text-xs text-yellow-400 mb-1">USDT Balance</div>
            <div className="text-lg font-bold text-white text-outline-gold truncate">
              {formatBalance(usdtBalance)}
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-3 border border-purple-500/30">
            <div className="text-xs text-purple-400 mb-1">SAS Balance</div>
            <div className="text-lg font-bold text-white truncate">
              {formatBalance(sasBalance)}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-600">
            <div className="text-xs text-white text-outline-dark mb-1">Total Staked</div>
            <div className="text-xl font-bold text-white text-outline-gold truncate">
              {formatBalance(playerFarm.totalStaked)} USDT
            </div>
          </div>
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-600">
            <div className="text-xs text-white text-outline-dark mb-1">Pending USDT Yield</div>
            <div className="text-xl font-bold text-white text-outline-green truncate">
              +{formatBalance(pendingYield)}
            </div>
          </div>
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-600">
            <div className="text-xs text-white text-outline-dark mb-1">Pending SAS Rewards</div>
            <div className="text-xl font-bold text-purple-400 truncate">
              +{formatBalance(pendingSasRewards)}
            </div>
          </div>
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-600">
            <div className="text-xs text-white text-outline-dark mb-1">Active Plots</div>
            <div className="text-xl font-bold text-white text-outline-dark">
              {activePlots.length} / {inventory.totalPlots}
            </div>
          </div>
        </div>
      </div>

      {/* Buy Shield & Plot Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <motion.button
          onClick={handleBuyShield}
          disabled={sasBalance < SHIELD_COST_SAS}
          className="py-3 bg-gradient-to-r from-blue-600 to-cyan-600 disabled:from-slate-700 disabled:to-slate-700 rounded-xl font-medium text-sm flex items-center justify-center gap-2 text-white"
          whileHover={{ scale: sasBalance >= SHIELD_COST_SAS ? 1.02 : 1 }}
          whileTap={{ scale: sasBalance >= SHIELD_COST_SAS ? 0.98 : 1 }}
        >
          <ShieldCheckIcon className="w-5 h-5" />
          <span>Buy Shield ({SHIELD_COST_SAS} SAS)</span>
        </motion.button>
        <motion.button
          onClick={handleBuyPlot}
          disabled={!canBuyMorePlots}
          className="py-3 bg-gradient-to-r from-yellow-600 to-orange-600 disabled:from-slate-700 disabled:to-slate-700 rounded-xl font-medium text-sm flex items-center justify-center gap-2 text-white"
          whileHover={{ scale: canBuyMorePlots ? 1.02 : 1 }}
          whileTap={{ scale: canBuyMorePlots ? 0.98 : 1 }}
        >
          <PlusCircleIcon className="w-5 h-5" />
          <span>Buy Plot ({PLOT_COST_SAS} SAS)</span>
        </motion.button>
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
                onOpenDeposit={() => openDepositModal(plot.plotId)}
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

      {/* Deposit Modal - Page Level */}
      <AnimatePresence>
        {depositModalPlotId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
            onClick={() => setDepositModalPlotId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 rounded-xl p-5 w-full max-w-[320px] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold mb-4 text-white text-center truncate">
                Deposit to Plot #{depositModalPlotId + 1}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/80 mb-1.5 block">Amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2.5 bg-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                    />
                    <button
                      onClick={() => setDepositAmount(balance.toString())}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-yellow-500 hover:text-yellow-400 px-2 py-1"
                    >
                      MAX
                    </button>
                  </div>
                  <p className="text-xs text-white/60 mt-1.5 truncate">
                    Available: {formatBalance(balance)} Tokens
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setDepositModalPlotId(null)}
                    className="flex-1 px-3 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors text-white text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDepositConfirm}
                    disabled={!depositAmount || parseFloat(depositAmount) <= 0 || parseFloat(depositAmount) > balance}
                    className="flex-1 px-3 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-600 disabled:text-slate-400 text-slate-900 rounded-lg font-medium transition-colors text-sm"
                  >
                    Deposit
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
