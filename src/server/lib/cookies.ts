import 'server-only'

import { cookies } from 'next/headers'

export const WORLD_NULLIFIER_COOKIE = 'w_nh'

export async function getWorldNullifierFromCookie(): Promise<string | null> {
  try {
    const store = await cookies()
    const c = store.get(WORLD_NULLIFIER_COOKIE)?.value
    return c ?? null
  } catch {
    return null
  }
}

export async function setWorldNullifierCookie(value: string) {
  const store = await cookies()
  store.set(WORLD_NULLIFIER_COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // Session cookie; optionally set maxAge if desired
  })
}

export async function clearWorldNullifierCookie() {
  const store = await cookies()
  store.delete(WORLD_NULLIFIER_COOKIE)
}
