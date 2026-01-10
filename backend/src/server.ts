import express from 'express';
import cors from 'cors';
import portfolioRouter from './routes/portfolio';
import { cache } from './cache/memory-cache';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Routes
app.use('/api/portfolio', portfolioRouter);

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

// Cache stats endpoint
app.get('/api/cache/stats', (req, res) => {
  res.json(cache.stats());
});

// Clear cache endpoint (be careful in production)
app.post('/api/cache/clear', (req, res) => {
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
