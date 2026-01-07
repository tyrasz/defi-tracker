import type { Address } from 'viem';
import type { ChainId } from '@/types/chain';

export interface TokenInfo {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  coingeckoId?: string; // For price lookups
  category?: 'stablecoin' | 'defi' | 'meme' | 'layer2' | 'gaming' | 'ai' | 'rwa' | 'lsd' | 'governance';
}

// Ethereum Mainnet tokens
const ETHEREUM_TOKENS: TokenInfo[] = [
  // Major tokens
  { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, coingeckoId: 'weth' },
  { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, coingeckoId: 'wrapped-bitcoin' },

  // Stablecoins
  { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', decimals: 6, coingeckoId: 'usd-coin', category: 'stablecoin' },
  { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether', decimals: 6, coingeckoId: 'tether', category: 'stablecoin' },
  { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', name: 'Dai', decimals: 18, coingeckoId: 'dai', category: 'stablecoin' },
  { address: '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3', symbol: 'USDe', name: 'Ethena USDe', decimals: 18, coingeckoId: 'ethena-usde', category: 'stablecoin' },
  { address: '0xdC035D45d973E3EC169d2276DDab16f1e407384F', symbol: 'USDS', name: 'USDS', decimals: 18, coingeckoId: 'usds', category: 'stablecoin' },
  { address: '0x853d955aCEf822Db058eb8505911ED77F175b99e', symbol: 'FRAX', name: 'Frax', decimals: 18, coingeckoId: 'frax', category: 'stablecoin' },
  { address: '0x5f98805A4E8be255a32880FDeC7F6728C6568bA0', symbol: 'LUSD', name: 'Liquity USD', decimals: 18, coingeckoId: 'liquity-usd', category: 'stablecoin' },
  { address: '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51', symbol: 'sUSD', name: 'Synthetix USD', decimals: 18, coingeckoId: 'susd', category: 'stablecoin' },
  { address: '0x8E870D67F660D95d5be530380D0eC0bd388289E1', symbol: 'USDP', name: 'Pax Dollar', decimals: 18, coingeckoId: 'paxos-standard', category: 'stablecoin' },
  { address: '0x0000000000085d4780B73119b644AE5ecd22b376', symbol: 'TUSD', name: 'TrueUSD', decimals: 18, coingeckoId: 'true-usd', category: 'stablecoin' },
  { address: '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c', symbol: 'EURC', name: 'Euro Coin', decimals: 6, coingeckoId: 'euro-coin', category: 'stablecoin' },

  // Liquid Staking Derivatives
  { address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', symbol: 'stETH', name: 'Lido Staked ETH', decimals: 18, coingeckoId: 'staked-ether', category: 'lsd' },
  { address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', symbol: 'wstETH', name: 'Wrapped stETH', decimals: 18, coingeckoId: 'wrapped-steth', category: 'lsd' },
  { address: '0xae78736Cd615f374D3085123A210448E74Fc6393', symbol: 'rETH', name: 'Rocket Pool ETH', decimals: 18, coingeckoId: 'rocket-pool-eth', category: 'lsd' },
  { address: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704', symbol: 'cbETH', name: 'Coinbase Wrapped Staked ETH', decimals: 18, coingeckoId: 'coinbase-wrapped-staked-eth', category: 'lsd' },
  { address: '0xf951E335afb289353dc249e82926178EaC7DEd78', symbol: 'swETH', name: 'Swell ETH', decimals: 18, coingeckoId: 'sweth', category: 'lsd' },
  { address: '0xA35b1B31Ce002FBF2058D22F30f95D405200A15b', symbol: 'ETHx', name: 'Stader ETHx', decimals: 18, coingeckoId: 'stader-ethx', category: 'lsd' },
  { address: '0xFAe103DC9cf190eD75350761e95403b7b8aFa6c0', symbol: 'rswETH', name: 'Restaked Swell ETH', decimals: 18, coingeckoId: 'rsweth', category: 'lsd' },
  { address: '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee', symbol: 'weETH', name: 'Wrapped eETH', decimals: 18, coingeckoId: 'wrapped-eeth', category: 'lsd' },
  { address: '0xA1290d69c65A6Fe4DF752f95823fae25cB99e5A7', symbol: 'rsETH', name: 'Kelp rsETH', decimals: 18, coingeckoId: 'kelp-dao-restaked-eth', category: 'lsd' },
  { address: '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497', symbol: 'sUSDe', name: 'Staked USDe', decimals: 18, coingeckoId: 'ethena-staked-usde', category: 'lsd' },

  // DeFi tokens
  { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', symbol: 'AAVE', name: 'Aave', decimals: 18, coingeckoId: 'aave', category: 'defi' },
  { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', name: 'Uniswap', decimals: 18, coingeckoId: 'uniswap', category: 'defi' },
  { address: '0xD533a949740bb3306d119CC777fa900bA034cd52', symbol: 'CRV', name: 'Curve DAO', decimals: 18, coingeckoId: 'curve-dao-token', category: 'defi' },
  { address: '0xc00e94Cb662C3520282E6f5717214004A7f26888', symbol: 'COMP', name: 'Compound', decimals: 18, coingeckoId: 'compound-governance-token', category: 'defi' },
  { address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', symbol: 'MKR', name: 'Maker', decimals: 18, coingeckoId: 'maker', category: 'defi' },
  { address: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F', symbol: 'SNX', name: 'Synthetix', decimals: 18, coingeckoId: 'havven', category: 'defi' },
  { address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', symbol: 'LDO', name: 'Lido DAO', decimals: 18, coingeckoId: 'lido-dao', category: 'defi' },
  { address: '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B', symbol: 'CVX', name: 'Convex Finance', decimals: 18, coingeckoId: 'convex-finance', category: 'defi' },
  { address: '0xBA100000625a3754423978a60c9317c58a424e3D', symbol: 'BAL', name: 'Balancer', decimals: 18, coingeckoId: 'balancer', category: 'defi' },
  { address: '0x6DEA81C8171D0bA574754EF6F8b412F2Ed88c54D', symbol: 'LQTY', name: 'Liquity', decimals: 18, coingeckoId: 'liquity', category: 'defi' },
  { address: '0x111111111117dC0aa78b770fA6A738034120C302', symbol: '1INCH', name: '1inch', decimals: 18, coingeckoId: '1inch', category: 'defi' },
  { address: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2', symbol: 'SUSHI', name: 'SushiSwap', decimals: 18, coingeckoId: 'sushi', category: 'defi' },
  { address: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e', symbol: 'YFI', name: 'yearn.finance', decimals: 18, coingeckoId: 'yearn-finance', category: 'defi' },
  { address: '0x808507121B80c02388fAd14726482e061B8da827', symbol: 'PENDLE', name: 'Pendle', decimals: 18, coingeckoId: 'pendle', category: 'defi' },
  { address: '0xec53bF9167f50cDEB3Ae105f56099aaaB9061F83', symbol: 'EIGEN', name: 'EigenLayer', decimals: 18, coingeckoId: 'eigenlayer', category: 'defi' },
  { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', symbol: 'ARB', name: 'Arbitrum', decimals: 18, coingeckoId: 'arbitrum', category: 'layer2' },
  { address: '0x4200000000000000000000000000000000000042', symbol: 'OP', name: 'Optimism', decimals: 18, coingeckoId: 'optimism', category: 'layer2' },

  // Major L1/L2 tokens
  { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK', name: 'Chainlink', decimals: 18, coingeckoId: 'chainlink' },
  { address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', symbol: 'MATIC', name: 'Polygon', decimals: 18, coingeckoId: 'matic-network' },
  { address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', symbol: 'SHIB', name: 'Shiba Inu', decimals: 18, coingeckoId: 'shiba-inu', category: 'meme' },
  { address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', symbol: 'PEPE', name: 'Pepe', decimals: 18, coingeckoId: 'pepe', category: 'meme' },

  // AI tokens
  { address: '0xFEF2e7938C99b36d55F22703E89448D239D75e6C', symbol: 'RNDR', name: 'Render', decimals: 18, coingeckoId: 'render-token', category: 'ai' },
  { address: '0x64Bc2cA1Be492bE7185FAA2c8835d9b824c8a194', symbol: 'OCEAN', name: 'Ocean Protocol', decimals: 18, coingeckoId: 'ocean-protocol', category: 'ai' },

  // Gaming
  { address: '0xF57e7e7C23978C3cAEC3C3548E3D615c346e79fF', symbol: 'IMX', name: 'Immutable', decimals: 18, coingeckoId: 'immutable-x', category: 'gaming' },
  { address: '0xBB0E17EF65F82Ab018d8EDd776e8DD940327B28b', symbol: 'AXS', name: 'Axie Infinity', decimals: 18, coingeckoId: 'axie-infinity', category: 'gaming' },
  { address: '0x15D4c048F83bd7e37d49eA4C83a07267Ec4203dA', symbol: 'GALA', name: 'Gala', decimals: 8, coingeckoId: 'gala', category: 'gaming' },
  { address: '0x3845badAde8e6dFF049820680d1F14bD3903a5d0', symbol: 'SAND', name: 'The Sandbox', decimals: 18, coingeckoId: 'the-sandbox', category: 'gaming' },
  { address: '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942', symbol: 'MANA', name: 'Decentraland', decimals: 18, coingeckoId: 'decentraland', category: 'gaming' },

  // RWA already in our system (for reference)
  { address: '0x96F6eF951840721AdBF46Ac996b59E0235CB985C', symbol: 'USDY', name: 'Ondo US Dollar Yield', decimals: 18, coingeckoId: 'ondo-us-dollar-yield', category: 'rwa' },
  { address: '0x59D9356E565Ab3A36dD77763Fc0d87fEaf85508C', symbol: 'USDM', name: 'Mountain Protocol USD', decimals: 18, coingeckoId: 'mountain-protocol-usdm', category: 'rwa' },
];

// Arbitrum tokens
const ARBITRUM_TOKENS: TokenInfo[] = [
  { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, coingeckoId: 'weth' },
  { address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, coingeckoId: 'wrapped-bitcoin' },

  // Stablecoins
  { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', name: 'USD Coin', decimals: 6, coingeckoId: 'usd-coin', category: 'stablecoin' },
  { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', symbol: 'USDC.e', name: 'Bridged USDC', decimals: 6, coingeckoId: 'usd-coin', category: 'stablecoin' },
  { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', name: 'Tether', decimals: 6, coingeckoId: 'tether', category: 'stablecoin' },
  { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', symbol: 'DAI', name: 'Dai', decimals: 18, coingeckoId: 'dai', category: 'stablecoin' },
  { address: '0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F', symbol: 'FRAX', name: 'Frax', decimals: 18, coingeckoId: 'frax', category: 'stablecoin' },
  { address: '0x5979D7b546E38E414F7E9822514be443A4800529', symbol: 'wstETH', name: 'Wrapped stETH', decimals: 18, coingeckoId: 'wrapped-steth', category: 'lsd' },
  { address: '0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8', symbol: 'rETH', name: 'Rocket Pool ETH', decimals: 18, coingeckoId: 'rocket-pool-eth', category: 'lsd' },

  // DeFi
  { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', symbol: 'ARB', name: 'Arbitrum', decimals: 18, coingeckoId: 'arbitrum', category: 'layer2' },
  { address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a', symbol: 'GMX', name: 'GMX', decimals: 18, coingeckoId: 'gmx', category: 'defi' },
  { address: '0x6694340fc020c5E6B96567843da2df01b2CE1eb6', symbol: 'STG', name: 'Stargate Finance', decimals: 18, coingeckoId: 'stargate-finance', category: 'defi' },
  { address: '0x539bdE0d7Dbd336b79148AA742883198BBF60342', symbol: 'MAGIC', name: 'Magic', decimals: 18, coingeckoId: 'magic', category: 'gaming' },
  { address: '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8', symbol: 'PENDLE', name: 'Pendle', decimals: 18, coingeckoId: 'pendle', category: 'defi' },
  { address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', symbol: 'LINK', name: 'Chainlink', decimals: 18, coingeckoId: 'chainlink' },
  { address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0', symbol: 'UNI', name: 'Uniswap', decimals: 18, coingeckoId: 'uniswap', category: 'defi' },
  { address: '0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978', symbol: 'CRV', name: 'Curve DAO', decimals: 18, coingeckoId: 'curve-dao-token', category: 'defi' },
];

// Optimism tokens
const OPTIMISM_TOKENS: TokenInfo[] = [
  { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, coingeckoId: 'weth' },
  { address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095', symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, coingeckoId: 'wrapped-bitcoin' },

  // Stablecoins
  { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC', name: 'USD Coin', decimals: 6, coingeckoId: 'usd-coin', category: 'stablecoin' },
  { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', symbol: 'USDC.e', name: 'Bridged USDC', decimals: 6, coingeckoId: 'usd-coin', category: 'stablecoin' },
  { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', symbol: 'USDT', name: 'Tether', decimals: 6, coingeckoId: 'tether', category: 'stablecoin' },
  { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', symbol: 'DAI', name: 'Dai', decimals: 18, coingeckoId: 'dai', category: 'stablecoin' },
  { address: '0x2E3D870790dC77A83DD1d18184Acc7439A53f475', symbol: 'FRAX', name: 'Frax', decimals: 18, coingeckoId: 'frax', category: 'stablecoin' },
  { address: '0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb', symbol: 'wstETH', name: 'Wrapped stETH', decimals: 18, coingeckoId: 'wrapped-steth', category: 'lsd' },
  { address: '0x9Bcef72be871e61ED4fBbc7630889beE758eb81D', symbol: 'rETH', name: 'Rocket Pool ETH', decimals: 18, coingeckoId: 'rocket-pool-eth', category: 'lsd' },

  // DeFi
  { address: '0x4200000000000000000000000000000000000042', symbol: 'OP', name: 'Optimism', decimals: 18, coingeckoId: 'optimism', category: 'layer2' },
  { address: '0x9e1028F5F1D5eDE59748FFceE5532509976840E0', symbol: 'PERP', name: 'Perpetual Protocol', decimals: 18, coingeckoId: 'perpetual-protocol', category: 'defi' },
  { address: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9', symbol: 'sUSD', name: 'Synthetix USD', decimals: 18, coingeckoId: 'susd', category: 'stablecoin' },
  { address: '0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6', symbol: 'LINK', name: 'Chainlink', decimals: 18, coingeckoId: 'chainlink' },
  { address: '0x6fd9d7AD17242c41f7131d257212c54A0e816691', symbol: 'UNI', name: 'Uniswap', decimals: 18, coingeckoId: 'uniswap', category: 'defi' },
  { address: '0xFdb794692724153d1488CcdBE0C56c252596735F', symbol: 'LDO', name: 'Lido DAO', decimals: 18, coingeckoId: 'lido-dao', category: 'defi' },
];

// Base tokens
const BASE_TOKENS: TokenInfo[] = [
  { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, coingeckoId: 'weth' },

  // Stablecoins
  { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USD Coin', decimals: 6, coingeckoId: 'usd-coin', category: 'stablecoin' },
  { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', symbol: 'USDbC', name: 'USD Base Coin', decimals: 6, coingeckoId: 'bridged-usd-coin-base', category: 'stablecoin' },
  { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', symbol: 'DAI', name: 'Dai', decimals: 18, coingeckoId: 'dai', category: 'stablecoin' },
  { address: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452', symbol: 'wstETH', name: 'Wrapped stETH', decimals: 18, coingeckoId: 'wrapped-steth', category: 'lsd' },
  { address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', symbol: 'cbETH', name: 'Coinbase Wrapped Staked ETH', decimals: 18, coingeckoId: 'coinbase-wrapped-staked-eth', category: 'lsd' },
  { address: '0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A', symbol: 'weETH', name: 'Wrapped eETH', decimals: 18, coingeckoId: 'wrapped-eeth', category: 'lsd' },

  // DeFi/Meme
  { address: '0x532f27101965dd16442E59d40670FaF5eBB142E4', symbol: 'BRETT', name: 'Brett', decimals: 18, coingeckoId: 'brett', category: 'meme' },
  { address: '0xfA980cEd6895AC314E7dE34Ef1bFAE90a5AdD21b', symbol: 'PRIME', name: 'Echelon Prime', decimals: 18, coingeckoId: 'echelon-prime', category: 'gaming' },
  { address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', symbol: 'AERO', name: 'Aerodrome', decimals: 18, coingeckoId: 'aerodrome-finance', category: 'defi' },
  { address: '0x22e6966B799c4D5B13BE962E1D117b56327FDa66', symbol: 'VIRTUAL', name: 'Virtual Protocol', decimals: 18, coingeckoId: 'virtual-protocol', category: 'ai' },
];

export const TOKEN_LISTS: Record<ChainId, TokenInfo[]> = {
  1: ETHEREUM_TOKENS,
  42161: ARBITRUM_TOKENS,
  10: OPTIMISM_TOKENS,
  8453: BASE_TOKENS,
};

export function getTokensForChain(chainId: ChainId): TokenInfo[] {
  return TOKEN_LISTS[chainId] || [];
}

export function getAllTokenAddresses(chainId: ChainId): Address[] {
  return getTokensForChain(chainId).map(t => t.address);
}

export function getTokenInfo(chainId: ChainId, address: Address): TokenInfo | undefined {
  const tokens = getTokensForChain(chainId);
  return tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
}
