import 'server-only'

import type { ISuccessResult } from '@worldcoin/minikit-js'
import { getWorldNullifierFromCookie, setWorldNullifierCookie } from '@/server/lib/cookies'
import { verifyWorldcoinProof } from '@/server/services'
import { isWorldcoinMockEnabled } from '@/server/config/worldcoin'

export type EnsureVerifyInput = {
  payload?: ISuccessResult
  nullifier_hash?: string
  action?: string
  signal?: string
  /**
   * When true (default), in mock mode a missing cookie will auto-generate a mock nullifier.
   * When false, in mock mode a missing cookie will NOT auto-verify and will throw instead.
   * Use false for SSR/page guards that should not create sessions implicitly.
   */
  allowAutoMock?: boolean
}

export type EnsureVerifyResult = { nullifier_hash: string; source: 'cookie' | 'proof' | 'mock' }

export async function ensureVerifiedNullifier(input: EnsureVerifyInput): Promise<EnsureVerifyResult> {
  const cookieNh = await getWorldNullifierFromCookie()
  
  if (cookieNh) {
    // Already verified in this browser session
    return { nullifier_hash: cookieNh, source: 'cookie' }
  }

  const isMock = isWorldcoinMockEnabled()

  if (isMock) {
    const nh = input.payload?.nullifier_hash || input.nullifier_hash
    if (nh) {
      await setWorldNullifierCookie(nh)
      return { nullifier_hash: nh, source: 'mock' }
    }
    // Only auto-verify in mock if allowed
    const allowAuto = input.allowAutoMock !== false
    if (!allowAuto) {
      throw new Error('Not verified')
    }
    const autoNh = 'dev-nullifier'
    await setWorldNullifierCookie(autoNh)
    return { nullifier_hash: autoNh, source: 'mock' }
  }

  // Production path: verify proof with Worldcoin
  const res = await verifyWorldcoinProof(input)
  await setWorldNullifierCookie(res.nullifier_hash)
  return { nullifier_hash: res.nullifier_hash, source: 'proof' }
}
