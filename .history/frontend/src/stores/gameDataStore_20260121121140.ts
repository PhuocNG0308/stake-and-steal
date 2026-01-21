/**
 * Game Data Store - Live state management for Stake & Steal
 * 
 * This store manages:
 * - Player's own farm with hidden plot configuration
 * - Dual-token system: USDT (Token A) + SAS (Token B)
 * - Shield system (global protection)
 * - Balance and yield tracking
 * - Raid history
 * - Achievement tracking
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================================================
// CONSTANTS
// ============================================================================

export const BASE_PLOTS_COUNT = 5
export const MAX_PLOTS_PER_PLAYER = 15
export const SAS_REWARD_RATE_BPS = 5 // 0.05% per block in SAS
export const PLOT_COST_SAS = 500
export const SHIELD_COST_SAS = 100

// ============================================================================
// TYPES
// ============================================================================

export interface HiddenPlot {
  plotId: number
  hasTokens: boolean  // Only the owner knows this
  balance: number     // USDT balance (hidden from others)
  pendingSasRewards: number // Pending SAS rewards
  depositTime: number // When tokens were deposited
  isPurchased: boolean // Extra plots need to be purchased
}

export interface PlayerFarm {
  id: string
  plots: HiddenPlot[]
  totalStaked: number
  pendingYield: number    // USDT yield
  pendingSasRewards: number // SAS rewards
  lastYieldClaim: number
  createdAt: number
}

export interface PlayerInventory {
  totalPlots: number  // Total plots owned (base + purchased)
  shields: number     // Global shields for protection
}

export interface RaidHistoryEntry {
  id: string
  timestamp: number
  type: 'attack' | 'defense'
  targetId: string
  targetName: string
  plotIndex: number
  success: boolean
  amount: number
  blockedByShield: boolean
  txHash?: string
}

export interface PlayerStats {
  totalDeposited: number
  totalWithdrawn: number
  totalYieldEarned: number    // USDT yield
  totalSasEarned: number      // SAS rewards
  totalSasSpent: number       // SAS spent on plots/shields
  totalStolen: number
  totalLostToRaids: number
  successfulRaids: number
  failedRaids: number
  timesRaided: number
  timesDefended: number
  shieldsUsed: number
  plotsPurchased: number
}

export interface TestVictim {
  id: string
  name: string
  chainId: string
  totalStaked: number
  shields: number  // Global shields
  // Hidden plot config - in real game this would be encrypted on-chain
  plotConfig: boolean[] // Which plots have tokens
  plotBalances: number[] // Balance in each plot
  createdAt: number
}

interface GameDataStore {
  // Current wallet ID
  currentWalletId: string | null
  
  // Player data
  playerFarm: PlayerFarm | null
  usdtBalance: number    // Token A - USDT
  sasBalance: number     // Token B - SAS (governance token)
  inventory: PlayerInventory
  stats: PlayerStats
  raidHistory: RaidHistoryEntry[]
  
  // Test victims for raid testing
  testVictims: TestVictim[]
  
  // Registered players on network (for cross-chain discovery)
  networkPlayers: TestVictim[]
  
  // Game time tracking
  gameStartTime: number
  lastTickTime: number
  
  // Actions
  initializePlayer: (initialUsdtBalance: number, initialSasBalance: number, walletId?: string) => void
  switchWallet: (walletId: string) => void
  setupPlot: (plotId: number, amount: number) => boolean
  withdrawFromPlot: (plotId: number) => number
  claimYield: () => number
  claimSasRewards: () => number
  
  // Plot management
  buyPlot: () => boolean
  getAvailablePlotSlots: () => number
  
  // Shield management (global)
  buyShield: (count: number) => boolean
  hasShieldProtection: () => boolean
  
  // Raid actions
  executeRaid: (victimId: string, plotIndex: number) => { success: boolean; amount: number; blockedByShield: boolean }
  addRaidHistory: (entry: Omit<RaidHistoryEntry, 'id'>) => void
  
  // Test victim management
  createTestVictim: () => TestVictim
  removeTestVictim: (id: string) => void
  
  // Network player discovery (simulates on-chain registry)
  registerOnNetwork: () => void
  discoverNetworkPlayers: () => TestVictim[]
  
  // Balance management
  addUsdtBalance: (amount: number) => void
  addSasBalance: (amount: number) => void
  removeUsdtBalance: (amount: number) => boolean
  removeSasBalance: (amount: number) => boolean
  
  // Legacy balance methods (for backward compatibility)
  addBalance: (amount: number) => void
  removeBalance: (amount: number) => boolean
  
  // Yield calculation
  calculatePendingYield: (settings: { apyPercent: number; dayDurationSeconds: number }) => number
  calculatePendingSasRewards: (settings: { sasApyPercent: number; dayDurationSeconds: number }) => number
  tickYield: (settings: { apyPercent: number; sasApyPercent: number; dayDurationSeconds: number }) => void
  
  // Reset
  reset: () => void
  resetPlayer: () => void
}

const initialStats: PlayerStats = {
  totalDeposited: 0,
  totalWithdrawn: 0,
  totalYieldEarned: 0,
  totalSasEarned: 0,
  totalSasSpent: 0,
  totalStolen: 0,
  totalLostToRaids: 0,
  successfulRaids: 0,
  failedRaids: 0,
  timesRaided: 0,
  timesDefended: 0,
  shieldsUsed: 0,
  plotsPurchased: 0,
}

const initialInventory: PlayerInventory = {
  totalPlots: BASE_PLOTS_COUNT,
  shields: 0,
}

const createEmptyFarm = (totalPlots: number = BASE_PLOTS_COUNT): PlayerFarm => ({
  id: `farm-${Date.now()}`,
  plots: Array.from({ length: totalPlots }, (_, i) => ({
    plotId: i,
    hasTokens: false,
    balance: 0,
    pendingSasRewards: 0,
    depositTime: 0,
    isPurchased: i < BASE_PLOTS_COUNT, // First 5 are free
  })),
  totalStaked: 0,
  pendingYield: 0,
  pendingSasRewards: 0,
  lastYieldClaim: Date.now(),
  createdAt: Date.now(),
})

export const useGameDataStore = create<GameDataStore>()(
  persist(
    (set, get) => ({
      currentWalletId: null,
      playerFarm: null,
      usdtBalance: 0,
      sasBalance: 0,
      inventory: initialInventory,
      stats: initialStats,
      raidHistory: [],
      testVictims: [],
      networkPlayers: [],
      gameStartTime: Date.now(),
      lastTickTime: Date.now(),

      initializePlayer: (initialUsdtBalance: number, initialSasBalance: number = 0, walletId?: string) => {
        const id = walletId || `wallet-${Date.now()}`
        set({
          currentWalletId: id,
          playerFarm: { ...createEmptyFarm(), id },
          usdtBalance: initialUsdtBalance,
          sasBalance: initialSasBalance,
          inventory: initialInventory,
          stats: initialStats,
          raidHistory: [],
          gameStartTime: Date.now(),
          lastTickTime: Date.now(),
        })
      },

      switchWallet: (walletId: string) => {
        // Clear current player data and reinitialize for new wallet
        // In production, this would load from blockchain
        set({
          currentWalletId: walletId,
          playerFarm: { ...createEmptyFarm(), id: walletId },
          usdtBalance: 10000, // Default starting USDT balance
          sasBalance: 100,    // Default starting SAS balance
          inventory: initialInventory,
          stats: initialStats,
          raidHistory: [],
          gameStartTime: Date.now(),
          lastTickTime: Date.now(),
        })
      },

      setupPlot: (plotId: number, amount: number) => {
        const { playerFarm, usdtBalance, stats, inventory } = get()
        if (!playerFarm || usdtBalance < amount || plotId < 0 || plotId >= inventory.totalPlots) {
          return false
        }

        // Check if plot is purchased
        if (!playerFarm.plots[plotId]?.isPurchased) {
          return false
        }

        const newPlots = [...playerFarm.plots]
        newPlots[plotId] = {
          ...newPlots[plotId],
          hasTokens: true,
          balance: newPlots[plotId].balance + amount,
          depositTime: Date.now(),
        }

        const totalStaked = newPlots.reduce((sum, p) => sum + p.balance, 0)

        set({
          playerFarm: {
            ...playerFarm,
            plots: newPlots,
            totalStaked,
          },
          usdtBalance: usdtBalance - amount,
          stats: {
            ...stats,
            totalDeposited: stats.totalDeposited + amount,
          },
        })

        return true
      },

      withdrawFromPlot: (plotId: number) => {
        const { playerFarm, usdtBalance, stats, inventory } = get()
        if (!playerFarm || plotId < 0 || plotId >= inventory.totalPlots) {
          return 0
        }

        const plot = playerFarm.plots[plotId]
        if (!plot.hasTokens || plot.balance === 0) {
          return 0
        }

        const amount = plot.balance
        const newPlots = [...playerFarm.plots]
        newPlots[plotId] = {
          ...newPlots[plotId],
          hasTokens: false,
          balance: 0,
          depositTime: 0,
        }

        const totalStaked = newPlots.reduce((sum, p) => sum + p.balance, 0)

        set({
          playerFarm: {
            ...playerFarm,
            plots: newPlots,
            totalStaked,
          },
          usdtBalance: usdtBalance + amount,
          stats: {
            ...stats,
            totalWithdrawn: stats.totalWithdrawn + amount,
          },
        })

        return amount
      },

      claimYield: () => {
        const { playerFarm, usdtBalance, stats } = get()
        if (!playerFarm || playerFarm.pendingYield === 0) {
          return 0
        }

        const yieldAmount = playerFarm.pendingYield
        const now = Date.now()

        // Reset deposit times after claiming so yield starts fresh
        const newPlots = playerFarm.plots.map(plot => ({
          ...plot,
          depositTime: plot.hasTokens && plot.balance > 0 ? now : 0,
        }))

        set({
          playerFarm: {
            ...playerFarm,
            plots: newPlots,
            pendingYield: 0,
            lastYieldClaim: now,
          },
          usdtBalance: usdtBalance + yieldAmount,
          stats: {
            ...stats,
            totalYieldEarned: stats.totalYieldEarned + yieldAmount,
          },
        })

        return yieldAmount
      },

      claimSasRewards: () => {
        const { playerFarm, sasBalance, stats } = get()
        if (!playerFarm || playerFarm.pendingSasRewards === 0) {
          return 0
        }

        const sasAmount = playerFarm.pendingSasRewards

        set({
          playerFarm: {
            ...playerFarm,
            pendingSasRewards: 0,
          },
          sasBalance: sasBalance + sasAmount,
          stats: {
            ...stats,
            totalSasEarned: stats.totalSasEarned + sasAmount,
          },
        })

        return sasAmount
      },

      // Plot management
      buyPlot: () => {
        const { playerFarm, sasBalance, inventory, stats } = get()
        if (!playerFarm || sasBalance < PLOT_COST_SAS) return false
        if (inventory.totalPlots >= MAX_PLOTS_PER_PLAYER) return false

        const newPlotId = inventory.totalPlots
        const newPlots = [...playerFarm.plots, {
          plotId: newPlotId,
          hasTokens: false,
          balance: 0,
          pendingSasRewards: 0,
          depositTime: 0,
          isPurchased: true,
        }]

        set({
          playerFarm: {
            ...playerFarm,
            plots: newPlots,
          },
          sasBalance: sasBalance - PLOT_COST_SAS,
          inventory: {
            ...inventory,
            totalPlots: inventory.totalPlots + 1,
          },
          stats: {
            ...stats,
            totalSasSpent: stats.totalSasSpent + PLOT_COST_SAS,
            plotsPurchased: stats.plotsPurchased + 1,
          },
        })

        return true
      },

      getAvailablePlotSlots: () => {
        const { inventory } = get()
        return MAX_PLOTS_PER_PLAYER - inventory.totalPlots
      },

      // Shield management (global)
      buyShield: (count: number) => {
        const { sasBalance, inventory, stats } = get()
        const totalCost = SHIELD_COST_SAS * count
        if (sasBalance < totalCost) return false

        set({
          sasBalance: sasBalance - totalCost,
          inventory: {
            ...inventory,
            shields: inventory.shields + count,
          },
          stats: {
            ...stats,
            totalSasSpent: stats.totalSasSpent + totalCost,
          },
        })

        return true
      },

      hasShieldProtection: () => {
        const { inventory } = get()
        return inventory.shields > 0
      },

      executeRaid: (victimId: string, plotIndex: number) => {
        const { testVictims, usdtBalance, stats, raidHistory, inventory } = get()
        const victim = testVictims.find(v => v.id === victimId)
        
        if (!victim || plotIndex < 0 || plotIndex >= victim.plotConfig.length) {
          return { success: false, amount: 0, blockedByShield: false }
        }

        // Check if victim has GLOBAL shield protection
        if (victim.shields > 0) {
          // Shield blocks the attack
          const newVictims = testVictims.map(v => {
            if (v.id === victimId) {
              return { ...v, shields: v.shields - 1 }
            }
            return v
          })

          const historyEntry: RaidHistoryEntry = {
            id: `raid-${Date.now()}`,
            timestamp: Date.now(),
            type: 'attack',
            targetId: victimId,
            targetName: victim.name,
            plotIndex,
            success: false,
            amount: 0,
            blockedByShield: true,
          }

          set({
            testVictims: newVictims,
            stats: {
              ...stats,
              failedRaids: stats.failedRaids + 1,
            },
            raidHistory: [historyEntry, ...raidHistory].slice(0, 50),
          })

          return { success: false, amount: 0, blockedByShield: true }
        }

        // Check if the selected plot has tokens
        const hasTokens = victim.plotConfig[plotIndex]
        const plotBalance = victim.plotBalances[plotIndex]

        if (hasTokens && plotBalance > 0) {
          // Success! Calculate steal amount (15% of stake + yield)
          const stealPercent = 15
          const stealAmount = Math.floor(plotBalance * stealPercent / 100)

          // Update victim's balance
          const newVictims = testVictims.map(v => {
            if (v.id === victimId) {
              const newBalances = [...v.plotBalances]
              newBalances[plotIndex] = Math.max(0, newBalances[plotIndex] - stealAmount)
              return {
                ...v,
                plotBalances: newBalances,
                totalStaked: v.totalStaked - stealAmount,
              }
            }
            return v
          })

          // Add raid history
          const historyEntry: RaidHistoryEntry = {
            id: `raid-${Date.now()}`,
            timestamp: Date.now(),
            type: 'attack',
            targetId: victimId,
            targetName: victim.name,
            plotIndex,
            success: true,
            amount: stealAmount,
          }

          set({
            testVictims: newVictims,
            balance: balance + stealAmount,
            stats: {
              ...stats,
              totalStolen: stats.totalStolen + stealAmount,
              successfulRaids: stats.successfulRaids + 1,
            },
            raidHistory: [historyEntry, ...raidHistory].slice(0, 50), // Keep last 50
          })

          return { success: true, amount: stealAmount }
        } else {
          // Failed - wrong plot
          const historyEntry: RaidHistoryEntry = {
            id: `raid-${Date.now()}`,
            timestamp: Date.now(),
            type: 'attack',
            targetId: victimId,
            targetName: victim.name,
            plotIndex,
            success: false,
            amount: 0,
          }

          set({
            stats: {
              ...stats,
              failedRaids: stats.failedRaids + 1,
            },
            raidHistory: [historyEntry, ...raidHistory].slice(0, 50),
          })

          return { success: false, amount: 0 }
        }
      },

      addRaidHistory: (entry) => {
        const { raidHistory } = get()
        set({
          raidHistory: [{ ...entry, id: `raid-${Date.now()}` }, ...raidHistory].slice(0, 50),
        })
      },

      createTestVictim: () => {
        const { testVictims } = get()
        
        // Randomly configure which plots have tokens (at least 1, max 5)
        const numActivePlots = Math.floor(Math.random() * 4) + 1
        const plotConfig = Array(PLOTS_PER_FARM).fill(false)
        const plotBalances = Array(PLOTS_PER_FARM).fill(0)
        
        // Randomly select which plots have tokens
        const indices = Array.from({ length: PLOTS_PER_FARM }, (_, i) => i)
        for (let i = 0; i < numActivePlots; i++) {
          const randomIdx = Math.floor(Math.random() * indices.length)
          const plotIdx = indices.splice(randomIdx, 1)[0]
          plotConfig[plotIdx] = true
          plotBalances[plotIdx] = Math.floor(Math.random() * 9000) + 1000
        }

        const totalStaked = plotBalances.reduce((sum, b) => sum + b, 0)

        const newVictim: TestVictim = {
          id: `victim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: `Player ${testVictims.length + 1}`,
          chainId: `0x${Math.random().toString(16).slice(2, 18)}`,
          totalStaked,
          plotConfig,
          plotBalances,
          createdAt: Date.now(),
        }

        set({ testVictims: [...testVictims, newVictim] })
        return newVictim
      },

      removeTestVictim: (id: string) => {
        const { testVictims } = get()
        set({ testVictims: testVictims.filter(v => v.id !== id) })
      },

      registerOnNetwork: () => {
        const { playerFarm, currentWalletId, networkPlayers } = get()
        if (!playerFarm || !currentWalletId) return

        // Check if already registered
        if (networkPlayers.some(p => p.id === currentWalletId)) return

        // Register current player as discoverable on network
        const playerAsVictim: TestVictim = {
          id: currentWalletId,
          name: `Wallet ${currentWalletId.slice(0, 8)}...`,
          chainId: `chain-${currentWalletId}`,
          totalStaked: playerFarm.totalStaked,
          plotConfig: playerFarm.plots.map(p => p.hasTokens),
          plotBalances: playerFarm.plots.map(p => p.balance),
          createdAt: Date.now(),
        }

        set({ networkPlayers: [...networkPlayers, playerAsVictim] })
      },

      discoverNetworkPlayers: () => {
        const { currentWalletId, networkPlayers } = get()
        // Return all network players except current wallet
        return networkPlayers.filter(p => p.id !== currentWalletId)
      },

      addBalance: (amount: number) => {
        const { balance } = get()
        set({ balance: balance + amount })
      },

      removeBalance: (amount: number) => {
        const { balance } = get()
        if (balance < amount) return false
        set({ balance: balance - amount })
        return true
      },

      calculatePendingYield: (settings) => {
        const { playerFarm } = get()
        if (!playerFarm || playerFarm.totalStaked === 0) return 0

        const now = Date.now()
        let totalYield = 0
        
        // Calculate yield for each plot individually based on its deposit time
        for (const plot of playerFarm.plots) {
          if (plot.hasTokens && plot.balance > 0 && plot.depositTime > 0) {
            const secondsElapsed = (now - plot.depositTime) / 1000
            const daysElapsed = secondsElapsed / settings.dayDurationSeconds
            const dailyRate = settings.apyPercent / 365 / 100
            totalYield += plot.balance * dailyRate * daysElapsed
          }
        }
        
        return totalYield
      },

      tickYield: (settings) => {
        const { playerFarm } = get()
        if (!playerFarm || playerFarm.totalStaked === 0) return

        // Calculate yield based on actual deposit times (not lastTickTime)
        const newYield = get().calculatePendingYield(settings)
        
        // Only update if yield changed significantly (avoid tiny increments)
        if (newYield - playerFarm.pendingYield > 0.0001) {
          set({
            playerFarm: {
              ...playerFarm,
              pendingYield: newYield,
            },
            lastTickTime: Date.now(),
          })
        }
      },

      reset: () => {
        set({
          currentWalletId: null,
          playerFarm: null,
          balance: 0,
          stats: initialStats,
          raidHistory: [],
          testVictims: [],
          // Note: networkPlayers is NOT reset - it persists across wallet switches
          gameStartTime: Date.now(),
          lastTickTime: Date.now(),
        })
      },

      resetPlayer: () => {
        // Alias for reset - resets all player data
        get().reset()
      },
    }),
    {
      name: 'stake-steal-game-data',
      partialize: (state) => ({
        // Persist all state including networkPlayers for cross-wallet discovery
        currentWalletId: state.currentWalletId,
        playerFarm: state.playerFarm,
        balance: state.balance,
        stats: state.stats,
        raidHistory: state.raidHistory,
        testVictims: state.testVictims,
        networkPlayers: state.networkPlayers,
        gameStartTime: state.gameStartTime,
        lastTickTime: state.lastTickTime,
      }),
    }
  )
)

// Hook for easy access with derived values
export function useGameData() {
  const store = useGameDataStore()
  
  const isInitialized = store.playerFarm !== null
  const activePlots = store.playerFarm?.plots.filter(p => p.hasTokens).length ?? 0
  const winRate = store.stats.successfulRaids + store.stats.failedRaids > 0
    ? Math.round((store.stats.successfulRaids / (store.stats.successfulRaids + store.stats.failedRaids)) * 100)
    : 0

  return {
    ...store,
    isInitialized,
    activePlots,
    winRate,
  }
}
