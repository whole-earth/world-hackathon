"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useWorldcoin } from "@/providers/AppProvider";
import {
  type VerifyCommandInput,
  VerificationLevel,
  type ISuccessResult,
} from "@worldcoin/minikit-js";
import { verifyHumanAndUpsertProfileAction, verifyWorldcoinAction, getAuthStatusAction } from "@/server/actions";
import type { WorldAuthContextValue } from "@/types/auth";
import { LOCAL_WORLD_NULLIFIER_KEY } from "@/constants";

const WorldAuthContext = createContext<WorldAuthContextValue | undefined>(undefined);

function getStoredNullifier(): string | null {
  // Session-scoped storage: clearing browser session resets verification UI
  try { return sessionStorage.getItem(LOCAL_WORLD_NULLIFIER_KEY); } catch { return null; }
}
function setStoredNullifier(nh: string) {
  try { sessionStorage.setItem(LOCAL_WORLD_NULLIFIER_KEY, nh); } catch {}
}

export function WorldAuthProvider({ children }: { children: React.ReactNode }) {
  const { isInstalled, minikit } = useWorldcoin();
  const [verified, setVerified] = useState<boolean | null>(null);
  const [nullifier, setNullifier] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isHuman, setIsHuman] = useState<boolean>(false);

  // Read at build-time; safe for client bundle
  const WORLD_ACTION = (process.env.NEXT_PUBLIC_WORLD_ACTION || 'voting-action').trim();
  const SIGNIN_ACTION = (process.env.NEXT_PUBLIC_WORLD_ACTION_SIGNIN || WORLD_ACTION).trim();
  const action = useMemo(() => WORLD_ACTION, [WORLD_ACTION]);
  const signinAction = useMemo(() => SIGNIN_ACTION, [SIGNIN_ACTION]);
  const signal = undefined as string | undefined;
  const MOCK = process.env.NEXT_PUBLIC_WORLDCOIN_VERIFY_MOCK === "true";

  // Initialize from server session + sessionStorage (per-tab). No cross-tab persistence.
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const status = await getAuthStatusAction()
        const nh = status.nullifier_hash || getStoredNullifier()
        if (!active) return
        if (nh) setStoredNullifier(nh)
        setNullifier(nh)
        setVerified(Boolean(nh))
        setIsHuman(Boolean(status.is_human))
      } catch {
        const nh = getStoredNullifier()
        if (!active) return
        setNullifier(nh)
        setVerified(Boolean(nh))
        setIsHuman(false)
      }
    })()
    return () => { active = false }
  }, [MOCK])

  const verify = useCallback(async () => {
    if (loading) return
    setLoading(true);
    setMessage(null);
    try {
      // World ID login only (no PoH). In mock, set a fixed nullifier via server action.
      if (MOCK && !isInstalled) {
        const nh = 'dev-nullifier'
        await verifyWorldcoinAction({ nullifier_hash: nh, action: signinAction, signal })
        setStoredNullifier(nh)
        setNullifier(nh)
        setVerified(true)
        setMessage('Signed in (mock)')
        return
      }

      if (!isInstalled) throw new Error("MiniKit not detected. Open in World App.");

      const verifyPayload: VerifyCommandInput = {
        action: signinAction,
        signal,
        // Sign-in should be the lowest bar (Device). The Dev Portal action for `signinAction` must allow Device.
        verification_level: VerificationLevel.Device,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { finalPayload }: any = await minikit.commandsAsync.verify(verifyPayload);
      if (!finalPayload || finalPayload.status === "error") {
        throw new Error("Verification cancelled or failed in World App");
      }

      const nh: string | undefined = (finalPayload as ISuccessResult)?.nullifier_hash;
      if (!nh) throw new Error("Missing nullifier_hash in response");

      const res = await verifyWorldcoinAction({ payload: finalPayload as ISuccessResult, action: signinAction, signal })
      if (!res?.ok) throw new Error('Sign-in failed')
      setStoredNullifier(nh)
      setNullifier(nh)
      setVerified(true)
      setMessage('Signed in')
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [MOCK, isInstalled, minikit, signal, loading, signinAction]);

  const verifyHumanity = useCallback(async () => {
    if (loading) return
    setLoading(true)
    setMessage(null)
    try {
      if (MOCK && !isInstalled) {
        const nh = nullifier || 'dev-nullifier'
        const fallbackUsername = `user-${nh.slice(0, 6)}`
        await verifyHumanAndUpsertProfileAction({ nullifier_hash: nh, username: fallbackUsername })
        setIsHuman(true)
        setMessage('Humanity verified (mock)')
        return
      }
      if (!isInstalled) throw new Error('MiniKit not detected. Open in World App.')
      const verifyPayload: VerifyCommandInput = {
        action,
        signal,
        verification_level: VerificationLevel.Orb,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { finalPayload }: any = await minikit.commandsAsync.verify(verifyPayload)
      if (!finalPayload || finalPayload.status === 'error') {
        throw new Error('Verification cancelled or failed in World App')
      }
      const nh: string | undefined = (finalPayload as ISuccessResult)?.nullifier_hash
      if (!nh) throw new Error('Missing nullifier_hash in response')
      const world_username: string | undefined = (minikit as { user?: { username?: string } })?.user?.username || undefined
      const username = world_username || `user-${nh.slice(0, 6)}`
      const data = await verifyHumanAndUpsertProfileAction({
        payload: finalPayload as ISuccessResult,
        action,
        signal,
        world_username: world_username || undefined,
        username,
      })
      if (!data?.ok) throw new Error('Humanity verification failed')
      setIsHuman(true)
      setMessage(world_username ? `Verified as @${world_username}` : 'Humanity verified')
    } catch (err) {
      setMessage((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [MOCK, action, isInstalled, minikit, signal, loading, nullifier])

  const value = useMemo<WorldAuthContextValue>(() => ({
    verified,
    nullifier,
    loading,
    message,
    isInstalled,
    verify,
    isHuman,
    verifyHumanity,
  }), [verified, nullifier, loading, message, isInstalled, verify, isHuman, verifyHumanity]);

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
