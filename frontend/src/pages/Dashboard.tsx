import { useQuery } from '@apollo/client'
import { motion } from 'framer-motion'
import {
  BanknotesIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ShieldCheckIcon,
  BoltIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { GET_DASHBOARD_DATA } from '@/graphql/queries'
import { formatBalance, formatPercentage } from '@/utils/format'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

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
  const { data, loading, error } = useQuery(GET_DASHBOARD_DATA, {
    pollInterval: 5000, // Refresh every 5 seconds
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card border-danger-600/50 bg-danger-900/20">
        <p className="text-danger-400">Error loading dashboard: {error.message}</p>
      </div>
    )
  }

  const stats = data?.stats || {}
  const isOnCooldown = data?.isOnCooldown || false
  const cooldownRemaining = data?.cooldownRemaining || '0'

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Welcome Banner */}
      <motion.div variants={item} className="card bg-gradient-to-r from-primary-600/20 to-primary-800/20 border-primary-600/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {data?.isRegistered ? 'Welcome Back!' : 'Get Started'}
            </h2>
            <p className="text-dark-300">
              {data?.isRegistered
                ? 'Your yield is growing. Check your farms or raid other players!'
                : 'Register to start farming yield and stealing from others.'}
            </p>
          </div>
          {!data?.isRegistered && (
            <button className="btn-primary">
              Register Now
            </button>
          )}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={item} className="card-hover">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary-600/20">
              <BanknotesIcon className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Available Balance</p>
              <p className="text-2xl font-bold">
                {formatBalance(data?.availableBalance || '0')}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="card-hover">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-600/20">
              <SparklesIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Total Deposited</p>
              <p className="text-2xl font-bold">
                {formatBalance(data?.totalDeposited || '0')}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="card-hover">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-600/20">
              <ArrowTrendingUpIcon className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Total Yield Earned</p>
              <p className="text-2xl font-bold">
                {formatBalance(data?.totalYieldEarned || '0')}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="card-hover">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-yellow-600/20">
              <ClockIcon className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Pending Yield</p>
              <p className="text-2xl font-bold">
                {formatBalance(data?.totalPendingYield || '0')}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Raid Status */}
        <motion.div variants={item} className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BoltIcon className="w-5 h-5 text-danger-400" />
            Raid Status
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-dark-800 rounded-lg">
              <span className="text-dark-300">Current State</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                data?.raidState?.state === 'Idle'
                  ? 'bg-dark-700 text-dark-300'
                  : 'bg-primary-600/20 text-primary-400'
              }`}>
                {data?.raidState?.state || 'Idle'}
              </span>
            </div>

            {isOnCooldown && (
              <div className="flex items-center justify-between p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                <span className="text-yellow-400">Cooldown</span>
                <span className="font-mono">{cooldownRemaining} blocks</span>
              </div>
            )}

            <button
              disabled={isOnCooldown || !data?.isRegistered}
              className="btn-danger w-full"
            >
              {isOnCooldown ? 'On Cooldown' : 'Start Raid'}
            </button>
          </div>
        </motion.div>

        {/* Combat Stats */}
        <motion.div variants={item} className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-primary-400" />
            Combat Stats
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-dark-400">Successful Steals</span>
              <span className="font-semibold text-green-400">
                {stats.successfulSteals || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-dark-400">Failed Steals</span>
              <span className="font-semibold text-danger-400">
                {stats.failedSteals || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-dark-400">Win Rate</span>
              <span className="font-semibold text-primary-400">
                {formatPercentage(stats.winRate || 0)}
              </span>
            </div>
            <div className="h-px bg-dark-700 my-2" />
            <div className="flex justify-between items-center">
              <span className="text-dark-400">Total Stolen</span>
              <span className="font-semibold text-green-400">
                +{formatBalance(stats.totalStolenFromOthers || '0')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-dark-400">Total Lost</span>
              <span className="font-semibold text-danger-400">
                -{formatBalance(stats.totalLostToThieves || '0')}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={item} className="card">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary">
            <SparklesIcon className="w-4 h-4" />
            Claim All Yield
          </button>
          <button className="btn-secondary">
            <BanknotesIcon className="w-4 h-4" />
            New Deposit
          </button>
          <button className="btn-ghost">
            View All Pages
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
