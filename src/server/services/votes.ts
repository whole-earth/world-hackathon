import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function recordVote(
  voterNullifier: string,
  postId: string,
  isYay: boolean
): Promise<{ recorded: boolean }> {
  const admin = getSupabaseAdmin()

  // Insert vote (one per user per post). If conflict, treat as not recorded.
  const { error: insertErr } = await admin
    .from('votes')
    .insert({ post_id: postId, voter_nullifier: voterNullifier, is_yay: isYay })

  if (insertErr) {
    // Unique violation means the user already voted. We don't update counts.
    // For other errors, surface as not recorded.
    return { recorded: false }
  }

  // For now we only record the vote row; counts can be updated by a trigger or a later reconciliation.
  return { recorded: true }
}
