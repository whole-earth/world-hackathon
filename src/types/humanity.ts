import type { ProfileRow } from './profiles'

export type VerifyHumanAndUpsertInput = {
  payload?: import('@worldcoin/minikit-js').ISuccessResult
  nullifier_hash?: string
  action?: string
  signal?: string
  username?: string
  world_username?: string
}

export type VerifyHumanAndUpsertResult = {
  ok: true
  nullifier_hash: string
  is_human: boolean
  verification_level?: string
  profile: ProfileRow
}

