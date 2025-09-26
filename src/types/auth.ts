// Shared auth-related types

export type WorldAuthContextValue = {
  verified: boolean | null
  nullifier: string | null
  loading: boolean
  message: string | null
  isInstalled: boolean
  verify: () => Promise<void>
}

