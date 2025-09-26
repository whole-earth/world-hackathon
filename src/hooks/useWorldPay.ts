"use client"

import { useCallback } from 'react'
import { initiateWorldPayAction, confirmWorldPayAction } from '@/server/actions'
import type { MiniAppPaymentSuccessPayload } from '@worldcoin/minikit-js'

export type InitiateWorldPayParams = {
  amountUsd: number
  description?: string
}

export type InitiateWorldPayResponse = {
  reference: string
  to: string
  description?: string
}

export function useWorldPay() {
  const isMock = process.env.NEXT_PUBLIC_WORLDCOIN_VERIFY_MOCK === 'true'
  const initiateWorldPay = useCallback(async (amountUsd: number, description?: string): Promise<InitiateWorldPayResponse> => {
    const res = await initiateWorldPayAction({ amountUsd, description })
    return { reference: res.reference, to: res.to, description: res.description }
  }, [])

  const confirmWorldPay = useCallback(async (payload: MiniAppPaymentSuccessPayload) => {
    if (isMock) {
      // Bypass MiniKit in mock mode; confirm server-side (no-op) for consistency
      return await confirmWorldPayAction()
    }
    return await confirmWorldPayAction(payload)
  }, [])

  const autoApproveWorldPay = useCallback(async (amountUsd: number, description?: string) => {
    if (!isMock) throw new Error('autoApproveWorldPay is only available in mock mode')
    // Create synthetic initiation (server returns synthetic reference; no DB write)
    const res = await initiateWorldPayAction({ amountUsd, description })
    // Confirm immediately (server returns mock-confirmed; no DB write)
    const confirmed = await confirmWorldPayAction()
    return { init: res, confirm: confirmed }
  }, [isMock])

  return { isMock, initiateWorldPay, confirmWorldPay, autoApproveWorldPay }
}
