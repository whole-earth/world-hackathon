"use server"

import type { ISuccessResult } from '@worldcoin/minikit-js'
import { verifyWorldcoinProof } from '@/server/services'
import { headers } from 'next/headers'
import { assertRateLimit } from '@/server/lib/rate-limit'
import { setWorldNullifierCookie } from '@/server/lib/cookies'
import { isWorldcoinMockEnabled } from '@/server/config/worldcoin'
import type { VerifyActionInput, VerifyActionResult } from '@/types'

export async function verifyWorldcoinAction(input: VerifyActionInput): Promise<VerifyActionResult> {
  // Basic schema checks (no external deps)
  const isMock = isWorldcoinMockEnabled()
  if (!isMock) {
    if (!input.payload) throw new Error('Missing payload')
    const p = input.payload as Partial<ISuccessResult>
    if (!p.nullifier_hash || !p.merkle_root || !p.proof) {
      throw new Error('Invalid payload: expected nullifier_hash, merkle_root, proof')
    }
  } else if (!input.payload && !input.nullifier_hash) {
    throw new Error('In mock mode, provide nullifier_hash or payload')
  }

  // Rate limit per IP
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  assertRateLimit(`verify:${ip}`, 10, 60_000) // 10/min per IP

  const res = await verifyWorldcoinProof(input)
  if (res?.nullifier_hash) {
    await setWorldNullifierCookie(res.nullifier_hash)
  }
  return { ok: true, ...res }
}
