"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getCreditsAction, addSwipeCreditAction } from '@/server/actions'
import { useWorldVerification } from '@/hooks/useWorldVerification'

type CreditsContextValue = {
  balance: number | null
  refreshing: boolean
  refresh: () => Promise<void>
  addSwipe: (amount?: number) => Promise<void>
  optimisticAdd: (amount: number) => void
}

const CreditsContext = createContext<CreditsContextValue | undefined>(undefined)

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const { verified } = useWorldVerification()
  const [balance, setBalance] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const inflight = useRef<Promise<void> | null>(null)

  const refresh = useCallback(async () => {
    if (!verified) { setBalance(null); return }
    if (inflight.current) return inflight.current
    setRefreshing(true)
    const p = (async () => {
      try {
        const res = await getCreditsAction()
        setBalance(res.balance)
      } catch {
        // ignore
      } finally {
        setRefreshing(false)
        inflight.current = null
      }
    })()
    inflight.current = p
    await p
  }, [verified])

  const optimisticAdd = useCallback((amount: number) => {
    setBalance((b) => (typeof b === 'number' ? b + amount : amount))
  }, [])

  const addSwipe = useCallback(async (amount = 1) => {
    optimisticAdd(amount)
    try {
      await addSwipeCreditAction({ amount, reason: 'swipe' })
      // Refresh to reconcile server state
      await refresh()
    } catch {
      // On error, force a refresh to correct UI
      await refresh()
    }
  }, [optimisticAdd, refresh])

  // Initial load + polling
  useEffect(() => {
    let active = true
    // If user is not verified, clear and avoid polling
    if (!verified) {
      setBalance(null)
      return () => { active = false }
    }

    const load = async () => { if (active) await refresh() }
    load()
    const id = window.setInterval(load, 5000)
    return () => { active = false; window.clearInterval(id) }
  }, [verified, refresh])

  const value = useMemo<CreditsContextValue>(() => ({ balance, refreshing, refresh, addSwipe, optimisticAdd }), [balance, refreshing, refresh, addSwipe, optimisticAdd])

  return (
    <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>
  )
}

export function useCredits(): CreditsContextValue {
  const ctx = useContext(CreditsContext)
  if (!ctx) throw new Error('useCredits must be used within CreditsProvider')
  return ctx
}
