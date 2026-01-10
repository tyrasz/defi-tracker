'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Portfolio } from '@/types/portfolio';
import type { YieldAnalysis } from '@/types/yield';
import type { WalletBalances } from '@/core/wallet';

interface PortfolioResponse {
  success: boolean;
  data: Portfolio & {
    yieldAnalysis: YieldAnalysis | null;
    walletBalances: WalletBalances | null;
  };
  error?: string;
  message?: string;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export default function DashboardPage() {
  const params = useParams();
  const address = params.address as string;
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Connecting to blockchains...');

  useEffect(() => {
    const controller = new AbortController();

    async function fetchPortfolio() {
      try {
        // Update loading messages
        const messages = [
          'Connecting to blockchains...',
          'Scanning Ethereum...',
          'Scanning L2 networks...',
          'Checking DeFi protocols...',
          'Fetching prices...',
        ];

        let messageIndex = 0;
        const messageInterval = setInterval(() => {
          messageIndex = (messageIndex + 1) % messages.length;
          setLoadingMessage(messages[messageIndex]);
        }, 3000);

        // Use external API if configured, otherwise use local API routes
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
        const apiUrl = apiBase
          ? `${apiBase}/api/portfolio/${address}`
          : `/api/v1/portfolio/${address}`;

        const res = await fetch(apiUrl, {
          signal: controller.signal,
        });

        clearInterval(messageInterval);

        const json = await res.json();

        if (!json.success) {
          setError(json.message || json.error || 'Failed to fetch portfolio');
        } else {
          setData(json);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setError('Failed to connect to API. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchPortfolio();

    return () => controller.abort();
  }, [address]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Portfolio Dashboard</h1>
          <p className="text-gray-400 font-mono text-sm">{address}</p>
        </div>

        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-400">{loadingMessage}</p>
          <p className="text-gray-500 text-sm mt-2">This may take up to a minute...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Portfolio Dashboard</h1>
          <p className="text-gray-400 font-mono text-sm">{address}</p>
        </div>

        <div className="p-6 bg-red-900/20 border border-red-800 rounded-lg">
          <h2 className="text-lg font-semibold text-red-400">Error</h2>
          <p className="text-gray-300 mt-2">{error}</p>
          <Link
            href="/"
            className="inline-block mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
          >
            Try another address
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { data: portfolio } = data;

  // Handle empty portfolio (but still show wallet balances if any)
  if (!portfolio.positions || portfolio.positions.length === 0) {
    const hasWalletBalances =
      portfolio.walletBalances &&
      portfolio.walletBalances.balances.length > 0 &&
      portfolio.walletBalances.totalValueUsd > 0;

    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Portfolio Dashboard</h1>
          <p className="text-gray-400 font-mono text-sm">{address}</p>
        </div>

        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
            <svg
              className="w-8 h-8 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">No DeFi Positions Found</h2>
          <p className="text-gray-400 max-w-md mx-auto mb-6">
            This address doesn&apos;t have any positions in the supported protocols
            (Aave, Compound, Lido, Rocket Pool, Uniswap V3, Curve, Yearn).
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              Try another address
            </Link>
            <a
              href={`https://etherscan.io/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
            >
              View on Etherscan
            </a>
          </div>
        </div>

        {/* Show wallet balances even without DeFi positions */}
        {hasWalletBalances && portfolio.walletBalances && (
          <div className="mb-8 p-6 bg-gray-900 rounded-lg border border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Idle Wallet Balances</h2>
              <p className="text-lg font-semibold text-yellow-400">
                {formatUsd(portfolio.walletBalances.totalValueUsd)}
              </p>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              You have assets that could be earning yield in DeFi protocols
            </p>

            <div className="space-y-4">
              {portfolio.walletBalances.balances.map((chainBalance) => (
                <div
                  key={chainBalance.chainId}
                  className="p-4 bg-gray-950 rounded border border-gray-800"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium">{chainBalance.chainName}</h3>
                    <span className="text-sm text-gray-400">
                      {formatUsd(chainBalance.totalValueUsd)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {chainBalance.balances.map((token) => (
                      <div
                        key={`${chainBalance.chainId}-${token.symbol}`}
                        className="flex justify-between items-center py-2 border-t border-gray-800 first:border-t-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{token.symbol}</span>
                          <span className="text-sm text-gray-400">
                            {parseFloat(token.balanceFormatted).toLocaleString(undefined, {
                              maximumFractionDigits: 4,
                            })}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatUsd(token.valueUsd)}</p>
                          {token.symbol === 'ETH' && (
                            <p className="text-xs text-blue-400">
                              Stake on Lido for ~3.5% APY
                            </p>
                          )}
                          {['USDC', 'USDT', 'DAI', 'USDC.E', 'USDBC'].includes(token.symbol) && (
                            <p className="text-xs text-blue-400">
                              Supply on Aave for ~3-5% APY
                            </p>
                          )}
                          {['WETH', 'WBTC', 'LINK', 'UNI', 'AAVE', 'CRV', 'MKR', 'SNX', 'COMP'].includes(token.symbol) && (
                            <p className="text-xs text-blue-400">
                              Supply on Aave for yield
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-green-900/20 border border-green-800 rounded">
              <p className="text-sm text-green-300">
                <span className="font-medium">Get Started:</span> ETH and stablecoins in your wallet
                could be earning yield in DeFi protocols like Aave or Lido.
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 p-6 bg-gray-900 rounded-lg border border-gray-800">
          <h3 className="font-semibold mb-4">Supported Protocols</h3>

          <div className="mb-4">
            <h4 className="text-sm text-green-400 mb-2">Yield Earning</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-400">
              <div>Aave V3</div>
              <div>Compound V3</div>
              <div>Spark</div>
              <div>Morpho</div>
              <div>Lido</div>
              <div>Rocket Pool</div>
              <div>Yearn V3</div>
              <div>Convex</div>
              <div>Sky (Maker)</div>
              <div>EigenLayer</div>
              <div>Pendle</div>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-sm text-purple-400 mb-2">Real World Assets (RWA)</h4>
            <p className="text-xs text-gray-500 mb-2">Treasury-backed yield tokens</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-400">
              <div>Ondo (USDY, OUSG)</div>
              <div>Mountain (USDM)</div>
              <div>Backed (bIB01)</div>
              <div>Hashnote (USYC)</div>
              <div>Superstate (USTB)</div>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-sm text-yellow-400 mb-2">Tokenized Securities</h4>
            <p className="text-xs text-gray-500 mb-2">Tokenized stocks and ETFs</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-400">
              <div>Backed Stocks</div>
            </div>
          </div>

          <div>
            <h4 className="text-sm text-blue-400 mb-2">Position Tracking</h4>
            <p className="text-xs text-gray-500 mb-2">LP positions (earns fees, not yield)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-400">
              <div>Uniswap V3</div>
              <div>Curve</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Portfolio Dashboard</h1>
        <p className="text-gray-400 font-mono text-sm">{address}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
          <p className="text-sm text-gray-400 mb-1">Total Value</p>
          <p className="text-2xl font-bold">
            {formatUsd(portfolio.totalValueUsd)}
          </p>
        </div>
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
          <p className="text-sm text-gray-400 mb-1">Positions</p>
          <p className="text-2xl font-bold">{portfolio.positions.length}</p>
        </div>
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
          <p className="text-sm text-gray-400 mb-1">Protocols</p>
          <p className="text-2xl font-bold">
            {Object.keys(portfolio.byProtocol).length}
          </p>
        </div>
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
          <p className="text-sm text-gray-400 mb-1">Chains</p>
          <p className="text-2xl font-bold">
            {
              Object.values(portfolio.byChain).filter(
                (c) => c.positions.length > 0
              ).length
            }
          </p>
        </div>
      </div>

      {/* Yield Analysis */}
      {portfolio.yieldAnalysis && (
        <div className="mb-8 p-6 bg-gray-900 rounded-lg border border-gray-800">
          <h2 className="text-lg font-semibold mb-4">Yield Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-400">Current Annual Yield</p>
              <p className="text-xl font-semibold text-green-400">
                {formatUsd(portfolio.yieldAnalysis.totalCurrentYield)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Potential Annual Yield</p>
              <p className="text-xl font-semibold text-blue-400">
                {formatUsd(portfolio.yieldAnalysis.totalPotentialYield)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Optimization Opportunities</p>
              <p className="text-xl font-semibold">
                {portfolio.yieldAnalysis.opportunities.length}
              </p>
            </div>
          </div>

          {portfolio.yieldAnalysis.opportunities.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-400 mb-3">
                Top Opportunities
              </h3>
              <div className="space-y-3">
                {portfolio.yieldAnalysis.opportunities.slice(0, 3).map((opp, i) => (
                  <div
                    key={i}
                    className="p-4 bg-gray-950 rounded border border-gray-800"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {opp.currentPosition.tokens[0]?.symbol} on{' '}
                          {opp.currentPosition.protocol.name}
                        </p>
                        <p className="text-sm text-gray-400">
                          Current APY: {formatPercent(opp.currentPosition.yield?.apy || 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-semibold">
                          +{formatUsd(opp.potentialGainUsd)}/yr
                        </p>
                        <p className="text-sm text-gray-400">
                          Best: {formatPercent(opp.betterAlternatives[0]?.apy || 0)} on{' '}
                          {opp.betterAlternatives[0]?.protocolName}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Idle Wallet Balances */}
      {portfolio.walletBalances &&
        portfolio.walletBalances.balances.length > 0 &&
        portfolio.walletBalances.totalValueUsd > 0 && (
          <div className="mb-8 p-6 bg-gray-900 rounded-lg border border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Idle Wallet Balances</h2>
              <p className="text-lg font-semibold text-yellow-400">
                {formatUsd(portfolio.walletBalances.totalValueUsd)}
              </p>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              These tokens are sitting idle in your wallet and could be earning yield
            </p>

            <div className="space-y-4">
              {portfolio.walletBalances.balances.map((chainBalance) => (
                <div
                  key={chainBalance.chainId}
                  className="p-4 bg-gray-950 rounded border border-gray-800"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium">{chainBalance.chainName}</h3>
                    <span className="text-sm text-gray-400">
                      {formatUsd(chainBalance.totalValueUsd)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {chainBalance.balances.map((token) => (
                      <div
                        key={`${chainBalance.chainId}-${token.symbol}`}
                        className="flex justify-between items-center py-2 border-t border-gray-800 first:border-t-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{token.symbol}</span>
                          <span className="text-sm text-gray-400">
                            {parseFloat(token.balanceFormatted).toLocaleString(undefined, {
                              maximumFractionDigits: 4,
                            })}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatUsd(token.valueUsd)}</p>
                          {token.symbol === 'ETH' && (
                            <p className="text-xs text-blue-400">
                              Stake on Lido for ~3.5% APY
                            </p>
                          )}
                          {['USDC', 'USDT', 'DAI', 'USDC.E', 'USDBC'].includes(token.symbol) && (
                            <p className="text-xs text-blue-400">
                              Supply on Aave for ~3-5% APY
                            </p>
                          )}
                          {['WETH', 'WBTC', 'LINK', 'UNI', 'AAVE', 'CRV', 'MKR', 'SNX', 'COMP'].includes(token.symbol) && (
                            <p className="text-xs text-blue-400">
                              Supply on Aave for yield
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded">
              <p className="text-sm text-blue-300">
                <span className="font-medium">Tip:</span> ETH and stablecoins in your wallet
                could be earning yield in DeFi protocols like Aave or Lido.
              </p>
            </div>
          </div>
        )}

      {/* Positions by Protocol */}
      {Object.keys(portfolio.byProtocol).length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Positions by Protocol</h2>
          <div className="space-y-4">
            {Object.values(portfolio.byProtocol).map((protocol) => (
              <div
                key={protocol.protocolId}
                className="p-6 bg-gray-900 rounded-lg border border-gray-800"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">{protocol.protocolName}</h3>
                  <p className="text-lg">{formatUsd(protocol.totalValueUsd)}</p>
                </div>
                <div className="space-y-3">
                  {protocol.positions.map((position) => (
                    <div
                      key={position.id}
                      className="flex justify-between items-center p-4 bg-gray-950 rounded border border-gray-800"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm px-2 py-0.5 bg-gray-800 rounded">
                            {position.type}
                          </span>
                          <span className="font-medium">
                            {position.tokens.map((t) => t.symbol).join(' / ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          {position.tokens
                            .map((t) => `${t.balanceFormatted} ${t.symbol}`)
                            .join(' + ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatUsd(position.valueUsd)}</p>
                        {position.yield && (
                          <p className="text-sm text-green-400">
                            {formatPercent(position.yield.apy)} APY
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Positions by Chain */}
      {Object.values(portfolio.byChain).some((c) => c.positions.length > 0) && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Positions by Chain</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(portfolio.byChain)
              .filter((chain) => chain.positions.length > 0)
              .map((chain) => (
                <div
                  key={chain.chainId}
                  className="p-6 bg-gray-900 rounded-lg border border-gray-800"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">{chain.chainName}</h3>
                    <p>{formatUsd(chain.totalValueUsd)}</p>
                  </div>
                  <p className="text-sm text-gray-400">
                    {chain.positions.length} position
                    {chain.positions.length !== 1 ? 's' : ''}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <p className="text-center text-gray-500 text-sm mt-8">
        Last updated: {new Date(portfolio.fetchedAt).toLocaleString()}
      </p>
    </div>
  );
}
