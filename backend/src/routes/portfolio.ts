import { Router, type Request, type Response } from 'express';
import { isAddress, type Address } from 'viem';
import { balanceService } from '../services/balances';
import { solanaService } from '../services/solana';
import { getSolanaProtocolPositions, SolanaPosition } from '../services/solana-protocols';
import { getEvmProtocolPositions, EvmPosition } from '../services/evm-protocols';
import type { EvmChainId } from '../services/chains';

const router = Router();

// Helper to serialize BigInts
function serializeBigInts(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInts);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeBigInts(value);
    }
    return result;
  }
  return obj;
}

// GET /api/portfolio/:address
router.get('/:address', async (req: Request, res: Response) => {
  const { address } = req.params;
  const chainsParam = req.query.chains as string | undefined;

  // Check if Solana address
  if (solanaService.isSolanaAddress(address)) {
    try {
      // Fetch wallet balances and protocol positions in parallel
      const [balances, protocolPositions] = await Promise.all([
        solanaService.getBalances(address),
        getSolanaProtocolPositions(address),
      ]);

      // Calculate total value including protocol positions
      const positionsValue = protocolPositions.reduce((sum, p) => sum + Math.abs(p.valueUsd), 0);
      const totalValueUsd = balances.totalValueUsd + positionsValue;

      // Group positions by protocol
      const byProtocol: Record<string, {
        protocolId: string;
        protocolName: string;
        totalValueUsd: number;
        positions: SolanaPosition[];
      }> = {};

      for (const position of protocolPositions) {
        const protocolId = position.protocol.id;
        if (!byProtocol[protocolId]) {
          byProtocol[protocolId] = {
            protocolId,
            protocolName: position.protocol.name,
            totalValueUsd: 0,
            positions: [],
          };
        }
        byProtocol[protocolId].positions.push(position);
        byProtocol[protocolId].totalValueUsd += Math.abs(position.valueUsd);
      }

      // Build portfolio structure matching frontend expectations
      const portfolio = {
        address,
        network: 'solana',
        totalValueUsd,
        positions: protocolPositions,
        byChain: {
          solana: {
            chainId: 'solana',
            chainName: 'Solana',
            totalValueUsd,
            positions: protocolPositions,
          },
        },
        byProtocol,
        walletBalances: {
          address,
          balances: [
            {
              chainId: 'solana',
              chainName: 'Solana',
              balances: balances.balances,
              totalValueUsd: balances.totalValueUsd,
            },
          ],
          totalValueUsd: balances.totalValueUsd,
          fetchedAt: balances.fetchedAt,
        },
        yieldAnalysis: null,
        fetchedAt: balances.fetchedAt,
      };

      return res.json(serializeBigInts({ success: true, data: portfolio }));
    } catch (error) {
      console.error('Solana portfolio error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch Solana portfolio',
      });
    }
  }

  // Validate EVM address
  if (!isAddress(address)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid address format. Provide an EVM (0x...) or Solana address.',
    });
  }

  // Parse chain IDs
  let chainIds: EvmChainId[] | undefined;
  if (chainsParam) {
    chainIds = chainsParam.split(',').map(Number).filter(Boolean) as EvmChainId[];
  }

  try {
    // Fetch wallet balances and protocol positions in parallel
    const [walletBalances, protocolPositions] = await Promise.all([
      balanceService.getBalances(address as Address, chainIds),
      getEvmProtocolPositions(address as Address, chainIds),
    ]);

    // Calculate total value including protocol positions
    const positionsValue = protocolPositions.reduce((sum, p) => sum + Math.abs(p.valueUsd), 0);
    const totalValueUsd = walletBalances.totalValueUsd + positionsValue;

    // Group positions by protocol
    const byProtocol: Record<string, {
      protocolId: string;
      protocolName: string;
      totalValueUsd: number;
      positions: EvmPosition[];
    }> = {};

    for (const position of protocolPositions) {
      const protocolId = position.protocol.id;
      if (!byProtocol[protocolId]) {
        byProtocol[protocolId] = {
          protocolId,
          protocolName: position.protocol.name,
          totalValueUsd: 0,
          positions: [],
        };
      }
      byProtocol[protocolId].positions.push(position);
      byProtocol[protocolId].totalValueUsd += Math.abs(position.valueUsd);
    }

    // Group positions by chain
    const positionsByChain = new Map<EvmChainId, EvmPosition[]>();
    for (const position of protocolPositions) {
      const chainPositions = positionsByChain.get(position.chainId) || [];
      chainPositions.push(position);
      positionsByChain.set(position.chainId, chainPositions);
    }

    // Build portfolio structure matching frontend expectations
    const portfolio = {
      address,
      network: 'evm',
      totalValueUsd,
      positions: protocolPositions,
      byChain: Object.fromEntries(
        walletBalances.balances.map((chain) => {
          const chainPositions = positionsByChain.get(chain.chainId as EvmChainId) || [];
          const chainPositionsValue = chainPositions.reduce((sum, p) => sum + Math.abs(p.valueUsd), 0);
          return [
            chain.chainId,
            {
              chainId: chain.chainId,
              chainName: chain.chainName,
              totalValueUsd: chain.totalValueUsd + chainPositionsValue,
              positions: chainPositions,
            },
          ];
        })
      ),
      byProtocol,
      walletBalances: {
        address,
        balances: walletBalances.balances,
        totalValueUsd: walletBalances.totalValueUsd,
        fetchedAt: walletBalances.fetchedAt,
      },
      yieldAnalysis: null,
      fetchedAt: walletBalances.fetchedAt,
    };

    return res.json(serializeBigInts({ success: true, data: portfolio }));
  } catch (error) {
    console.error('Portfolio error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio',
    });
  }
});

export default router;
