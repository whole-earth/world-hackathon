// Theme unlocks shared types

export type ThemeUnlockRow = {
  id: string
  worldcoin_nullifier: string
  theme_slug: string
  method: 'payment' | 'credits' | 'mock'
  payment_reference: string | null
  created_at: string
}

export type CreateThemeUnlockInput = {
  worldcoin_nullifier: string
  theme_slug: string
  method: 'payment' | 'credits' | 'mock'
  payment_reference?: string | null
}

export type UnlockThemeWithPaymentInput = { reference: string; themeSlug: string }
export type UnlockThemeWithPaymentResult = {
  ok: true
  unlocked: boolean
  themeSlug: string
  method: 'payment' | 'mock'
}

export type GetUnlockedThemesResult = { ok: true; themes: string[] }

