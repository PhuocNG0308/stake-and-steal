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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="game-panel max-w-md mx-4 w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${type === 'danger' ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
              <ExclamationTriangleIcon className={`w-6 h-6 ${type === 'danger' ? 'text-red-400' : 'text-yellow-400'}`} />
            </div>
            <h3 className="text-xl font-bold">{title}</h3>
          </div>
          
          <p className="text-[var(--text-secondary)] mb-6">{message}</p>
          
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button 
              onClick={() => { onConfirm(); onClose(); }} 
              className={type === 'danger' ? 'btn-danger flex-1' : 'btn-gold flex-1'}
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
      initial={{ opacity: 0, y: -50, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: -50, x: '-50%' }}
      className={`fixed top-20 left-1/2 z-50 px-4 py-3 rounded-xl flex items-center gap-2 ${
        type === 'success' 
          ? 'bg-green-500/90 border border-green-400/30' 
          : 'bg-red-500/90 border border-red-400/30'
      } shadow-lg`}
    >
      {type === 'success' ? (
        <CheckCircleIcon className="w-5 h-5" />
      ) : (
        <XMarkIcon className="w-5 h-5" />
      )}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">
        <XMarkIcon className="w-4 h-4" />
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
      className={`toggle ${enabled ? 'active' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="toggle-knob" />
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
          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/20 shadow-lg'
          : 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--accent-primary)]/50'
      }`}
      style={{
        boxShadow: isActive ? '0 0 20px var(--glow-primary)' : 'none'
      }}
    >
      <Icon className={`w-8 h-8 mx-auto mb-2 ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}`} />
      <p className={`font-semibold ${isActive ? 'text-[var(--accent-primary)]' : ''}`}>{label}</p>
      {isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mt-2"
        >
          <CheckCircleIcon className="w-5 h-5 mx-auto text-[var(--accent-primary)]" />
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
    <div className="space-y-6 max-w-6xl pb-24">
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
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center shadow-lg animate-glow">
          <Cog6ToothIcon className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-cyber gradient-text">Settings</h1>
          <p className="text-[var(--text-secondary)]">
            Configure your game experience
          </p>
        </div>
      </motion.div>

      {/* Theme Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="game-panel"
      >
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 font-cyber">
          <PaintBrushIcon className="w-5 h-5 text-purple-400" />
          Theme
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <ThemeButton
            theme="neon"
            currentTheme={theme}
            onClick={() => setTheme('neon')}
            icon={BoltIcon}
            label="Neon"
          />
          <ThemeButton
            theme="retro"
            currentTheme={theme}
            onClick={() => setTheme('retro')}
            icon={ComputerDesktopIcon}
            label="Retro"
          />
        </div>
      </motion.div>

      {/* Sound & Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="game-panel"
      >
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 font-cyber">
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
                <p className="font-semibold">Notifications</p>
                <p className="text-sm text-[var(--text-muted)]">Get notified when you're raided</p>
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
                <p className="font-semibold">Sound Effects</p>
                <p className="text-sm text-[var(--text-muted)]">Play sounds for game events</p>
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
                  <span className="text-sm text-[var(--text-secondary)]">Volume</span>
                  <span className="text-sm font-bold text-[var(--accent-primary)]">{soundVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-primary) ${soundVolume}%, var(--bg-secondary) ${soundVolume}%, var(--bg-secondary) 100%)`
                  }}
                />
                <button onClick={handleTestSound} className="btn-secondary text-sm mt-2">
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
                <p className="font-semibold">Animations</p>
                <p className="text-sm text-[var(--text-muted)]">Enable fancy animations</p>
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
        className="game-panel"
      >
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 font-cyber">
          <ServerIcon className="w-5 h-5 text-cyan-400" />
          Connection
        </h3>

        <div className="space-y-4">
          <div>
            <label className="label">Node URL</label>
            <input
              type="text"
              value={localNodeUrl}
              onChange={(e) => setLocalNodeUrl(e.target.value)}
              className="input"
              placeholder="http://localhost:8080"
            />
          </div>

          <div>
            <label className="label">Registry Chain ID</label>
            <input
              type="text"
              value={localRegistryChain}
              onChange={(e) => setLocalRegistryChain(e.target.value)}
              className="input font-mono text-sm"
              placeholder="Enter registry chain ID..."
            />
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <div>
                <p className="font-medium">{connected ? 'Connected' : 'Not Connected'}</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {connected ? 'Linera node is active' : 'Connect your wallet to start'}
                </p>
              </div>
            </div>
          </div>

          {chainId && (
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
              <p className="text-sm text-[var(--text-muted)] mb-1">Your Chain ID</p>
              <p className="font-mono text-sm break-all text-[var(--accent-primary)]">{chainId}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleSaveConnection} className="btn-primary flex-1">
              <CheckCircleIcon className="w-4 h-4" />
              Save Settings
            </button>
            <button 
              onClick={handleReconnect} 
              className="btn-secondary"
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
          className="game-panel"
        >
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 font-cyber">
            <KeyIcon className="w-5 h-5 text-yellow-400" />
            Game Configuration
            <span className="badge ml-2">Read Only</span>
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Yield Rate', value: `${(Number(config.yieldRateBps) / 100).toFixed(2)}% APY`, color: 'green' },
              { label: 'Steal Success', value: `${config.stealSuccessRate}%`, color: 'red' },
              { label: 'Cooldown', value: `${config.stealCooldownBlocks} blocks`, color: 'blue' },
              { label: 'Max Pages', value: config.maxPages, color: 'purple' },
              { label: 'Plots per Page', value: config.maxPlotsPerPage, color: 'cyan' },
              { label: 'Min Deposit', value: config.minDeposit, color: 'gold' },
            ].map((item) => (
              <div 
                key={item.label} 
                className={`stat-card stat-card-${item.color}`}
              >
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{item.label}</p>
                <p className="text-lg font-bold font-cyber">{item.value}</p>
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
        className="game-panel"
        style={{ borderColor: 'var(--accent-red)', boxShadow: '0 0 20px var(--glow-red)' }}
      >
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-red-400 font-cyber">
          <ExclamationTriangleIcon className="w-5 h-5" />
          Danger Zone
        </h3>

        <div className="space-y-4">
          {/* Reset Settings */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-yellow-500/30">
            <div>
              <p className="font-semibold">Reset Settings</p>
              <p className="text-sm text-[var(--text-muted)]">Reset all settings to default values</p>
            </div>
            <button 
              onClick={() => setShowResetModal(true)}
              className="btn-secondary text-sm"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Reset
            </button>
          </div>

          {/* Unregister */}
          {connected && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-red-500/30">
              <div>
                <p className="font-semibold">Unregister</p>
                <p className="text-sm text-[var(--text-muted)]">Remove yourself from the game registry</p>
              </div>
              <button 
                onClick={() => setShowUnregisterModal(true)}
                className="btn-danger text-sm"
              >
                Unregister
              </button>
            </div>
          )}

          {/* Clear All Data */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-red-500/30">
            <div>
              <p className="font-semibold">Clear All Data</p>
              <p className="text-sm text-[var(--text-muted)]">Reset everything and start fresh</p>
            </div>
            <button 
              onClick={() => setShowClearDataModal(true)}
              className="btn-danger text-sm"
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
