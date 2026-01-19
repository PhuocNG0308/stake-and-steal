// Stake and Steal - Faucet Service
// Request test tokens from the Linera testnet faucet

import { config } from '@/config';

export interface FaucetResponse {
  success: boolean;
  message: string;
  amount?: string;
  chainId?: string;
  error?: string;
}

// Request tokens from faucet for a chain
export async function requestFaucetTokens(chainId: string): Promise<FaucetResponse> {
  try {
    const response = await fetch(`${config.faucetUrl}/api/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chain_id: chainId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        message: 'Faucet request failed',
        error: errorText || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: 'Tokens received successfully!',
      amount: data.amount?.toString() || '1000',
      chainId: data.chain_id || chainId,
    };
  } catch (error) {
    console.error('Faucet request error:', error);
    return {
      success: false,
      message: 'Failed to connect to faucet',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Alternative: Direct faucet claim via CLI command format
// This can be used as fallback or for demo purposes
export async function requestFaucetTokensViaRpc(chainId: string): Promise<FaucetResponse> {
  try {
    // Try the simple faucet endpoint
    const response = await fetch(`${config.faucetUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'request_tokens',
        params: {
          chain_id: chainId,
        },
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      return {
        success: false,
        message: 'Faucet request failed',
        error: data.error.message || data.error,
      };
    }

    return {
      success: true,
      message: 'Tokens received successfully!',
      amount: data.result?.amount?.toString() || '1000',
      chainId,
    };
  } catch (error) {
    console.error('Faucet RPC error:', error);
    return {
      success: false,
      message: 'Failed to request tokens',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Check faucet availability
export async function checkFaucetStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${config.faucetUrl}`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// For demo wallet: simulate faucet by updating local balance
export function simulateFaucetForDemo(currentBalance: string): string {
  const current = BigInt(currentBalance || '0');
  const faucetAmount = BigInt(10000); // Add 10000 tokens
  return (current + faucetAmount).toString();
}
