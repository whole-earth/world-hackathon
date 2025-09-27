"use client"

import { useEffect } from 'react'
import { clearSessionAction } from '@/server/actions/session'
import { LOCAL_WORLD_NULLIFIER_KEY } from '@/constants'

declare global {
  interface Window {
    clearSession?: () => Promise<void>
  }
}

export default function ConsoleCommands() {
  useEffect(() => {
    async function clearSession() {
      try {
        await clearSessionAction()
      } catch {}

      try {
        // Remove client-side session-scoped verification key
        sessionStorage.removeItem(LOCAL_WORLD_NULLIFIER_KEY)
      } catch {}


      try {
        // Clear local cached data to fully reset UX
        // Unlocked themes caches
        const THEME_PREFIX = 'wwc_unlocked_themes:'
        const THEME_SYNC_PREFIX = 'wwc_unlocked_themes_synced:'
        // Credits local fallback
        const CREDITS_KEY = 'wwc_local_credits'

        // Remove matching keys from localStorage
        const keys = Object.keys(localStorage)
        for (const k of keys) {
          if (k === CREDITS_KEY || k.startsWith(THEME_PREFIX) || k.startsWith(THEME_SYNC_PREFIX)) {
            try { localStorage.removeItem(k) } catch {}
          }
        }
      } catch {}

      try {
        console.info('[WWC] Session cleared. Reloading...')
      } catch {}

      // Reload to ensure providers reinitialize cleanly
      try { window.location.reload() } catch {}
    }

    // Attach to window for console access
    window.clearSession = clearSession

    return () => { delete window.clearSession }
  }, [])

  return null
}
