"use client"

import { useCredits } from '@/providers/CreditsProvider'
import { useWorldVerification } from '@/hooks/useWorldVerification'

export function HeaderCredits() {
  const { verified } = useWorldVerification()
  const { balance } = useCredits()
  if (!verified) return null

  return (
    <div className="fixed top-2 right-2 z-50 text-xs pointer-events-none select-none">
      <div className="rounded-full bg-black/70 backdrop-blur px-3 py-1 text-white shadow border border-white/10">
        Swipes: <span className="font-semibold">{balance ?? '—'}</span>
      </div>
    </div>
  )
}
