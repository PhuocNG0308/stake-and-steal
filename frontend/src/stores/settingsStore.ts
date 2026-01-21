import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeType = 'dark' | 'light' | 'neon' | 'retro'

interface SettingsStore {
  // Theme
  theme: ThemeType
  setTheme: (theme: ThemeType) => void
  
  // Notifications
  notificationsEnabled: boolean
  setNotificationsEnabled: (enabled: boolean) => void
  
  // Sound
  soundEnabled: boolean
  setSoundEnabled: (enabled: boolean) => void
  soundVolume: number
  setSoundVolume: (volume: number) => void
  
  // Display
  showAnimations: boolean
  setShowAnimations: (show: boolean) => void
  compactMode: boolean
  setCompactMode: (compact: boolean) => void
  
  // Connection
  nodeUrl: string
  setNodeUrl: (url: string) => void
  registryChain: string
  setRegistryChain: (chain: string) => void
  
  // Actions
  clearAllData: () => void
  resetToDefaults: () => void
}

const defaultSettings = {
  theme: 'dark' as ThemeType,
  notificationsEnabled: true,
  soundEnabled: true,
  soundVolume: 70,
  showAnimations: true,
  compactMode: false,
  nodeUrl: 'http://localhost:8080',
  registryChain: '',
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,
      
      setTheme: (theme) => {
        set({ theme })
        // Apply theme to document
        document.documentElement.setAttribute('data-theme', theme)
      },
      
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setSoundVolume: (soundVolume) => set({ soundVolume }),
      
      setShowAnimations: (showAnimations) => set({ showAnimations }),
      setCompactMode: (compactMode) => set({ compactMode }),
      
      setNodeUrl: (nodeUrl) => set({ nodeUrl }),
      setRegistryChain: (registryChain) => set({ registryChain }),
      
      clearAllData: () => {
        // Clear all localStorage data
        localStorage.clear()
        // Reset to defaults
        set(defaultSettings)
        // Reload to apply changes
        window.location.reload()
      },
      
      resetToDefaults: () => {
        set(defaultSettings)
        document.documentElement.setAttribute('data-theme', 'dark')
      },
    }),
    {
      name: 'game-settings',
      onRehydrateStorage: () => (state) => {
        // Apply theme on load
        if (state?.theme) {
          document.documentElement.setAttribute('data-theme', state.theme)
        }
      },
    }
  )
)

// Sound effects helper
export const playSound = (soundType: 'click' | 'success' | 'error' | 'coin' | 'raid') => {
  const { soundEnabled, soundVolume } = useSettingsStore.getState()
  if (!soundEnabled) return
  
  // Sound frequencies for different effects
  const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
    click: { freq: 600, duration: 50, type: 'square' },
    success: { freq: 800, duration: 150, type: 'sine' },
    error: { freq: 200, duration: 200, type: 'sawtooth' },
    coin: { freq: 1200, duration: 100, type: 'sine' },
    raid: { freq: 400, duration: 300, type: 'triangle' },
  }
  
  const sound = sounds[soundType]
  if (!sound) return
  
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)
    
    oscillator.frequency.value = sound.freq
    oscillator.type = sound.type
    gainNode.gain.value = soundVolume / 100 * 0.3
    
    oscillator.start()
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + sound.duration / 1000)
    oscillator.stop(audioCtx.currentTime + sound.duration / 1000)
  } catch (e) {
    // Audio context not available
  }
}
