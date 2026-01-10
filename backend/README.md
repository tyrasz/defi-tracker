# DeFi Tracker Backend

Express.js backend for the DeFi Portfolio Tracker with in-memory caching.

## Features

- Multi-chain EVM balance fetching (ETH, Arbitrum, Optimism, Base, Polygon, Avalanche, BSC)
- Solana balance fetching
- CoinGecko price integration with rate limiting
- In-memory caching to reduce API calls
- No timeout limits (unlike serverless)

## Local Development

```bash
cd backend
npm install
npm run dev
```

Server runs on http://localhost:3001

## API Endpoints

### GET /health
Health check with cache stats.

### GET /api/portfolio/:address
Fetch wallet balances for an address.

**Query params:**
- `chains` - Comma-separated chain IDs (e.g., `1,42161,10`)

**Examples:**
```bash
# EVM address (all chains)
curl http://localhost:3001/api/portfolio/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

# EVM address (specific chains)
curl "http://localhost:3001/api/portfolio/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?chains=1,42161"

# Solana address
curl http://localhost:3001/api/portfolio/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN
```

### GET /api/cache/stats
View cache statistics.

### POST /api/cache/clear
Clear the cache.

## Deploy to Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repo
3. Set:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Deploy!

Or use the `render.yaml` blueprint for automatic configuration.

## Environment Variables

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

## Chain IDs

| Chain | ID |
|-------|-----|
| Ethereum | 1 |
| Arbitrum | 42161 |
| Optimism | 10 |
| Base | 8453 |
| Polygon | 137 |
| Avalanche | 43114 |
| BSC | 56 |
