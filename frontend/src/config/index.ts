// Stake and Steal - Configuration

export interface NetworkConfig {
  network: string;
  faucetUrl: string;
  rpcUrl: string;
  explorerUrl: string;
  nodeServiceUrl: string;
}

// Testnet Conway Configuration
export const testnetConfig: NetworkConfig = {
  network: 'testnet-conway',
  faucetUrl: 'https://faucet.testnet-conway.linera.net',
  rpcUrl: 'https://rpc.testnet-conway.linera.net',
  explorerUrl: 'https://explorer.testnet-conway.linera.net',
  nodeServiceUrl: 'https://rpc.testnet-conway.linera.net',
};

// Local Development Configuration  
export const localConfig: NetworkConfig = {
  network: 'local',
  faucetUrl: 'http://localhost:8080/faucet',
  rpcUrl: 'http://localhost:8080',
  explorerUrl: 'http://localhost:8080/explorer',
  nodeServiceUrl: 'http://localhost:8080',
};

// Determine which config to use based on environment
const isTestnet = import.meta.env.VITE_NETWORK === 'testnet' || 
                  import.meta.env.MODE === 'production';

export const config: NetworkConfig = isTestnet ? testnetConfig : localConfig;

// Application ID - will be set after deployment
export const APP_ID = import.meta.env.VITE_APP_ID || '';

// Game constants
export const GAME_NAME = 'Stake and Steal';
export const MIN_STEAL_STAKE = 1000; // Minimum stake required for guaranteed steal
export const STEAL_PERCENTAGE = 15; // Percentage taken during steal
