// Shared auth-related types

export type WorldAuthContextValue = {
  // World ID session (cookie) present
  verified: boolean | null
  nullifier: string | null
  loading: boolean
  message: string | null
  isInstalled: boolean
  // Initiate World ID sign-in (sets cookie only)
  verify: () => Promise<void>
  // Proof-of-humanity state + action (Orb-level)
  isHuman: boolean
  verifyHumanity: () => Promise<void>
}
