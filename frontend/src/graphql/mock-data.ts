// Mock data for development without a running Linera node
// Matches the GraphQL schema in service.rs

// Player info matching PlayerInfo type
export const mockPlayerData = {
  player: {
    isRegistered: true,
    encryptedName: '0x1234567890abcdef',
    tokenABalance: '5000',
    tokenBBalance: '2500',
    pageCount: 2,
    raidState: 'Idle',
  },
};

// Inventory matching InventoryInfo type
export const mockInventoryData = {
  inventory: {
    totalPlots: 10,
    shields: 3,
  },
};

// Stats matching StatsInfo type
export const mockStatsData = {
  stats: {
    totalDeposited: '10000',
    totalWithdrawn: '2000',
    totalTokenAYieldEarned: '1250',
    totalSasEarned: '625',
    totalSasSpent: '300',
    totalStolen: '500',
    totalLostToSteals: '150',
    successfulSteals: 3,
    failedSteals: 1,
    timesRaided: 5,
    shieldsUsed: 2,
    plotsPurchased: 10,
  },
};

// Config matching ConfigInfo type
export const mockConfigData = {
  config: {
    yieldRateBps: 10,
    sasRewardRateBps: 5,
    minStealStake: '1000',
    minDeposit: '100',
    maxDeposit: '100000',
    raidCooldownBlocks: '100',
    maxTargetsPerRequest: 5,
    plotCostSas: '100',
    shieldCostSas: '50',
  },
};

// Page matching PageInfo type
export const mockPagesData = {
  pages: [
    {
      pageId: 0,
      totalBalance: '6000',
      totalPendingYield: '350',
      totalPendingSas: '175',
      plots: [
        {
          plotId: 0,
          tokenABalance: '2000',
          pendingTokenAYield: '100',
          pendingSasRewards: '50',
          depositBlock: '11000',
          lastClaimBlock: '12000',
          isActive: true,
          isPurchased: true,
        },
        {
          plotId: 1,
          tokenABalance: '2500',
          pendingTokenAYield: '125',
          pendingSasRewards: '62',
          depositBlock: '11100',
          lastClaimBlock: '12100',
          isActive: true,
          isPurchased: true,
        },
        {
          plotId: 2,
          tokenABalance: '1500',
          pendingTokenAYield: '75',
          pendingSasRewards: '37',
          depositBlock: '11050',
          lastClaimBlock: '12050',
          isActive: true,
          isPurchased: true,
        },
        {
          plotId: 3,
          tokenABalance: '0',
          pendingTokenAYield: '0',
          pendingSasRewards: '0',
          depositBlock: '0',
          lastClaimBlock: '0',
          isActive: false,
          isPurchased: true,
        },
        {
          plotId: 4,
          tokenABalance: '0',
          pendingTokenAYield: '0',
          pendingSasRewards: '0',
          depositBlock: '0',
          lastClaimBlock: '0',
          isActive: false,
          isPurchased: false,
        },
      ],
    },
    {
      pageId: 1,
      totalBalance: '4000',
      totalPendingYield: '225',
      totalPendingSas: '112',
      plots: [
        {
          plotId: 0,
          tokenABalance: '2500',
          pendingTokenAYield: '150',
          pendingSasRewards: '75',
          depositBlock: '11200',
          lastClaimBlock: '12200',
          isActive: true,
          isPurchased: true,
        },
        {
          plotId: 1,
          tokenABalance: '1500',
          pendingTokenAYield: '75',
          pendingSasRewards: '37',
          depositBlock: '11250',
          lastClaimBlock: '12250',
          isActive: true,
          isPurchased: true,
        },
        {
          plotId: 2,
          tokenABalance: '0',
          pendingTokenAYield: '0',
          pendingSasRewards: '0',
          depositBlock: '0',
          lastClaimBlock: '0',
          isActive: false,
          isPurchased: true,
        },
        {
          plotId: 3,
          tokenABalance: '0',
          pendingTokenAYield: '0',
          pendingSasRewards: '0',
          depositBlock: '0',
          lastClaimBlock: '0',
          isActive: false,
          isPurchased: false,
        },
        {
          plotId: 4,
          tokenABalance: '0',
          pendingTokenAYield: '0',
          pendingSasRewards: '0',
          depositBlock: '0',
          lastClaimBlock: '0',
          isActive: false,
          isPurchased: false,
        },
      ],
    },
  ],
};

// Dashboard combined data
export const mockDashboardData = {
  ...mockPlayerData,
  ...mockInventoryData,
  ...mockStatsData,
  ...mockConfigData,
  pendingTokenAYield: '575',
  pendingSasRewards: '287',
};

// Farm page data
export const mockFarmData = {
  player: {
    tokenABalance: mockPlayerData.player.tokenABalance,
    tokenBBalance: mockPlayerData.player.tokenBBalance,
    pageCount: mockPlayerData.player.pageCount,
  },
  ...mockPagesData,
  pendingTokenAYield: '575',
  pendingSasRewards: '287',
  config: {
    yieldRateBps: mockConfigData.config.yieldRateBps,
    sasRewardRateBps: mockConfigData.config.sasRewardRateBps,
    minDeposit: mockConfigData.config.minDeposit,
    maxDeposit: mockConfigData.config.maxDeposit,
    plotCostSas: mockConfigData.config.plotCostSas,
  },
};

// Raid page data
export const mockRaidData = {
  player: {
    tokenABalance: mockPlayerData.player.tokenABalance,
    tokenBBalance: mockPlayerData.player.tokenBBalance,
    raidState: mockPlayerData.player.raidState,
  },
  config: {
    minStealStake: mockConfigData.config.minStealStake,
    raidCooldownBlocks: mockConfigData.config.raidCooldownBlocks,
    shieldCostSas: mockConfigData.config.shieldCostSas,
  },
  inventory: {
    shields: mockInventoryData.inventory.shields,
  },
};

// Legacy compatibility exports
export const mockRaidStateData = {
  player: {
    raidState: 'Idle',
  },
};

export const mockCooldownData = {
  player: {
    raidState: 'Idle',
  },
};

export const mockPendingYieldData = {
  pendingTokenAYield: '575',
  pendingSasRewards: '287',
};

export const mockPowerScoreData = {
  // Power score can be calculated from inventory and stats
  powerScore: 850,
};
