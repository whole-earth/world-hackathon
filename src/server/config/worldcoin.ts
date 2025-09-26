import 'server-only'

type AppId = `app_${string}`

// Lightweight validators (no runtime deps)
function isValidAppId(value: string | undefined | null): value is AppId {
  if (!value) return false
  if (!value.startsWith('app_')) return false
  // Known App IDs are long, hex-like. Keep it permissive but non-empty after prefix.
  return value.length > 4
}

function normalizeAction(value: string | undefined | null): string {
  const v = (value ?? '').trim()
  return v.length > 0 ? v : 'voting-action'
}

function isValidActionSlug(value: string): boolean {
  // Lowercase slug with hyphens; at least 3 chars
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length >= 3
}

let cached: { appId?: AppId; action: string } | null = null

export function getWorldcoinServerConfig() {
  if (cached) return cached

  const rawAppId = process.env.APP_ID
  const appId = isValidAppId(rawAppId) ? (rawAppId as AppId) : undefined

  const action = normalizeAction(process.env.NEXT_PUBLIC_WORLD_ACTION)
  const safeAction = isValidActionSlug(action) ? action : 'voting-action'

  cached = { appId, action: safeAction }
  return cached
}

export function ensureWorldcoinAppId(): AppId {
  const { appId } = getWorldcoinServerConfig()
  if (!appId) {
    const details = [
      'Missing or invalid Worldcoin APP_ID.',
      'Set APP_ID in your server environment (e.g., .env.local).',
      'Example: APP_ID=app_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    ].join(' ')
    throw new Error(details)
  }
  return appId
}

