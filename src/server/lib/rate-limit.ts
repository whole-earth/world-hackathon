import 'server-only'

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function assertRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }
  if (bucket.count >= limit) {
    const waitMs = Math.max(0, bucket.resetAt - now)
    const err = new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitMs / 1000)}s.`)
    // @ts-expect-error attach http status
    err.statusCode = 429
    throw err
  }
  bucket.count += 1
}

