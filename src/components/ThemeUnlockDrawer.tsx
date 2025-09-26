"use client"

import { useCallback, useMemo, useState } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { useWorldcoin } from '@/providers/AppProvider'
import { MiniKit, Tokens, tokenToDecimals, type PayCommandInput } from '@worldcoin/minikit-js'
import { useWorldPay } from '@/hooks/useWorldPay'
import { unlockThemeWithPaymentAction, spendCreditsAndUnlockAction } from '@/server/actions'
import { useToast } from '@/providers/ToastProvider'
import { useCredits } from '@/providers/CreditsProvider'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  themeSlug: string
  themeTitle: string
  onUnlocked?: (slug: string) => void
}

type Step = 'intro' | 'method' | 'processing' | 'done' | 'error'

type Toast = { id: number; kind: 'success' | 'error' | 'info'; text: string }

export function ThemeUnlockDrawer({ open, onOpenChange, themeSlug, themeTitle, onUnlocked }: Props) {
  const { isInstalled } = useWorldcoin()
  const { isMock, initiateWorldPay, confirmWorldPay, autoApproveWorldPay } = useWorldPay()

  const [step, setStep] = useState<Step>('intro')
  const [message, setMessage] = useState<string | null>(null)
  const { balance, refresh: refreshCredits } = useCredits()
  const { toast } = useToast()

  const description = useMemo(() => `Unlock Theme: ${themeTitle}`, [themeTitle])

  const handleBack = useCallback(() => {
    if (step === 'intro') {
      onOpenChange(false)
    } else if (step === 'method') {
      setStep('intro')
    }
  }, [onOpenChange, step])

  const startUnlock = useCallback(() => {
    setStep('method')
    setMessage(null)
  }, [])

  const pushToast = toast

  const unlockWithWLD = useCallback(async () => {
    try {
      setStep('processing')
      setMessage('Starting payment…')

      if (isMock) {
        await autoApproveWorldPay(1, description)
        await unlockThemeWithPaymentAction({ reference: 'mock', themeSlug })
        setMessage('Unlocked (mock)')
        setStep('done')
        onUnlocked?.(themeSlug)
        return
      }

      if (!isInstalled || !MiniKit?.isInstalled?.()) {
        throw new Error('MiniKit not detected. Open in World App.')
      }

      const init = await initiateWorldPay(1, description)

      const payload: PayCommandInput = {
        reference: init.reference,
        to: init.to,
        tokens: [
          { symbol: Tokens.WLD, token_amount: tokenToDecimals(1, Tokens.WLD).toString() },
        ],
        description,
      }

      setMessage('Confirm in World App…')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { finalPayload }: any = await MiniKit.commandsAsync.pay(payload)
      if (!finalPayload || finalPayload.status === 'error') {
        throw new Error('Payment cancelled or failed in World App')
      }

      setMessage('Verifying payment…')
      const conf = await confirmWorldPay(finalPayload)
      if (!conf?.success) {
        throw new Error(`Payment not confirmed (status: ${conf?.status || 'unknown'})`)
      }

      setMessage('Unlocking…')
      await unlockThemeWithPaymentAction({ reference: init.reference, themeSlug })
      setStep('done')
      setMessage('Unlocked!')
      pushToast('success', 'Unlocked with WLD')
      onUnlocked?.(themeSlug)
    } catch (err) {
      setStep('error')
      const m = (err as Error)?.message || 'Something went wrong'
      setMessage(m)
      pushToast('error', m)
    }
  }, [autoApproveWorldPay, confirmWorldPay, description, initiateWorldPay, isInstalled, isMock, onUnlocked, themeSlug, pushToast])

  const unlockWithCredits = useCallback(async () => {
    try {
      setStep('processing')
      setMessage('Spending credits…')
      const res = await spendCreditsAndUnlockAction({ themeSlug, cost: 20 })
      await refreshCredits()
      setStep('done')
      setMessage('Unlocked!')
      pushToast('success', 'Unlocked with credits')
      onUnlocked?.(themeSlug)
    } catch (err) {
      setStep('error')
      const m = (err as Error)?.message || 'Unable to unlock with credits'
      setMessage(m)
      pushToast('error', m)
    }
  }, [onUnlocked, themeSlug, pushToast])

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{step === 'method' ? 'Choose Unlock Method' : 'Unlock Required'}</DrawerTitle>
          <DrawerDescription>
            {step === 'intro' && (
              <>You need to unlock this theme to view its contents.</>
            )}
            {step === 'method' && (
              <>Unlock “{themeTitle}”</>
            )}
            {step === 'processing' && (message || 'Processing…')}
            {step === 'done' && 'Unlocked successfully.'}
            {step === 'error' && (message || 'Error')}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-2">
          {step === 'intro' && (
            <div className="text-sm text-muted-foreground">This channel requires an unlock.</div>
          )}
          {step === 'method' && (
            <div className="space-y-3">
              <button
                className="w-full rounded-md bg-white text-black py-2 font-medium"
                onClick={unlockWithWLD}
              >
                Unlock with 1 WLD
              </button>
              <button
                className="w-full rounded-md bg-white/10 text-white py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={unlockWithCredits}
                disabled={balance !== null && balance < 20}
              >
                {balance !== null ? `Unlock with 20 swipes (You have ${balance})` : 'Unlock with 20 swipes'}
              </button>
            </div>
          )}
        </div>

        <DrawerFooter>
          {step === 'intro' && (
            <div className="flex w-full gap-2">
              <button
                className="flex-1 rounded-md border border-white/20 py-2"
                onClick={handleBack}
              >
                Go back
              </button>
              <button
                className="flex-1 rounded-md bg-white text-black py-2 font-medium"
                onClick={startUnlock}
              >
                Unlock
              </button>
            </div>
          )}
          {step === 'method' && (
            <div className="flex w-full gap-2">
              <button
                className="flex-1 rounded-md border border-white/20 py-2"
                onClick={handleBack}
              >
                Back
              </button>
            </div>
          )}
          {step === 'processing' && (
            <div className="text-center text-sm text-muted-foreground">{message}</div>
          )}
          {step === 'done' && (
            <div className="flex w-full gap-2">
              <button
                className="flex-1 rounded-md bg-white text-black py-2 font-medium"
                onClick={() => onOpenChange(false)}
              >
                Close
              </button>
            </div>
          )}
          {step === 'error' && (
            <div className="flex w-full gap-2">
              <button
                className="flex-1 rounded-md border border-red-500 text-red-200 py-2"
                onClick={() => setStep('method')}
              >
                Try again
              </button>
              <button
                className="flex-1 rounded-md bg-white text-black py-2 font-medium"
                onClick={() => onOpenChange(false)}
              >
                Close
              </button>
            </div>
          )}
        </DrawerFooter>
      </DrawerContent>

      {/* Toasts are handled by ToastProvider */}
    </Drawer>
  )
}
