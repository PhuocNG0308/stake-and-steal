import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface TestSettings {
  timeScale: number
  apyPercent: number
  dayDurationSeconds: number
  stealPercent: number
  minStealStake: number
  autoYieldEnabled: boolean
  debugMode: boolean
}

interface TestSettingsStore {
  settings: TestSettings
  updateSettings: (settings: Partial<TestSettings>) => void
  resetSettings: () => void
}

const defaultSettings: TestSettings = {
  timeScale: 1,
  apyPercent: 5,
  dayDurationSeconds: 60, // 1 minute = 1 day for testing
  stealPercent: 15,
  minStealStake: 1000,
  autoYieldEnabled: true,
  debugMode: false,
}

const useTestSettingsStore = create<TestSettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: 'stake-steal-test-settings',
    }
  )
)

export function useTestSettings() {
  const store = useTestSettingsStore()
  
  // Calculate derived values
  const calculateYield = (stakeAmount: number, daysElapsed: number) => {
    const { apyPercent, timeScale } = store.settings
    // Daily rate = APY / 365
    const dailyRate = apyPercent / 365 / 100
    return stakeAmount * dailyRate * daysElapsed * timeScale
  }

  const calculateStealAmount = (stakeAmount: number, daysElapsed: number) => {
    const { stealPercent } = store.settings
    const yieldAmount = calculateYield(stakeAmount, daysElapsed)
    return (stakeAmount * stealPercent / 100) + (yieldAmount * stealPercent / 100)
  }

  // Convert real seconds to game days
  const secondsToGameDays = (seconds: number) => {
    const { dayDurationSeconds, timeScale } = store.settings
    return (seconds / dayDurationSeconds) * timeScale
  }

  return {
    ...store,
    calculateYield,
    calculateStealAmount,
    secondsToGameDays,
  }
}

export default useTestSettingsStore
