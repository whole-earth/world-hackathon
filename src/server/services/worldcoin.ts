import 'server-only'

import { verifyCloudProof, type IVerifyResponse } from '@worldcoin/minikit-js'
import { getWorldcoinServerConfig, isWorldcoinMockEnabled } from '@/server/config/worldcoin'
import type { VerifyInput, VerifySuccess } from '@/types'

export class WorldcoinVerifyError extends Error {
  statusCode: number
  code?: string
  attribute?: string | null
  constructor(message: string, opts?: { statusCode?: number; code?: string; attribute?: string | null }) {
    super(message)
    this.name = 'WorldcoinVerifyError'
    this.statusCode = opts?.statusCode ?? 400
    this.code = opts?.code
    this.attribute = opts?.attribute ?? null
  }
}


export async function verifyWorldcoinProof(input: VerifyInput): Promise<VerifySuccess> {
  const mock = isWorldcoinMockEnabled()

  if (mock) {
    const nh = input.payload?.nullifier_hash || input.nullifier_hash
    if (!nh) {
      throw new WorldcoinVerifyError('Missing nullifier_hash for mock verification', { statusCode: 400 })
    }
    return { nullifier_hash: nh }
  }

  const { appId, action: defaultAction } = getWorldcoinServerConfig()
  if (!appId) throw new WorldcoinVerifyError('Missing WORLD_APP_ID', { statusCode: 500 })

  const payload = input.payload
  const action = input.action || defaultAction

  if (!payload) throw new WorldcoinVerifyError('Missing payload', { statusCode: 400 })
  if (!action) throw new WorldcoinVerifyError('Missing action', { statusCode: 400 })

  const verifyRes = (await verifyCloudProof(payload, appId, action, input.signal)) as IVerifyResponse

  if (!verifyRes.success) {
    throw new WorldcoinVerifyError(verifyRes.detail || 'Verification failed', {
      statusCode: 400,
      code: verifyRes.code,
      attribute: verifyRes.attribute ?? null,
    })
  }

  return { nullifier_hash: payload.nullifier_hash, verifyRes }
}
