import type { Metadata } from 'next'
import { ensureVerifiedNullifier } from '@/server/lib/world-verify'
import { isChannelUnlocked } from '@/server/services/unlocks'
import { ThemeLockedGate } from '@/components/ExplorePanel/ThemeLockedGate'
import { THEMES } from '@/constants/themes'
import { ChannelPostsList } from '@/components/ExplorePanel/ChannelPostsList'
import { BackButton } from '@/components/Header/BackButton'
import { ThemeSwipeShell } from '@/components/ThemeSwipeShell'
import { mapThemeToChannel, legacyThemeSlugForChannel } from '@/constants/themeChannelMap'

type Params = { params: Promise<{ slug: string }> }

// THEMES imported from shared constants

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const meta = THEMES[slug]
  const title = meta ? `${meta.title} — Whole World Catalog` : `Theme — Whole World Catalog`
  return { title }
}

export default async function ThemePage({ params }: Params) {
  const { slug } = await params
  // Server-side enforcement: must be verified and must have unlocked this theme
  let allowed = false
  const channelSlug = mapThemeToChannel(slug)
  try {
    const { nullifier_hash } = await ensureVerifiedNullifier({ allowAutoMock: false })
    allowed = await isChannelUnlocked(nullifier_hash, channelSlug)
  } catch {
    allowed = false
  }
  const meta = THEMES[slug]
  const title = meta?.title || 'Theme'
  const desc = meta?.desc || 'Curated catalog entries will appear here.'
  // Map channel slug to category enum value for proper filtering
  const category = legacyThemeSlugForChannel(channelSlug) || slug

  if (!allowed) {
    return <ThemeLockedGate slug={slug} title={title} desc={desc} />
  }

  return (
    <ThemeSwipeShell>
      <div className="p-4 space-y-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton />
            <h1 className="text-2xl font-semibold">{title}</h1>
          </div>
          <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-200 border border-green-500/40">Unlocked</span>
        </header>
        <p className="text-white/80">{desc}</p>

        {/* Channel posts for this theme (no demo items) */}
        <div className="mt-4 h-[70vh] rounded-lg border border-white/10 bg-neutral-900/40 relative">
          <ChannelPostsList category={category} title={title} />
        </div>
      </div>
    </ThemeSwipeShell>
  )
}
