import { NextRequest, NextResponse } from 'next/server';
import { LRUCache } from 'lru-cache';

interface RateLimitConfig {
  interval: number; // ms
  maxRequests: number;
}

const cache = new LRUCache<string, number[]>({
  max: 10000,
  ttl: 300000, // 5 minutes
});

export function rateLimit(config: RateLimitConfig) {
  return async function (request: NextRequest): Promise<NextResponse | null> {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';

    const key = `${ip}:${request.nextUrl.pathname}`;
    const now = Date.now();
    const windowStart = now - config.interval;

    const requests = cache.get(key) || [];
    const validRequests = requests.filter((time) => time > windowStart);

    if (validRequests.length >= config.maxRequests) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }

    validRequests.push(now);
    cache.set(key, validRequests);

    return null;
  };
}

export const rateLimiters = {
  login: rateLimit({ interval: 60000, maxRequests: 5 }), // 5 per minute
  api: rateLimit({ interval: 60000, maxRequests: 30 }), // 30 per minute
  upload: rateLimit({ interval: 60000, maxRequests: 10 }), // 10 per minute
};
