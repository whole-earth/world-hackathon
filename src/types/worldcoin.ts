import type { ISuccessResult, IVerifyResponse } from '@worldcoin/minikit-js'

// Input type used by server verify action and service
export type VerifyActionInput = {
  payload?: ISuccessResult
  nullifier_hash?: string
  action?: string
  signal?: string
}

// Service layer input/output
export type VerifyInput = VerifyActionInput
export type VerifySuccess = { nullifier_hash: string; verifyRes?: IVerifyResponse }

// Public verify action result
export type VerifyActionResult = { ok: true } & VerifySuccess

