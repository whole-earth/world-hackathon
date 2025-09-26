import 'server-only'

import type { ISuccessResult } from '@worldcoin/minikit-js'
import { getWorldNullifierFromCookie, setWorldNullifierCookie } from '@/server/lib/cookies'
import { verifyWorldcoinProof } from '@/server/services'

export type EnsureVerifyInput = {
  payload?: ISuccessResult
  nullifier_hash?: string
  action?: string
  signal?: string
}

export type EnsureVerifyResult = { nullifier_hash: string; source: 'cookie' | 'proof' | 'mock' }

export async function ensureVerifiedNullifier(input: EnsureVerifyInput): Promise<EnsureVerifyResult> {
  const cookieNh = await getWorldNullifierFromCookie()
  if (cookieNh) {
    // Already verified in this browser session
    return { nullifier_hash: cookieNh, source: 'cookie' }
  }

  const isMock = String(process.env.WORLDCOIN_VERIFY_MOCK || '').toLowerCase() === 'true'

  if (isMock) {
    const nh = input.payload?.nullifier_hash || input.nullifier_hash
    if (!nh) throw new Error('Missing nullifier_hash (mock)')
    await setWorldNullifierCookie(nh)
    return { nullifier_hash: nh, source: 'mock' }
  }

  // Production path: verify proof with Worldcoin
  const res = await verifyWorldcoinProof(input)
  await setWorldNullifierCookie(res.nullifier_hash)
  return { nullifier_hash: res.nullifier_hash, source: 'proof' }
}
