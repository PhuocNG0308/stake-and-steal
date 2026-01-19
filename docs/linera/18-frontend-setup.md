# Frontend Setup and Development Environment

Complete guide for setting up a frontend development environment for Linera applications.

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn
- Linera node service running locally or testnet access

---

## Project Setup Options

### Option 1: React with Vite (Recommended)

```bash
# Create project
npm create vite@latest linera-frontend -- --template react-ts
cd linera-frontend

# Install dependencies
npm install

# Install Linera-specific packages
npm install @apollo/client graphql
npm install @tanstack/react-query # Optional but recommended
```

### Option 2: Next.js

```bash
# Create project
npx create-next-app@latest linera-frontend --typescript --tailwind --app
cd linera-frontend

# Install dependencies
npm install @apollo/client graphql
```

### Option 3: Vue.js

```bash
# Create project
npm create vue@latest linera-frontend
cd linera-frontend

# Install dependencies
npm install
npm install @vue/apollo-composable @apollo/client graphql
```

---

## Project Structure

```
linera-frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Modal.tsx
│   │   ├── wallet/
│   │   │   ├── WalletConnect.tsx
│   │   │   └── AccountInfo.tsx
│   │   └── app/
│   │       ├── TokenBalance.tsx
│   │       └── TransferForm.tsx
│   ├── hooks/
│   │   ├── useLinera.ts
│   │   ├── useWallet.ts
│   │   └── useApplication.ts
│   ├── lib/
│   │   ├── apollo.ts
│   │   ├── linera.ts
│   │   └── utils.ts
│   ├── graphql/
│   │   ├── queries.ts
│   │   ├── mutations.ts
│   │   └── subscriptions.ts
│   ├── types/
│   │   ├── linera.ts
│   │   └── application.ts
│   ├── config/
│   │   └── index.ts
│   ├── App.tsx
│   └── main.tsx
├── .env
├── .env.local
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Configuration Files

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  define: {
    // Enable BigInt JSON serialization
    'process.env': {},
  },
});
```

### .env

```env
# Node Service
VITE_NODE_SERVICE_URL=http://localhost:8080

# Chain Configuration
VITE_CHAIN_ID=
VITE_APP_ID=

# Testnet Configuration
VITE_FAUCET_URL=https://faucet.testnet-conway.linera.net
VITE_NETWORK=testnet

# Feature Flags
VITE_ENABLE_DEVTOOLS=true
```

---

## Core Setup Files

### src/config/index.ts

```typescript
export const config = {
  // Network
  nodeServiceUrl: import.meta.env.VITE_NODE_SERVICE_URL || 'http://localhost:8080',
  network: import.meta.env.VITE_NETWORK || 'local',
  
  // Chain & App
  chainId: import.meta.env.VITE_CHAIN_ID || '',
  appId: import.meta.env.VITE_APP_ID || '',
  
  // Faucet
  faucetUrl: import.meta.env.VITE_FAUCET_URL || '',
  
  // Polling
  pollInterval: 5000,
  blockInterval: 3000,
  
  // Dev
  enableDevtools: import.meta.env.VITE_ENABLE_DEVTOOLS === 'true',
} as const;

export type Config = typeof config;
```

### src/lib/apollo.ts

```typescript
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
  from,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { config } from '@/config';

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}, Operation: ${operation.operationName}`
      );
    });
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

// Logging link (development only)
const loggingLink = new ApolloLink((operation, forward) => {
  if (config.enableDevtools) {
    console.log(`GraphQL Request: ${operation.operationName}`);
  }
  return forward(operation).map((result) => {
    if (config.enableDevtools) {
      console.log(`GraphQL Response: ${operation.operationName}`, result);
    }
    return result;
  });
});

// Create client for specific app
export function createAppClient(chainId: string, appId: string) {
  const httpLink = new HttpLink({
    uri: `${config.nodeServiceUrl}/chains/${chainId}/applications/${appId}`,
  });

  return new ApolloClient({
    link: from([errorLink, loggingLink, httpLink]),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            // Cache policies for your queries
            balance: {
              merge: true,
            },
          },
        },
      },
    }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
      },
    },
  });
}

// System client for chain management
export const systemClient = new ApolloClient({
  link: from([
    errorLink,
    loggingLink,
    new HttpLink({ uri: config.nodeServiceUrl }),
  ]),
  cache: new InMemoryCache(),
});

// Default app client
export const appClient = createAppClient(config.chainId, config.appId);
```

### src/types/linera.ts

```typescript
// Chain types
export interface ChainId {
  value: string;
}

export interface BlockHeight {
  value: number;
}

// Account types
export type AccountOwner =
  | { User: string }
  | { Application: string };

export function formatAccountOwner(owner: AccountOwner): string {
  if ('User' in owner) {
    return `User:${owner.User}`;
  }
  return `Application:${owner.Application}`;
}

export function parseAccountOwner(str: string): AccountOwner {
  const [type, value] = str.split(':');
  if (type === 'User') {
    return { User: value };
  }
  return { Application: value };
}

// Amount handling
export class Amount {
  private value: bigint;
  private decimals: number;

  constructor(value: bigint | string | number, decimals: number = 18) {
    this.value = typeof value === 'bigint' ? value : BigInt(value);
    this.decimals = decimals;
  }

  static fromHuman(value: string | number, decimals: number = 18): Amount {
    const [whole, fraction = ''] = value.toString().split('.');
    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
    const raw = BigInt(whole + paddedFraction);
    return new Amount(raw, decimals);
  }

