import 'server-only'

type MiniKitTx = {
  transaction_id?: string
  reference?: string
  status?: string // failed | submitted | mined | confirmed | etc.
  token?: string // WLD | USDC
  token_amount?: string // on-chain amount as string
  to?: string
}

export async function getDeveloperPortalTransaction(transactionId: string, appId: string): Promise<MiniKitTx> {
  const apiKey = process.env.DEV_PORTAL_API_KEY
  if (!apiKey) throw new Error('Missing DEV_PORTAL_API_KEY')

  const url = `https://developer.worldcoin.org/api/v2/minikit/transaction/${encodeURIComponent(transactionId)}?app_id=${encodeURIComponent(appId)}`
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Developer Portal fetch failed (${res.status}): ${text || res.statusText}`)
  }
  const json = (await res.json()) as MiniKitTx
  return json
}

