"use server"

import { getSupabaseAdmin } from '@/lib/supabase/server'
import { assertRateLimit } from '@/server/lib/rate-limit'

export type PostRow = {
  id: string
  status: 'submitted' | 'catalog' | 'rejected'
  category?: string | null
  title: string
  thumbnail_url: string | null
  source_url: string | null
  submitted_by: string
  created_at: string
  accepted_at: string | null
}


export async function getPostsByCategoryAction(params: {
  category: string
  status?: 'submitted' | 'catalog' | 'rejected'
  limit?: number
  cursor?: string | null
}) {
  const { category, status = 'catalog', limit = 20, cursor } = params
  try {
    await assertRateLimit('posts-by-category', 20, 60_000)

    const supabase = getSupabaseAdmin()
    let query = supabase
      .from('posts')
      .select(
        'id, status, category, title, thumbnail_url, source_url, submitted_by, created_at, accepted_at'
      )
      .eq('category', category)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data, error } = await query
    if (error) {
      console.error('getPostsByCategoryAction error:', error)
      return { ok: false as const, error: 'Failed to load posts' }
    }

    const items = (data || []) as PostRow[]
    return {
      ok: true as const,
      items,
      hasMore: items.length === limit,
      nextCursor: items.length > 0 ? items[items.length - 1].created_at : null,
    }
  } catch (err) {
    console.error('getPostsByCategoryAction exception:', err)
    return { ok: false as const, error: 'Internal server error' }
  }
}
