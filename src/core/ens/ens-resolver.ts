import type { Address, PublicClient } from 'viem';
import { normalize } from 'viem/ens';
import { chainRegistry } from '@/chains';

// Cache ENS resolutions
interface EnsCache {
  address: Address;
  timestamp: number;
}

const ENS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

class EnsResolver {
  private cache: Map<string, EnsCache> = new Map();

  /**
   * Check if a string looks like an ENS name
   */
  isEnsName(input: string): boolean {
    return input.endsWith('.eth') || input.includes('.');
  }

  /**
   * Check if a string is a valid Ethereum address
   */
  isValidAddress(input: string): input is Address {
    return /^0x[a-fA-F0-9]{40}$/.test(input);
  }

  /**
   * Resolve an ENS name to an address
   * Uses Ethereum mainnet for ENS resolution
   */
  async resolveEns(name: string): Promise<Address | null> {
    // Check cache first
    const normalizedName = name.toLowerCase();
    const cached = this.cache.get(normalizedName);
    if (cached && Date.now() - cached.timestamp < ENS_CACHE_TTL) {
      return cached.address;
    }

    try {
      // Use Ethereum mainnet for ENS resolution (ENS only exists on mainnet)
      const client = chainRegistry.getClient(1);

      // Normalize the ENS name to handle special characters
      const normalized = normalize(name);

      const address = await client.getEnsAddress({
        name: normalized,
      });

      if (address) {
        this.cache.set(normalizedName, {
          address,
          timestamp: Date.now(),
        });
        return address;
      }

      return null;
    } catch (error) {
      console.error(`Error resolving ENS name "${name}":`, error);
      return null;
    }
  }

  /**
   * Get the ENS name for an address (reverse resolution)
   */
  async getEnsName(address: Address): Promise<string | null> {
    try {
      const client = chainRegistry.getClient(1);

      const name = await client.getEnsName({
        address,
      });

      return name;
    } catch (error) {
      console.error(`Error getting ENS name for "${address}":`, error);
      return null;
    }
  }

  /**
   * Get ENS avatar URL for an address or name
   */
  async getEnsAvatar(nameOrAddress: string): Promise<string | null> {
    try {
      const client = chainRegistry.getClient(1);

      // If it's an address, first get the ENS name
      let name: string | null = nameOrAddress;
      if (this.isValidAddress(nameOrAddress)) {
        name = await this.getEnsName(nameOrAddress);
        if (!name) return null;
      }

      const avatar = await client.getEnsAvatar({
        name: normalize(name),
      });

      return avatar;
    } catch (error) {
      console.error(`Error getting ENS avatar for "${nameOrAddress}":`, error);
      return null;
    }
  }

  /**
   * Resolve input to address - handles both ENS names and raw addresses
   */
  async resolveToAddress(input: string): Promise<{
    address: Address | null;
    ensName: string | null;
    isEns: boolean;
  }> {
    const trimmedInput = input.trim();

    // If it's already a valid address
    if (this.isValidAddress(trimmedInput)) {
      // Try to get the ENS name for display
      const ensName = await this.getEnsName(trimmedInput);
      return {
        address: trimmedInput,
        ensName,
        isEns: false,
      };
    }

    // If it looks like an ENS name
    if (this.isEnsName(trimmedInput)) {
      const address = await this.resolveEns(trimmedInput);
      return {
        address,
        ensName: address ? trimmedInput : null,
        isEns: true,
      };
    }

    // Invalid input
    return {
      address: null,
      ensName: null,
      isEns: false,
    };
  }

  /**
   * Batch resolve multiple ENS names
   */
  async batchResolve(names: string[]): Promise<Map<string, Address | null>> {
    const results = new Map<string, Address | null>();

    // Process in parallel with Promise.allSettled
    const promises = names.map(async (name) => {
      const result = await this.resolveToAddress(name);
      return { name, address: result.address };
    });

    const settled = await Promise.allSettled(promises);

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.set(result.value.name, result.value.address);
      } else {
        // Log error but continue
        console.error('Failed to resolve name:', result.reason);
      }
    }

    return results;
  }

  /**
   * Clear the ENS cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const ensResolver = new EnsResolver();
