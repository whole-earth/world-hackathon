"use server"

import { getSupabaseAdmin } from '@/lib/supabase/server'
import { assertRateLimit } from '@/server/lib/rate-limit'
import { ensureVerifiedNullifier } from '@/server/lib/world-verify'

export type MediaInboxItem = {
  id: string
  title: string
  subtitle?: string
  color: string
  description?: string
  category?: string
  uploaded_by: string
  uploaded_by_username?: string | null
  source_url?: string | null
  thumbnail_url?: string | null
  created_at: string
}

export async function getMediaInboxAction(params: {
  page?: number
  limit?: number
  cursor?: string
  category?: string
}) {
  try {
    await assertRateLimit('media-inbox-fetch', 10, 60000) // 10 requests per minute
    // Ensure we know the caller (used to exclude already-voted items)
    const { nullifier_hash } = await ensureVerifiedNullifier({})

    const { limit = 5, cursor, category } = params
    const supabase = getSupabaseAdmin()

    // Over-fetch to compensate for filtering out already-voted items
    const fetchCount = Math.max(1, Math.min(50, limit * 3))

    let base = supabase
      .from('media_inbox')
      .select('id, title, subtitle, color, description, category, uploaded_by, uploaded_by_username, source_url, thumbnail_url, created_at')
      .order('created_at', { ascending: false })
      .limit(fetchCount)

    if (cursor) {
      base = base.lt('created_at', cursor)
    }
    if (category) {
      base = base.eq('category', category)
    }

    const { data: rawItems, error: baseErr } = await base
    if (baseErr) {
      console.error('Error fetching media-inbox items:', baseErr)
      return { ok: false, error: 'Failed to fetch media items' }
    }

    const items = rawItems || []
    if (items.length === 0) {
      return { ok: true, items: [], hasMore: false, nextCursor: null, totalCount: 0 }
    }

    const ids = items.map((i) => i.id)
    // Find which of these items the caller has already voted on
    const { data: votes, error: votesErr } = await supabase
      .from('media_inbox_votes')
      .select('inbox_item_id')
      .eq('voter_nullifier', nullifier_hash)
      .in('inbox_item_id', ids)

    if (votesErr) {
      console.error('Error fetching media-inbox votes:', votesErr)
      return { ok: false, error: 'Failed to fetch media items' }
    }

    const voted = new Set((votes || []).map((v) => v.inbox_item_id))
    const unvoted = items.filter((i) => !voted.has(i.id))
    const pageItems = unvoted.slice(0, limit)

    // nextCursor: advance by the last item we examined (raw list) to ensure progress
    const lastRaw = items[items.length - 1]
    const nextCursorVal = lastRaw ? lastRaw.created_at : null
    const hasMore = pageItems.length === limit && !!nextCursorVal

    return {
      ok: true,
      items: pageItems,
      hasMore,
      nextCursor: nextCursorVal,
      totalCount: 0,
    }
  } catch (error) {
    console.error('Error in getMediaInboxAction:', error)
    return { ok: false, error: 'Internal server error' }
  }
}

export async function voteMediaInboxItemAction(input: { inbox_item_id: string; up: boolean }) {
  const { inbox_item_id, up } = input || {}
  if (!inbox_item_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(inbox_item_id)) {
    throw new Error('Invalid inbox_item_id')
  }

  // Bind to verified user
  const { nullifier_hash } = await ensureVerifiedNullifier({})

  const supabase = getSupabaseAdmin()
  // Upsert to allow switching vote direction; trigger will adjust counts accordingly
  const { error } = await supabase
    .from('media_inbox_votes')
    .upsert({ inbox_item_id, voter_nullifier: nullifier_hash, is_upvote: !!up }, { onConflict: 'inbox_item_id,voter_nullifier' })

  if (error) {
    console.error('Error recording inbox vote:', error)
    return { ok: false, error: 'Failed to record vote' }
  }
  return { ok: true, recorded: true }
}
