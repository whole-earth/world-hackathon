// Profiles shared types

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

export type VerifyAndUpsertInput = {
  payload?: import('@worldcoin/minikit-js').ISuccessResult
  nullifier_hash?: string
  action?: string
  signal?: string
  username?: string
  world_username?: string
}

export type VerifyAndUpsertResult = {
  ok: true
  profile: ProfileRow
  nullifier_hash: string
}

