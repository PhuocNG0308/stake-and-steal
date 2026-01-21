/**
 * Raid Page - Hidden Plot Raiding System
 * 
 * Raiders must select a victim and guess which plot has tokens.
 * If they guess correctly, they steal a percentage.
 * All balance updates are live and reflected across the app.
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BoltIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  UsersIcon,
  WalletIcon,
  TrashIcon,
  QuestionMarkCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrophyIcon,
  ClockIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline'
import { useWalletStore } from '../stores'
import { useGameData, type TestVictim } from '../stores/gameDataStore'
import { useTestSettings } from '../hooks/useTestSettings'
import { formatBalance } from '../utils/format'

const PLOTS_COUNT = 5

type RaidPhase = 'select-target' | 'select-plot' | 'executing' | 'result'

export default function Raid() {
  const { connected } = useWalletStore()
  const { 
    testVictims, 
    raidHistory,
    stats,
    usdtBalance,
    createTestVictim,
    removeTestVictim,
    executeRaid,
    discoverNetworkPlayers,
  } = useGameData()
  const { settings } = useTestSettings()

  const [phase, setPhase] = useState<RaidPhase>('select-target')
  const [selectedVictim, setSelectedVictim] = useState<TestVictim | null>(null)
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null)
  const [raidResult, setRaidResult] = useState<{ success: boolean; amount: number; blockedByShield?: boolean } | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showNetworkPlayers, setShowNetworkPlayers] = useState(false)

  // Get network players (other wallets registered on network)
  const networkPlayers = useMemo(() => discoverNetworkPlayers(), [discoverNetworkPlayers])

  // Combine test victims and network players
  const allTargets = useMemo(() => {
    if (showNetworkPlayers) {
      return [...networkPlayers, ...testVictims]
    }
    return testVictims
  }, [testVictims, networkPlayers, showNetworkPlayers])

  // Calculate win rate
  const winRate = useMemo(() => {
    const total = stats.successfulRaids + stats.failedRaids
    if (total === 0) return 0
    return Math.round((stats.successfulRaids / total) * 100)
  }, [stats.successfulRaids, stats.failedRaids])

  const handleCreateTestVictim = () => {
    const newVictim = createTestVictim()
    setNotification({ type: 'success', message: `Created test victim: ${newVictim.name}` })
    setTimeout(() => setNotification(null), 2000)
  }

  const handleSelectVictim = (victim: TestVictim) => {
    setSelectedVictim(victim)
    setSelectedPlot(null)
    setPhase('select-plot')
  }

  const handleSelectPlot = (plotIndex: number) => {
    setSelectedPlot(plotIndex)
  }

  const handleExecuteRaid = () => {
    if (!selectedVictim || selectedPlot === null) return

    setPhase('executing')

    // Simulate execution delay
    setTimeout(() => {
      const result = executeRaid(selectedVictim.id, selectedPlot)
      setRaidResult(result)
      setPhase('result')
    }, 1500)
  }

  const handleReset = () => {
    setPhase('select-target')
    setSelectedVictim(null)
    setSelectedPlot(null)
    setRaidResult(null)
  }

  // Not connected state
  if (!connected) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-700/20 flex items-center justify-center mb-6 border border-red-500/30">
          <BoltIcon className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold mb-3 text-white text-outline-royal">Ready to Steal?</h2>
        <p className="text-white text-outline-royal max-w-md mb-6">
          Connect your wallet to start stealing from other players.
          Pick the right plot and steal their yield! ⚔️
        </p>
        <div className="flex items-center gap-2 text-white text-outline-royal">
          <WalletIcon className="w-5 h-5" />
          <span>Connect wallet to continue</span>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-4">
      {/* Notification Toast */}
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

      {/* Header with Stats */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-3 mb-4 text-white text-outline-royal">
          <BoltIcon className="w-8 h-8 text-red-400 flex-shrink-0" />
          <span>Steal Mode</span>
        </h1>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-600">
            <div className="text-xs text-white text-outline-dark mb-1">USDT Balance</div>
            <div className="text-lg font-bold text-white text-outline-gold truncate">{formatBalance(usdtBalance)}</div>
          </div>
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-600">
            <div className="text-xs text-white text-outline-dark mb-1">Total Stolen</div>
            <div className="text-lg font-bold text-white text-outline-green truncate">{formatBalance(stats.totalStolen)}</div>
          </div>
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-600">
            <div className="text-xs text-white text-outline-dark mb-1">Win Rate</div>
            <div className="text-lg font-bold text-white text-outline-dark">{winRate}%</div>
          </div>
        </div>
      </div>

      {/* Main Content Based on Phase */}
      <AnimatePresence mode="wait">
        {phase === 'select-target' && (
          <motion.div
            key="select-target"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {/* Test Victims Section */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-white text-outline-dark">
                <UsersIcon className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <span>Available Targets</span>
              </h2>
              <div className="flex items-center gap-2">
                {/* Network Players Toggle */}
                {networkPlayers.length > 0 && (
                  <button
                    onClick={() => setShowNetworkPlayers(!showNetworkPlayers)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${
                      showNetworkPlayers 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    <GlobeAltIcon className="w-4 h-4" />
                    Network ({networkPlayers.length})
                  </button>
                )}
                <button
                  onClick={handleCreateTestVictim}
                  className="px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm font-medium flex items-center gap-1"
                >
                  <UserPlusIcon className="w-4 h-4" />
                  Create Victim
                </button>
              </div>
            </div>

            {allTargets.length === 0 ? (
              <div className="bg-slate-800/60 rounded-xl p-8 text-center border border-slate-600">
                <UsersIcon className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                <p className="text-white text-outline-dark mb-4">No victims available. Create some to test raiding!</p>
                <button
                  onClick={handleCreateTestVictim}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded-lg font-medium"
                >
                  Create First Victim
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {allTargets.map((victim) => {
                  const isNetworkPlayer = networkPlayers.some(p => p.id === victim.id)
                  return (
                    <motion.div
                      key={victim.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-xl p-4 border ${
                        isNetworkPlayer 
                          ? 'bg-green-900/20 border-green-500/30' 
                          : 'bg-slate-800/60 border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white truncate">{victim.name}</p>
                            {isNetworkPlayer && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 flex-shrink-0">
                                NETWORK
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/70 font-mono truncate">
                            {victim.chainId}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-sm text-white text-outline-dark">Total Staked</p>
                            <p className="text-lg font-bold text-white text-outline-gold">{formatBalance(victim.totalStaked)}</p>
                          </div>
                          {!isNetworkPlayer && (
                            <button
                              onClick={() => removeTestVictim(victim.id)}
                              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Hidden Plots Preview (Show only that there ARE 5 plots, not which has tokens) */}
                      <div className="grid grid-cols-5 gap-2 mb-3">
                        {Array.from({ length: PLOTS_COUNT }).map((_, idx) => (
                          <div
                            key={idx}
                            className="aspect-square bg-slate-700/50 rounded-lg flex items-center justify-center border border-slate-600/50"
                          >
                            <QuestionMarkCircleIcon className="w-6 h-6 text-slate-500" />
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => handleSelectVictim(victim)}
                        className={`w-full py-2 rounded-lg font-medium flex items-center justify-center gap-2 ${
                          isNetworkPlayer
                            ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                            : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                        }`}
                      >
                        <BoltIcon className="w-5 h-5" />
                        Select as Target
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* Raid History */}
            {raidHistory.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-white text-outline-dark">
                  <ClockIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <span>Recent Raids</span>
                </h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {raidHistory.slice(0, 10).map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        entry.success
                          ? 'bg-green-500/10 border border-green-500/20'
                          : 'bg-red-500/10 border border-red-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {entry.success ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{entry.targetName}</p>
                          <p className="text-xs text-white/70">Plot #{entry.plotIndex + 1}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {entry.success ? (
                          <p className="text-white text-outline-green font-bold">+{formatBalance(entry.amount)}</p>
                        ) : (
                          <p className="text-white text-outline-dark text-sm">Failed</p>
                        )}
                        <p className="text-xs text-white/70">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {phase === 'select-plot' && selectedVictim && (
          <motion.div
            key="select-plot"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleReset}
                className="text-white hover:text-white/80 text-sm text-outline-dark"
              >
                ← Back
              </button>
              <h2 className="text-lg font-semibold text-white text-outline-dark">Select a Plot to Raid</h2>
              <div className="w-12" />
            </div>

            {/* Target Info */}
            <div className="bg-slate-800/80 rounded-xl p-4 border border-red-500/30">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white text-outline-dark">Target</p>
                  <p className="font-bold text-white truncate">{selectedVictim.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm text-white text-outline-dark">Total Staked</p>
                  <p className="text-xl font-bold text-white text-outline-gold">{formatBalance(selectedVictim.totalStaked)}</p>
                </div>
              </div>
            </div>

            {/* Plot Selection - Raiders see all plots as "?" */}
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-600">
              <h3 className="text-center font-semibold mb-4 text-white text-outline-dark">
                🎯 Pick a Plot (Guess Wisely!)
              </h3>
              <p className="text-center text-sm text-white text-outline-dark mb-4">
                One or more plots have tokens hidden. Pick correctly to steal!
              </p>
              
              <div className="grid grid-cols-5 gap-3">
                {Array.from({ length: PLOTS_COUNT }).map((_, idx) => (
                  <motion.button
                    key={idx}
                    onClick={() => handleSelectPlot(idx)}
                    className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                      selectedPlot === idx
                        ? 'border-red-500 bg-red-500/20 scale-105'
                        : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                    }`}
                    whileHover={{ scale: selectedPlot === idx ? 1.05 : 1.02 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <QuestionMarkCircleIcon className="w-8 h-8 text-slate-400" />
                    <p className="text-xs mt-1 text-white/70">#{idx + 1}</p>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Execute Button */}
            <motion.button
              onClick={handleExecuteRaid}
              disabled={selectedPlot === null}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 text-white ${
                selectedPlot !== null
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-outline-dark'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
              whileHover={selectedPlot !== null ? { scale: 1.02 } : {}}
              whileTap={selectedPlot !== null ? { scale: 0.98 } : {}}
            >
              <BoltIcon className="w-6 h-6 flex-shrink-0" />
              <span className="truncate">{selectedPlot !== null ? `Raid Plot #${selectedPlot + 1}` : 'Select a Plot'}</span>
            </motion.button>

            {/* Risk Warning */}
            <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <p className="text-sm text-white text-outline-gold text-center">
                ⚠️ You have a {Math.round(100 / PLOTS_COUNT)}% base chance of picking the right plot!
              </p>
            </div>
          </motion.div>
        )}

        {phase === 'executing' && (
          <motion.div
            key="executing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="min-h-[50vh] flex flex-col items-center justify-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-20 h-20 rounded-full border-4 border-red-500/30 border-t-red-500 mb-6"
            />
            <h2 className="text-xl font-bold mb-2 text-white text-outline-royal">Executing Raid...</h2>
            <p className="text-white text-outline-dark">Attempting to breach Plot #{(selectedPlot ?? 0) + 1}</p>
          </motion.div>
        )}

        {phase === 'result' && raidResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
                raidResult.success ? 'bg-green-500/20' : raidResult.blockedByShield ? 'bg-blue-500/20' : 'bg-red-500/20'
              }`}
            >
              {raidResult.success ? (
                <TrophyIcon className="w-12 h-12 text-green-400" />
              ) : raidResult.blockedByShield ? (
                <ShieldCheckIcon className="w-12 h-12 text-blue-400" />
              ) : (
                <XCircleIcon className="w-12 h-12 text-red-400" />
              )}
            </motion.div>

            <h2 className={`text-3xl font-bold mb-2 text-white ${
              raidResult.success ? 'text-outline-green' : raidResult.blockedByShield ? 'text-outline-royal' : 'text-outline-dark'
            }`}>
              {raidResult.success ? 'RAID SUCCESS!' : raidResult.blockedByShield ? 'BLOCKED BY SHIELD!' : 'RAID FAILED'}
            </h2>

            {raidResult.success ? (
              <div className="space-y-2 mb-6">
                <p className="text-white text-outline-dark">You found tokens in Plot #{(selectedPlot ?? 0) + 1}!</p>
                <p className="text-2xl font-bold text-white text-outline-gold">
                  +{formatBalance(raidResult.amount)} Stolen!
                </p>
              </div>
            ) : raidResult.blockedByShield ? (
              <div className="space-y-2 mb-6">
                <p className="text-white text-outline-dark">The victim had a shield active!</p>
                <p className="text-blue-400">🛡️ Their shield was consumed protecting them.</p>
              </div>
            ) : (
              <div className="space-y-2 mb-6">
                <p className="text-white text-outline-dark">Plot #{(selectedPlot ?? 0) + 1} was empty!</p>
                <p className="text-white text-outline-dark">Better luck next time...</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedPlot(null)
                  setRaidResult(null)
                  setPhase('select-plot')
                }}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium"
              >
                Try Again
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded-xl font-medium"
              >
                New Target
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Card */}
      <div className="mt-8 p-4 bg-slate-800/60 rounded-xl border border-slate-600">
        <h4 className="font-semibold mb-3 flex items-center gap-2 text-white text-outline-dark">
          <ShieldCheckIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <span>How Raiding Works</span>
        </h4>
        <ul className="space-y-2 text-sm text-white text-outline-dark">
          <li>• Each farm has 5 hidden plots</li>
          <li>• You must guess which plot(s) have tokens</li>
          <li>• Correct guess = steal {settings.stealPercent}% of that plot's balance</li>
          <li>• Wrong guess = nothing (no penalty)</li>
          <li>• Strategy: Target farms with high total stake!</li>
        </ul>
      </div>
    </div>
  )
}
