import { gql } from '@apollo/client'

// ============================================================================
// FRAGMENTS
// ============================================================================

export const PLOT_FRAGMENT = gql`
  fragment PlotFields on PlotInfo {
    plotId
    balance
    encryptedBalance
    lastClaimBlock
    isEmpty
    isLocked
    lockUntilBlock
    yieldEarned
    estimatedYield
  }
`

export const PAGE_FRAGMENT = gql`
  fragment PageFields on PageInfo {
    pageId
    plots {
      ...PlotFields
    }
    totalBalance
    activePlots
  }
  ${PLOT_FRAGMENT}
`

export const STATS_FRAGMENT = gql`
  fragment StatsFields on PlayerStatsInfo {
    totalDeposited
    totalWithdrawn
    totalYieldEarned
    totalStolenFromOthers
    totalLostToThieves
    successfulSteals
    failedSteals
    timesRaided
    timesDefended
    winRate
  }
`

export const RAID_STATE_FRAGMENT = gql`
  fragment RaidStateFields on RaidStateInfo {
    state
    targets {
      chainId
      estimatedValue
      lastActiveBlock
      defenseScore
    }
    lockedTarget
    lockUntil
    commitment
  }
`

export const CONFIG_FRAGMENT = gql`
  fragment ConfigFields on GameConfigInfo {
    yieldRateBps
    stealSuccessRate
    stealCooldownBlocks
    maxPages
    maxPlotsPerPage
    minDeposit
    maxStealPercentage
  }
`

// ============================================================================
// QUERIES
// ============================================================================

export const GET_PLAYER_STATUS = gql`
  query GetPlayerStatus {
    isRegistered
    chainId
    registryChainId
    availableBalance
    totalDeposited
    totalYieldEarned
    pageCount
    currentBlock
  }
`

export const GET_ALL_PAGES = gql`
  query GetAllPages {
    allPages {
      ...PageFields
    }
  }
  ${PAGE_FRAGMENT}
`

export const GET_PAGE = gql`
  query GetPage($pageId: Int!) {
    page(pageId: $pageId) {
      ...PageFields
    }
  }
  ${PAGE_FRAGMENT}
`

export const GET_STATS = gql`
  query GetStats {
    stats {
      ...StatsFields
    }
  }
  ${STATS_FRAGMENT}
`

export const GET_RAID_STATE = gql`
  query GetRaidState {
    raidState {
      ...RaidStateFields
    }
  }
  ${RAID_STATE_FRAGMENT}
`

export const GET_CONFIG = gql`
  query GetConfig {
    config {
      ...ConfigFields
    }
  }
  ${CONFIG_FRAGMENT}
`

export const GET_PENDING_YIELD = gql`
  query GetPendingYield {
    totalPendingYield
  }
`

export const GET_COOLDOWN_STATUS = gql`
  query GetCooldownStatus {
    isOnCooldown
    cooldownRemaining
    lastStealBlock
  }
`

export const GET_POWER_SCORE = gql`
  query GetPowerScore {
    powerScore
  }
`

export const GET_DASHBOARD_DATA = gql`
  query GetDashboardData {
    isRegistered
    availableBalance
    totalDeposited
    totalYieldEarned
    totalPendingYield
    pageCount
    stats {
      ...StatsFields
    }
    raidState {
      state
    }
    isOnCooldown
    cooldownRemaining
  }
  ${STATS_FRAGMENT}
`
