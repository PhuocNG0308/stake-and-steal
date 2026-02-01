/**
 * Linera Web Client - GraphQL Integration for Testnet Conway
 * 
 * This module provides direct interaction with Linera applications via GraphQL.
 * Compatible with:
 * - Linera Wallet extension
 * - CheCko Wallet
 * - Croissant Wallet
 * - Demo mode (mock data)
 */

import { APP_ID, CHAIN_ID } from '@/config';
import type { Operation, OperationResponse, PlayerInfo, GameConfig } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

export interface LineraClientConfig {
  nodeServiceUrl: string;
  chainId: string;
  appId: string;
}

export interface QueryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface OperationResult {
  success: boolean;
  blockHeight?: number;
  response?: OperationResponse;
  error?: string;
}

export interface CrossChainTarget {
  chainId: string;
  owner: string;
  name?: string;
  totalStaked?: number;
  isOnline?: boolean;
}

// ============================================================================
// LINERA CLIENT CLASS
// ============================================================================

export class LineraClient {
  private config: LineraClientConfig;
  private connected: boolean = false;
  private currentOwner: string | null = null;

  constructor(config?: Partial<LineraClientConfig>) {
    this.config = {
      nodeServiceUrl: config?.nodeServiceUrl || import.meta.env.VITE_NODE_SERVICE_URL || 'http://localhost:8080',
      chainId: config?.chainId || CHAIN_ID || '',
      appId: config?.appId || APP_ID || '',
    };
  }

  // Get the GraphQL endpoint for the application
  getEndpoint(): string {
    const { nodeServiceUrl, chainId, appId } = this.config;
    if (chainId && appId) {
      return `${nodeServiceUrl}/chains/${chainId}/applications/${appId}`;
    }
    return `${nodeServiceUrl}`;
  }

  // Get endpoint for a specific chain
  getChainEndpoint(chainId: string): string {
    const { nodeServiceUrl, appId } = this.config;
    return `${nodeServiceUrl}/chains/${chainId}/applications/${appId}`;
  }

  // Connect to node service
  async connect(owner?: string): Promise<boolean> {
    try {
      // Test connection by querying config
      const result = await this.query<{ config: GameConfig }>(`
        query TestConnection {
          config {
            yieldRateBps
          }
        }
      `);
      
      this.connected = result.success;
      this.currentOwner = owner || null;
      return this.connected;
    } catch (error) {
      console.error('Failed to connect to Linera node:', error);
      this.connected = false;
      return false;
    }
  }

