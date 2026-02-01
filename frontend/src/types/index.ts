/**
 * Types matching the Linera smart contract service.rs
 */

// ============================================================================
// CORE TYPES - Match service.rs GraphQL types
// ============================================================================

/**
 * Player information matching PlayerInfo in service.rs
 */
export interface PlayerInfo {
  isRegistered: boolean
  encryptedName: string
  /** Token A (USDT) balance */
  tokenABalance: string
  /** Token B (SAS) balance */
  tokenBBalance: string
  pageCount: number
  raidState: string
}

/**
 * Inventory matching InventoryInfo in service.rs
 */
export interface InventoryInfo {
  totalPlots: number
  shields: number
}

/**
 * Plot information matching PlotInfo in service.rs
 */
export interface PlotInfo {
  plotId: number
  /** Token A balance in this plot */
  tokenABalance: string
  /** Pending Token A yield */
  pendingTokenAYield: string
  /** Pending SAS rewards */
  pendingSasRewards: string
  depositBlock: string
  lastClaimBlock: string
  isActive: boolean
  isPurchased: boolean
}

/**
 * Page information matching PageInfo in service.rs
 */
export interface PageInfo {
  pageId: number
  plots: PlotInfo[]
  totalBalance: string
  totalPendingYield: string
  totalPendingSas: string
}

/**
 * Player statistics matching StatsInfo in service.rs
 */
export interface PlayerStats {
  totalDeposited: string
  totalWithdrawn: string
  /** Total Token A yield earned */
  totalTokenAYieldEarned: string
  /** Total SAS earned */
  totalSasEarned: string
  /** Total SAS spent (on plots and shields) */
  totalSasSpent: string
  totalStolen: string
  totalLostToSteals: string
  successfulSteals: number
  failedSteals: number
  timesRaided: number
  shieldsUsed: number
  plotsPurchased: number
}

/**
 * Game configuration matching ConfigInfo in service.rs
 */
export interface GameConfig {
  yieldRateBps: number
  sasRewardRateBps: number
  /** Minimum stake required for guaranteed steal */
  minStealStake: string
  minDeposit: string
  maxDeposit: string
  raidCooldownBlocks: string
  maxTargetsPerRequest: number
  plotCostSas: string
  shieldCostSas: string
}

/**
 * Raid target information
 */
export interface TargetInfo {
  chainId: string
  estimatedValue: string
  lastActiveBlock: string
  defenseScore: number
}

/**
 * Raid state
 */
export interface RaidState {
  state: string
  targets: TargetInfo[] | null
  lockedTarget: string | null
  lockUntil: string | null
  commitment: string | null
}

// ============================================================================
// OPERATION TYPES - Match contract.rs operations
// ============================================================================

export type OperationType =
  | 'Register'
  | 'Unregister'
  | 'CreatePage'
  | 'Deposit'
  | 'Withdraw'
  | 'Claim'
  | 'ClaimAll'
  | 'FindTargets'
  | 'LockTarget'
  | 'ExecuteSteal'
  | 'CancelRaid'
  | 'UpdateConfig'

export interface RegisterOperation {
  Register: {
    encrypted_name: number[]
  }
}

export interface CreatePageOperation {
  CreatePage: null
}

export interface DepositOperation {
  Deposit: {
    page_id: number
    plot_id: number
    amount: string
    encrypted_data: number[]
  }
}

export interface WithdrawOperation {
  Withdraw: {
    page_id: number
    plot_id: number
    amount: string
  }
}

export interface ClaimOperation {
  Claim: {
    page_id: number
    plot_id: number
  }
}

export interface ClaimAllOperation {
  ClaimAll: null
}

export interface ClaimYieldOperation {
  ClaimYield: {
    page_id: number
    plot_id: number
  }
}

export interface ClaimAllYieldOperation {
  ClaimAllYield: null
}

export interface ClaimSasRewardsOperation {
  ClaimSasRewards: {
    page_id: number
    plot_id: number
  }
}

export interface ClaimAllSasRewardsOperation {
  ClaimAllSasRewards: null
}

export interface BuyPlotOperation {
  BuyPlot: {
    page_id: number
  }
}

export interface BuyShieldOperation {
  BuyShield: {
    count: number
  }
}

export interface FindTargetsOperation {
  FindTargets: {
    count: number
  }
}

export interface LockTargetOperation {
  LockTarget: {
    target_chain: string
    commitment: number[]
  }
}

export interface ExecuteStealOperation {
  ExecuteSteal: {
    /** Attacker's page where they have staked */
    attacker_page: number
    /** Attacker's plot where they have staked */
    attacker_plot: number
    /** Target page to steal from */
    target_page: number
    /** Target plot to steal from */
    target_plot: number
    reveal_nonce: number[]
  }
}

export interface CancelRaidOperation {
  CancelRaid: null
}

export type Operation =
  | RegisterOperation
  | CreatePageOperation
  | DepositOperation
  | WithdrawOperation
  | ClaimOperation
  | ClaimAllOperation
  | ClaimYieldOperation
  | ClaimAllYieldOperation
  | ClaimSasRewardsOperation
  | ClaimAllSasRewardsOperation
  | BuyPlotOperation
  | BuyShieldOperation
  | FindTargetsOperation
  | LockTargetOperation
  | ExecuteStealOperation
  | CancelRaidOperation

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface OperationResponse {
  Success?: null
  Registered?: { player_id: string }
  PageCreated?: { page_id: number }
  Deposited?: { page_id: number; plot_id: number; new_balance: string }
  Withdrawn?: { page_id: number; plot_id: number; amount: string }
  Claimed?: { page_id: number; plot_id: number; yield_amount: string }
  ClaimedAll?: { total_yield: string }
  TargetsFound?: { targets: TargetInfo[] }
  TargetLocked?: { target_chain: string; lock_until_block: string }
  StealResult?: { success: boolean; amount_stolen: string }
  Error?: { message: string }
}

// ============================================================================
// UI TYPES
// ============================================================================

export interface WalletState {
  connected: boolean
  chainId: string | null
  address: string | null
}

export interface GameState {
  isRegistered: boolean
  isLoading: boolean
  error: string | null
}

export type RaidPhase =
  | 'idle'
  | 'finding_targets'
  | 'selecting_target'
  | 'locking_target'
  | 'executing_steal'
  | 'completed'
  | 'on_cooldown'

export interface NotificationItem {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: number
}
