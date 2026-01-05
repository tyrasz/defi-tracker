import type { Address } from 'viem';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import type {
  YieldAnalysis,
  YieldOpportunity,
  YieldAlternative,
  IdleAsset,
  RiskLevel,
} from '@/types/yield';
import type { YieldRate } from '@/protocols/types';
import { chainRegistry } from '@/chains';
import { protocolRegistry } from '@/protocols';

class YieldAnalyzer {
  private readonly MIN_APY_IMPROVEMENT = 0.005; // 0.5%
  private readonly MIN_VALUE_USD = 10;

  async analyzePortfolio(
    positions: Position[],
    address: Address
  ): Promise<YieldAnalysis> {
    // Fetch all current yield rates across protocols
    const yieldRates = await this.fetchAllYieldRates();

    // Find yield-bearing positions that could be optimized
    const opportunities = this.findOpportunities(positions, yieldRates);

    // Find idle assets (tokens not earning yield)
    const idleAssets = this.findIdleAssets(positions, yieldRates);

    // Calculate totals
    const totalCurrentYield = this.calculateCurrentYield(positions);
    const totalPotentialYield = this.calculatePotentialYield(
      positions,
      opportunities
    );

    return {
      address,
      totalCurrentYield,
      totalPotentialYield,
      opportunities,
      idleAssets,
      analyzedAt: Date.now(),
    };
  }

  private async fetchAllYieldRates(): Promise<YieldRate[]> {
    const allRates: YieldRate[] = [];
    const chains = chainRegistry.getSupportedChainIds();

    for (const chainId of chains) {
      const client = chainRegistry.getClient(chainId);
      const adapters = protocolRegistry.getAdaptersForChain(chainId);

      const rateResults = await Promise.allSettled(
        adapters.map((adapter) => adapter.getYieldRates(client, chainId))
      );

      rateResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          allRates.push(...result.value);
        }
      });
    }

    return allRates;
  }

  private findOpportunities(
    positions: Position[],
    yieldRates: YieldRate[]
  ): YieldOpportunity[] {
    const opportunities: YieldOpportunity[] = [];

    // Filter to yield-bearing positions with significant value
    const yieldPositions = positions.filter(
      (p) => p.yield && p.valueUsd >= this.MIN_VALUE_USD
    );

    for (const position of yieldPositions) {
      const currentApy = position.yield?.apy ?? 0;

      const alternatives = this.findAlternatives(
        position,
        yieldRates,
        currentApy
      );

      if (alternatives.length > 0) {
        const bestAlt = alternatives[0];
        opportunities.push({
          currentPosition: position,
          betterAlternatives: alternatives,
          potentialGainApy: bestAlt.apyImprovement,
          potentialGainUsd: bestAlt.annualGainUsd,
        });
      }
    }

    return opportunities.sort((a, b) => b.potentialGainUsd - a.potentialGainUsd);
  }

  private findAlternatives(
    position: Position,
    yieldRates: YieldRate[],
    currentApy: number
  ): YieldAlternative[] {
    const alternatives: YieldAlternative[] = [];
    const primaryToken = position.tokens[0];
    if (!primaryToken) return alternatives;

    for (const rate of yieldRates) {
      // Skip same protocol on same chain
      if (
        rate.protocol === position.protocol.id &&
        rate.chainId === position.chainId
      ) {
        continue;
      }

      // Check if same asset or equivalent
      if (!this.isEquivalentAsset(primaryToken.symbol, rate.assetSymbol)) {
        continue;
      }

      const apyImprovement = rate.apy - currentApy;

      if (apyImprovement > this.MIN_APY_IMPROVEMENT) {
        const protocol = protocolRegistry.getAdapter(rate.protocol);

        alternatives.push({
          protocol: rate.protocol,
          protocolName: protocol?.protocol.name ?? rate.protocol,
          chainId: rate.chainId,
          asset: rate.asset,
          apy: rate.apy,
          apyImprovement,
          annualGainUsd: position.valueUsd * apyImprovement,
          risk: this.assessRisk(rate),
        });
      }
    }

    return alternatives.sort((a, b) => b.apy - a.apy);
  }

  private findIdleAssets(
    positions: Position[],
    yieldRates: YieldRate[]
  ): IdleAsset[] {
    const idleAssets: IdleAsset[] = [];

    const nonYieldPositions = positions.filter(
      (p) => !p.yield && p.valueUsd >= this.MIN_VALUE_USD
    );

    for (const position of nonYieldPositions) {
      const token = position.tokens[0];
      if (!token) continue;

      const opportunities = yieldRates
        .filter((r) => this.isEquivalentAsset(token.symbol, r.assetSymbol))
        .map((r) => ({
          protocol: r.protocol,
          protocolName:
            protocolRegistry.getAdapter(r.protocol)?.protocol.name ?? r.protocol,
          chainId: r.chainId,
          asset: r.asset,
          apy: r.apy,
          apyImprovement: r.apy,
          annualGainUsd: position.valueUsd * r.apy,
          risk: this.assessRisk(r),
        }))
        .sort((a, b) => b.apy - a.apy)
        .slice(0, 3);

      if (opportunities.length > 0) {
        idleAssets.push({
          token: token.address,
          symbol: token.symbol,
          balance: token.balance,
          valueUsd: position.valueUsd,
          chainId: position.chainId,
          bestYieldOpportunities: opportunities,
        });
      }
    }

    return idleAssets;
  }

  private isEquivalentAsset(symbol1: string, symbol2: string): boolean {
    const normalize = (s: string) => s.toUpperCase();

    if (normalize(symbol1) === normalize(symbol2)) return true;

    // Stablecoin equivalents
    const stablecoins = ['USDC', 'USDT', 'DAI', 'FRAX', 'LUSD', 'USDS', 'USDE'];
    if (
      stablecoins.includes(normalize(symbol1)) &&
      stablecoins.includes(normalize(symbol2))
    ) {
      return true;
    }

    // ETH equivalents
    const ethEquivalents = ['ETH', 'WETH', 'STETH', 'WSTETH', 'RETH', 'CBETH'];
    if (
      ethEquivalents.includes(normalize(symbol1)) &&
      ethEquivalents.includes(normalize(symbol2))
    ) {
      return true;
    }

    return false;
  }

  private assessRisk(rate: YieldRate): RiskLevel {
    const protocol = rate.protocol.toLowerCase();

    // Battle-tested protocols
    if (['aave-v3', 'compound-v3', 'lido'].includes(protocol)) {
      return 'low';
    }

    // Established but more complex
    if (['uniswap-v3', 'curve', 'yearn-v3', 'rocket-pool'].includes(protocol)) {
      return 'medium';
    }

    return 'high';
  }

  private calculateCurrentYield(positions: Position[]): number {
    return positions.reduce((sum, p) => {
      if (p.yield) {
        return sum + p.valueUsd * p.yield.apy;
      }
      return sum;
    }, 0);
  }

  private calculatePotentialYield(
    positions: Position[],
    opportunities: YieldOpportunity[]
  ): number {
    let potentialYield = this.calculateCurrentYield(positions);

    for (const opp of opportunities) {
      potentialYield += opp.potentialGainUsd;
    }

    return potentialYield;
  }
}

export const yieldAnalyzer = new YieldAnalyzer();
