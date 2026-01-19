# Interacting with Linera from Frontend

Detailed guide on how to query data and submit operations to Linera applications.

## GraphQL API Structure

### Application Endpoint

Each application exposes a GraphQL endpoint:

```
http://<node_service>/chains/<chain_id>/applications/<app_id>
```

### System Endpoint

For chain management operations:

```
http://<node_service>/
```

---

## Querying Application State

### Basic Queries

```typescript
import { useQuery, gql } from '@apollo/client';

// Simple query
const GET_VALUE = gql`
  query GetValue {
    value
  }
`;

function ValueDisplay() {
  const { data, loading, error } = useQuery(GET_VALUE);
  
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  
  return <p>Value: {data.value}</p>;
}
```

### Queries with Variables

```typescript
const GET_BALANCE = gql`
  query GetBalance($owner: String!) {
    balance(owner: $owner)
  }
`;

function BalanceDisplay({ owner }: { owner: string }) {
  const { data, loading, error } = useQuery(GET_BALANCE, {
    variables: { owner },
  });
  
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  
  return <p>Balance: {data.balance}</p>;
}
```

### Complex Queries

```typescript
const GET_ACCOUNT_INFO = gql`
  query GetAccountInfo($owner: String!) {
    balance(owner: $owner)
    tokenInfo {
      name
      symbol
      decimals
    }
    allowance(owner: $owner, spender: "User:treasury")
  }
`;

function AccountInfo({ owner }: { owner: string }) {
  const { data, loading } = useQuery(GET_ACCOUNT_INFO, {
    variables: { owner },
  });
  
  if (loading || !data) return null;
  
  const { balance, tokenInfo, allowance } = data;
  
  return (
    <div>
      <h3>Account: {owner}</h3>
      <p>Balance: {formatAmount(balance, tokenInfo.decimals)} {tokenInfo.symbol}</p>
      <p>Treasury Allowance: {formatAmount(allowance, tokenInfo.decimals)}</p>
    </div>
  );
}
```

---

## Submitting Operations

### Direct GraphQL Mutation

Some applications expose mutations for operations:

```typescript
const TRANSFER = gql`
  mutation Transfer($to: String!, $amount: String!) {
    transfer(to: $to, amount: $amount) {
      success
      txId
    }
  }
`;

function TransferButton({ to, amount }: { to: string; amount: bigint }) {
  const [transfer, { loading }] = useMutation(TRANSFER);
  
  const handleTransfer = async () => {
    const result = await transfer({
      variables: {
        to,
        amount: amount.toString(),
      },
    });
    console.log('Transfer result:', result);
  };
  
  return (
    <button onClick={handleTransfer} disabled={loading}>
      {loading ? 'Processing...' : 'Transfer'}
    </button>
  );
}
```

### Via REST API

Operations can also be submitted via REST endpoints:

```typescript
// src/lib/linera.ts
import { config } from '@/config';

interface SubmitResult {
  success: boolean;
  blockHeight?: number;
  error?: string;
}

export async function submitOperation(
  chainId: string,
  operation: any
): Promise<SubmitResult> {
  const response = await fetch(
    `${config.nodeServiceUrl}/chains/${chainId}/operations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: JSON.stringify(operation),
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    return { success: false, error };
  }
  
  const result = await response.json();
  return { success: true, blockHeight: result.blockHeight };
}
```

### Using with Wallet Signing

```typescript
// src/lib/operations.ts
interface SignedOperation {
  operation: any;
  signature: string;
  publicKey: string;
}

