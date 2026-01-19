/**
 * Types matching the Linera smart contract
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export interface PlotInfo {
  plotId: number
  balance: string
  encryptedBalance: string
  lastClaimBlock: string
  isEmpty: boolean
  isLocked: boolean
  lockUntilBlock: string | null
  yieldEarned: string
  estimatedYield: string
}

export interface PageInfo {
  pageId: number
  plots: PlotInfo[]
  totalBalance: string
  activePlots: number
}

export interface PlayerStats {
  totalDeposited: string
  totalWithdrawn: string
  totalYieldEarned: string
  totalStolenFromOthers: string
  totalLostToThieves: string
  successfulSteals: number
  failedSteals: number
  timesRaided: number
  timesDefended: number
  winRate: number
}

export interface TargetInfo {
  chainId: string
  estimatedValue: string
  lastActiveBlock: string
  defenseScore: number
}

export interface RaidState {
  state: string
  targets: TargetInfo[] | null
  lockedTarget: string | null
  lockUntil: string | null
  commitment: string | null
}

export interface GameConfig {
  yieldRateBps: string
  /** Minimum stake required for guaranteed steal */
  minStealStake: string
  stealCooldownBlocks: string
  maxPages: number
  maxPlotsPerPage: number
  minDeposit: string
  /** Percentage taken during steal (0-100) */
  stealPercentage: number
}

// ============================================================================
// OPERATION TYPES
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
