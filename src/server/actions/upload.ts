"use server"

import { getSupabaseAdmin } from '@/lib/supabase/server'
import { assertRateLimit } from '@/server/lib/rate-limit'

export type UploadMediaInput = {
  title: string
  subtitle?: string
  color: string
  description?: string
  category?: string
  uploaded_by: string // worldcoin_nullifier
}

export type UploadMediaResult = {
  ok: true
  id: string
} | {
  ok: false
  error: string
}

export async function uploadMediaAction(input: UploadMediaInput): Promise<UploadMediaResult> {
  try {
    await assertRateLimit('media-upload', 5, 60000) // 5 uploads per minute
    
    const supabase = getSupabaseAdmin()
    
    const { data, error } = await supabase
      .from('media_inbox')
      .insert({
        title: input.title,
        subtitle: input.subtitle,
        color: input.color,
        description: input.description,
        category: input.category,
        uploaded_by: input.uploaded_by
      })
      .select('id')
      .single()
    
    if (error) {
      console.error('Error uploading media:', error)
      return { ok: false, error: 'Failed to upload media' }
    }
    
    return { ok: true, id: data.id }
  } catch (error) {
    console.error('Error in uploadMediaAction:', error)
    return { ok: false, error: 'Internal server error' }
  }
}

export type MarkInboxItemViewedInput = {
  worldcoin_nullifier: string
  inbox_item_id: string
}

export type MarkInboxItemViewedResult = {
  ok: true
} | {
  ok: false
  error: string
}

export async function markInboxItemViewedAction(
  input: MarkInboxItemViewedInput
): Promise<MarkInboxItemViewedResult> {
  try {
    await assertRateLimit('mark-viewed', 50, 60000) // 50 marks per minute
    
    const supabase = getSupabaseAdmin()
    
    const { error } = await supabase
      .from('user_inbox_views')
      .upsert({
        worldcoin_nullifier: input.worldcoin_nullifier,
        inbox_item_id: input.inbox_item_id,
        viewed_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('Error marking item as viewed:', error)
      return { ok: false, error: 'Failed to mark item as viewed' }
    }
    
    return { ok: true }
  } catch (error) {
    console.error('Error in markInboxItemViewedAction:', error)
    return { ok: false, error: 'Internal server error' }
  }
}

export type GetUnseenInboxItemsInput = {
  worldcoin_nullifier: string
  limit?: number
  cursor?: string
}

export type GetUnseenInboxItemsResult = {
  ok: true
  items: Array<{
    id: string
    title: string
    subtitle?: string
    color: string
    description?: string
    created_at: string
  }>
  hasMore: boolean
  nextCursor?: string
} | {
  ok: false
  error: string
}

export async function getUnseenInboxItemsAction(
  input: GetUnseenInboxItemsInput
): Promise<GetUnseenInboxItemsResult> {
  try {
    await assertRateLimit('get-unseen-inbox', 20, 60000) // 20 requests per minute
    
    const { worldcoin_nullifier, limit = 10, cursor } = input
    const supabase = getSupabaseAdmin()
    
    let query = supabase
      .from('user_unseen_inbox')
      .select('inbox_item_id, title, subtitle, color, description, category, created_at')
      .eq('worldcoin_nullifier', worldcoin_nullifier)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (cursor) {
      query = query.lt('created_at', cursor)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching unseen inbox items:', error)
      return { ok: false, error: 'Failed to fetch unseen items' }
    }
    
    const items = (data || []).map(item => ({
      id: item.inbox_item_id,
      title: item.title,
      subtitle: item.subtitle,
      color: item.color,
      description: item.description,
      category: item.category,
      created_at: item.created_at
    }))
    
    return {
      ok: true,
      items,
      hasMore: items.length === limit,
      nextCursor: items.length > 0 ? items[items.length - 1].created_at : undefined
    }
  } catch (error) {
    console.error('Error in getUnseenInboxItemsAction:', error)
    return { ok: false, error: 'Internal server error' }
  }
}
