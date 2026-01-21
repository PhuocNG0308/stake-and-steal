import { motion } from 'framer-motion'
import {
  ChartBarIcon,
  TrophyIcon,
  ShieldCheckIcon,
  BoltIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  WalletIcon,
} from '@heroicons/react/24/outline'
import { formatBalance, formatPercentage } from '@/utils/format'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useWalletStore } from '@/stores'
import { useGameData } from '@/stores/gameDataStore'

export default function Stats() {
  const { connected } = useWalletStore()
  const { stats: gameStats, isInitialized, playerFarm } = useGameData()
  
  // Use live stats from game data store
  const stats = gameStats
  const powerScore = gameStats 
    ? Math.floor(
        gameStats.totalDeposited * 0.5 + 
        gameStats.totalYieldEarned * 1.5 + 
        gameStats.successfulRaids * 100 -
        gameStats.failedRaids * 20
      )
    : 0

  // Not connected state
  if (!connected) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center mb-6 border border-blue-500/30">
          <ChartBarIcon className="w-10 h-10 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold mb-3 text-white text-outline-royal">View Your Stats</h2>
        <p className="text-white text-outline-royal max-w-md mb-6">
          Connect your wallet to view your complete game statistics, combat record, and achievements.
        </p>
        <div className="flex items-center gap-2 text-white text-outline-royal">
          <WalletIcon className="w-5 h-5" />
          <span>Connect wallet to view statistics</span>
        </div>
      </motion.div>
    )
  }

  // Loading state
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3 text-white text-outline-royal">
          <ChartBarIcon className="w-8 h-8 text-blue-400 flex-shrink-0" />
          <span>Statistics</span>
        </h1>
        <p className="text-white text-outline-dark">
          Your complete game performance overview
        </p>
      </div>

      {/* Power Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/80 rounded-xl p-6 border border-blue-500/30"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-4 rounded-xl bg-blue-600/30 flex-shrink-0">
              <TrophyIcon className="w-10 h-10 text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-white text-outline-dark">Power Score</p>
              <p className="text-4xl font-bold text-white text-outline-dark truncate">{powerScore}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm text-white text-outline-dark">Rank</p>
            <p className="text-2xl font-semibold text-white text-outline-dark">#???</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Financial Stats */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/80 rounded-xl p-6 border border-slate-600"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-white text-outline-dark">
            <ArrowTrendingUpIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
            <span>Financial Performance</span>
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
              <span className="text-white text-outline-dark">Total Deposited</span>
              <span className="font-semibold text-white text-outline-dark truncate ml-2">{formatBalance(stats?.totalDeposited || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
              <span className="text-white text-outline-dark">Total Withdrawn</span>
              <span className="font-semibold text-white text-outline-dark truncate ml-2">{formatBalance(stats?.totalWithdrawn || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-900/30 border border-green-600/30 rounded-lg">
              <span className="text-white text-outline-green">Total Yield Earned</span>
              <span className="font-semibold text-white text-outline-green truncate ml-2">
                +{formatBalance(stats?.totalYieldEarned || 0)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Combat Stats */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/80 rounded-xl p-6 border border-slate-600"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-white text-outline-dark">
            <BoltIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>Combat Record</span>
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-green-900/30 border border-green-600/30 rounded-lg text-center">
                <p className="text-3xl font-bold text-white text-outline-green">{stats?.successfulRaids || 0}</p>
                <p className="text-xs text-white text-outline-dark">Successful Steals</p>
              </div>
              <div className="p-3 bg-red-900/30 border border-red-600/30 rounded-lg text-center">
                <p className="text-3xl font-bold text-white text-outline-dark">{stats?.failedRaids || 0}</p>
                <p className="text-xs text-white text-outline-dark">Failed Steals</p>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
              <span className="text-white text-outline-dark">Win Rate</span>
              <span className="font-semibold text-white text-outline-dark">
                {stats && (stats.successfulRaids + stats.failedRaids) > 0 
                  ? formatPercentage((stats.successfulRaids / (stats.successfulRaids + stats.failedRaids)) * 100)
                  : '0%'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Theft Stats */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800/80 rounded-xl p-6 border border-slate-600"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-white text-outline-dark">
            <ArrowTrendingDownIcon className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <span>Theft Summary</span>
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-900/30 border border-green-600/30 rounded-lg">
              <span className="text-white text-outline-green">Stolen from Others</span>
              <span className="font-semibold text-white text-outline-green truncate ml-2">
                +{formatBalance(stats?.totalStolen || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-900/30 border border-red-600/30 rounded-lg">
              <span className="text-white text-outline-dark">Lost to Thieves</span>
              <span className="font-semibold text-white text-outline-dark truncate ml-2">
                -{formatBalance(stats?.totalLostToRaids || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
              <span className="text-white text-outline-dark">Net Theft</span>
              <span className={`font-semibold text-white truncate ml-2 ${
                (stats?.totalStolen || 0) > (stats?.totalLostToRaids || 0)
                  ? 'text-outline-green'
                  : 'text-outline-dark'
              }`}>
                {formatBalance(
                  (stats?.totalStolen || 0) - (stats?.totalLostToRaids || 0)
                )}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Defense Stats */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-800/80 rounded-xl p-6 border border-slate-600"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-white text-outline-dark">
            <ShieldCheckIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <span>Defense Record</span>
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-900/30 border border-blue-600/30 rounded-lg text-center">
                <p className="text-3xl font-bold text-white text-outline-dark">{stats?.timesDefended || 0}</p>
                <p className="text-xs text-white text-outline-dark">Times Defended</p>
              </div>
              <div className="p-3 bg-red-900/30 border border-red-600/30 rounded-lg text-center">
                <p className="text-3xl font-bold text-white text-outline-dark">{stats?.timesRaided || 0}</p>
                <p className="text-xs text-white text-outline-dark">Times Raided</p>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
              <span className="text-white text-outline-dark">Defense Rate</span>
              <span className="font-semibold text-white text-outline-dark">
                {stats?.timesRaided && stats.timesRaided > 0
                  ? formatPercentage((stats.timesDefended / stats.timesRaided) * 100)
                  : '100%'}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Achievements Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-slate-800/80 rounded-xl p-6 border border-slate-600"
      >
        <h3 className="font-semibold mb-4 text-white text-outline-dark">Achievements</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'First Deposit', unlocked: stats && stats.totalDeposited > 0 },
            { name: 'First Steal', unlocked: stats && stats.successfulRaids > 0 },
            { name: 'Yield Master', unlocked: stats && stats.totalYieldEarned > 1000 },
            { name: 'Legendary Thief', unlocked: stats && stats.totalStolen > 5000 },
          ].map((achievement) => (
            <div
              key={achievement.name}
              className={`p-4 rounded-lg text-center ${
                achievement.unlocked
                  ? 'bg-yellow-500/20 border border-yellow-500/30'
                  : 'bg-slate-700/50 opacity-50'
              }`}
            >
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-slate-600 flex items-center justify-center">
                <TrophyIcon className={`w-6 h-6 ${achievement.unlocked ? 'text-yellow-400' : 'text-slate-500'}`} />
              </div>
              <p className="text-sm font-medium text-white text-outline-dark">{achievement.name}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
