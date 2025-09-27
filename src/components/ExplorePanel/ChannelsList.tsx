"use client"

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ThemeUnlockDrawer } from '@/components/ExplorePanel/ThemeUnlockDrawer'
import { useEffect } from 'react'
import { useUnlockedThemes } from '@/providers/UnlockedThemesProvider'

import { HeaderCreditsPill } from '@/components/Header/HeaderCreditsPill'
import { THEMES } from '@/constants/themes'

type ChannelsListProps = { showHeader?: boolean }

export function ChannelsList({ showHeader = true }: ChannelsListProps) {
  const router = useRouter()
  const { isUnlocked, addUnlocked, refresh } = useUnlockedThemes()
  // Channels from shared THEMES to avoid duplication
  const channels = useMemo(() => (
    Object.entries(THEMES).map(([id, meta]) => ({ id, title: meta.title, desc: meta.desc }))
  ), [])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<{ id: string; title: string } | null>(null)
  // Optional: light periodic refresh to catch server-side updates from other devices
  useEffect(() => {
    const id = window.setInterval(() => { void refresh() }, 30000)
    return () => window.clearInterval(id)
  }, [refresh])
  const openUnlock = (id: string, title: string) => {
    if (isUnlocked(id)) {
      router.push(`/themes/${id}`)
      return
    }
    setSelected({ id, title })
    setDrawerOpen(true)
  }
  const handleUnlocked = (slug: string) => {
    addUnlocked(slug)
    setDrawerOpen(false)
    router.push(`/themes/${slug}`)
  }

  return (
    <div className="relative h-full w-full">
      {showHeader && (
        <header className="absolute top-0 left-0 right-0 p-4">
          <div className="relative flex items-center justify-center">
            <h1 className="text-lg font-semibold text-center">Channels</h1>
            <div className="absolute right-0">
              <HeaderCreditsPill />
            </div>
          </div>
        </header>
      )}

      <main className="pt-16 pb-14 h-full overflow-y-auto">
        <ul className="px-4 space-y-3">
          {channels.map((ch) => (
            <li
              key={ch.id}
              className="rounded-lg bg-white/5 border border-white/10 p-4 cursor-pointer hover:bg-white/10 transition"
              onClick={() => openUnlock(ch.id, ch.title)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openUnlock(ch.id, ch.title)
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium">{ch.title}</h3>
                  <p className="text-sm text-white/70">{ch.desc}</p>
                </div>
                {isUnlocked(ch.id) ? (
                  <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-200 border border-green-500/40">Unlocked</span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded bg-white/10 text-white/80 border border-white/20">Locked</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </main>

      {selected && (
        <ThemeUnlockDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          themeSlug={selected.id}
          themeTitle={selected.title}
          onUnlocked={handleUnlocked}
        />
      )}
    </div>
  );
}
