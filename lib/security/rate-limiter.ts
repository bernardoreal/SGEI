import { NextRequest } from 'next/server';

/**
 * Enterprise Rate Limiter (Edge-Compatible)
 * 
 * Simple Memory-based Sliding Window for Edge Functions.
 * Note: For distributed environments, a Redis store (like Upstash) is recommended.
 * This implementation protects against burst attacks on single-container instances.
 */

interface RateLimitTracker {
  count: number;
  resetTime: number;
}

const windowSizeMs = 60 * 1000; // 1 minute
const maxRequestsPerWindow = 50; // Standard threshold
const maxLoginAttempts = 5; // Stricter threshold for Auth routes

// In-memory store (Isolated per Edge Container)
const ipCache = new Map<string, RateLimitTracker>();

export function checkRateLimit(req: NextRequest, routeType: 'STANDARD' | 'AUTH' = 'STANDARD'): { allowed: boolean, remaining: number } {
  // Try to get IP from headers (Cloud Run / Vercel inject this)
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const limit = routeType === 'AUTH' ? maxLoginAttempts : maxRequestsPerWindow;
  
  const now = Date.now();
  const record = ipCache.get(ip);

  // If no record or inside a clean window
  if (!record || now > record.resetTime) {
    ipCache.set(ip, {
      count: 1,
      resetTime: now + windowSizeMs
    });
    return { allowed: true, remaining: limit - 1 };
  }

  // If inside window but under limit
  if (record.count < limit) {
    record.count += 1;
    ipCache.set(ip, record);
    return { allowed: true, remaining: limit - record.count };
  }

  // Rate limit exceeded
  return { allowed: false, remaining: 0 };
}
