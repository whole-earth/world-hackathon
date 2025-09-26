import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/server'
import type { UpsertProfileInput, ProfileRow } from '@/types'

export async function upsertProfileByNullifier(input: UpsertProfileInput): Promise<ProfileRow> {
  const admin = getSupabaseAdmin()
  const { worldcoin_nullifier, username, world_username } = input

  const { data, error } = await admin
    .from('profiles')
    .upsert(
      {
        worldcoin_nullifier,
        username,
        world_username: world_username ?? null,
      },
      { onConflict: 'worldcoin_nullifier' }
    )
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }
  return data as ProfileRow
}