  toHuman(): string {
    const str = this.value.toString().padStart(this.decimals + 1, '0');
    const whole = str.slice(0, -this.decimals) || '0';
    const fraction = str.slice(-this.decimals).replace(/0+$/, '');
    return fraction ? `${whole}.${fraction}` : whole;
  }

  toRaw(): bigint {
    return this.value;
  }

  toString(): string {
    return this.value.toString();
  }
}

// Operation types
export interface Operation {
  [key: string]: any;
}

// Message types
export interface Message {
  [key: string]: any;
}
```

### src/types/application.ts

```typescript
// Application-specific types (customize for your app)

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}

export interface AccountBalance {
  owner: string;
  balance: string;
}

// Operations
export interface TransferOperation {
  Transfer: {
    to: string;
    amount: string;
  };
}

export interface ApproveOperation {
  Approve: {
    spender: string;
    amount: string;
  };
}

export interface MintOperation {
  Mint: {
    to: string;
    amount: string;
  };
}

export type TokenOperation =
  | TransferOperation
  | ApproveOperation
  | MintOperation;

// Helpers
export function createTransfer(to: string, amount: bigint): TransferOperation {
  return {
    Transfer: {
      to,
      amount: amount.toString(),
    },
  };
}

export function createApprove(spender: string, amount: bigint): ApproveOperation {
  return {
    Approve: {
      spender,
      amount: amount.toString(),
    },
  };
}
```

---

## GraphQL Definitions

### src/graphql/queries.ts

```typescript
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
  query GetBalance($owner: String!) {
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

export const GET_ALLOWANCE = gql`
  query GetAllowance($owner: String!, $spender: String!) {
    allowance(owner: $owner, spender: $spender)
  }
`;

export const GET_CHAIN_INFO = gql`
  query GetChainInfo {
    chainId
    applicationId
  }
`;
```

### src/graphql/mutations.ts

```typescript
import { gql } from '@apollo/client';

// Note: Actual mutation format depends on your node service setup
export const EXECUTE_OPERATION = gql`
  mutation ExecuteOperation($operation: String!) {
    executeOperation(operation: $operation)
  }
`;

// Serialize helper mutation (from service)
export const SERIALIZE_TRANSFER = gql`
  mutation SerializeTransfer($to: String!, $amount: String!) {
    serializeTransfer(to: $to, amount: $amount)
  }
`;
```

---

## React Hooks

### src/hooks/useLinera.ts

```typescript
import { useCallback, useState } from 'react';
import { config } from '@/config';

interface LineraState {
  chainId: string;
  appId: string;
  connected: boolean;
}

export function useLinera() {
  const [state, setState] = useState<LineraState>({
    chainId: config.chainId,
    appId: config.appId,
    connected: Boolean(config.chainId && config.appId),
  });

  const connect = useCallback((chainId: string, appId: string) => {
    setState({
      chainId,
      appId,
      connected: true,
    });
  }, []);

  const disconnect = useCallback(() => {
    setState({
      chainId: '',
      appId: '',
      connected: false,
    });
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    nodeServiceUrl: config.nodeServiceUrl,
  };
}
```

### src/hooks/useApplication.ts

```typescript
import { useQuery, useMutation } from '@apollo/client';
import { GET_TOKEN_INFO, GET_BALANCE } from '@/graphql/queries';
import { EXECUTE_OPERATION } from '@/graphql/mutations';
import { TokenInfo } from '@/types/application';

export function useTokenInfo() {
  const { data, loading, error, refetch } = useQuery<{ tokenInfo: TokenInfo }>(
    GET_TOKEN_INFO
  );

  return {
    tokenInfo: data?.tokenInfo,
    loading,
    error,
    refetch,
  };
}

export function useBalance(owner: string) {
  const { data, loading, error, refetch } = useQuery<{ balance: string }>(
    GET_BALANCE,
    {
      variables: { owner },
      skip: !owner,
      pollInterval: 5000,
    }
  );

  return {
    balance: data?.balance ? BigInt(data.balance) : 0n,
    loading,
    error,
    refetch,
  };
}

export function useOperation() {
  const [execute, { loading, error }] = useMutation(EXECUTE_OPERATION);

  const submitOperation = async (operation: any) => {
    const result = await execute({
      variables: {
        operation: JSON.stringify(operation),
      },
    });
    return result.data;
  };

  return {
    submitOperation,
    loading,
    error,
  };
}
```

---

## Main App Setup

### src/App.tsx

```tsx
import { ApolloProvider } from '@apollo/client';
import { appClient } from '@/lib/apollo';
import { TokenInfo } from '@/components/app/TokenInfo';
import { TransferForm } from '@/components/app/TransferForm';
import { WalletConnect } from '@/components/wallet/WalletConnect';

function App() {
  return (
    <ApolloProvider client={appClient}>
      <div className="app">
        <header>
          <h1>Linera Token App</h1>
          <WalletConnect />
        </header>
        
        <main>
          <TokenInfo />
          <TransferForm />
        </main>
      </div>
    </ApolloProvider>
  );
}

export default App;
```

### src/main.tsx

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## Running the Frontend

### Development

```bash
# Start development server
npm run dev

# Start with specific env file
npm run dev -- --mode development
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment-Specific Builds

```bash
# Testnet build
VITE_NETWORK=testnet npm run build

# Local devnet build
VITE_NETWORK=local npm run build
```
