// Mock data for development without a running Linera node

export const mockPlayerData = {
  isRegistered: true,
  chainId: 'demo-chain-0x1234567890abcdef',
  registryChainId: 'registry-chain-0x0987654321fedcba',
  availableBalance: '5000',
  totalDeposited: '10000',
  totalYieldEarned: '1250',
  pageCount: 2,
  currentBlock: '12345',
};

export const mockStatsData = {
  stats: {
    totalDeposited: '10000',
    totalWithdrawn: '2000',
    totalYieldEarned: '1250',
    totalStolenFromOthers: '500',
    totalLostToThieves: '150',
    successfulSteals: 3,
    failedSteals: 1,
    timesRaided: 5,
    timesDefended: 2,
    winRate: 75,
  },
};

export const mockConfigData = {
  config: {
    yieldRateBps: 10,
    minStealStake: '1000',
    stealCooldownBlocks: '100',
    maxPages: 10,
    maxPlotsPerPage: 5,
    minDeposit: '100',
    stealPercentage: 15,
    stealSuccessRate: 60,
  },
};

export const mockPagesData = {
  allPages: [
    {
      pageId: 0,
      totalBalance: '6000',
      activePlots: 3,
      plots: [
        {
          plotId: 0,
          balance: '2000',
          encryptedBalance: null,
          lastClaimBlock: '12000',
          isEmpty: false,
          isLocked: false,
          lockUntilBlock: null,
          yieldEarned: '200',
          estimatedYield: '50',
        },
        {
          plotId: 1,
          balance: '2500',
          encryptedBalance: null,
          lastClaimBlock: '12100',
          isEmpty: false,
          isLocked: false,
          lockUntilBlock: null,
          yieldEarned: '250',
          estimatedYield: '62',
        },
        {
          plotId: 2,
          balance: '1500',
          encryptedBalance: null,
          lastClaimBlock: '12050',
          isEmpty: false,
          isLocked: false,
          lockUntilBlock: null,
          yieldEarned: '150',
          estimatedYield: '37',
        },
        {
          plotId: 3,
          balance: '0',
          encryptedBalance: null,
          lastClaimBlock: '0',
          isEmpty: true,
          isLocked: false,
          lockUntilBlock: null,
          yieldEarned: '0',
          estimatedYield: '0',
        },
        {
          plotId: 4,
          balance: '0',
          encryptedBalance: null,
          lastClaimBlock: '0',
          isEmpty: true,
          isLocked: false,
          lockUntilBlock: null,
          yieldEarned: '0',
          estimatedYield: '0',
        },
      ],
    },
    {
      pageId: 1,
      totalBalance: '4000',
      activePlots: 2,
      plots: [
        {
          plotId: 0,
          balance: '2500',
          encryptedBalance: null,
          lastClaimBlock: '12200',
          isEmpty: false,
          isLocked: false,
          lockUntilBlock: null,
          yieldEarned: '300',
          estimatedYield: '75',
        },
        {
          plotId: 1,
          balance: '1500',
          encryptedBalance: null,
          lastClaimBlock: '12250',
          isEmpty: false,
          isLocked: false,
          lockUntilBlock: null,
          yieldEarned: '180',
          estimatedYield: '45',
        },
        {
          plotId: 2,
          balance: '0',
          encryptedBalance: null,
          lastClaimBlock: '0',
          isEmpty: true,
          isLocked: false,
          lockUntilBlock: null,
          yieldEarned: '0',
          estimatedYield: '0',
        },
        {
          plotId: 3,
          balance: '0',
          encryptedBalance: null,
          lastClaimBlock: '0',
          isEmpty: true,
          isLocked: false,
          lockUntilBlock: null,
          yieldEarned: '0',
          estimatedYield: '0',
        },
        {
          plotId: 4,
          balance: '0',
          encryptedBalance: null,
          lastClaimBlock: '0',
          isEmpty: true,
          isLocked: false,
          lockUntilBlock: null,
          yieldEarned: '0',
          estimatedYield: '0',
        },
      ],
    },
  ],
};

export const mockRaidStateData = {
  raidState: {
    state: 'Idle',
    targets: [],
    lockedTarget: null,
    lockUntil: null,
    commitment: null,
  },
};

export const mockDashboardData = {
  ...mockPlayerData,
  totalPendingYield: '224',
  ...mockStatsData,
  raidState: {
    state: 'Idle',
  },
  isOnCooldown: false,
  cooldownRemaining: '0',
};

export const mockCooldownData = {
  isOnCooldown: false,
  cooldownRemaining: '0',
  lastStealBlock: '11000',
};

export const mockPendingYieldData = {
  totalPendingYield: '224',
};

export const mockPowerScoreData = {
  powerScore: 850,
};
