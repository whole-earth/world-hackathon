"use server"

import { clearWorldNullifierCookie } from '@/server/lib/cookies'

export async function clearSessionAction(): Promise<{ ok: true }> {
  await clearWorldNullifierCookie()
  return { ok: true }
}

