import type { Address } from 'viem';
import type { ChainId } from '@/types/chain';
import type {
  PortfolioSnapshot,
  TokenSnapshot,
  CostBasis,
  Acquisition,
  PortfolioHistory,
  HistoricalValue,
} from '@/types/history';
import crypto from 'crypto';

function generateId(): string {
  return crypto.randomUUID();
}

// In-memory storage (for production, replace with database)
// This serves as a reference implementation that can be swapped for
// Prisma, MongoDB, Redis, or any other persistence layer
class HistoryStore {
  private snapshots: Map<string, PortfolioSnapshot[]> = new Map();
  private costBases: Map<string, CostBasis[]> = new Map();

  // Generate unique key for address
  private getAddressKey(address: Address): string {
    return address.toLowerCase();
  }

  // Generate unique key for cost basis
  private getCostBasisKey(
    address: Address,
    chainId: ChainId,
    tokenAddress: Address | string
  ): string {
    const tokenKey = String(tokenAddress).toLowerCase();
    return `${address.toLowerCase()}-${chainId}-${tokenKey}`;
  }

  // ============ Snapshots ============

  async saveSnapshot(snapshot: Omit<PortfolioSnapshot, 'id'>): Promise<PortfolioSnapshot> {
    const key = this.getAddressKey(snapshot.address);
    const fullSnapshot: PortfolioSnapshot = {
      ...snapshot,
      id: generateId(),
    };

    const existing = this.snapshots.get(key) || [];
    existing.push(fullSnapshot);

    // Keep only last 365 daily snapshots
    if (existing.length > 365) {
      existing.shift();
    }

    this.snapshots.set(key, existing);
    return fullSnapshot;
  }

  async getSnapshots(
    address: Address,
    startTime?: number,
    endTime?: number
  ): Promise<PortfolioSnapshot[]> {
    const key = this.getAddressKey(address);
    const all = this.snapshots.get(key) || [];

    return all.filter((s) => {
      if (startTime && s.timestamp < startTime) return false;
      if (endTime && s.timestamp > endTime) return false;
      return true;
    });
  }

  async getLatestSnapshot(address: Address): Promise<PortfolioSnapshot | null> {
    const key = this.getAddressKey(address);
    const all = this.snapshots.get(key) || [];
    return all.length > 0 ? all[all.length - 1] : null;
  }

  async getHistory(
    address: Address,
    days: number = 30
  ): Promise<PortfolioHistory> {
    const now = Date.now();
    const startDate = now - days * 24 * 60 * 60 * 1000;
    const snapshots = await this.getSnapshots(address, startDate, now);

    const valueHistory: HistoricalValue[] = snapshots.map((s) => ({
      timestamp: s.timestamp,
      valueUsd: s.totalValueUsd,
    }));

    return {
      address,
      snapshots,
      valueHistory,
      startDate,
      endDate: now,
    };
  }

  // ============ Cost Basis ============

  async getCostBasis(
    address: Address,
    chainId: ChainId,
    tokenAddress: Address | string
  ): Promise<CostBasis | null> {
    const bases = this.costBases.get(this.getAddressKey(address)) || [];
    const normalizedTokenAddr = String(tokenAddress).toLowerCase();

    return bases.find((b) =>
      b.chainId === chainId &&
      String(b.tokenAddress).toLowerCase() === normalizedTokenAddr
    ) || null;
  }

  async getAllCostBases(address: Address): Promise<CostBasis[]> {
    return this.costBases.get(this.getAddressKey(address)) || [];
  }

  async setCostBasis(costBasis: CostBasis): Promise<void> {
    const key = this.getAddressKey(costBasis.address);
    const bases = this.costBases.get(key) || [];

    // Find and update existing or add new
    const index = bases.findIndex((b) =>
      b.chainId === costBasis.chainId &&
      b.tokenAddress === costBasis.tokenAddress
    );

    if (index >= 0) {
      bases[index] = costBasis;
    } else {
      bases.push(costBasis);
    }

    this.costBases.set(key, bases);
  }

  async addAcquisition(
    address: Address,
    chainId: ChainId,
    tokenAddress: Address | string,
    symbol: string,
    acquisition: Acquisition
  ): Promise<CostBasis> {
    let costBasis = await this.getCostBasis(address, chainId, tokenAddress);

    if (!costBasis) {
      costBasis = {
        address,
        tokenAddress,
        chainId,
        symbol,
        totalCost: 0,
        totalQuantity: '0',
        averageCostPerUnit: 0,
        acquisitions: [],
      };
    }

    // Add acquisition
    costBasis.acquisitions.push(acquisition);

    // Recalculate totals
    let totalCost = 0;
    let totalQuantity = BigInt(0);

    for (const acq of costBasis.acquisitions) {
      totalCost += acq.costUsd;
      totalQuantity += BigInt(acq.quantity);
    }

    costBasis.totalCost = totalCost;
    costBasis.totalQuantity = totalQuantity.toString();
    costBasis.averageCostPerUnit = totalQuantity > 0n
      ? totalCost / Number(totalQuantity)
      : 0;

    await this.setCostBasis(costBasis);
    return costBasis;
  }

  // ============ Utility Methods ============

  async clearHistory(address: Address): Promise<void> {
    const key = this.getAddressKey(address);
    this.snapshots.delete(key);
    this.costBases.delete(key);
  }

  async exportData(address: Address): Promise<{
    snapshots: PortfolioSnapshot[];
    costBases: CostBasis[];
  }> {
    return {
      snapshots: await this.getSnapshots(address),
      costBases: await this.getAllCostBases(address),
    };
  }

  async importData(
    address: Address,
    data: {
      snapshots?: PortfolioSnapshot[];
      costBases?: CostBasis[];
    }
  ): Promise<void> {
    const key = this.getAddressKey(address);

    if (data.snapshots) {
      this.snapshots.set(key, data.snapshots);
    }

    if (data.costBases) {
      this.costBases.set(key, data.costBases);
    }
  }
}

export const historyStore = new HistoryStore();
