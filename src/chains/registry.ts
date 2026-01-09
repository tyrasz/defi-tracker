import { createPublicClient, http, type PublicClient } from 'viem';
import type { ChainConfig, ChainId, EvmChainId, EvmChainConfig, SolanaChainConfig } from '@/types/chain';
import { withRetry, shouldRotateRpc } from '@/lib/utils/retry';
import { ethereumConfig } from './ethereum';
import { arbitrumConfig } from './arbitrum';
import { optimismConfig } from './optimism';
import { baseConfig } from './base';
import { polygonConfig } from './polygon';
import { avalancheConfig } from './avalanche';
import { bscConfig } from './bsc';
import { solanaConfig } from './solana';

interface RpcHealth {
  failureCount: number;
  lastFailure: number | null;
  lastSuccess: number | null;
}

const FAILURE_THRESHOLD = 3; // Rotate after this many consecutive failures
const HEALTH_RESET_MS = 60000; // Reset failure count after 1 minute of no failures

class ChainRegistry {
  private chains: Map<ChainId, ChainConfig> = new Map();
  private clients: Map<EvmChainId, PublicClient> = new Map();
  private rpcIndex: Map<ChainId, number> = new Map();
  private rpcHealth: Map<string, RpcHealth> = new Map();

  constructor() {
    // EVM chains
    this.registerChain(ethereumConfig);
    this.registerChain(arbitrumConfig);
    this.registerChain(optimismConfig);
    this.registerChain(baseConfig);
    this.registerChain(polygonConfig);
    this.registerChain(avalancheConfig);
    this.registerChain(bscConfig);
    // Non-EVM chains
    this.registerChain(solanaConfig);
  }

  registerChain(config: ChainConfig): void {
    this.chains.set(config.id, config);
    this.rpcIndex.set(config.id, 0);
  }

  getChain(chainId: ChainId): ChainConfig | undefined {
    return this.chains.get(chainId);
  }

  getEvmChain(chainId: EvmChainId): EvmChainConfig | undefined {
    const chain = this.chains.get(chainId);
    if (chain && chain.network === 'evm') {
      return chain as EvmChainConfig;
    }
    return undefined;
  }

  getSolanaChain(): SolanaChainConfig | undefined {
    const chain = this.chains.get('solana');
    if (chain && chain.network === 'solana') {
      return chain as SolanaChainConfig;
    }
    return undefined;
  }

  getAllChains(): ChainConfig[] {
    return Array.from(this.chains.values());
  }

  getEvmChains(): EvmChainConfig[] {
    return Array.from(this.chains.values()).filter(
      (c): c is EvmChainConfig => c.network === 'evm'
    );
  }

  isEvmChain(chainId: ChainId): chainId is EvmChainId {
    return typeof chainId === 'number';
  }

  private getHealthKey(chainId: ChainId, rpcIndex: number): string {
    return `${chainId}-${rpcIndex}`;
  }

  private getHealth(chainId: ChainId, rpcIndex: number): RpcHealth {
    const key = this.getHealthKey(chainId, rpcIndex);
    if (!this.rpcHealth.has(key)) {
      this.rpcHealth.set(key, {
        failureCount: 0,
        lastFailure: null,
        lastSuccess: null,
      });
    }
    return this.rpcHealth.get(key)!;
  }

  private recordSuccess(chainId: ChainId): void {
    const rpcIndex = this.rpcIndex.get(chainId) || 0;
    const health = this.getHealth(chainId, rpcIndex);
    health.failureCount = 0;
    health.lastSuccess = Date.now();
  }

  private recordFailure(chainId: ChainId, error: Error): boolean {
    const rpcIndex = this.rpcIndex.get(chainId) || 0;
    const health = this.getHealth(chainId, rpcIndex);
    const config = this.chains.get(chainId);

    // Reset failure count if enough time has passed
    if (health.lastFailure && Date.now() - health.lastFailure > HEALTH_RESET_MS) {
      health.failureCount = 0;
    }

    health.failureCount++;
    health.lastFailure = Date.now();

    console.warn(
      `[Chain ${chainId}] RPC failure #${health.failureCount}: ${error.message}`
    );

    // Check if we should rotate
    if (
      health.failureCount >= FAILURE_THRESHOLD &&
      shouldRotateRpc(error) &&
      config &&
      config.rpcUrls.length > 1
    ) {
      this.rotateRpc(chainId);
      return true; // Rotated
    }

    return false;
  }

  getClient(chainId: EvmChainId): PublicClient {
    if (!this.clients.has(chainId)) {
      this.createClient(chainId);
    }
    return this.clients.get(chainId)!;
  }

