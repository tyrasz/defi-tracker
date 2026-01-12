// In-memory rate limiting middleware using token bucket algorithm

import type { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
}

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

// Store rate limit state per IP
const rateLimiters = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes

  for (const [key, entry] of rateLimiters.entries()) {
    if (now - entry.lastRefill > maxAge) {
      rateLimiters.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Creates a rate limiting middleware using token bucket algorithm
 *
 * @param config - Rate limit configuration
 * @returns Express middleware function
 */
export function rateLimit(config: RateLimitConfig) {
  const { windowMs, maxRequests } = config;
  const refillRate = maxRequests / windowMs; // tokens per ms

  return (req: Request, res: Response, next: NextFunction) => {
    // Get client IP (handle proxy)
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : req.ip || req.socket.remoteAddress || 'unknown';

    const key = `rate:${ip}`;
    const now = Date.now();

    // Get or create limiter for this IP
    let limiter = rateLimiters.get(key);
    if (!limiter) {
      limiter = { tokens: maxRequests, lastRefill: now };
      rateLimiters.set(key, limiter);
    }

    // Refill tokens based on elapsed time
    const elapsed = now - limiter.lastRefill;
    limiter.tokens = Math.min(maxRequests, limiter.tokens + elapsed * refillRate);
    limiter.lastRefill = now;

    // Check if request can proceed
    if (limiter.tokens < 1) {
      const retryAfter = Math.ceil((1 - limiter.tokens) / refillRate / 1000);

      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', (now + retryAfter * 1000).toString());
      res.setHeader('Retry-After', retryAfter.toString());

      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter,
      });
    }

    // Consume a token
    limiter.tokens -= 1;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.floor(limiter.tokens).toString());
    res.setHeader('X-RateLimit-Reset', (now + windowMs).toString());

    next();
  };
}

/**
 * Default rate limit configurations
 */
export const rateLimitConfigs = {
  // Standard API endpoints - 30 requests per minute
  standard: { windowMs: 60 * 1000, maxRequests: 30 },

  // Heavy endpoints (portfolio fetch) - 10 requests per minute
  heavy: { windowMs: 60 * 1000, maxRequests: 10 },

  // Light endpoints (health check) - 60 requests per minute
  light: { windowMs: 60 * 1000, maxRequests: 60 },
};
