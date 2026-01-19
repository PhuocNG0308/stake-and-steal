// Stake and Steal - Network Status Hook
// Checks connectivity to Linera devnet/testnet

import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isConnected: boolean;
  networkType: 'devnet' | 'testnet' | 'mainnet' | 'local' | 'mock' | null;
  endpoint: string | null;
  latency: number | null;
  lastChecked: number;
  error: string | null;
}

// Known Linera network endpoints
const LINERA_ENDPOINTS = {
  devnet: 'https://devnet.linera.dev',
  testnet: 'https://testnet.linera.net',
  local: 'http://localhost:8080',
};

// Check if endpoint is reachable
async function checkEndpoint(url: string): Promise<{ ok: boolean; latency: number }> {
  const start = Date.now();
  try {
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    const latency = Date.now() - start;
    return { ok: response.ok, latency };
  } catch {
    // Try GraphQL endpoint as fallback
    try {
      const response = await fetch(`${url}/graphql`, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ __typename }' }),
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - start;
      return { ok: response.ok, latency };
    } catch {
      return { ok: false, latency: -1 };
    }
  }
}

// Detect network type from endpoint URL
function detectNetworkType(endpoint: string): NetworkStatus['networkType'] {
  if (endpoint.includes('devnet')) return 'devnet';
  if (endpoint.includes('testnet')) return 'testnet';
  if (endpoint.includes('mainnet')) return 'mainnet';
  if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) return 'local';
  return null;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: false,
    networkType: 'mock', // Default to mock mode
    endpoint: null,
    latency: null,
    lastChecked: 0,
    error: null,
  });

  const [isChecking, setIsChecking] = useState(false);

  const checkNetwork = useCallback(async (customEndpoint?: string) => {
    setIsChecking(true);
    
    // If custom endpoint provided, check it first
    if (customEndpoint) {
      const result = await checkEndpoint(customEndpoint);
      if (result.ok) {
        setStatus({
          isConnected: true,
          networkType: detectNetworkType(customEndpoint),
          endpoint: customEndpoint,
          latency: result.latency,
          lastChecked: Date.now(),
          error: null,
        });
        setIsChecking(false);
        return true;
      }
    }

    // Try known endpoints in order
    for (const [network, endpoint] of Object.entries(LINERA_ENDPOINTS)) {
      const result = await checkEndpoint(endpoint);
      if (result.ok) {
        setStatus({
          isConnected: true,
          networkType: network as NetworkStatus['networkType'],
          endpoint,
          latency: result.latency,
          lastChecked: Date.now(),
          error: null,
        });
        setIsChecking(false);
        return true;
      }
    }

    // No network available - use mock mode
    setStatus({
      isConnected: false,
      networkType: 'mock',
      endpoint: null,
      latency: null,
      lastChecked: Date.now(),
      error: 'No Linera network available. Running in mock mode.',
    });
    setIsChecking(false);
    return false;
  }, []);

  // Check network on mount and periodically
  useEffect(() => {
    checkNetwork();
    
    // Re-check every 30 seconds
    const interval = setInterval(() => {
      checkNetwork();
    }, 30000);

    return () => clearInterval(interval);
  }, [checkNetwork]);

  const isMockMode = status.networkType === 'mock' || !status.isConnected;

  return {
    ...status,
    isChecking,
    isMockMode,
    checkNetwork,
    // Helper for displaying network name
    networkName: status.networkType 
      ? status.networkType.charAt(0).toUpperCase() + status.networkType.slice(1)
      : 'Unknown',
  };
}

// Store for sharing network status across components
import { create } from 'zustand';

interface NetworkStore {
  status: NetworkStatus;
  setStatus: (status: NetworkStatus) => void;
}

export const useNetworkStore = create<NetworkStore>((set) => ({
  status: {
    isConnected: false,
    networkType: 'mock',
    endpoint: null,
    latency: null,
    lastChecked: 0,
    error: null,
  },
  setStatus: (status) => set({ status }),
}));
