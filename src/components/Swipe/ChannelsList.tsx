"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ThemeUnlockDrawer } from '@/components/ThemeUnlockDrawer'
import { useEffect } from 'react'
import { useUnlockedThemes } from '@/providers/UnlockedThemesProvider'

export function ChannelsList({ onOpenFilters }: { onOpenFilters?: () => void }) {
  const router = useRouter()
  const { isUnlocked, addUnlocked, refresh } = useUnlockedThemes()
  // Static channels
  const channels = [
    { id: 'env', title: 'Environment', desc: 'Climate, ecology, energy' },
    { id: 'tools', title: 'Tools', desc: 'Hardware, software, craft' },
    { id: 'shelter', title: 'Shelter', desc: 'Housing, architecture' },
    { id: 'education', title: 'Education', desc: 'Learning, pedagogy' },
    { id: 'crypto', title: 'Cryptography', desc: 'Security, protocols' },
  ];

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
      <header className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
        <button
          className="px-3 py-1 rounded-full bg-white/10 text-sm"
          onClick={() => onOpenFilters?.()}
        >
          Filters
        </button>
        <h1 className="text-lg font-semibold">Channels</h1>
        <div className="w-[72px]" />
      </header>

      <main className="pt-16 pb-14 h-full overflow-y-auto">
        <ul className="px-4 space-y-3">
          {channels.map((ch) => (
            <li
              key={ch.id}
              className="rounded-lg bg-white/5 border border-white/10 p-4 cursor-pointer hover:bg-white/10 transition"
              onClick={() => openUnlock(ch.id, ch.title)}
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
