import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ensureVerifiedNullifier } from '@/server/lib/world-verify'
import { isThemeUnlocked } from '@/server/services/unlocks'
import { ThemeLockedGate } from '@/components/ThemeLockedGate'

type Params = { params: Promise<{ slug: string }> }

const THEMES: Record<string, { title: string; desc: string }> = {
  env: { title: 'Environment', desc: 'Climate, ecology, energy' },
  tools: { title: 'Tools', desc: 'Hardware, software, craft' },
  shelter: { title: 'Shelter', desc: 'Housing, architecture' },
  education: { title: 'Education', desc: 'Learning, pedagogy' },
  crypto: { title: 'Cryptography', desc: 'Security, protocols' },
}

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
  try {
    const { nullifier_hash } = await ensureVerifiedNullifier({})
    allowed = await isThemeUnlocked(nullifier_hash, slug)
  } catch {
    allowed = false
  }
  const meta = THEMES[slug]
  const title = meta?.title || 'Theme'
  const desc = meta?.desc || 'Curated catalog entries will appear here.'

  if (!allowed) {
    return <ThemeLockedGate slug={slug} title={title} desc={desc} />
  }

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-200 border border-green-500/40">Unlocked</span>
      </header>
      <p className="text-white/80">{desc}</p>

      <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-white/70">This is a placeholder theme page. Replace with real content once the catalog and filters are wired to the database.</p>
      </div>
    </div>
  )
}
