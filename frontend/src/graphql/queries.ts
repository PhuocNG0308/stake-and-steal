import { gql } from '@apollo/client'

// ============================================================================
// FRAGMENTS - Match service.rs types
// ============================================================================

export const PLOT_FRAGMENT = gql`
  fragment PlotFields on PlotInfo {
    plotId
    tokenABalance
    pendingTokenAYield
    pendingSasRewards
    depositBlock
    lastClaimBlock
    isActive
    isPurchased
  }
`

export const PAGE_FRAGMENT = gql`
  fragment PageFields on PageInfo {
    pageId
    plots {
      ...PlotFields
    }
    totalBalance
    totalPendingYield
    totalPendingSas
  }
  ${PLOT_FRAGMENT}
`

export const STATS_FRAGMENT = gql`
  fragment StatsFields on StatsInfo {
    totalDeposited
    totalWithdrawn
    totalTokenAYieldEarned
    totalSasEarned
    totalSasSpent
    totalStolen
    totalLostToSteals
    successfulSteals
    failedSteals
    timesRaided
    shieldsUsed
    plotsPurchased
  }
`

export const CONFIG_FRAGMENT = gql`
  fragment ConfigFields on ConfigInfo {
    yieldRateBps
    sasRewardRateBps
    minStealStake
    minDeposit
    maxDeposit
    raidCooldownBlocks
    maxTargetsPerRequest
    plotCostSas
    shieldCostSas
  }
`

export const INVENTORY_FRAGMENT = gql`
  fragment InventoryFields on InventoryInfo {
    totalPlots
    shields
  }
`

export const PLAYER_FRAGMENT = gql`
  fragment PlayerFields on PlayerInfo {
    isRegistered
    encryptedName
    tokenABalance
    tokenBBalance
    pageCount
    raidState
  }
`

// ============================================================================
// QUERIES - Match service.rs QueryRoot
// ============================================================================

export const GET_PLAYER = gql`
  query GetPlayer {
    player {
      ...PlayerFields
    }
  }
  ${PLAYER_FRAGMENT}
`

export const GET_INVENTORY = gql`
  query GetInventory {
    inventory {
      ...InventoryFields
    }
  }
  ${INVENTORY_FRAGMENT}
`

export const GET_STATS = gql`
  query GetStats {
    stats {
      ...StatsFields
    }
  }
  ${STATS_FRAGMENT}
`

export const GET_CONFIG = gql`
  query GetConfig {
    config {
      ...ConfigFields
    }
  }
  ${CONFIG_FRAGMENT}
`

export const GET_TOKEN_A_BALANCE = gql`
  query GetTokenABalance {
    tokenABalance
  }
`

export const GET_TOKEN_B_BALANCE = gql`
  query GetTokenBBalance {
    tokenBBalance
  }
`

export const GET_PAGE = gql`
  query GetPage($pageId: Int!) {
    page(pageId: $pageId) {
      ...PageFields
    }
  }
  ${PAGE_FRAGMENT}
`

export const GET_ALL_PAGES = gql`
  query GetAllPages {
    pages {
      ...PageFields
    }
  }
  ${PAGE_FRAGMENT}
`

export const GET_PENDING_TOKEN_A_YIELD = gql`
  query GetPendingTokenAYield {
    pendingTokenAYield
  }
`

export const GET_PENDING_SAS_REWARDS = gql`
  query GetPendingSasRewards {
    pendingSasRewards
  }
`

// ============================================================================
// COMBINED QUERIES - For efficiency
// ============================================================================

export const GET_DASHBOARD_DATA = gql`
  query GetDashboardData {
    player {
      ...PlayerFields
    }
    inventory {
      ...InventoryFields
    }
    stats {
      ...StatsFields
    }
    config {
      ...ConfigFields
    }
    pendingTokenAYield
    pendingSasRewards
  }
  ${PLAYER_FRAGMENT}
  ${INVENTORY_FRAGMENT}
  ${STATS_FRAGMENT}
  ${CONFIG_FRAGMENT}
`

export const GET_FARM_DATA = gql`
  query GetFarmData {
    player {
      tokenABalance
      tokenBBalance
      pageCount
    }
    pages {
      ...PageFields
    }
    pendingTokenAYield
    pendingSasRewards
    config {
      yieldRateBps
      sasRewardRateBps
      minDeposit
      maxDeposit
      plotCostSas
    }
  }
  ${PAGE_FRAGMENT}
`

export const GET_RAID_DATA = gql`
  query GetRaidData {
    player {
      tokenABalance
      tokenBBalance
      raidState
    }
    config {
      minStealStake
      raidCooldownBlocks
      shieldCostSas
    }
    inventory {
      shields
    }
  }
`

// ============================================================================
// LEGACY QUERIES - For backwards compatibility
// ============================================================================

export const GET_PLAYER_STATUS = gql`
  query GetPlayerStatus {
    player {
      isRegistered
      tokenABalance
      tokenBBalance
      pageCount
      raidState
    }
  }
`

export const GET_COOLDOWN_STATUS = gql`
  query GetCooldownStatus {
    player {
      raidState
    }
  }
`
