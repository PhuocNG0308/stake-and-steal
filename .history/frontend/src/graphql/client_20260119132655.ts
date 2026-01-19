import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  split,
} from '@apollo/client'

// Default endpoint - will be configured based on user's chain
const DEFAULT_ENDPOINT = 'http://localhost:8080'

// Create HTTP link for GraphQL queries
const httpLink = new HttpLink({
  uri: `${DEFAULT_ENDPOINT}/graphql`,
})

// Apollo Client instance
export const apolloClient = new ApolloClient({
  link: httpLink,
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
      fetchPolicy: 'cache-and-network',
    },
    query: {
      fetchPolicy: 'network-only',
    },
  },
})

// Function to update the endpoint when user connects
export function updateEndpoint(chainId: string, nodeUrl: string) {
  // In a real app, you'd reconfigure the client here
  console.log(`Updating endpoint to ${nodeUrl} for chain ${chainId}`)
}

// Function to get the GraphQL endpoint for a chain
export function getChainEndpoint(chainId: string, baseUrl: string = DEFAULT_ENDPOINT): string {
  return `${baseUrl}/chains/${chainId}/applications`
}
