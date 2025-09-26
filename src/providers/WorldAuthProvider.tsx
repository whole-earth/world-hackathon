"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useWorldcoin } from "@/providers/AppProvider";
import {
  type VerifyCommandInput,
  VerificationLevel,
  type ISuccessResult,
} from "@worldcoin/minikit-js";
import { verifyWorldcoinAction } from "@/server/actions";
import { WORLD_ACTION } from "@/config/worldcoin";

type WorldAuthContextValue = {
  verified: boolean | null;
  nullifier: string | null;
  loading: boolean;
  message: string | null;
  isInstalled: boolean;
  verify: () => Promise<void>;
};

const WorldAuthContext = createContext<WorldAuthContextValue | undefined>(undefined);

const STORAGE_KEY = "worldcoin_nullifier";

function getStoredNullifier(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function setStoredNullifier(nh: string) {
  try { localStorage.setItem(STORAGE_KEY, nh); } catch {}
}

export function WorldAuthProvider({ children }: { children: React.ReactNode }) {
  const { isInstalled, minikit } = useWorldcoin();
  const [verified, setVerified] = useState<boolean | null>(null);
  const [nullifier, setNullifier] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const action = useMemo(() => WORLD_ACTION, []);
  const signal = undefined as string | undefined;
  const MOCK = process.env.NEXT_PUBLIC_WORLDCOIN_VERIFY_MOCK === "true";

  // Initialize and keep in sync with storage (multi-tab safety)
  useEffect(() => {
    const nh = getStoredNullifier();
    setNullifier(nh);
    setVerified(Boolean(nh));

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const next = e.newValue;
        setNullifier(next);
        setVerified(Boolean(next));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const verify = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      if (MOCK && !isInstalled) {
        const nh = "dev-nullifier";
        // Call server action to set secure cookie even in mock mode
        try { await verifyWorldcoinAction({ nullifier_hash: nh }); } catch {}
        setStoredNullifier(nh);
        setNullifier(nh);
        setVerified(true);
        setMessage("Verified (mock)");
        return;
      }

      if (!isInstalled) throw new Error("MiniKit not detected. Open in World App.");

      const verifyPayload: VerifyCommandInput = {
        action,
        signal,
        verification_level: VerificationLevel.Orb,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { finalPayload }: any = await minikit.commandsAsync.verify(verifyPayload);
      if (!finalPayload || finalPayload.status === "error") {
        throw new Error("Verification cancelled or failed in World App");
      }

      const data = await verifyWorldcoinAction({
        payload: finalPayload as ISuccessResult,
        action,
        signal,
      });
      if (!data?.ok) throw new Error("Verification failed");

      const nh: string | undefined = data?.nullifier_hash;
      if (!nh) throw new Error("Missing nullifier_hash in response");

      setStoredNullifier(nh);
      setNullifier(nh);
      setVerified(true);
      setMessage("Verified successfully");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [MOCK, action, isInstalled, minikit, signal]);

  const value = useMemo<WorldAuthContextValue>(() => ({
    verified,
    nullifier,
    loading,
    message,
    isInstalled,
    verify,
  }), [verified, nullifier, loading, message, isInstalled, verify]);

  return (
    <WorldAuthContext.Provider value={value}>
      {children}
    </WorldAuthContext.Provider>
  );
}

export function useWorldAuth(): WorldAuthContextValue {
  const ctx = useContext(WorldAuthContext);
  if (!ctx) throw new Error("useWorldAuth must be used within WorldAuthProvider");
  return ctx;
}
