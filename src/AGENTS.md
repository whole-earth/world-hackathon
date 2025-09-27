# Agents — Whole World Catalog (Updated Spec)

This document reflects the current architecture after the refactor to Server Actions and a simplified UI.

---

## Overview

- Human-verified commons with a Snapchat-style two-pane UI.
- Worldcoin primitive in use: World ID (proof-of-personhood).
- Current UX:
  - Pre-verify: Landing screen with a single “Verify with World ID” CTA.
  - Post-verify: Full-screen horizontal swipe between two panels:
    - Channels (default, right panel)
    - Filters (left panel)

---

## Architecture

- Client State
  - WorldAuthProvider: shared verification state (verified, nullifier, loading, message).
    - File: src/providers/WorldAuthProvider.tsx
    - Persists an HttpOnly cookie on the server and a non-authoritative sessionStorage key for UX only (session-scoped).
  - useWorldVerification(): thin hook that reads provider state.
    - File: src/hooks/useWorldVerification.ts
  - MinikitProvider: detects World App MiniKit; errors suppressed when not installed.
    - File: src/providers/MinikitProvider.tsx
  - SupabaseProvider: initializes the browser Supabase client with no auth persistence.
    - File: src/providers/SupabaseProvider.tsx
    - Config: `{ auth: { persistSession: false, autoRefreshToken: false } }` to avoid localStorage writes.

- Server Actions (preferred over REST endpoints)
  - verifyWorldcoinAction(input)
    - File: src/server/actions/worldcoin.ts
    - Verifies a MiniKit proof (or mock), sets HttpOnly cookie `w_nh` with the nullifier.
    - Rate-limited per-IP.
  - verifyAndUpsertProfileAction(input)
    - File: src/server/actions/profiles.ts
    - Ensures verified context (see ensureVerifiedNullifier), upserts a `profiles` row bound to the nullifier.
    - Rate-limited per-IP.

- Verification Guard
  - ensureVerifiedNullifier(input)
    - File: src/server/lib/world-verify.ts
    - Resolves a verified nullifier in priority order:
      1) Existing cookie (session already verified)
      2) If mock mode and `payload.nullifier_hash` or `nullifier_hash` is provided, accept and set cookie
      3) If production, verify `payload` with Worldcoin Cloud and set cookie
    - Option: `allowAutoMock` (default true). When false, mock mode will not auto-create a session; used for SSR page guards.

- Cookies
  - Helpers: src/server/lib/cookies.ts
  - Name: `w_nh`, HttpOnly, SameSite=Lax, Secure in production. Session cookie (no maxAge).
  - Do not trust client storage for authorization.

- Env Vars
  - Server: `WORLD_APP_ID` (Worldcoin App ID), `WORLDCOIN_VERIFY_MOCK` (true/false)
  - Client: `NEXT_PUBLIC_WORLD_ACTION` (action slug), `NEXT_PUBLIC_WORLDCOIN_VERIFY_MOCK` (true/false)

---

## Data Model (Current)

- profiles
  - worldcoin_nullifier (text, unique)
  - username (text)
  - world_username (text, nullable)
  - created_at/updated_at (timestamptz)
  - Implemented in: src/server/services/profiles.ts

Note: Other tables from the original vision (items, votes, credits, unlocks, payments) are not yet implemented in UI. Payments are now scaffolded in backend + hook.

---

## UI

- LandingScreen
  - File: src/components/LandingScreen.tsx
  - Uses `useWorldVerification()` directly; shows MiniKit detection hint; calls `verify()`.

- SwipeShell
  - File: src/components/SwipeShell.tsx
  - Two panels on a 200% track; default shows Channels (right panel). Swipe right to reveal Filters (left).
  - Pixel-based drag with clamped bounds; 20% width threshold to snap; 200ms transition.
  - Haptics on snap via `navigator.vibrate(15)` when supported.
  - Bottom pill tabs (Filters | Channels). Active = white; inactive = white/60.

- ThemeSwipeShell
  - File: src/components/ThemeSwipeShell.tsx
  - Two panels on a 200% track: [Channels | Theme]. Default shows Theme (right panel). Swipe right to reveal Channels.
  - Mirrors SwipeShell’s drag thresholds and axis locking; respects `[data-swipe-lock]` regions.
  - Emits the same animation for programmatic back via `swipeback:go` event (used by BackButton).
  - After snapping to Channels, navigates to `/` to keep canonical routing.

- ChannelsList / FiltersPane
  - Files: src/components/ExplorePanel/ChannelsList.tsx, src/components/SortPanel/FiltersPane.tsx
  - Placeholder content; wiring points for future features.

- Back Button
  - File: src/components/Header/BackButton.tsx
  - Circular button with left chevron. Dispatches `swipeback:go` for animated back; falls back to router navigation.

- Mapping
  - File: src/constants/themeChannelMap.ts
  - `mapThemeToChannel(slug)` converts theme slug to canonical channel slug (e.g., `crypto` → `cryptography`).
  - `CHANNEL_TO_THEME` provides reverse mapping for client caches (e.g., unlocked channels → theme slugs).

---

## Server Actions vs API

- We use Next.js Server Actions instead of REST endpoints for app interactions.
- Existing actions:
  - `verifyWorldcoinAction(input)` → returns `{ ok, nullifier_hash }` and sets cookie.
  - `verifyAndUpsertProfileAction(input)` → returns `{ ok, profile, nullifier_hash }`.
  - `initiateWorldPayAction({ amountUsd, description? })` → returns `{ ok, reference, to, description? }`. Stores a row in `payments` with status `initiated` bound to the caller's nullifier. Use the returned `reference` and `to` to build the MiniKit `pay` payload on the client.
  - `confirmWorldPayAction(payload)` → Verifies the MiniKit payment by querying the Developer Portal using `transaction_id` and `reference`, checks ownership and recipient, updates the `payments` row with `status`, `transaction_id`, and token details, and returns `{ ok, success, status }`.
  - `unlockThemeWithPaymentAction({ reference, themeSlug })` → After a successful confirmation, validates that the payment belongs to the caller and is not failed, then creates an idempotent unlock in `theme_unlocks` with method `payment`. In mock mode, bypasses payment checks and creates an unlock with method `mock`.
  - Dev: `clearSessionAction()` → clears the auth cookie; used by the client-only helper that exposes `window.clearSession()`.
- When adding new mutations/queries, prefer Server Actions and call `ensureVerifiedNullifier()` at the top to bind the call to a verified user.
- If public/SSR endpoints are needed later, keep the same cookie gate and rate limiting patterns.

---

## Security Notes

- Authorization trusts the HttpOnly cookie (`w_nh`), not client-provided fields.
- SessionStorage `worldcoin_nullifier` is for UX-only UI state; clearing the session resets the flow.
- Use `assertRateLimit` for abuse controls (see existing actions).
- Dev convenience: `window.clearSession()` clears cookie and local caches, then reloads.

---
