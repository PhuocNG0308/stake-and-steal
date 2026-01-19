import { useQuery } from '@apollo/client'
import { motion } from 'framer-motion'
import {
  ChartBarIcon,
  TrophyIcon,
  ShieldCheckIcon,
  BoltIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline'
import { GET_STATS, GET_POWER_SCORE } from '@/graphql/queries'
import { formatBalance, formatPercentage } from '@/utils/format'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function Stats() {
  const { data: statsData, loading } = useQuery(GET_STATS)
  const { data: powerData } = useQuery(GET_POWER_SCORE)

  const stats = statsData?.stats
  const powerScore = powerData?.powerScore || 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <ChartBarIcon className="w-8 h-8 text-primary-400" />
          Statistics
        </h1>
        <p className="text-dark-400">
          Your complete game performance overview
        </p>
      </div>

      {/* Power Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-gradient-to-r from-primary-600/20 to-primary-800/20 border-primary-600/30"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-xl bg-primary-600/30">
              <TrophyIcon className="w-10 h-10 text-primary-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Power Score</p>
              <p className="text-4xl font-bold text-primary-400">{powerScore}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-dark-400">Rank</p>
            <p className="text-2xl font-semibold">#???</p>
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
          className="card"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
            Financial Performance
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-dark-800 rounded-lg">
              <span className="text-dark-400">Total Deposited</span>
              <span className="font-semibold">{formatBalance(stats?.totalDeposited || '0')}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-dark-800 rounded-lg">
              <span className="text-dark-400">Total Withdrawn</span>
              <span className="font-semibold">{formatBalance(stats?.totalWithdrawn || '0')}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
              <span className="text-green-400">Total Yield Earned</span>
              <span className="font-semibold text-green-400">
                +{formatBalance(stats?.totalYieldEarned || '0')}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Combat Stats */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BoltIcon className="w-5 h-5 text-danger-400" />
            Combat Record
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-green-900/20 border border-green-600/30 rounded-lg text-center">
                <p className="text-3xl font-bold text-green-400">{stats?.successfulSteals || 0}</p>
                <p className="text-xs text-dark-400">Successful Steals</p>
              </div>
              <div className="p-3 bg-danger-900/20 border border-danger-600/30 rounded-lg text-center">
                <p className="text-3xl font-bold text-danger-400">{stats?.failedSteals || 0}</p>
                <p className="text-xs text-dark-400">Failed Steals</p>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-dark-800 rounded-lg">
              <span className="text-dark-400">Win Rate</span>
              <span className="font-semibold text-primary-400">
                {formatPercentage(stats?.winRate || 0)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Theft Stats */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <ArrowTrendingDownIcon className="w-5 h-5 text-yellow-400" />
            Theft Summary
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
              <span className="text-green-400">Stolen from Others</span>
              <span className="font-semibold text-green-400">
                +{formatBalance(stats?.totalStolenFromOthers || '0')}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-danger-900/20 border border-danger-600/30 rounded-lg">
              <span className="text-danger-400">Lost to Thieves</span>
              <span className="font-semibold text-danger-400">
                -{formatBalance(stats?.totalLostToThieves || '0')}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-dark-800 rounded-lg">
              <span className="text-dark-400">Net Theft</span>
              <span className={`font-semibold ${
                BigInt(stats?.totalStolenFromOthers || 0) > BigInt(stats?.totalLostToThieves || 0)
                  ? 'text-green-400'
                  : 'text-danger-400'
              }`}>
                {formatBalance(
                  (BigInt(stats?.totalStolenFromOthers || 0) - BigInt(stats?.totalLostToThieves || 0)).toString()
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
          className="card"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-blue-400" />
            Defense Record
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg text-center">
                <p className="text-3xl font-bold text-blue-400">{stats?.timesDefended || 0}</p>
                <p className="text-xs text-dark-400">Times Defended</p>
              </div>
              <div className="p-3 bg-danger-900/20 border border-danger-600/30 rounded-lg text-center">
                <p className="text-3xl font-bold text-danger-400">{stats?.timesRaided || 0}</p>
                <p className="text-xs text-dark-400">Times Raided</p>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-dark-800 rounded-lg">
              <span className="text-dark-400">Defense Rate</span>
              <span className="font-semibold text-blue-400">
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
        className="card"
      >
        <h3 className="font-semibold mb-4">Achievements</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'First Deposit', unlocked: true },
            { name: 'First Steal', unlocked: stats?.successfulSteals > 0 },
            { name: 'Yield Master', unlocked: false },
            { name: 'Legendary Thief', unlocked: false },
          ].map((achievement) => (
            <div
              key={achievement.name}
              className={`p-4 rounded-lg text-center ${
                achievement.unlocked
                  ? 'bg-primary-600/20 border border-primary-600/30'
                  : 'bg-dark-800 opacity-50'
              }`}
            >
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-dark-700 flex items-center justify-center">
                <TrophyIcon className={`w-6 h-6 ${achievement.unlocked ? 'text-primary-400' : 'text-dark-500'}`} />
              </div>
              <p className="text-sm font-medium">{achievement.name}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
