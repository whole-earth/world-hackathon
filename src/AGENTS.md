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
    - Filters (left panel, “TBD stack”)

---

## Architecture

- Client State
  - WorldAuthProvider: shared verification state (verified, nullifier, loading, message).
    - File: src/providers/WorldAuthProvider.tsx
    - Persists an HttpOnly cookie on the server and a non-authoritative localStorage key for UX only.
  - useWorldVerification(): thin hook that reads provider state.
    - File: src/hooks/useWorldVerification.ts
  - MinikitProvider: detects World App MiniKit; errors suppressed when not installed.
    - File: src/providers/MinikitProvider.tsx

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
      2) Mock mode: `payload.nullifier_hash` or `nullifier_hash`
      3) Production: verify `payload` with Worldcoin Cloud
    - Refreshes/sets cookie when verifying or accepting mock.

- Cookies
  - Helpers: src/server/lib/cookies.ts
  - Name: `w_nh`, HttpOnly, SameSite=Lax, Secure in production.
  - Do not trust localStorage for authorization.

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
  - File: src/components/Swipe/SwipeShell.tsx
  - Two panels on a 200% track; default shows Channels (right panel). Swipe right to reveal Filters (left).
  - Pixel-based drag with clamped bounds; 20% width threshold to snap; 200ms transition.
  - Haptics on snap via `navigator.vibrate(15)` when supported.
  - Bottom pill tabs (Filters | Channels). Active = white; inactive = white/60.

- ChannelsList / FiltersPane
  - Files: src/components/Swipe/ChannelsList.tsx, src/components/Swipe/FiltersPane.tsx
  - Placeholder content; wiring points for future features.

---

## Server Actions vs API

- We use Next.js Server Actions instead of REST endpoints for app interactions.
- Existing actions:
  - `verifyWorldcoinAction(input)` → returns `{ ok, nullifier_hash }` and sets cookie.
  - `verifyAndUpsertProfileAction(input)` → returns `{ ok, profile, nullifier_hash }`.
  - `initiateWorldPayAction({ amountUsd, description? })` → returns `{ ok, reference, to, description? }`. Stores a row in `payments` with status `initiated` bound to the caller's nullifier. Use the returned `reference` and `to` to build the MiniKit `pay` payload on the client.
  - `confirmWorldPayAction(payload)` → Verifies the MiniKit payment by querying the Developer Portal using `transaction_id` and `reference`, checks ownership and recipient, updates the `payments` row with `status`, `transaction_id`, and token details, and returns `{ ok, success, status }`.
  - `unlockThemeWithPaymentAction({ reference, themeSlug })` → After a successful confirmation, validates that the payment belongs to the caller and is not failed, then creates an idempotent unlock in `theme_unlocks` with method `payment`. In mock mode, bypasses payment checks and creates an unlock with method `mock`.
- When adding new mutations/queries, prefer Server Actions and call `ensureVerifiedNullifier()` at the top to bind the call to a verified user.
- If public/SSR endpoints are needed later, keep the same cookie gate and rate limiting patterns.

---

## Security Notes

- Authorization trusts the HttpOnly cookie (`w_nh`), not client-provided fields.
- LocalStorage `worldcoin_nullifier` is for UX only.
- Use `assertRateLimit` for abuse controls (see existing actions).

---

## Roadmap / TODO

- Auth
  - Add a sign-out action to clear the cookie and reset provider state.

- Domain Features
  - Implement items, votes, credits, theme unlocks via Server Actions + Supabase transactions.
  - Build swipe feed backed by DB (filter by “not yet voted by me”).
  - Enforce daily vote cap and single vote per item per user.
  - Promotion rules (catalog threshold) and background reconciliation.

- UI/UX
  - Persist last-opened panel in localStorage.
  - Add icons and polish to bottom tabs; optional haptics toggle.
  - Replace placeholders with real data from Supabase.

---

## File Index (Key)

- Client Providers/Hooks
  - src/providers/AppProvider.tsx
  - src/providers/MinikitProvider.tsx
  - src/providers/WorldAuthProvider.tsx
  - src/hooks/useWorldVerification.ts

- Server
  - src/server/actions/worldcoin.ts
  - src/server/actions/profiles.ts
  - src/server/actions/payments.ts
  - src/server/lib/world-verify.ts
  - src/server/lib/cookies.ts
  - src/server/services/worldcoin.ts
  - src/server/services/profiles.ts
  - src/server/services/payments.ts
  - src/server/services/dev-portal.ts
  - src/server/config/worldcoin.ts
  - src/server/config/payments.ts

- Client Hooks
  - src/hooks/useWorldVerification.ts
  - src/hooks/useWorldPay.ts

- Types
  - src/types/index.ts (barrel)
  - src/types/auth.ts
  - src/types/worldcoin.ts
  - src/types/payments.ts
  - src/types/credits.ts
  - src/types/unlocks.ts
  - src/types/profiles.ts

- Constants
  - src/constants.ts

- Database Migrations
  - migrations/2025-09-26T000000_profiles.sql
  - migrations/2025-09-26T010000_payments.sql
  - migrations/2025-09-26T011000_payments_hardening.sql
  - migrations/2025-09-26T012000_theme_unlocks.sql

Env required for payments:

- `WORLD_PAY_TO_ADDRESS` (server) — the recipient address for payments (0x...).
- `DEV_PORTAL_API_KEY` (server) — used to query Developer Portal for transaction status.

Mock mode behavior:

- If `WORLDCOIN_VERIFY_MOCK=true` (server) and `NEXT_PUBLIC_WORLDCOIN_VERIFY_MOCK=true` (client), payment flow is bypassed:
  - `initiateWorldPayAction` returns a synthetic `reference` and the configured `to` address without writing to `payments`.
  - `confirmWorldPayAction` returns `{ ok: true, success: true, status: 'mock-confirmed' }` with no DB updates.
  - The client hook `useWorldPay()` exposes `isMock` and `autoApproveWorldPay(amountUsd, description?)` for convenience.
  - No Supabase logging occurs in mock mode; only real (non-mock) transactions are persisted.

Client usage (outline):

- Call `const { initiateWorldPay } = useWorldPay()`.
- `const { reference, to } = await initiateWorldPay(1.25, 'Unlock Theme: Tools')`.
- Then construct `MiniKit.commandsAsync.pay({ reference, to, tokens: [...], description })` on the client.

- UI
  - src/components/LandingScreen.tsx
  - src/components/Swipe/SwipeShell.tsx
  - src/components/Swipe/ChannelsList.tsx
  - src/components/Swipe/FiltersPane.tsx
