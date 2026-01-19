import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WalletState, GameState, NotificationItem, RaidPhase } from '@/types'

// ============================================================================
// WALLET STORE
// ============================================================================

interface WalletStore extends WalletState {
  connect: (chainId: string, address: string) => void
  disconnect: () => void
  setChainId: (chainId: string) => void
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set) => ({
      connected: false,
      chainId: null,
      address: null,

      connect: (chainId, address) =>
        set({
          connected: true,
          chainId,
          address,
        }),

      disconnect: () =>
        set({
          connected: false,
          chainId: null,
          address: null,
        }),

      setChainId: (chainId) => set({ chainId }),
    }),
    {
      name: 'steal-yield-wallet',
    }
  )
)

// ============================================================================
// GAME STORE
// ============================================================================

interface GameStore extends GameState {
  availableBalance: string
  totalDeposited: string
  totalYieldEarned: string
  pendingYield: string
  pageCount: number
  currentBlock: string
  raidPhase: RaidPhase
  cooldownRemaining: string
  
  setRegistered: (isRegistered: boolean) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  updateBalances: (data: {
    availableBalance?: string
    totalDeposited?: string
    totalYieldEarned?: string
    pendingYield?: string
  }) => void
  setPageCount: (count: number) => void
  setCurrentBlock: (block: string) => void
  setRaidPhase: (phase: RaidPhase) => void
  setCooldown: (remaining: string) => void
  reset: () => void
}

const initialGameState = {
  isRegistered: false,
  isLoading: false,
  error: null,
  availableBalance: '0',
  totalDeposited: '0',
  totalYieldEarned: '0',
  pendingYield: '0',
  pageCount: 0,
  currentBlock: '0',
  raidPhase: 'idle' as RaidPhase,
  cooldownRemaining: '0',
}

export const useGameStore = create<GameStore>()((set) => ({
  ...initialGameState,

  setRegistered: (isRegistered) => set({ isRegistered }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  updateBalances: (data) =>
    set((state) => ({
      availableBalance: data.availableBalance ?? state.availableBalance,
      totalDeposited: data.totalDeposited ?? state.totalDeposited,
      totalYieldEarned: data.totalYieldEarned ?? state.totalYieldEarned,
      pendingYield: data.pendingYield ?? state.pendingYield,
    })),

  setPageCount: (pageCount) => set({ pageCount }),
  setCurrentBlock: (currentBlock) => set({ currentBlock }),
  setRaidPhase: (raidPhase) => set({ raidPhase }),
  setCooldown: (cooldownRemaining) => set({ cooldownRemaining }),
  reset: () => set(initialGameState),
}))

// ============================================================================
// NOTIFICATION STORE
// ============================================================================

interface NotificationStore {
  notifications: NotificationItem[]
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

export const useNotificationStore = create<NotificationStore>()((set) => ({
  notifications: [],

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          ...notification,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        },
      ],
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearAll: () => set({ notifications: [] }),
}))

// ============================================================================
// UI STORE
// ============================================================================

interface UIStore {
  sidebarOpen: boolean
  modalOpen: string | null
  selectedPage: number | null
  selectedPlot: number | null
  
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  openModal: (modalId: string) => void
  closeModal: () => void
  selectPlot: (pageId: number, plotId: number) => void
  clearSelection: () => void
}

export const useUIStore = create<UIStore>()((set) => ({
  sidebarOpen: true,
  modalOpen: null,
  selectedPage: null,
  selectedPlot: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  openModal: (modalOpen) => set({ modalOpen }),
  closeModal: () => set({ modalOpen: null }),
  selectPlot: (selectedPage, selectedPlot) => set({ selectedPage, selectedPlot }),
  clearSelection: () => set({ selectedPage: null, selectedPlot: null }),
}))
