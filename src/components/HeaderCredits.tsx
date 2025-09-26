"use client"

import { useCredits } from '@/providers/CreditsProvider'
import { useWorldVerification } from '@/hooks/useWorldVerification'
import { usePathname, useRouter } from 'next/navigation'

export function HeaderCredits() {
  const { verified } = useWorldVerification()
  const { balance } = useCredits()
  const pathname = usePathname()
  const router = useRouter()
  if (!verified) return null

  const isThemePage = pathname?.startsWith('/themes/')
  const showCredits = typeof balance === 'number' && balance > 0
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
        {showCredits && (
          <div className="pointer-events-auto ml-auto rounded-full bg-black/70 backdrop-blur px-3 py-1 text-white shadow border border-white/10">
            Credits: <span className="font-semibold">{balance}</span>
          </div>
        )}
      </div>
    </div>
  )
}
