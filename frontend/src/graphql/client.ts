import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
  Observable,
} from '@apollo/client'
import { config, APP_ID } from '@/config'
import {
  mockDashboardData,
  mockPlayerData,
  mockStatsData,
  mockConfigData,
  mockPagesData,
  mockRaidStateData,
  mockCooldownData,
  mockPendingYieldData,
  mockPowerScoreData,
} from './mock-data'

// Check if we're in demo/development mode without a real backend
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK === 'true' || 
                      import.meta.env.DEV;

// Get GraphQL endpoint based on chain and app
function getGraphQLEndpoint(chainId?: string, appId?: string): string {
  const baseUrl = config.nodeServiceUrl;
  if (chainId && appId) {
    return `${baseUrl}/chains/${chainId}/applications/${appId}`;
  }
  return `${baseUrl}/graphql`;
}

// Mock link that returns mock data for development
const mockLink = new ApolloLink((operation) => {
  return new Observable((observer) => {
    // Simulate network delay
    setTimeout(() => {
      const { operationName } = operation;
      let data: Record<string, unknown> = {};

      // Match operation name to mock data
      switch (operationName) {
        case 'GetDashboardData':
          data = mockDashboardData;
          break;
        case 'GetPlayerStatus':
          data = mockPlayerData;
          break;
        case 'GetStats':
          data = mockStatsData;
          break;
        case 'GetConfig':
          data = mockConfigData;
          break;
        case 'GetAllPages':
          data = mockPagesData;
          break;
        case 'GetPage':
          const pageId = operation.variables?.pageId ?? 0;
          const page = mockPagesData.allPages.find(p => p.pageId === pageId);
          data = { page: page || null };
          break;
        case 'GetRaidState':
          data = mockRaidStateData;
          break;
        case 'GetCooldownStatus':
          data = mockCooldownData;
          break;
        case 'GetPendingYield':
          data = mockPendingYieldData;
          break;
        case 'GetPowerScore':
          data = mockPowerScoreData;
          break;
        default:
          // Return empty data for unknown queries
          console.warn(`[Mock] Unknown operation: ${operationName}`);
          data = {};
      }

      console.log(`[Mock GraphQL] ${operationName}:`, data);
      observer.next({ data });
      observer.complete();
    }, 100); // 100ms simulated delay
  });
});

// Create HTTP link for real GraphQL queries
const httpLink = new HttpLink({
  uri: getGraphQLEndpoint(),
})

// Select link based on mode
const activeLink = USE_MOCK_DATA ? mockLink : httpLink;

// Apollo Client instance
export const apolloClient = new ApolloClient({
  link: activeLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          allPages: {
            merge: false,
          },
        },
      },
      PageInfo: {
        keyFields: ['pageId'],
      },
      PlotInfo: {
        keyFields: ['plotId'],
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: USE_MOCK_DATA ? 'cache-first' : 'cache-and-network',
    },
    query: {
      fetchPolicy: USE_MOCK_DATA ? 'cache-first' : 'network-only',
    },
  },
})

// Store current chain and app IDs
let currentChainId: string | null = null;
let currentAppId: string | null = null;

// Function to update the endpoint when user connects
export function updateEndpoint(chainId: string, appId?: string) {
  currentChainId = chainId;
  currentAppId = appId || APP_ID;
  
  const newUri = getGraphQLEndpoint(chainId, currentAppId);
  console.log(`Updating GraphQL endpoint to: ${newUri}`);
  
  // Create new client with updated endpoint
  apolloClient.setLink(new HttpLink({ uri: newUri }));
  
  // Clear cache to refetch with new endpoint
  apolloClient.clearStore();
}

// Function to get the GraphQL endpoint for a chain
export function getChainEndpoint(chainId: string, appId?: string): string {
  return getGraphQLEndpoint(chainId, appId || APP_ID);
}

// Get current configuration
export function getCurrentConfig() {
  return {
    chainId: currentChainId,
    appId: currentAppId,
    endpoint: currentChainId ? getGraphQLEndpoint(currentChainId, currentAppId || undefined) : null,
  };
}
