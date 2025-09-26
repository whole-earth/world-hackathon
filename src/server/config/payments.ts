import 'server-only'

function isValidAddress(addr: string | undefined | null): addr is string {
  const a = (addr || '').trim()
  // Basic 0x address length check; keep permissive
  return a.startsWith('0x') && a.length >= 10
}

type PaymentsConfig = {
  toAddress: string
}

let cached: PaymentsConfig | null = null

export function getPaymentsServerConfig(): PaymentsConfig {
  if (cached) return cached
  const to = process.env.WORLD_PAY_TO_ADDRESS
  if (!isValidAddress(to)) {
    throw new Error('Missing or invalid WORLD_PAY_TO_ADDRESS in server environment')
  }
  cached = { toAddress: to }
  return cached
}