  // Execute GraphQL query
  async query<T>(query: string, variables?: Record<string, unknown>): Promise<QueryResult<T>> {
    try {
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      const result = await response.json();
      
      if (result.errors?.length > 0) {
        return { success: false, error: result.errors[0].message };
      }

      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // Execute GraphQL mutation
  async mutate<T>(mutation: string, variables?: Record<string, unknown>): Promise<QueryResult<T>> {
    return this.query<T>(mutation, variables);
  }

  // Submit operation to the contract
  async submitOperation(operation: Operation): Promise<OperationResult> {
    try {
      const response = await fetch(
        `${this.config.nodeServiceUrl}/chains/${this.config.chainId}/operations`,
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
      return { 
        success: true, 
        blockHeight: result.blockHeight,
        response: result.response,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // ============================================================================
  // GAME OPERATIONS
  // ============================================================================

  // Register player
  async register(encryptedName: number[]): Promise<OperationResult> {
    return this.submitOperation({
      Register: { encrypted_name: encryptedName }
    });
  }

  // Create a new page
  async createPage(): Promise<OperationResult> {
    return this.submitOperation({ CreatePage: null });
  }

  // Deposit tokens to a plot
  async deposit(pageId: number, plotId: number, amount: string, encryptedData: number[] = []): Promise<OperationResult> {
    return this.submitOperation({
      Deposit: { 
        page_id: pageId, 
        plot_id: plotId, 
        amount: amount,
        encrypted_data: encryptedData
      }
    });
  }

  // Withdraw tokens from a plot
  async withdraw(pageId: number, plotId: number, amount: string): Promise<OperationResult> {
    return this.submitOperation({
      Withdraw: { 
        page_id: pageId, 
        plot_id: plotId, 
        amount: amount 
      }
    });
  }

  // Claim yield from a plot
  async claimYield(pageId: number, plotId: number): Promise<OperationResult> {
    return this.submitOperation({
      ClaimYield: { page_id: pageId, plot_id: plotId }
    });
  }

  // Claim all yield
  async claimAllYield(): Promise<OperationResult> {
    return this.submitOperation({ ClaimAllYield: null });
  }

  // Claim SAS rewards from a plot
  async claimSasRewards(pageId: number, plotId: number): Promise<OperationResult> {
    return this.submitOperation({
      ClaimSasRewards: { page_id: pageId, plot_id: plotId }
    });
  }

  // Claim all SAS rewards
  async claimAllSasRewards(): Promise<OperationResult> {
    return this.submitOperation({ ClaimAllSasRewards: null });
  }

  // Buy a plot with SAS
  async buyPlot(pageId: number): Promise<OperationResult> {
    return this.submitOperation({
      BuyPlot: { page_id: pageId }
    });
  }

  // Buy shields with SAS
  async buyShield(count: number): Promise<OperationResult> {
    return this.submitOperation({
      BuyShield: { count }
    });
  }

  // ============================================================================
  // CROSS-CHAIN RAID OPERATIONS
  // ============================================================================

  // Find targets for raiding (cross-chain)
  async findTargets(count: number): Promise<OperationResult> {
    return this.submitOperation({
      FindTargets: { count }
    });
  }

  // Lock onto a target for raiding
  async lockTarget(targetChain: string, commitment: number[]): Promise<OperationResult> {
    return this.submitOperation({
      LockTarget: { 
        target_chain: targetChain, 
        commitment: commitment as unknown as [number] 
      }
    });
  }

  // Execute steal attempt
  async executeSteal(
    attackerPage: number,
    attackerPlot: number,
    targetPage: number,
    targetPlot: number,
    revealNonce: number[]
  ): Promise<OperationResult> {
    return this.submitOperation({
      ExecuteSteal: {
        attacker_page: attackerPage,
        attacker_plot: attackerPlot,
        target_page: targetPage,
        target_plot: targetPlot,
        reveal_nonce: revealNonce as unknown as [number]
      }
    });
  }

  // Cancel current raid
  async cancelRaid(): Promise<OperationResult> {
    return this.submitOperation({ CancelRaid: null });
  }

  // ============================================================================
  // CROSS-CHAIN QUERIES
  // ============================================================================

  // Query another chain's player info
  async queryPlayerOnChain(chainId: string): Promise<QueryResult<{ player: PlayerInfo }>> {
    const endpoint = this.getChainEndpoint(chainId);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetPlayerInfo {
              player {
                isRegistered
                encryptedName
                tokenABalance
                tokenBBalance
                pageCount
                raidState
              }
            }
          `
        }),
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const result = await response.json();
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // Discover players on the network
  async discoverNetworkPlayers(knownChains: string[]): Promise<CrossChainTarget[]> {
    const targets: CrossChainTarget[] = [];

    for (const chainId of knownChains) {
      if (chainId === this.config.chainId) continue; // Skip own chain
      
      try {
        const result = await this.queryPlayerOnChain(chainId);
        if (result.success && result.data?.player?.isRegistered) {
          targets.push({
            chainId,
            owner: result.data.player.encryptedName?.toString() || 'Unknown',
            totalStaked: Number(result.data.player.tokenABalance) || 0,
            isOnline: true,
          });
        }
      } catch {
        // Chain not available or no player registered
      }
    }

    return targets;
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  isConnected(): boolean {
    return this.connected;
  }

  getOwner(): string | null {
    return this.currentOwner;
  }

  getChainId(): string {
    return this.config.chainId;
  }

  getAppId(): string {
    return this.config.appId;
  }

  updateConfig(newConfig: Partial<LineraClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let clientInstance: LineraClient | null = null;

export function getLineraClient(): LineraClient {
  if (!clientInstance) {
    clientInstance = new LineraClient();
  }
  return clientInstance;
}

export function createLineraClient(config?: Partial<LineraClientConfig>): LineraClient {
  clientInstance = new LineraClient(config);
  return clientInstance;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Generate commitment hash for raid (simplified)
export function generateCommitment(targetChain: string, targetPage: number, targetPlot: number): number[] {
  const data = `${targetChain}:${targetPage}:${targetPlot}:${Date.now()}`;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  
  // Simple hash (in production, use proper crypto)
  const hash = new Uint8Array(32);
  for (let i = 0; i < bytes.length; i++) {
    hash[i % 32] ^= bytes[i];
  }
  
  return Array.from(hash);
}

// Generate reveal nonce
export function generateRevealNonce(): number[] {
  const nonce = new Uint8Array(32);
  crypto.getRandomValues(nonce);
  return Array.from(nonce);
}