export async function signAndSubmit(
  wallet: Wallet,
  chainId: string,
  operation: any
): Promise<SubmitResult> {
  // Serialize operation
  const serialized = JSON.stringify(operation);
  
  // Sign with wallet
  const signature = await wallet.sign(serialized);
  
  // Submit signed operation
  const response = await fetch(
    `${config.nodeServiceUrl}/chains/${chainId}/signed-operations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: serialized,
        signature,
        publicKey: wallet.publicKey,
      }),
    }
  );
  
  return response.json();
}
```

---

## Polling and Subscriptions

### Polling with Apollo

```typescript
function LiveBalance({ owner }: { owner: string }) {
  const { data } = useQuery(GET_BALANCE, {
    variables: { owner },
    pollInterval: 3000, // Poll every 3 seconds
  });
  
  return <p>Balance: {data?.balance || '0'}</p>;
}
```

### Manual Refetch

```typescript
function BalanceWithRefresh({ owner }: { owner: string }) {
  const { data, refetch } = useQuery(GET_BALANCE, {
    variables: { owner },
  });
  
  return (
    <div>
      <p>Balance: {data?.balance || '0'}</p>
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
```

### WebSocket Subscriptions

```typescript
import { useSubscription, gql } from '@apollo/client';

const BALANCE_UPDATES = gql`
  subscription BalanceUpdates($owner: String!) {
    balanceChanged(owner: $owner) {
      newBalance
      change
      timestamp
    }
  }
`;

function LiveBalanceSubscription({ owner }: { owner: string }) {
  const { data, loading, error } = useSubscription(BALANCE_UPDATES, {
    variables: { owner },
  });
  
  if (loading) return <p>Connecting...</p>;
  if (error) return <p>Subscription error: {error.message}</p>;
  
  return (
    <div>
      <p>Balance: {data?.balanceChanged.newBalance}</p>
      <p>Last change: {data?.balanceChanged.change}</p>
    </div>
  );
}
```

---

## Transaction Handling

### Complete Transaction Flow

```typescript
// src/hooks/useTransaction.ts
import { useState, useCallback } from 'react';
import { submitOperation } from '@/lib/linera';

interface TransactionState {
  status: 'idle' | 'pending' | 'success' | 'error';
  txId?: string;
  error?: string;
}

export function useTransaction() {
  const [state, setState] = useState<TransactionState>({ status: 'idle' });
  
  const execute = useCallback(async (chainId: string, operation: any) => {
    setState({ status: 'pending' });
    
    try {
      const result = await submitOperation(chainId, operation);
      
      if (result.success) {
        setState({
          status: 'success',
          txId: result.blockHeight?.toString(),
        });
        return result;
      } else {
        setState({
          status: 'error',
          error: result.error,
        });
        throw new Error(result.error);
      }
    } catch (error: any) {
      setState({
        status: 'error',
        error: error.message,
      });
      throw error;
    }
  }, []);
  
  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);
  
  return {
    ...state,
    execute,
    reset,
    isPending: state.status === 'pending',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
  };
}
```

### Transaction Component

```tsx
// src/components/TransactionStatus.tsx
import { useTransaction } from '@/hooks/useTransaction';

interface Props {
  status: 'idle' | 'pending' | 'success' | 'error';
  txId?: string;
  error?: string;
  onReset?: () => void;
}

export function TransactionStatus({ status, txId, error, onReset }: Props) {
  if (status === 'idle') return null;
  
  return (
    <div className={`tx-status tx-status--${status}`}>
      {status === 'pending' && (
        <div className="tx-pending">
          <span className="spinner" />
          <span>Processing transaction...</span>
        </div>
      )}
      
      {status === 'success' && (
        <div className="tx-success">
          <span>✓ Transaction successful!</span>
          {txId && <span className="tx-id">Block: {txId}</span>}
          <button onClick={onReset}>Dismiss</button>
        </div>
      )}
      
      {status === 'error' && (
        <div className="tx-error">
          <span>✗ Transaction failed</span>
          <span className="error-message">{error}</span>
          <button onClick={onReset}>Try Again</button>
        </div>
      )}
    </div>
  );
}
```

---

## Batch Operations

### Sending Multiple Operations

```typescript
async function batchTransfer(
  chainId: string,
  transfers: Array<{ to: string; amount: bigint }>
) {
  // Create batch operation if supported
  const batchOp = {
    BatchTransfer: {
      transfers: transfers.map(t => ({
        to: t.to,
        amount: t.amount.toString(),
      })),
    },
  };
  
  return submitOperation(chainId, batchOp);
}

// Or submit sequentially
async function sequentialTransfers(
  chainId: string,
  transfers: Array<{ to: string; amount: bigint }>
) {
  const results = [];
  
  for (const transfer of transfers) {
    const op = {
      Transfer: {
        to: transfer.to,
        amount: transfer.amount.toString(),
      },
    };
    
    const result = await submitOperation(chainId, op);
    results.push(result);
    
    if (!result.success) {
      throw new Error(`Transfer failed: ${result.error}`);
    }
  }
  
  return results;
}
```

---

## Cross-Chain Operations

### Initiating Cross-Chain Transfer

```typescript
const CROSS_CHAIN_TRANSFER = gql`
  mutation CrossChainTransfer(
    $targetChain: String!
    $to: String!
    $amount: String!
  ) {
    crossChainTransfer(targetChain: $targetChain, to: $to, amount: $amount) {
      success
      messageId
    }
  }
`;

function CrossChainTransfer() {
  const [transfer, { loading }] = useMutation(CROSS_CHAIN_TRANSFER);
  const [targetChain, setTargetChain] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await transfer({
      variables: {
        targetChain,
        to: recipient,
        amount: parseAmount(amount).toString(),
      },
    });
    
    if (result.data?.crossChainTransfer.success) {
      alert(`Message sent! ID: ${result.data.crossChainTransfer.messageId}`);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        value={targetChain}
        onChange={e => setTargetChain(e.target.value)}
        placeholder="Target Chain ID"
      />
      <input
        value={recipient}
        onChange={e => setRecipient(e.target.value)}
        placeholder="Recipient"
      />
      <input
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder="Amount"
        type="number"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Transfer Cross-Chain'}
      </button>
    </form>
  );
}
```

### Checking Message Status

```typescript
const GET_MESSAGE_STATUS = gql`
  query GetMessageStatus($messageId: String!) {
    messageStatus(id: $messageId) {
      delivered
      deliveryBlock
      bounced
    }
  }
`;

function MessageStatus({ messageId }: { messageId: string }) {
  const { data, loading } = useQuery(GET_MESSAGE_STATUS, {
    variables: { messageId },
    pollInterval: 5000,
  });
  
  if (loading || !data) return <p>Checking status...</p>;
  
  const { delivered, deliveryBlock, bounced } = data.messageStatus;
  
  if (bounced) {
    return <p className="error">Message bounced!</p>;
  }
  
  if (delivered) {
    return <p className="success">Delivered at block {deliveryBlock}</p>;
  }
  
  return <p>Pending delivery...</p>;
}
```

---

## Error Handling Patterns

### GraphQL Error Handling

```typescript
import { ApolloError } from '@apollo/client';

function handleGraphQLError(error: ApolloError) {
  // Network error
  if (error.networkError) {
    if ('statusCode' in error.networkError) {
      const status = error.networkError.statusCode;
      if (status === 503) {
        return 'Node service unavailable. Please try again.';
      }
    }
    return 'Network error. Check your connection.';
  }
  
  // GraphQL errors
  if (error.graphQLErrors.length > 0) {
    const gqlError = error.graphQLErrors[0];
    
    // Parse specific error types
    if (gqlError.message.includes('Insufficient balance')) {
      return 'You don\'t have enough tokens for this operation.';
    }
    if (gqlError.message.includes('Unauthorized')) {
      return 'You are not authorized to perform this action.';
    }
    
    return gqlError.message;
  }
  
  return 'An unexpected error occurred.';
}
```

### Retry Logic

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.message?.includes('Insufficient balance')) {
        throw error;
      }
      
      // Wait before retrying
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

// Usage
const result = await withRetry(() => submitOperation(chainId, operation));
```

---

## Optimistic Updates

```typescript
function TransferWithOptimisticUpdate() {
  const [transfer] = useMutation(TRANSFER_MUTATION, {
    optimisticResponse: {
      __typename: 'Mutation',
      transfer: {
        __typename: 'TransferResult',
        success: true,
        newBalance: '0', // Will be corrected
      },
    },
    update: (cache, { data }) => {
      // Update cache with new balance
      cache.modify({
        fields: {
          balance(existingBalance) {
            // Optimistically update
            return data?.transfer.newBalance ?? existingBalance;
          },
        },
      });
    },
  });
  
  // ...
}
```
