// Simple in-memory fixed-window rate limiter. Good enough for a single
// long-running container; resets on deploy/restart, which is fine for
// slowing down brute-force attempts against admin login / access codes.
const buckets = new Map();

export function rateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.start > windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return { ok: true };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfterMs: windowMs - (now - bucket.start) };
  }
  return { ok: true };
}

export function clientKey(req) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}
