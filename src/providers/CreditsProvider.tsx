"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getCreditsAction, addSwipeCreditAction, syncCreditsAction } from '@/server/actions'
import { useWorldVerification } from '@/hooks/useWorldVerification'

type CreditsContextValue = {
  balance: number | null
  refreshing: boolean
  refresh: () => Promise<void>
  addSwipe: (amount?: number) => Promise<void>
  optimisticAdd: (amount: number) => void
  flush: () => Promise<void>
  syncToServer: () => Promise<void>
}

const CreditsContext = createContext<CreditsContextValue | undefined>(undefined)

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const { verified } = useWorldVerification()
  const [balance, setBalance] = useState<number | null>(null)
  const [localBalance, setLocalBalance] = useState<number>(0)
  const [refreshing, setRefreshing] = useState(false)
  const inflight = useRef<Promise<void> | null>(null)
  const LOCAL_KEY = 'wwc_local_credits'
  const [pendingToSend, setPendingToSend] = useState<number>(0)
  const currentBalanceRef = useRef<number>(0)
  useEffect(() => {
    if (typeof balance === 'number' && Number.isFinite(balance)) {
      currentBalanceRef.current = balance
    }
  }, [balance])

  // Load local fallback credits once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY)
      if (raw != null) {
        const n = Number(raw)
        if (!Number.isNaN(n) && n >= 0) setLocalBalance(n)
      }
    } catch {}
  }, [])

  const refresh = useCallback(async () => {
    if (!verified) {
      // When not verified, expose local fallback balance
      setBalance(localBalance)
      return
    }
    if (inflight.current) return inflight.current
    setRefreshing(true)
    const p = (async () => {
      try {
        const res = await getCreditsAction()
        setBalance((prev) => {
          // Never let reconcile decrease the optimistic UI value
          const next = res.balance
          if (typeof prev === 'number') return Math.max(prev, next)
          return next
        })
      } catch {
        // ignore
      } finally {
        setRefreshing(false)
        inflight.current = null
      }
    })()
    inflight.current = p
    await p
  }, [verified, localBalance])

  const optimisticAdd = useCallback((amount: number) => {
    const delta = Number(amount)
    if (!Number.isFinite(delta) || delta <= 0) return
    setBalance((b) => (typeof b === 'number' && Number.isFinite(b) ? b + delta : delta))
    // Update ref and broadcast a client event so lightweight listeners (like headers) can react immediately
    const next = (typeof currentBalanceRef.current === 'number' && Number.isFinite(currentBalanceRef.current))
      ? currentBalanceRef.current + delta
      : delta
    currentBalanceRef.current = next
    try {
      window.dispatchEvent(new CustomEvent('wwc:credits', { detail: { balance: next } }))
    } catch {}
    // Also update local fallback so UI keeps increasing even when not verified
    setLocalBalance((b) => {
      const base = Number.isFinite(b) ? b : 0
      const next = base + delta
      try { localStorage.setItem(LOCAL_KEY, String(next)) } catch {}
      return next
    })
  }, [])

  const addSwipe = useCallback(async (amount = 1) => {
    optimisticAdd(amount)
    if (!verified) return
    try {
      // Batch up server-side adds and send on tab switches
      setPendingToSend((p) => p + amount)
    } catch {
      // ignore; optimistic UI stands, polling will reconcile later
    }
  }, [optimisticAdd, verified])

  const flush = useCallback(async () => {
    if (!verified) return
    const amount = pendingToSend
    if (!amount || amount <= 0) return
    try {
      await addSwipeCreditAction({ amount, reason: 'swipe-batch' })
      setPendingToSend(0)
      // optional reconcile without lowering UI
      void refresh()
    } catch {
      // keep pending; will retry on next flush
    }
  }, [pendingToSend, verified, refresh])

  // Sync client mutations to server on tab switch
  const syncToServer = useCallback(async () => {
    if (!verified) return
    const amount = pendingToSend
    if (!amount || amount <= 0) return
    
    // Prevent multiple simultaneous syncs
    if (inflight.current) return
    
    try {
      await syncCreditsAction({ amount, reason: 'tab-switch-sync' })
      setPendingToSend(0)
    } catch (error) {
      // Keep pending; will retry on next sync
      console.warn('Credit sync failed, will retry:', error)
    }
  }, [pendingToSend, verified])

  // Tab switch detection for server sync
  useEffect(() => {
    if (!verified) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && pendingToSend > 0) {
        void syncToServer()
      }
    }

    const handleBeforeUnload = () => {
      if (pendingToSend > 0) {
        // Sync immediately on page unload - use synchronous approach
        syncToServer().catch(() => {
          // Silent fail - credits will be reconciled on next visit
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [verified, pendingToSend, syncToServer])

  // Initial load + polling + periodic sync
  useEffect(() => {
    let active = true
    // If user is not verified, clear and avoid polling
    if (!verified) {
      setBalance(localBalance)
      return () => { active = false }
    }

    const load = async () => { if (active) await refresh() }
    const sync = async () => { if (active && pendingToSend > 0) await syncToServer() }
    
    load()
    const refreshId = window.setInterval(load, 5000)
    const syncId = window.setInterval(sync, 10000) // Sync every 10s as fallback
    
    return () => { 
      active = false
      window.clearInterval(refreshId)
      window.clearInterval(syncId)
    }
  }, [verified, refresh, localBalance, pendingToSend, syncToServer])

  const value = useMemo<CreditsContextValue>(() => ({ balance, refreshing, refresh, addSwipe, optimisticAdd, flush, syncToServer }), [balance, refreshing, refresh, addSwipe, optimisticAdd, flush, syncToServer])

  return (
    <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>
  )
}

export function useCredits(): CreditsContextValue {
  const ctx = useContext(CreditsContext)
  if (!ctx) throw new Error('useCredits must be used within CreditsProvider')
  return ctx
}
