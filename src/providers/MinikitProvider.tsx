'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'
import { MiniKitProvider as MiniKitSDKProvider } from '@worldcoin/minikit-js/minikit-provider'
import type { MinikitContextType } from '@/types'

const MinikitContext = createContext<MinikitContextType | undefined>(undefined)

export function MinikitProvider({ children }: { children: React.ReactNode }) {
  const [isInstalled, setIsInstalled] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let mounted = true

    const suppressMiniKitNoise = <T,>(fn: () => T): T => {
      const prev = console.error
      console.error = (...args: unknown[]) => {
        const first = args[0]
        if (typeof first === 'string' && first.includes('MiniKit is not installed')) return
        return prev(...args as [unknown, ...unknown[]])
      }
      try { return fn() } finally { console.error = prev }
    }

    const safeCheck = () => {
      let installed = false
      installed = suppressMiniKitNoise(() => {
        try { return Boolean(MiniKit?.isInstalled?.()) } catch { return false }
      })
      if (mounted) {
        setIsInstalled(installed)
        setIsReady(installed)
      }
      return installed
    }

    // Allow SDK provider to install, then check; poll briefly to catch late install
    const timeoutId = window.setTimeout(() => {
      if (safeCheck()) return
      let tries = 0
      const maxTries = 20 // ~5s @ 250ms
      const intervalId = window.setInterval(() => {
        tries += 1
        if (safeCheck() || tries >= maxTries || !mounted) {
          window.clearInterval(intervalId)
        }
      }, 250)
    }, 0)

    return () => {
      mounted = false
      window.clearTimeout(timeoutId)
    }
  }, [])

  const value = useMemo<MinikitContextType>(() => ({
    minikit: MiniKit,
    isWorldcoinInstalled: isInstalled,
    isWorldcoinReady: isReady,
  }), [isInstalled, isReady])

  return (
    <MinikitContext.Provider value={value}>
      <MiniKitSDKProvider>
        {children}
      </MiniKitSDKProvider>
    </MinikitContext.Provider>
  )
}

export function useWorldcoin() {
  const ctx = useContext(MinikitContext)
  if (ctx === undefined) {
    throw new Error('useWorldcoin must be used within a MinikitProvider')
  }
  const { minikit, isWorldcoinInstalled, isWorldcoinReady } = ctx
  return { minikit, isInstalled: isWorldcoinInstalled, isReady: isWorldcoinReady }
}
