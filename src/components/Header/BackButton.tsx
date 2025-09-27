"use client"

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

type Props = {
  className?: string
}

export function BackButton({ className }: Props) {
  const router = useRouter()
  const onClick = () => {
    // Try to let SwipeBack handle animated back. If no listener prevents default, fallback.
    let handled = false
    try {
      const ev = new CustomEvent('swipeback:go', { cancelable: true })
      handled = !window.dispatchEvent(ev)
    } catch {
      handled = false
    }
    if (handled) return
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
    <button
      aria-label="Back"
      onClick={onClick}
      className={[
        'inline-flex items-center justify-center h-9 w-9 rounded-full border border-white/20 bg-white/10',
        'hover:bg-white/15 active:bg-white/20 transition-colors',
        'text-white',
        className || ''
      ].join(' ')}
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  )
}
