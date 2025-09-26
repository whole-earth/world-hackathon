# Providers AGENTS.md

This file defines conventions and constraints for everything under `src/providers`. Its scope applies to this directory and all subpaths that import or depend on these providers.

## Architecture

- Composed providers:
  - `SupabaseProvider` — initializes the browser Supabase client using publishable env vars.
  - `MinikitProvider` — wraps the Worldcoin MiniKit SDK provider and exposes readiness flags.
  - `WorldAuthProvider` — manages World ID verification state and storage sync.
  - `CreditsProvider` — exposes swipe credit balance and mutations for verified users.
  - `ToastProvider` — ephemeral in-app toasts.
  - `AppProvider` — composes the above with an error boundary and re-exports convenience hooks.
- Hooks to use in app code (client components only):
  - `useSupabase()` — client-side Supabase.
  - `useWorldcoin()` — MiniKit object + `{ isInstalled, isReady }`.
  - `useWorldAuth()` / `useWorldVerification()` — verification state + `verify()`.
  - `useCredits()` — credit balance + `refresh()`, `addSwipe()`.
  - `useToast()` — `toast(kind, text)`.
  - `useApp()` / `useProviders()` — combined access to supabase + minikit flags.

## Ground Rules

- Do not initialize SDKs directly in `AppProvider`.
  - `AppProvider` only composes `<SupabaseProvider><MinikitProvider>{children}</MinikitProvider></SupabaseProvider>` and exports hooks.
- Keep all provider-specific initialization inside their own files:
  - `SupabaseProvider.tsx` for Supabase (browser client only).
  - `MinikitProvider.tsx` for Worldcoin MiniKit.
- Types must live in `src/types/providers.ts`. If adding fields, update:
  - `SupabaseContextType`, `MinikitContextType`, and `AppContextType`.

## Supabase Provider

- Client-only: use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Validate env at runtime; on failure, `throw Error` so the app-level error boundary can render a friendly message.
- Do not access secret keys or admin APIs here. For admin/server use, rely on `src/lib/supabase/server` helpers.

## MiniKit Provider

- Always wrap children in the SDK provider: `@worldcoin/minikit-js/minikit-provider`.
- Detect installation safely:
  - Use `MiniKit.isInstalled()` in a `try/catch`.
  - Defer first check and perform short polling (~250ms for up to ~5s) to avoid install race conditions.
- Expose via context:
  - `minikit` (the SDK object)
  - `isWorldcoinInstalled: boolean`
  - `isWorldcoinReady: boolean`
- Do not trigger MiniKit commands on mount unless they run in the same effect that installs MiniKit (to avoid race conditions).

## WorldAuth Provider

- Centralizes verified state for World ID:
  - `verified: boolean | null`, `nullifier: string | null`, `loading`, `message`, `verify()`.
- Persists a non-authoritative `localStorage` value for UX only and keeps it in sync across tabs via the `storage` event.
- Calls the server action `verifyWorldcoinAction()` which also sets/refreshes the HttpOnly cookie (`w_nh`).

## Credits Provider

- Exposes credit balance and mutations for verified users only.
- Polls `getCreditsAction()` every 5 seconds while verified; clears balance and disables polling when not verified.
- Provides optimistic `addSwipe(amount = 1)`; reconciles with a refresh on success/failure.

## Toast Provider

- Lightweight ephemeral toasts rendered in the bottom-right.
- Keep toasts brief; default auto-dismiss after ~3 seconds.

## Error Handling

- Provider files should not call `console.error` on config/init failures.
- Surface initialization failures by throwing; `AppProvider` includes an error boundary that logs once via `componentDidCatch`.

## Import/Usage Rules

- Prefer importing hooks from `@/providers/AppProvider` when available; otherwise import directly from the specific provider file (e.g., `useCredits` from `@/providers/CreditsProvider`).
- Do not import underlying contexts directly from outside this directory.
- Server code must not import these client providers; use server utilities for admin operations.

## Style & Performance

- Memoize context values to prevent unnecessary re-renders.
- Keep effects idempotent, guard browser-only work with `typeof window !== 'undefined'`.
- Avoid long-running intervals or excessive polling.

## Testing & Verification

- For World App integration, open the app inside World App via a tunnel (e.g., ngrok) to see MiniKit installed.
- Use `WorldcoinStatus` component to verify `isInstalled`/`isReady` and SDK version visibility.

## Changes & Maintenance

- When altering provider interfaces, update `src/types/providers.ts` and this AGENTS.md.
- Keep this directory self-contained and framework-agnostic where possible.
- Prefer minimal, targeted changes; avoid cross-cutting refactors outside this scope without coordination.
- Ensure polling providers (like Credits) short-circuit when prerequisites (e.g., verification) aren’t met.
