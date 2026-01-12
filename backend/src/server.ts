import express from 'express';
import cors from 'cors';
import portfolioRouter from './routes/portfolio';
import { cache } from './cache/memory-cache';
import { rateLimit, rateLimitConfigs } from './middleware/rate-limit';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Trust proxy for correct IP detection behind reverse proxy
app.set('trust proxy', 1);

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Routes with rate limiting
app.use('/api/portfolio', rateLimit(rateLimitConfigs.standard), portfolioRouter);

// Health check
app.get('/health', (req, res) => {
  const cacheStats = cache.stats();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cache: {
      entries: cacheStats.size,
    },
  });
});

// Cache stats endpoint (with light rate limiting)
app.get('/api/cache/stats', rateLimit(rateLimitConfigs.light), (req, res) => {
  res.json(cache.stats());
});

// Clear cache endpoint (with heavy rate limiting - be careful in production)
app.post('/api/cache/clear', rateLimit(rateLimitConfigs.heavy), (req, res) => {
  cache.clear();
  res.json({ success: true, message: 'Cache cleared' });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DeFi Tracker Backend running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Portfolio: http://localhost:${PORT}/api/portfolio/:address`);
});
