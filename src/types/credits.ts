// Credits domain shared types

export type GetCreditsResult = { ok: true; balance: number }

export type SpendCreditsAndUnlockInput = { themeSlug: string; cost?: number }
export type SpendCreditsAndUnlockResult = { ok: true; unlocked: boolean; balance: number; themeSlug: string }

export type AddSwipeCreditInput = { amount?: number; reason?: string }
export type AddSwipeCreditResult = { ok: true; balance: number }

// DB row shapes
export type UserCreditsRow = {
  worldcoin_nullifier: string
  credits: number
  updated_at: string
  created_at: string
}

