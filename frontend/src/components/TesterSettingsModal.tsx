import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  BeakerIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BoltIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { useUIStore } from '@/stores'
import { useTestSettings } from '../hooks/useTestSettings'

export default function TesterSettingsModal() {
  const { modalOpen, closeModal } = useUIStore()
  const { settings, updateSettings, resetSettings } = useTestSettings()
  
  const [localSettings, setLocalSettings] = useState(settings)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  if (modalOpen !== 'tester-settings') return null

  const handleSave = () => {
    updateSettings(localSettings)
    closeModal()
  }

  const handleReset = () => {
    resetSettings()
    setLocalSettings({
      // Default values
      timeScale: 1,
      apyPercent: 5,
      dayDurationSeconds: 60, // 1 minute = 1 day for testing
      stealPercent: 15,
      minStealStake: 1000,
      autoYieldEnabled: true,
      debugMode: false,
    })
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={closeModal}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-lg bg-dark-900 rounded-2xl border border-yellow-500/30 shadow-xl shadow-yellow-500/10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 bg-yellow-500/10">
            <div className="flex items-center gap-3">
              <BeakerIcon className="w-6 h-6 text-yellow-400" />
              <h2 className="text-lg font-bold text-yellow-400">Tester Settings</h2>
            </div>
            <button
              onClick={closeModal}
              className="p-2 rounded-lg hover:bg-dark-800 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Time Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider flex items-center gap-2">
                <ClockIcon className="w-4 h-4" />
                Time Settings
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Day Duration (seconds)</label>
                  <input
                    type="number"
                    min={1}
                    max={86400}
                    value={localSettings.dayDurationSeconds}
                    onChange={(e) => setLocalSettings({ ...localSettings, dayDurationSeconds: parseInt(e.target.value) || 60 })}
                    className="input text-center"
                  />
                  <p className="text-xs text-dark-500 mt-1">
                    Real time for 1 in-game day
                  </p>
                </div>

                <div>
                  <label className="label">Time Scale</label>
                  <input
                    type="number"
                    min={0.1}
                    max={100}
                    step={0.1}
                    value={localSettings.timeScale}
                    onChange={(e) => setLocalSettings({ ...localSettings, timeScale: parseFloat(e.target.value) || 1 })}
                    className="input text-center"
                  />
                  <p className="text-xs text-dark-500 mt-1">
                    Yield calculation multiplier
                  </p>
                </div>
              </div>
            </div>

            {/* Yield Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider flex items-center gap-2">
                <CurrencyDollarIcon className="w-4 h-4" />
                Yield Settings
              </h3>

              <div>
                <label className="label">APY Percentage</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={localSettings.apyPercent}
                    onChange={(e) => setLocalSettings({ ...localSettings, apyPercent: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                  <span className="w-16 text-center font-bold text-primary-400">
                    {localSettings.apyPercent}%
                  </span>
                </div>
                <p className="text-xs text-dark-500 mt-1">
                  Annual yield rate applied to staked amounts
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-dark-800 rounded-lg">
                <div>
                  <p className="font-medium">Auto Calculate Yield</p>
                  <p className="text-xs text-dark-400">Enable real-time yield accumulation</p>
                </div>
                <button
                  onClick={() => setLocalSettings({ ...localSettings, autoYieldEnabled: !localSettings.autoYieldEnabled })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    localSettings.autoYieldEnabled ? 'bg-primary-600' : 'bg-dark-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      localSettings.autoYieldEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Raid Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider flex items-center gap-2">
                <BoltIcon className="w-4 h-4" />
                Raid Settings
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Steal Percentage</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={localSettings.stealPercent}
                      onChange={(e) => setLocalSettings({ ...localSettings, stealPercent: parseInt(e.target.value) || 15 })}
                      className="input text-center pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400">%</span>
                  </div>
                </div>

                <div>
                  <label className="label">Min Steal Stake</label>
                  <input
                    type="number"
                    min={0}
                    value={localSettings.minStealStake}
                    onChange={(e) => setLocalSettings({ ...localSettings, minStealStake: parseInt(e.target.value) || 0 })}
                    className="input text-center"
                  />
                </div>
              </div>

              <p className="text-xs text-dark-500 p-3 bg-dark-800 rounded-lg">
                💡 Raid formula: If attacker picks the correct plot, they steal <strong>{localSettings.stealPercent}%</strong> of (Stake × APY × Days)
              </p>
            </div>

            {/* Debug Mode */}
            <div className="flex items-center justify-between p-4 bg-dark-800 rounded-lg border border-yellow-500/20">
              <div>
                <p className="font-medium text-yellow-400">Debug Mode</p>
                <p className="text-xs text-dark-400">Show detailed logs in console</p>
              </div>
              <button
                onClick={() => setLocalSettings({ ...localSettings, debugMode: !localSettings.debugMode })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  localSettings.debugMode ? 'bg-yellow-500' : 'bg-dark-600'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    localSettings.debugMode ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-dark-700 bg-dark-800/50">
            <button
              onClick={handleReset}
              className="btn-ghost text-dark-400 hover:text-white"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Reset Defaults
            </button>
            <div className="flex gap-3">
              <button onClick={closeModal} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSave} className="btn-primary">
                Save Settings
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
