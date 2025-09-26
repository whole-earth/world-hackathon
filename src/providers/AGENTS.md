# Providers AGENTS.md

This file defines conventions and constraints for everything under `src/providers`. Its scope applies to this directory and all subpaths that import or depend on these providers.

## Architecture

- Composed providers:
  - `SupabaseProvider` — initializes the browser Supabase client using publishable env vars.
  - `MinikitProvider` — wraps the Worldcoin MiniKit SDK provider and exposes readiness flags.
  - `AppProvider` — composes both providers and re-exports convenience hooks.
- Hooks to use in app code (client components only):
  - `useSupabase()` — client-side Supabase.
  - `useWorldcoin()` — MiniKit object + `{ isInstalled, isReady }`.
  - `useApp()` / `useProviders()` — combined access to both.

## Ground Rules

- Do not initialize SDKs directly in `AppProvider`.
  - `AppProvider` only composes `<SupabaseProvider><MinikitProvider>{children}</MinikitProvider></SupabaseProvider>` and exports hooks.
- Keep all provider-specific initialization inside their own files:
  - `SupabaseProvider.tsx` for Supabase (browser client only).
  - `MinikitProvider.tsx` for Worldcoin MiniKit.
- Types must live in `src/types/providers.ts`. If adding fields, update:
  - `SupabaseContextType`, `MinikitContextType`, and `ProvidersHookReturn`.

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

## Error Handling

- Provider files should not call `console.error` on config/init failures.
- Surface initialization failures by throwing; `AppProvider` includes an error boundary.

## Import/Usage Rules

- Application code should import hooks from `@/providers/AppProvider` only.
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

