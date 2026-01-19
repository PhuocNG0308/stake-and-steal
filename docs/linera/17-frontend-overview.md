# Frontend Development Overview

Linera applications can have rich frontend interfaces that interact with the blockchain through GraphQL APIs.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │    React    │    │   Vue.js    │    │   Vanilla   │     │
│  │    App      │    │    App      │    │     JS      │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                 │
│                   ┌────────▼────────┐                       │
│                   │  Linera Client  │                       │
│                   │    Library      │                       │
│                   └────────┬────────┘                       │
└────────────────────────────┼────────────────────────────────┘
                             │
                    GraphQL over HTTP
                             │
                    ┌────────▼────────┐
                    │  Node Service   │
                    │  (GraphQL API)  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    Linera       │
                    │   Blockchain    │
                    └─────────────────┘
```

---

## Tech Stack

### Recommended

- **Framework**: React, Vue.js, Svelte, or vanilla JavaScript
- **GraphQL Client**: Apollo Client, urql, or graphql-request
- **Wallet Integration**: Linera Wallet, MetaMask (via adapter), Dynamic

### Required

- Node.js 18+
- TypeScript (recommended)
- GraphQL

---

## Project Setup

### Create React App with TypeScript

```bash
npx create-react-app my-linera-frontend --template typescript
cd my-linera-frontend
npm install @apollo/client graphql
```

### Create Vite Project

```bash
npm create vite@latest my-linera-frontend -- --template react-ts
cd my-linera-frontend
npm install
npm install @apollo/client graphql
```

### Next.js Setup

```bash
npx create-next-app@latest my-linera-frontend --typescript
cd my-linera-frontend
npm install @apollo/client graphql
```

---

## GraphQL Configuration

### Apollo Client Setup

```typescript
// src/lib/apollo.ts
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const NODE_SERVICE_URL = process.env.REACT_APP_NODE_SERVICE_URL || 'http://localhost:8080';

// Get the GraphQL endpoint for a specific chain and app
export function getGraphQLEndpoint(chainId: string, appId: string): string {
  return `${NODE_SERVICE_URL}/chains/${chainId}/applications/${appId}`;
}

// Create Apollo client for a specific application
export function createAppClient(chainId: string, appId: string) {
  return new ApolloClient({
    link: new HttpLink({
      uri: getGraphQLEndpoint(chainId, appId),
    }),
    cache: new InMemoryCache(),
  });
}

// System GraphQL endpoint (for chain management)
export const systemClient = new ApolloClient({
  link: new HttpLink({
    uri: `${NODE_SERVICE_URL}`,
  }),
  cache: new InMemoryCache(),
});
```

### Query Example

```typescript
// src/graphql/queries.ts
import { gql } from '@apollo/client';

export const GET_TOKEN_INFO = gql`
  query GetTokenInfo {
    tokenInfo {
      name
      symbol
      decimals
      totalSupply
    }
  }
`;

export const GET_BALANCE = gql`
  query GetBalance($owner: AccountOwner!) {
    balance(owner: $owner)
  }
`;

export const GET_ALL_BALANCES = gql`
  query GetAllBalances {
    allBalances {
      owner
      balance
    }
  }
`;
```

---

## Executing Operations

### Mutation Pattern

Operations are submitted through GraphQL mutations or direct API calls:

```typescript
// src/lib/operations.ts
import { gql } from '@apollo/client';

// System mutation to submit an operation
export const EXECUTE_OPERATION = gql`
  mutation ExecuteOperation($operation: String!) {
    executeOperation(operation: $operation)
  }
`;

// Helper to format operations
export function formatOperation(operation: any): string {
  return JSON.stringify(operation);
}

// Example: Transfer operation
export interface TransferOp {
  Transfer: {
    to: string;
    amount: string;
  };
}

export function createTransferOperation(to: string, amount: bigint): TransferOp {
  return {
    Transfer: {
      to,
      amount: amount.toString(),
    },
  };
}
```

### React Hook for Operations

```typescript
// src/hooks/useOperation.ts
import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { EXECUTE_OPERATION, formatOperation } from '../lib/operations';

