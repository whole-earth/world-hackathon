"use client"

import { useCredits } from '@/providers/CreditsProvider'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

export function HeaderCredits() {
  const { balance } = useCredits()
  const pathname = usePathname()
  const router = useRouter()
  // Persist header even when not verified; we only toggle the credits pill visibility.

  const isThemePage = pathname?.startsWith('/themes/')
  const [wasPositive, setWasPositive] = useState(false)
  const lastKnownBalance = useRef<number>(0)

  useEffect(() => {
    if (typeof balance === 'number') {
      lastKnownBalance.current = balance
      if (balance > 0) setWasPositive(true)
    }
  }, [balance])

  // Show credits pill if it has ever been positive this session, or is currently > 0
  const showCredits = useMemo(() => {
    if (typeof balance === 'number') return balance > 0
    return wasPositive
  }, [balance, wasPositive])

  // During transient nulls (fetching), keep showing the last known positive value to avoid flicker
  const displayBalance = useMemo(() => {
    if (typeof balance === 'number') return balance
    return wasPositive ? lastKnownBalance.current : 0
  }, [balance, wasPositive])
  const goBack = () => {
    try {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back()
      } else {
        router.push('/')
      }
    } catch {
      router.push('/')
    }
  }

  return (
    <div className="relative z-50 w-full text-xs pointer-events-none select-none">
      <div className="flex w-full items-start justify-between px-3 pt-2">
        <div className="pointer-events-auto">
          {isThemePage && (
            <button
              onClick={goBack}
              className="rounded-full bg-black/70 backdrop-blur px-3 py-1 text-white shadow border border-white/10 hover:bg-black/80 active:scale-[0.98] transition"
            >
              ← Back
            </button>
          )}
        </div>
        <div className="pointer-events-auto ml-auto">
          {showCredits && (
            <div className="rounded-full bg-black/70 backdrop-blur px-3 py-1 text-white shadow border border-white/10">
              Credits: <span className="font-semibold">{displayBalance}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
