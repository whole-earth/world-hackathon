"use client"

import { useCallback, useMemo, useState } from 'react'
import { ThemeUnlockDrawer } from '@/components/ExplorePanel/ThemeUnlockDrawer'
import { BackButton } from '@/components/Header/BackButton'
import { useRouter } from 'next/navigation'

type Props = {
  slug: string
  title?: string
  desc?: string
}

export function ThemeLockedGate({ slug, title = 'Theme', desc }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const themeTitle = useMemo(() => title, [title])

  const onUnlocked = useCallback(() => {
    setOpen(false)
    router.refresh()
  }, [router])

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-2xl font-semibold">{themeTitle}</h1>
        </div>
        <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-200 border border-yellow-500/40">Locked</span>
      </header>
      {desc && <p className="text-white/80">{desc}</p>}
      <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
        <p className="text-sm text-white/80">This theme is locked. Unlock to view its contents.</p>
        <button
          className="rounded-md bg-white text-black px-4 py-2 font-medium"
          onClick={() => setOpen(true)}
        >
          Unlock
        </button>
      </div>

      <ThemeUnlockDrawer
        open={open}
        onOpenChange={setOpen}
        themeSlug={slug}
        themeTitle={themeTitle}
        onUnlocked={onUnlocked}
      />
    </div>
  )
}
