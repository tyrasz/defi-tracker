'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAddress } from 'viem';

export default function Home() {
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const isEnsName = (input: string): boolean => {
    return input.endsWith('.eth') || (input.includes('.') && !input.startsWith('0x'));
  };

  const isSolanaAddress = (input: string): boolean => {
    // Solana addresses are base58 encoded, 32-44 chars, no 0x prefix
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(input);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedAddress = address.trim();

    if (!trimmedAddress) {
      setError('Please enter an address or ENS name');
      return;
    }

    if (!isAddress(trimmedAddress) && !isEnsName(trimmedAddress) && !isSolanaAddress(trimmedAddress)) {
      setError('Invalid Ethereum address, ENS name, or Solana address');
      return;
    }

    router.push(`/dashboard/${trimmedAddress}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">DeFi Portfolio Tracker</h1>
        <p className="text-gray-400 text-lg">
          Track your positions across DeFi protocols and discover yield
          optimization opportunities
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
        <div className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="address"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Wallet Address (EVM, Solana, or ENS)
            </label>
            <input
              type="text"
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x..., vitalik.eth, or Solana address"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg
                       text-white placeholder-gray-500 focus:outline-none focus:ring-2
                       focus:ring-blue-500 focus:border-transparent"
            />
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white
                     font-medium rounded-lg transition-colors"
          >
            Track Portfolio
          </button>
        </div>
      </form>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
          <h3 className="text-lg font-semibold mb-2">Multi-Chain</h3>
          <p className="text-gray-400 text-sm">
            Track across Ethereum, Arbitrum, Optimism, Base, Polygon, Avalanche, BSC, and Solana
          </p>
        </div>
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
          <h3 className="text-lg font-semibold mb-2">19 Protocols</h3>
          <p className="text-gray-400 text-sm">
            DeFi, RWA, and tokenized securities including Aave, Lido, Pendle, Ondo, and more
          </p>
        </div>
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
          <h3 className="text-lg font-semibold mb-2">Yield Analysis</h3>
          <p className="text-gray-400 text-sm">
            Find suboptimal positions and better yield opportunities
          </p>
        </div>
      </div>

      <div className="mt-12 p-6 bg-gray-900 rounded-lg border border-gray-800">
        <h3 className="text-lg font-semibold mb-4">API Access</h3>
        <p className="text-gray-400 text-sm mb-4">
          Get JSON responses for programmatic access:
        </p>
        <div className="space-y-2 font-mono text-sm">
          <div className="p-3 bg-gray-950 rounded border border-gray-800">
            <span className="text-green-400">GET</span>{' '}
            <span className="text-gray-300">
              /api/v1/portfolio/[address]
            </span>
          </div>
          <div className="p-3 bg-gray-950 rounded border border-gray-800">
            <span className="text-green-400">GET</span>{' '}
            <span className="text-gray-300">
              /api/v1/yield-analysis/[address]
            </span>
          </div>
          <div className="p-3 bg-gray-950 rounded border border-gray-800">
            <span className="text-green-400">GET</span>{' '}
            <span className="text-gray-300">/api/v1/health</span>
          </div>
        </div>
      </div>
    </div>
  );
}
