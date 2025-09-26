"use client"

import { useWorldAuth } from "@/providers/WorldAuthProvider";

export interface UseWorldVerification {
  verified: boolean | null;
  nullifier: string | null;
  loading: boolean;
  message: string | null;
  isInstalled: boolean;
  verify: () => Promise<void>;
}

export function useWorldVerification(): UseWorldVerification {
  // Delegate to provider so state is shared app-wide
  return useWorldAuth();
}
