import 'server-only'

import { cookies } from 'next/headers'

export const WORLD_NULLIFIER_COOKIE = 'w_nh'

export function getWorldNullifierFromCookie(): string | null {
  try {
    const c = cookies().get(WORLD_NULLIFIER_COOKIE)?.value
    return c ?? null
  } catch {
    return null
  }
}

export function setWorldNullifierCookie(value: string) {
  cookies().set(WORLD_NULLIFIER_COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // Session cookie; optionally set maxAge if desired
  })
}

export function clearWorldNullifierCookie() {
  cookies().delete(WORLD_NULLIFIER_COOKIE)
}

