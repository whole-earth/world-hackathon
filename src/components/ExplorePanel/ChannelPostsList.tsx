"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Inbox } from 'lucide-react'
import { getPostsByChannelAction, type PostRow } from '@/server/actions'

type Props = {
  channelSlug: string
  title?: string
}

export function ChannelPostsList({ channelSlug, title }: Props) {
  const router = useRouter()
  const [posts, setPosts] = useState<PostRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      const res = await getPostsByChannelAction({ channelSlug, status: 'catalog', limit: 20 })
      if (cancelled) return
      if (!res.ok) {
        setError(res.error || 'Failed to load posts')
        setPosts([])
      } else {
        setPosts(res.items)
      }
      setLoading(false)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [channelSlug])

  const hasPosts = useMemo(() => (posts && posts.length > 0) || false, [posts])

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  // Prefer an empty-state over error text if there are no posts
  if (!hasPosts) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center max-w-sm p-6 rounded-xl border border-white/10 bg-white/5">
          <div className="text-lg font-semibold">No posts yet</div>
          <p className="mt-2 text-white/70">Help curate to populate the channel!</p>
          <button
            className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 border border-white/20 text-sm"
            onClick={() => router.push('/?tab=filters')}
          >
            <Inbox className="h-4 w-4" />
            <span>Go to Filters</span>
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-300 bg-red-900/20 border border-red-500/30 rounded-lg">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-3 p-2 overflow-y-auto h-full">
      {posts!.map((p) => (
        <a
          key={p.id}
          href={p.source_url ?? '#'}
          target={p.source_url ? '_blank' : undefined}
          rel={p.source_url ? 'noreferrer' : undefined}
          className="block rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition p-3"
        >
          <div className="flex gap-3">
            {p.thumbnail_url ? (
              <img
                src={p.thumbnail_url}
                alt="thumbnail"
                className="w-16 h-16 rounded object-cover border border-white/10"
              />
            ) : (
              <div className="w-16 h-16 rounded bg-white/10 border border-white/10 flex items-center justify-center text-xs text-white/60">
                No image
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{p.title}</div>
              <div className="mt-1 text-xs text-white/60 flex items-center gap-2">
                <span>Yay {p.yay_count}</span>
                <span className="opacity-50">•</span>
                <span>Nay {p.nay_count}</span>
                <span className="opacity-50">•</span>
                <span>{new Date(p.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}
