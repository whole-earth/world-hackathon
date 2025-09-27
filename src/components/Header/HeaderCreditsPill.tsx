"use client"

import { useCredits } from '@/providers/CreditsProvider'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'

export function HeaderCreditsPill() {
  const { balance } = useCredits()
  const [uiBalance, setUiBalance] = useState<number | null>(null)
  const [wasPositive, setWasPositive] = useState(false)
  const lastKnownBalance = useRef<number>(0)

  useEffect(() => {
    if (typeof balance === 'number' && Number.isFinite(balance)) {
      lastKnownBalance.current = balance
      if (balance > 0) setWasPositive(true)
    }
  }, [balance])

  // Listen for client-side credit broadcasts to guarantee immediate header updates
  useEffect(() => {
    const onCredits = (e: Event) => {
      const detail = (e as CustomEvent).detail as { balance?: number } | undefined
      const b = detail?.balance
      if (typeof b === 'number' && Number.isFinite(b)) {
        setUiBalance(b)
      }
    }
    window.addEventListener('wwc:credits', onCredits as EventListener)
    return () => window.removeEventListener('wwc:credits', onCredits as EventListener)
  }, [])

  const effective = (typeof uiBalance === 'number' && Number.isFinite(uiBalance))
    ? uiBalance
    : (typeof balance === 'number' && Number.isFinite(balance) ? balance : undefined)

  const showCredits = useMemo(() => {
    if (typeof effective === 'number') return effective > 0
    return wasPositive
  }, [effective, wasPositive])

  const displayBalance = useMemo(() => {
    if (typeof effective === 'number') return effective
    return wasPositive ? lastKnownBalance.current : 0
  }, [effective, wasPositive])

  return (
    <motion.div
      initial={false}
      animate={{ opacity: showCredits ? 1 : 0, y: showCredits ? 0 : -4, scale: showCredits ? 1 : 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="rounded-full bg-black/70 backdrop-blur px-3 py-1 text-white shadow border border-white/10 text-xs"
      style={{ pointerEvents: showCredits ? 'auto' as const : 'none' as const }}
    >
      Credits: <span className="font-semibold">{displayBalance}</span>
    </motion.div>
  )
}
