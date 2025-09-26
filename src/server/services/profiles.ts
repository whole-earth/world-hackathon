import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/server'

export type UpsertProfileInput = {
  worldcoin_nullifier: string
  username: string
  world_username?: string | null
}

export type ProfileRow = {
  id: string
  worldcoin_nullifier: string
  username: string
  world_username: string | null
  world_app_address: string | null
  created_at: string
  updated_at: string
}

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