  private createClient(chainId: EvmChainId): void {
    const config = this.getEvmChain(chainId);
    if (!config) {
      throw new Error(`EVM Chain ${chainId} not registered`);
    }

    const rpcIndex = this.rpcIndex.get(chainId) || 0;
    const rpcUrl = config.rpcUrls[rpcIndex];

    console.log(`[Chain ${chainId}] Using RPC: ${rpcUrl}`);

    const client = createPublicClient({
      chain: config.viemChain,
      transport: http(rpcUrl, {
        timeout: 30000, // 30 second timeout
        retryCount: 0, // We handle retries ourselves
      }),
      batch: {
        multicall: {
          batchSize: 1024,
          wait: 16,
        },
      },
    });

    this.clients.set(chainId, client as PublicClient);
  }

  getSolanaRpcUrl(): string {
    const config = this.getSolanaChain();
    if (!config) {
      throw new Error('Solana chain not registered');
    }
    const rpcIndex = this.rpcIndex.get('solana') || 0;
    return config.rpcUrls[rpcIndex];
  }

  rotateRpc(chainId: ChainId): void {
    const config = this.chains.get(chainId);
    if (!config) return;

    const currentIndex = this.rpcIndex.get(chainId) || 0;
    const nextIndex = (currentIndex + 1) % config.rpcUrls.length;

    console.log(
      `[Chain ${chainId}] Rotating RPC from ${config.rpcUrls[currentIndex]} to ${config.rpcUrls[nextIndex]}`
    );

    this.rpcIndex.set(chainId, nextIndex);
    if (this.isEvmChain(chainId)) {
      this.clients.delete(chainId);
    }
  }

  /**
   * Execute an RPC call with automatic retry and failover (EVM chains only)
   */
  async withFailover<T>(
    chainId: EvmChainId,
    fn: (client: PublicClient) => Promise<T>,
    options: { maxRetries?: number } = {}
  ): Promise<T> {
    const config = this.getEvmChain(chainId);
    const maxRpcRotations = config ? config.rpcUrls.length : 1;
    let rotations = 0;

    return withRetry(
      async () => {
        const client = this.getClient(chainId);
        try {
          const result = await fn(client);
          this.recordSuccess(chainId);
          return result;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          const rotated = this.recordFailure(chainId, err);

          // If we rotated and haven't exhausted all RPCs, don't count this as a retry
          if (rotated && rotations < maxRpcRotations - 1) {
            rotations++;
          }

          throw err;
        }
      },
      {
        maxRetries: options.maxRetries ?? 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        onRetry: (error, attempt) => {
          console.warn(
            `[Chain ${chainId}] Retry attempt ${attempt}: ${error.message}`
          );
        },
      }
    );
  }

  /**
   * Health check - verify RPC is responding (EVM chains only)
   */
  async healthCheck(chainId: EvmChainId): Promise<boolean> {
    try {
      const client = this.getClient(chainId);
      await client.getBlockNumber();
      this.recordSuccess(chainId);
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.recordFailure(chainId, err);
      return false;
    }
  }

  /**
   * Check health of all EVM chains and rotate unhealthy RPCs
   */
  async healthCheckAll(): Promise<Record<EvmChainId, boolean>> {
    const results: Record<number, boolean> = {};
    const chainIds = this.getEvmChainIds();

    await Promise.all(
      chainIds.map(async (chainId) => {
        results[chainId] = await this.healthCheck(chainId);
      })
    );

    return results as Record<EvmChainId, boolean>;
  }

  /**
   * Get current RPC status for monitoring
   */
  getRpcStatus(): Record<ChainId, { rpcUrl: string; health: RpcHealth }> {
    const status: Record<string | number, { rpcUrl: string; health: RpcHealth }> = {};

    for (const chainId of this.getSupportedChainIds()) {
      const config = this.chains.get(chainId)!;
      const rpcIndex = this.rpcIndex.get(chainId) || 0;
      status[chainId] = {
        rpcUrl: config.rpcUrls[rpcIndex],
        health: this.getHealth(chainId, rpcIndex),
      };
    }

    return status as Record<ChainId, { rpcUrl: string; health: RpcHealth }>;
  }

  getSupportedChainIds(): ChainId[] {
    return Array.from(this.chains.keys());
  }

  getEvmChainIds(): EvmChainId[] {
    return Array.from(this.chains.keys()).filter(
      (id): id is EvmChainId => typeof id === 'number'
    );
  }
}

export const chainRegistry = new ChainRegistry();
