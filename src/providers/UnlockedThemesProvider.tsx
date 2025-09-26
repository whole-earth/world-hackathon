"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useWorldAuth } from '@/providers/WorldAuthProvider'
import { getUnlockedThemesAction } from '@/server/actions'

type UnlockedThemesContextValue = {
  unlocked: Set<string>
  isUnlocked: (slug: string) => boolean
  addUnlocked: (slug: string) => void
  refresh: () => Promise<void>
  lastSyncedAt: number | null
}

const UnlockedThemesContext = createContext<UnlockedThemesContextValue | undefined>(undefined)

const STORAGE_PREFIX = 'wwc_unlocked_themes:'
const STORAGE_SYNC_PREFIX = 'wwc_unlocked_themes_synced:'
const STALE_TTL_MS = 60_000 // 1 minute staleness window

export function UnlockedThemesProvider({ children }: { children: React.ReactNode }) {
  const { verified, nullifier } = useWorldAuth()
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set())
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const syncingRef = useRef(false)

  const storageKey = useMemo(() => (nullifier ? `${STORAGE_PREFIX}${nullifier}` : null), [nullifier])
  const syncKey = useMemo(() => (nullifier ? `${STORAGE_SYNC_PREFIX}${nullifier}` : null), [nullifier])

  // Load from localStorage on mount/when nullifier changes
  useEffect(() => {
    if (!verified || !storageKey) {
      setUnlocked(new Set())
      setLastSyncedAt(null)
      return
    }
    try {
      const raw = localStorage.getItem(storageKey)
      const arr: string[] = raw ? JSON.parse(raw) : []
      setUnlocked(new Set(arr))
    } catch {
      setUnlocked(new Set())
    }
    try {
      const ts = syncKey ? Number(localStorage.getItem(syncKey)) : NaN
      setLastSyncedAt(Number.isFinite(ts) ? ts : null)
    } catch {
      setLastSyncedAt(null)
    }
  }, [verified, storageKey, syncKey])

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!storageKey || !syncKey) return
      if (e.key === storageKey && typeof e.newValue === 'string') {
        try {
          const arr: string[] = JSON.parse(e.newValue)
          setUnlocked(new Set(arr))
        } catch {}
      }
      if (e.key === syncKey && typeof e.newValue === 'string') {
        const ts = Number(e.newValue)
        if (Number.isFinite(ts)) setLastSyncedAt(ts)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [storageKey, syncKey])

  const persist = useCallback((next: Set<string>) => {
    if (!storageKey) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(next)))
    } catch {}
  }, [storageKey])

  const markSyncedNow = useCallback(() => {
    const now = Date.now()
    setLastSyncedAt(now)
    if (syncKey) {
      try { localStorage.setItem(syncKey, String(now)) } catch {}
    }
  }, [syncKey])

  const isUnlocked = useCallback((slug: string) => unlocked.has(slug), [unlocked])

  const addUnlocked = useCallback((slug: string) => {
    setUnlocked(prev => {
      if (prev.has(slug)) return prev
      const next = new Set(prev)
      next.add(slug)
      persist(next)
      return next
    })
  }, [persist])

  // Conditional background refresh: if cache is stale or missing
  const refresh = useCallback(async () => {
    if (!verified || !nullifier) return
    if (syncingRef.current) return
    syncingRef.current = true
    try {
      const res = await getUnlockedThemesAction()
      const next = new Set(res.themes)
      setUnlocked(next)
      persist(next)
      markSyncedNow()
    } catch {
      // ignore
    } finally {
      syncingRef.current = false
    }
  }, [verified, nullifier, persist, markSyncedNow])

  useEffect(() => {
    if (!verified) return
    // If never synced or stale, refresh in background
    const stale = !lastSyncedAt || Date.now() - lastSyncedAt > STALE_TTL_MS
    if (stale) {
      // Defer a tick to let UI render from cache first
      const id = setTimeout(() => { void refresh() }, 50)
      return () => clearTimeout(id)
    }
  }, [verified, lastSyncedAt, refresh])

  const value = useMemo<UnlockedThemesContextValue>(() => ({
    unlocked,
    isUnlocked,
    addUnlocked,
    refresh,
    lastSyncedAt,
  }), [unlocked, isUnlocked, addUnlocked, refresh, lastSyncedAt])

  return (
    <UnlockedThemesContext.Provider value={value}>
      {children}
    </UnlockedThemesContext.Provider>
  )
}

export function useUnlockedThemes(): UnlockedThemesContextValue {
  const ctx = useContext(UnlockedThemesContext)
  if (!ctx) throw new Error('useUnlockedThemes must be used within UnlockedThemesProvider')
  return ctx
}

