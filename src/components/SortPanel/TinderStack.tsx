"use client"

import React, { useCallback, useMemo, useRef, useState, forwardRef, useImperativeHandle, useEffect } from 'react'
import { motion, useAnimation, useMotionValue, useTransform, useSpring } from 'framer-motion'

type Direction = 'left' | 'right'

type Props<T> = {
  items: T[]
  renderCard: (item: T, index: number, isTop: boolean) => React.ReactNode
  onSwipe?: (dir: Direction, item: T, index: number) => void
  maxVisible?: number
  onDragDirectionChange?: (dir: Direction | null) => void
  disabled?: boolean
}

export interface TinderStackRef {
  swipeLeft: () => void
  swipeRight: () => void
}

export const TinderStack = forwardRef<TinderStackRef, Props<unknown>>(function TinderStack({ items, renderCard, onSwipe, maxVisible = 4, onDragDirectionChange, disabled = false }, ref) {
  const [index, setIndex] = useState(0)
  const controls = useAnimation()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [flying, setFlying] = useState<Direction | null>(null)
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
  const dragX = useMotionValue(0)
  const dragProgress = useTransform(dragX, (v) => clamp01(Math.abs(v) / 120))

  // Notify parent as drag direction changes for immediate UI feedback
  const lastDirRef = useRef<Direction | null>(null)
  useEffect(() => {
    const unsub = dragX.on('change', (v) => {
      const dir: Direction | null = v > 8 ? 'right' : v < -8 ? 'left' : null
      if (dir !== lastDirRef.current) {
        lastDirRef.current = dir
        onDragDirectionChange?.(dir)
      }
    })
    return () => { try { unsub() } catch {} }
  }, [dragX, onDragDirectionChange])
  // Layer transforms interpolate toward the previous layer as you drag
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const baseScaleFor = (pos: number) => (pos <= 0 ? 1 : pos === 1 ? 0.93 : pos === 2 ? 0.87 : 0.85)
  const yFor = (pos: number) => (pos <= 0 ? 0 : pos === 1 ? 8 : pos === 2 ? 14 : 18)

  const positions = [0, 1, 2, 3, 4, 5]
  const springCfg = { stiffness: 360, damping: 32 }
  
  // Create transforms and springs for each position
  const layer0Scale = useTransform(dragProgress, () => 1)
  const layer1Scale = useTransform(dragProgress, (p) => {
    const factor = 1
    const target = lerp(baseScaleFor(1), baseScaleFor(0), Math.min(1, p * factor))
    const cap = 1.0
    return Math.min(target, cap)
  })
  const layer2Scale = useTransform(dragProgress, (p) => {
    const factor = 0.6
    const target = lerp(baseScaleFor(2), baseScaleFor(1), Math.min(1, p * factor))
    const cap = baseScaleFor(1) - 0.02
    return Math.min(target, cap)
  })
  const layer3Scale = useTransform(dragProgress, (p) => {
    const factor = 0.6
    const target = lerp(baseScaleFor(3), baseScaleFor(2), Math.min(1, p * factor))
    const cap = baseScaleFor(2) - 0.02
    return Math.min(target, cap)
  })
  const layer4Scale = useTransform(dragProgress, (p) => {
    const factor = 0.6
    const target = lerp(baseScaleFor(4), baseScaleFor(3), Math.min(1, p * factor))
    const cap = baseScaleFor(3) - 0.02
    return Math.min(target, cap)
  })
  const layer5Scale = useTransform(dragProgress, (p) => {
    const factor = 0.6
    const target = lerp(baseScaleFor(5), baseScaleFor(4), Math.min(1, p * factor))
    const cap = baseScaleFor(4) - 0.02
    return Math.min(target, cap)
  })

  const layer0Y = useTransform(dragProgress, () => 0)
  const layer1Y = useTransform(dragProgress, (p) => {
    const factor = 1
    return lerp(yFor(1), yFor(0), Math.min(1, p * factor))
  })
  const layer2Y = useTransform(dragProgress, (p) => {
    const factor = 0.6
    return lerp(yFor(2), yFor(1), Math.min(1, p * factor))
  })
  const layer3Y = useTransform(dragProgress, (p) => {
    const factor = 0.6
    return lerp(yFor(3), yFor(2), Math.min(1, p * factor))
  })
  const layer4Y = useTransform(dragProgress, (p) => {
    const factor = 0.6
    return lerp(yFor(4), yFor(3), Math.min(1, p * factor))
  })
  const layer5Y = useTransform(dragProgress, (p) => {
    const factor = 0.6
    return lerp(yFor(5), yFor(4), Math.min(1, p * factor))
  })

  const layerScale = [
    useSpring(layer0Scale, springCfg),
    useSpring(layer1Scale, springCfg),
    useSpring(layer2Scale, springCfg),
    useSpring(layer3Scale, springCfg),
    useSpring(layer4Scale, springCfg),
    useSpring(layer5Scale, springCfg)
  ]
  const layerY = [
    useSpring(layer0Y, springCfg),
    useSpring(layer1Y, springCfg),
    useSpring(layer2Y, springCfg),
    useSpring(layer3Y, springCfg),
    useSpring(layer4Y, springCfg),
    useSpring(layer5Y, springCfg)
  ]

  const visible = useMemo(() => {
    const slice = items.slice(index, index + maxVisible)
    return slice
  }, [items, index, maxVisible])


  const keyFor = (item: unknown, absoluteIndex: number, pos: number) => {
    const anyItem = item as Record<string, unknown>
    const id = anyItem && (anyItem.id ?? anyItem.key ?? anyItem.slug)
    return id != null ? `card-${String(id)}` : `idx-${absoluteIndex}-pos-${pos}`
  }

  const decide = useCallback((offsetX: number, velocityX: number): Direction | null => {
    const thresholdOffset = 120
    const thresholdVelocity = 600
    if (offsetX > thresholdOffset || velocityX > thresholdVelocity) return 'right'
    if (offsetX < -thresholdOffset || velocityX < -thresholdVelocity) return 'left'
    return null
  }, [])

  const flyAway = useCallback(async (dir: Direction) => {
    if (!visible.length) return
    setFlying(dir)
    const distance = (containerRef.current?.clientWidth || 320) * 1.5 * (dir === 'right' ? 1 : -1)
    try {
      await controls.start({
        x: distance,
        rotate: dir === 'right' ? 35 : -35,
        opacity: 0,
        transition: { type: 'spring', stiffness: 210, damping: 21 }
      })
    } finally {
      const currentItem = items[index]
      const currentIdx = index
      setIndex((i) => Math.min(i + 1, items.length))
      setFlying(null)
      controls.set({ x: 0, rotate: 0, opacity: 1 })
      // Reset drag progress so new layers don't appear fully advanced
      try { dragX.set(0) } catch {}
      // Clear any drag direction feedback
      try { onDragDirectionChange?.(null) } catch {}
      onSwipe?.(dir, currentItem, currentIdx)
    }
  }, [controls, visible.length, items, index, onSwipe, dragX, onDragDirectionChange])

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    swipeLeft: () => flyAway('left'),
    swipeRight: () => flyAway('right')
  }), [flyAway])

  const onDragEnd = useCallback((_e: unknown, info: { offset: { x: number }, velocity: { x: number } }) => {
    if (disabled || flying) return
    const dir = decide(info.offset.x, info.velocity.x)
    if (dir) {
      void flyAway(dir)
    } else {
      controls.start({ x: 0, rotate: 0, opacity: 1, transition: { type: 'spring', stiffness: 400, damping: 30 } })
      // Clear feedback when snap-back
      try { onDragDirectionChange?.(null) } catch {}
    }
  }, [controls, decide, flyAway, flying, onDragDirectionChange, disabled])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled || !visible.length || flying) return
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      void flyAway('right')
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      void flyAway('left')
    }
  }, [visible.length, flying, flyAway, disabled])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      onKeyDown={onKeyDown}
      tabIndex={0}
      data-swipe-lock
    >
      {/* Stack container */}
      <div className="absolute inset-0">
        {visible.map((item, i) => {
          const isTop = i === 0
          const absIndex = index + i
          const z = 100 - i
          const outerStyle = { zIndex: z } as React.CSSProperties
          const idx = Math.min(i, positions.length - 1)
          const styleY = layerY[idx]
          const styleScale = layerScale[idx]

          return (
            <motion.div
              key={keyFor(item, absIndex, i)}
              className="absolute inset-0 will-change-transform"
              style={{ ...outerStyle, y: styleY, scale: styleScale }}
              // Drive transforms purely via MotionValues to avoid any initial flash
            >
              {isTop ? (
                <motion.div
                  className="absolute inset-0"
                  drag={disabled ? false : 'x'}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.25}
                  onDragStart={() => {}}
                  onDragEnd={onDragEnd}
                  animate={controls}
                  style={{ x: dragX }}
                  whileDrag={disabled ? undefined : { rotate: 5, cursor: 'grabbing' }}
                >
                  {renderCard(item, absIndex, true)}
                </motion.div>
              ) : (
                <div className="absolute inset-0">
                  {renderCard(item, absIndex, false)}
                </div>
              )}
            </motion.div>
          )
        })}

        {/* Empty state */}
        {index >= items.length && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center text-white/70 text-sm">No more cards</div>
          </div>
        )}
      </div>
      
    </div>
  )
})