export function useOperation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const [executeOp] = useMutation(EXECUTE_OPERATION);
  
  async function submitOperation(operation: any) {
    setLoading(true);
    setError(null);
    
    try {
      const result = await executeOp({
        variables: {
          operation: formatOperation(operation),
        },
      });
      return result.data;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }
  
  return { submitOperation, loading, error };
}
```

---

## Component Examples

### Token Balance Component

```tsx
// src/components/TokenBalance.tsx
import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_BALANCE } from '../graphql/queries';

interface TokenBalanceProps {
  owner: string;
}

export function TokenBalance({ owner }: TokenBalanceProps) {
  const { data, loading, error } = useQuery(GET_BALANCE, {
    variables: { owner },
    pollInterval: 5000, // Refresh every 5 seconds
  });
  
  if (loading) return <span>Loading...</span>;
  if (error) return <span>Error: {error.message}</span>;
  
  const balance = BigInt(data.balance);
  const formatted = (Number(balance) / 1e18).toFixed(4);
  
  return (
    <div className="token-balance">
      <span className="balance">{formatted}</span>
      <span className="symbol">TST</span>
    </div>
  );
}
```

### Transfer Form Component

```tsx
// src/components/TransferForm.tsx
import React, { useState } from 'react';
import { useOperation } from '../hooks/useOperation';
import { createTransferOperation } from '../lib/operations';

export function TransferForm() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const { submitOperation, loading, error } = useOperation();
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    const amountBigInt = BigInt(parseFloat(amount) * 1e18);
    const operation = createTransferOperation(recipient, amountBigInt);
    
    try {
      await submitOperation(operation);
      alert('Transfer submitted!');
      setRecipient('');
      setAmount('');
    } catch (e) {
      console.error('Transfer failed:', e);
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="transfer-form">
      <div className="form-group">
        <label>Recipient</label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="User:abc123..."
          required
        />
      </div>
      
      <div className="form-group">
        <label>Amount</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          step="0.0001"
          required
        />
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Transfer'}
      </button>
      
      {error && <p className="error">{error.message}</p>}
    </form>
  );
}
```

---

## Real-time Updates

### WebSocket Subscriptions

```typescript
// src/lib/subscriptions.ts
import { split, HttpLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:8080/ws',
  })
);

const httpLink = new HttpLink({
  uri: 'http://localhost:8080/graphql',
});

// Split based on operation type
export const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink,
);
```

### Subscription Hook

```tsx
// src/hooks/useBlockUpdates.ts
import { useSubscription, gql } from '@apollo/client';

const BLOCK_SUBSCRIPTION = gql`
  subscription OnNewBlock {
    newBlock {
      height
      timestamp
      transactions {
        hash
        status
      }
    }
  }
`;

export function useBlockUpdates() {
  const { data, loading, error } = useSubscription(BLOCK_SUBSCRIPTION);
  
  return {
    block: data?.newBlock,
    loading,
    error,
  };
}
```

---

## Environment Configuration

### .env File

```env
# .env
REACT_APP_NODE_SERVICE_URL=http://localhost:8080
REACT_APP_CHAIN_ID=e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65
REACT_APP_APP_ID=e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65010000000000000001000000...
```

### Config Module

```typescript
// src/config.ts
export const config = {
  nodeServiceUrl: process.env.REACT_APP_NODE_SERVICE_URL || 'http://localhost:8080',
  chainId: process.env.REACT_APP_CHAIN_ID || '',
  appId: process.env.REACT_APP_APP_ID || '',
  
  // For testnet
  faucetUrl: 'https://faucet.testnet-conway.linera.net',
  
  // Polling intervals
  balanceRefreshInterval: 5000,
  blockRefreshInterval: 3000,
};
```

---

## Error Handling

```tsx
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Linera App Error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

---

## Next Steps

- [Frontend Setup Guide](18-frontend-setup.md) - Detailed setup instructions
- [Interacting with Linera](19-frontend-interacting.md) - API usage patterns
- [Wallet Integration](20-frontend-wallets.md) - Connecting user wallets
