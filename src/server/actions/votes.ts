"use server"

import { ensureVerifiedNullifier } from '@/server/lib/world-verify'
import { upsertProfileByNullifier } from '@/server/services'
import { recordVote } from '@/server/services/votes'
import type { RecordVoteInput, RecordVoteResult } from '@/types'

function isUUID(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

// Record a vote for the verified user. Idempotent per (postId, voter).
export async function recordVoteAction(input: RecordVoteInput): Promise<RecordVoteResult> {
  const postId = input?.postId
  const yay = !!input?.yay
  if (!postId || !isUUID(postId)) throw new Error('Invalid postId')

  // Optional: IP-based rate limiting can be re-enabled later using next/headers

  const { nullifier_hash } = await ensureVerifiedNullifier({})

  // Ensure a profile row exists to satisfy FK
  try {
    await upsertProfileByNullifier({
      worldcoin_nullifier: nullifier_hash,
      username: `user-${nullifier_hash.slice(0, 8)}`,
      world_username: null,
    })
  } catch {}

  const res = await recordVote(nullifier_hash, postId, yay)
  return { ok: true, recorded: res.recorded }
}
