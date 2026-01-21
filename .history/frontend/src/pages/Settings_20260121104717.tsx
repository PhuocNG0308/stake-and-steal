import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cog6ToothIcon,
  ServerIcon,
  KeyIcon,
  BellIcon,
  ArrowPathIcon,
  SpeakerWaveIcon,
  SparklesIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline'
import { GET_CONFIG } from '@/graphql/queries'
import { useWalletStore } from '@/stores'
import { useSettingsStore, playSound, type ThemeType } from '@/stores/settingsStore'
import { useGameData } from '@/stores/gameDataStore'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// Confirmation Modal Component
function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm',
  type = 'danger'
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  type?: 'danger' | 'warning'
}) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-800 rounded-xl p-5 w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${type === 'danger' ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
              <ExclamationTriangleIcon className={`w-6 h-6 ${type === 'danger' ? 'text-red-400' : 'text-yellow-400'}`} />
            </div>
            <h3 className="text-xl font-bold text-white text-outline-dark">{title}</h3>
          </div>
          
          <p className="text-white text-outline-dark mb-6">{message}</p>
          
          <div className="flex gap-3">
            <button 
              onClick={onClose} 
              className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => { onConfirm(); onClose(); }} 
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                type === 'danger' 
                  ? 'bg-red-600 hover:bg-red-500 text-white' 
                  : 'bg-yellow-500 hover:bg-yellow-400 text-slate-900'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Toast Notification
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg flex items-center gap-2 ${
        type === 'success' ? 'bg-green-500/90' : 'bg-red-500/90'
      }`}
    >
      {type === 'success' ? (
        <CheckCircleIcon className="w-5 h-5 text-white" />
      ) : (
        <XMarkIcon className="w-5 h-5 text-white" />
      )}
      <span className="font-medium text-white">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">
        <XMarkIcon className="w-4 h-4 text-white" />
      </button>
    </motion.div>
  )
}

// Toggle Component
function Toggle({ enabled, onChange, disabled = false }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => {
        if (!disabled) {
          onChange(!enabled)
          playSound('click')
        }
      }}
      disabled={disabled}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-yellow-500' : 'bg-slate-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div 
        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// Theme Button Component
function ThemeButton({ 
  theme, 
  currentTheme, 
  onClick, 
  icon: Icon, 
  label 
}: { 
  theme: ThemeType
  currentTheme: ThemeType
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string 
}) {
  const isActive = theme === currentTheme
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        onClick()
        playSound('click')
      }}
      className={`p-4 rounded-xl border-2 text-center transition-all ${
        isActive
          ? 'border-yellow-500 bg-yellow-500/20'
          : 'border-slate-600 bg-slate-800/50 hover:border-yellow-500/50'
      }`}
    >
      <Icon className={`w-8 h-8 mx-auto mb-2 ${isActive ? 'text-yellow-400' : 'text-slate-400'}`} />
      <p className={`font-semibold ${isActive ? 'text-white text-outline-gold' : 'text-white text-outline-dark'}`}>{label}</p>
      {isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mt-2"
        >
          <CheckCircleIcon className="w-5 h-5 mx-auto text-yellow-400" />
        </motion.div>
      )}
    </motion.button>
  )
}

export default function Settings() {
  const { data: configData, loading } = useQuery(GET_CONFIG)
  const { chainId, connected, disconnect } = useWalletStore()
  const { resetPlayer } = useGameData()
  
  // Settings store
  const {
    theme,
    setTheme,
    notificationsEnabled,
    setNotificationsEnabled,
    soundEnabled,
    setSoundEnabled,
    soundVolume,
    setSoundVolume,
    showAnimations,
    setShowAnimations,
    nodeUrl,
    setNodeUrl,
    registryChain,
    setRegistryChain,
    clearAllData,
    resetToDefaults,
  } = useSettingsStore()

  // Local state
  const [localNodeUrl, setLocalNodeUrl] = useState(nodeUrl)
  const [localRegistryChain, setLocalRegistryChain] = useState(registryChain)
  const [showClearDataModal, setShowClearDataModal] = useState(false)
  const [showUnregisterModal, setShowUnregisterModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isReconnecting, setIsReconnecting] = useState(false)

  const config = configData?.config

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    playSound(type)
    setTimeout(() => setToast(null), 3000)
  }

  const handleSaveConnection = () => {
    setNodeUrl(localNodeUrl)
    setRegistryChain(localRegistryChain)
    showToast('Connection settings saved!', 'success')
  }

  const handleReconnect = async () => {
    setIsReconnecting(true)
    playSound('click')
    
    // Simulate reconnection
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsReconnecting(false)
    showToast('Reconnected successfully!', 'success')
  }

  const handleUnregister = () => {
    resetPlayer()
    disconnect()
    showToast('Unregistered from the game', 'success')
  }

  const handleClearData = () => {
    clearAllData()
    // Page will reload automatically
  }

  const handleResetSettings = () => {
    resetToDefaults()
    setLocalNodeUrl('http://localhost:8080')
    setLocalRegistryChain('')
    showToast('Settings reset to defaults', 'success')
  }

  const handleTestSound = () => {
    playSound('coin')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-4 space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* Modals */}
      <ConfirmModal
        isOpen={showClearDataModal}
        onClose={() => setShowClearDataModal(false)}
        onConfirm={handleClearData}
        title="Clear All Data"
        message="This will reset all your local settings, cached data, and game progress. This action cannot be undone."
        confirmText="Clear Everything"
        type="danger"
      />

      <ConfirmModal
        isOpen={showUnregisterModal}
        onClose={() => setShowUnregisterModal(false)}
        onConfirm={handleUnregister}
        title="Unregister from Game"
        message="This will remove your player data from the game registry. You'll need to register again to play."
        confirmText="Unregister"
        type="danger"
      />

      <ConfirmModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetSettings}
        title="Reset Settings"
        message="This will reset all settings to their default values. Your game progress will not be affected."
        confirmText="Reset"
        type="warning"
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center border border-yellow-500/30">
          <Cog6ToothIcon className="w-8 h-8 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white text-outline-royal">Settings</h1>
          <p className="text-white text-outline-dark">
            Configure your game experience
          </p>
        </div>
      </motion.div>

      {/* Theme Settings - Simplified to Light/Dark */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-slate-800/80 rounded-xl p-4 border border-slate-600"
      >
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white text-outline-dark">
          <SunIcon className="w-5 h-5 text-yellow-400" />
          Theme
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <ThemeButton
            theme="dark"
            currentTheme={theme}
            onClick={() => setTheme('dark')}
            icon={MoonIcon}
            label="Dark"
          />
          <ThemeButton
            theme="light"
            currentTheme={theme}
            onClick={() => setTheme('light')}
            icon={SunIcon}
            label="Light"
          />
        </div>
      </motion.div>

      {/* Sound & Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-800/80 rounded-xl p-4 border border-slate-600"
      >
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white text-outline-dark">
          <BellIcon className="w-5 h-5 text-blue-400" />
          Sound & Notifications
        </h3>

        <div className="space-y-6">
          {/* Notifications Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <BellIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-white text-outline-dark">Notifications</p>
                <p className="text-sm text-white text-outline-dark">Get notified when you're raided</p>
              </div>
            </div>
            <Toggle enabled={notificationsEnabled} onChange={setNotificationsEnabled} />
          </div>

          {/* Sound Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <SpeakerWaveIcon className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-white text-outline-dark">Sound Effects</p>
                <p className="text-sm text-white text-outline-dark">Play sounds for game events</p>
              </div>
            </div>
            <Toggle enabled={soundEnabled} onChange={setSoundEnabled} />
          </div>

          {/* Volume Slider */}
          <AnimatePresence>
            {soundEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="ml-12 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white text-outline-dark">Volume</span>
                  <span className="text-sm font-bold text-white text-outline-gold">{soundVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-600"
                  style={{
                    background: `linear-gradient(to right, #eab308 0%, #eab308 ${soundVolume}%, #475569 ${soundVolume}%, #475569 100%)`
                  }}
                />
                <button 
                  onClick={handleTestSound} 
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors mt-2"
                >
                  🔊 Test Sound
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Animations Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <SparklesIcon className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="font-semibold text-white text-outline-dark">Animations</p>
                <p className="text-sm text-white text-outline-dark">Enable fancy animations</p>
              </div>
            </div>
            <Toggle enabled={showAnimations} onChange={setShowAnimations} />
          </div>
        </div>
      </motion.div>

      {/* Connection Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-800/80 rounded-xl p-4 border border-slate-600"
      >
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white text-outline-dark">
          <ServerIcon className="w-5 h-5 text-cyan-400" />
          Connection
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-white text-outline-dark mb-1.5 block">Node URL</label>
            <input
              type="text"
              value={localNodeUrl}
              onChange={(e) => setLocalNodeUrl(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
              placeholder="http://localhost:8080"
            />
          </div>

          <div>
            <label className="text-sm text-white text-outline-dark mb-1.5 block">Registry Chain ID</label>
            <input
              type="text"
              value={localRegistryChain}
              onChange={(e) => setLocalRegistryChain(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 font-mono text-sm"
              placeholder="Enter registry chain ID..."
            />
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-700/50 border border-slate-600">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <div>
                <p className="font-medium text-white text-outline-dark">{connected ? 'Connected' : 'Not Connected'}</p>
                <p className="text-sm text-white text-outline-dark">
                  {connected ? 'Linera node is active' : 'Connect your wallet to start'}
                </p>
              </div>
            </div>
          </div>

          {chainId && (
            <div className="p-4 rounded-xl bg-slate-700/50 border border-slate-600">
              <p className="text-sm text-white text-outline-dark mb-1">Your Chain ID</p>
              <p className="font-mono text-sm break-all text-white text-outline-gold">{chainId}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button 
              onClick={handleSaveConnection} 
              className="flex-1 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 rounded-lg font-medium text-slate-900 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircleIcon className="w-4 h-4" />
              Save Settings
            </button>
            <button 
              onClick={handleReconnect} 
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-white transition-colors flex items-center gap-2"
              disabled={isReconnecting}
            >
              <ArrowPathIcon className={`w-4 h-4 ${isReconnecting ? 'animate-spin' : ''}`} />
              {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Game Configuration (Read-only) */}
      {config && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-800/80 rounded-xl p-4 border border-slate-600"
        >
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white text-outline-dark">
            <KeyIcon className="w-5 h-5 text-yellow-400" />
            Game Configuration
            <span className="ml-2 px-2 py-0.5 text-xs bg-slate-700 rounded-full text-white">Read Only</span>
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Yield Rate', value: `${(Number(config.yieldRateBps) / 100).toFixed(2)}% APY`, color: 'text-green-400' },
              { label: 'Steal Success', value: `${config.stealSuccessRate}%`, color: 'text-red-400' },
              { label: 'Cooldown', value: `${config.stealCooldownBlocks} blocks`, color: 'text-blue-400' },
              { label: 'Max Pages', value: config.maxPages, color: 'text-purple-400' },
              { label: 'Plots per Page', value: config.maxPlotsPerPage, color: 'text-cyan-400' },
              { label: 'Min Deposit', value: config.minDeposit, color: 'text-yellow-400' },
            ].map((item) => (
              <div 
                key={item.label} 
                className="p-3 bg-slate-700/50 rounded-xl border border-slate-600"
              >
                <p className="text-xs text-white text-outline-dark uppercase tracking-wider">{item.label}</p>
                <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-slate-800/80 rounded-xl p-4 border border-red-500/50"
      >
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-red-400">
          <ExclamationTriangleIcon className="w-5 h-5" />
          Danger Zone
        </h3>

        <div className="space-y-4">
          {/* Reset Settings */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-700/50 border border-yellow-500/30">
            <div>
              <p className="font-semibold text-white text-outline-dark">Reset Settings</p>
              <p className="text-sm text-white text-outline-dark">Reset all settings to default values</p>
            </div>
            <button 
              onClick={() => setShowResetModal(true)}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Reset
            </button>
          </div>

          {/* Unregister */}
          {connected && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-700/50 border border-red-500/30">
              <div>
                <p className="font-semibold text-white text-outline-dark">Unregister</p>
                <p className="text-sm text-white text-outline-dark">Remove yourself from the game registry</p>
              </div>
              <button 
                onClick={() => setShowUnregisterModal(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium text-white transition-colors"
              >
                Unregister
              </button>
            </div>
          )}

          {/* Clear All Data */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-700/50 border border-red-500/30">
            <div>
              <p className="font-semibold text-white text-outline-dark">Clear All Data</p>
              <p className="text-sm text-white text-outline-dark">Reset everything and start fresh</p>
            </div>
            <button 
              onClick={() => setShowClearDataModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2"
            >
              <TrashIcon className="w-4 h-4" />
              Clear Data
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
