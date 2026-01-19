import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { motion } from 'framer-motion'
import {
  Cog6ToothIcon,
  ServerIcon,
  KeyIcon,
  BellIcon,
  PaintBrushIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { GET_CONFIG } from '@/graphql/queries'
import { useWalletStore } from '@/stores'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function Settings() {
  const { data: configData, loading } = useQuery(GET_CONFIG)
  const { chainId, connected } = useWalletStore()

  const [nodeUrl, setNodeUrl] = useState('http://localhost:8080')
  const [registryChain, setRegistryChain] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)

  const config = configData?.config

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Cog6ToothIcon className="w-8 h-8 text-dark-400" />
          Settings
        </h1>
        <p className="text-dark-400">
          Configure your game and connection settings
        </p>
      </div>

      {/* Connection Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <ServerIcon className="w-5 h-5 text-primary-400" />
          Connection
        </h3>

        <div className="space-y-4">
          <div>
            <label className="label">Node URL</label>
            <input
              type="text"
              value={nodeUrl}
              onChange={(e) => setNodeUrl(e.target.value)}
              className="input"
              placeholder="http://localhost:8080"
            />
            <p className="text-xs text-dark-500 mt-1">
              The Linera node to connect to for queries and mutations
            </p>
          </div>

          <div>
            <label className="label">Registry Chain ID</label>
            <input
              type="text"
              value={registryChain}
              onChange={(e) => setRegistryChain(e.target.value)}
              className="input font-mono text-sm"
              placeholder="Enter registry chain ID..."
            />
            <p className="text-xs text-dark-500 mt-1">
              The chain ID where the game registry is deployed
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-dark-800 rounded-lg">
            <div>
              <p className="font-medium">Connection Status</p>
              <p className="text-sm text-dark-400">
                {connected ? 'Connected to Linera node' : 'Not connected'}
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400' : 'bg-danger-400'}`} />
          </div>

          {chainId && (
            <div className="p-4 bg-dark-800 rounded-lg">
              <p className="text-sm text-dark-400">Your Chain ID</p>
              <p className="font-mono text-sm break-all">{chainId}</p>
            </div>
          )}

          <button className="btn-secondary">
            <ArrowPathIcon className="w-4 h-4" />
            Reconnect
          </button>
        </div>
      </motion.div>

      {/* Game Configuration (Read-only) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <KeyIcon className="w-5 h-5 text-yellow-400" />
          Game Configuration
        </h3>

        <p className="text-sm text-dark-400 mb-4">
          These settings are configured by the game admin and cannot be changed.
        </p>

        {config && (
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-dark-800 rounded-lg">
              <span className="text-dark-400">Yield Rate</span>
              <span className="font-semibold">{(Number(config.yieldRateBps) / 100).toFixed(2)}% APY</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-dark-800 rounded-lg">
              <span className="text-dark-400">Steal Success Rate</span>
              <span className="font-semibold">{config.stealSuccessRate}%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-dark-800 rounded-lg">
              <span className="text-dark-400">Steal Cooldown</span>
              <span className="font-semibold">{config.stealCooldownBlocks} blocks</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-dark-800 rounded-lg">
              <span className="text-dark-400">Max Pages</span>
              <span className="font-semibold">{config.maxPages}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-dark-800 rounded-lg">
              <span className="text-dark-400">Max Plots per Page</span>
              <span className="font-semibold">{config.maxPlotsPerPage}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-dark-800 rounded-lg">
              <span className="text-dark-400">Minimum Deposit</span>
              <span className="font-semibold">{config.minDeposit}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-dark-800 rounded-lg">
              <span className="text-dark-400">Max Steal Percentage</span>
              <span className="font-semibold">{config.maxStealPercentage}%</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Notification Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BellIcon className="w-5 h-5 text-blue-400" />
          Notifications
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Notifications</p>
              <p className="text-sm text-dark-400">Get notified when you're raided</p>
            </div>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${
                notificationsEnabled ? 'bg-primary-600' : 'bg-dark-600'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  notificationsEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sound Effects</p>
              <p className="text-sm text-dark-400">Play sounds for game events</p>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${
                soundEnabled ? 'bg-primary-600' : 'bg-dark-600'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Theme Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <PaintBrushIcon className="w-5 h-5 text-purple-400" />
          Theme
        </h3>

        <div className="grid grid-cols-3 gap-4">
          {['Dark', 'Light', 'System'].map((theme) => (
            <button
              key={theme}
              className={`p-4 rounded-lg border-2 text-center transition-all ${
                theme === 'Dark'
                  ? 'border-primary-500 bg-primary-600/20'
                  : 'border-dark-600 hover:border-dark-500 bg-dark-800'
              }`}
            >
              <p className="font-medium">{theme}</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-dark-500 mt-2">
          Currently only Dark theme is available
        </p>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card border-danger-600/50"
      >
        <h3 className="font-semibold mb-4 text-danger-400">Danger Zone</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Unregister</p>
              <p className="text-sm text-dark-400">Remove yourself from the game registry</p>
            </div>
            <button className="btn-danger text-sm">
              Unregister
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Clear Local Data</p>
              <p className="text-sm text-dark-400">Reset all local settings and cache</p>
            </div>
            <button className="btn-secondary text-sm">
              Clear Data
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
