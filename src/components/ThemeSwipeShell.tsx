"use client"

import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChannelsList } from '@/components/ExplorePanel/ChannelsList'

// Two-panel shell: [ Channels | Theme ]
// Default shows Theme (translated -1 * width). Swipe right to reveal Channels.
export function ThemeSwipeShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [progress, setProgress] = useState(1) // 0=Channels, 1=Theme
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const startProgressRef = useRef<number>(1)
  const axisRef = useRef<'none' | 'x' | 'y'>('none')
  const navigatePendingRef = useRef(false)

  const getContainerWidth = () => containerRef.current?.clientWidth || window.innerWidth || 1
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

  const snapTo = useCallback((target: 0 | 1) => {
    const from = progress
    const willChange = target !== Math.round(from)
    if (willChange && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(15) } catch {}
    }
    setProgress(target)
    if (target === 0) {
      // Reset channels state when navigating to channels panel
      console.log('ThemeSwipeShell: Dispatching channels:reset event')
      window.dispatchEvent(new CustomEvent('channels:reset'))
      
      // After reaching Channels, we can optionally navigate to the root
      navigatePendingRef.current = true
      // Use a small timeout to allow the transform transition to finish before routing
      window.setTimeout(() => {
        if (navigatePendingRef.current) {
          try { router.push('/') } catch {}
          navigatePendingRef.current = false
        }
      }, isDragging ? 0 : 240)
    }
  }, [progress, router, isDragging])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as Element | null
    if (target && target.closest('[data-swipe-lock]')) {
      startXRef.current = null
      startYRef.current = null
      axisRef.current = 'none'
      setIsDragging(false)
      return
    }
    const t = e.touches[0]
    startXRef.current = t.clientX
    startYRef.current = t.clientY
    startProgressRef.current = progress
    axisRef.current = 'none'
    setIsDragging(false)
  }, [progress])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startXRef.current == null || startYRef.current == null) return
    const t = e.touches[0]
    const dx = t.clientX - startXRef.current
    const dy = t.clientY - startYRef.current
    const lockThreshold = 12
    if (axisRef.current === 'none') {
      if (Math.abs(dx) > lockThreshold || Math.abs(dy) > lockThreshold) {
        axisRef.current = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'
        setIsDragging(axisRef.current === 'x')
      }
    }
    if (axisRef.current !== 'x') return
    const width = getContainerWidth()
    // Reversed: swiping right (dx>0) moves toward Channels (progress -> 0)
    const next = clamp01(startProgressRef.current - dx / width)
    setProgress(next)
  }, [])

  const onTouchEnd = useCallback(() => {
    if (axisRef.current === 'x') {
      const start = startProgressRef.current
      const curr = progress
      const threshold = 0.2
      const delta = Math.abs(curr - start)
      if (delta < threshold) {
        snapTo(Math.round(start) as 0 | 1)
      } else {
        snapTo(Math.round(curr) as 0 | 1)
      }
    }
    axisRef.current = 'none'
    startXRef.current = null
    startYRef.current = null
    setIsDragging(false)
  }, [progress, snapTo])

  // Pointer support
  const pointerIdRef = useRef<number | null>(null)
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as Element | null
    if (target && target.closest('[data-swipe-lock]')) {
      pointerIdRef.current = null
      startXRef.current = null
      startYRef.current = null
      axisRef.current = 'none'
      setIsDragging(false)
      return
    }
    pointerIdRef.current = e.pointerId
    startXRef.current = e.clientX
    startYRef.current = e.clientY
    startProgressRef.current = progress
    axisRef.current = 'none'
    setIsDragging(false)
  }, [progress])
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerIdRef.current == null || startXRef.current == null) return
    const dx = e.clientX - startXRef.current
    const dy = (startYRef.current != null ? e.clientY - startYRef.current : 0)
    const lockThreshold = 12
    if (axisRef.current === 'none') {
      if (Math.abs(dx) > lockThreshold || Math.abs(dy) > lockThreshold) {
        axisRef.current = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'
        setIsDragging(axisRef.current === 'x')
      }
    }
    if (axisRef.current !== 'x') return
    const width = getContainerWidth()
    const next = clamp01(startProgressRef.current - dx / width)
    setProgress(next)
  }, [])
  const onPointerUp = useCallback(() => {
    pointerIdRef.current = null
    onTouchEnd()
  }, [onTouchEnd])

  // Listen for programmatic back (from BackButton)
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as Event).cancelable) e.preventDefault()
      navigatePendingRef.current = true
      setProgress(0)
    }
    window.addEventListener('swipeback:go', handler as EventListener)
    return () => window.removeEventListener('swipeback:go', handler as EventListener)
  }, [])

  const translatePx = useMemo(() => -progress * getContainerWidth(), [progress])

  return (
    <div ref={containerRef} className="absolute inset-0 w-full overflow-hidden bg-black text-white">
      <div
        className="absolute inset-0 flex h-full w-[200%] touch-pan-y select-none"
        style={{ transform: `translate3d(${translatePx}px, 0, 0)`, transition: isDragging ? 'none' : 'transform 220ms ease' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Channels - left */}
        <section className="w-1/2 h-full bg-neutral-950">
          <ChannelsList showHeader={true} />
        </section>
        {/* Theme content - right */}
        <section className="w-1/2 h-full bg-neutral-900">
          {children}
        </section>
      </div>
    </div>
  )
}

