# Whole World Catalog

Hackathon mini‑app for World Build 2. A human‑verified cultural commons: verify with World ID, then browse and unlock themed catalogs. Backend uses Server Actions with an HttpOnly cookie for auth; client state is session‑scoped.

---

## Premise

Discovery online is noisy and bot‑driven. WWC makes curation human‑first:

- Proof of Humanity (World ID) to gate participation.
- Credits + Payments to unlock themed catalogs.
- Clear session model: explicit user action to enter, mock‑friendly for dev.

---

## Core Features (current)

- World ID verification behind a single “Verify with World ID” button.
- Session model: HttpOnly cookie (`w_nh`) for auth; sessionStorage key for client UI state.
- Theme unlocks (server) + client cache; UI placeholders wired for future data.
- Credits (server + provider) with optimistic updates; basic header surface.
- Payments flow scaffolded (initiate/confirm); unlocks support payment or mock.

Note: Submissions, voting feed, and catalog promotion are scaffolded in backend and UI placeholders but not fully implemented in the current UI.

---

## Data Model (implemented)

- Profiles: nullifier, username, optional world_username.
- Theme Unlocks: per‑user unlocks with method mock/payment.
- Payments: records for initiate/confirm (prod), bypassed in mock.
- Credits/Votes: server scaffolding in place for balance and mutations.

---

## Tech Stack

- Next.js (App Router) — UI + Server Actions
- Supabase (Postgres) — data + admin SDK (server‑only)
- World ID (MiniKit) — proof‑of‑personhood
- World Wallet — payments (scaffolded)

---

## Verification & Session Model

- Single entry point: “Verify with World ID” button. Always required.
- Cookie authority: On success, server sets HttpOnly cookie `w_nh`.
- Client UI state: sessionStorage `worldcoin_nullifier` mirrors session only.
- Mock mode (dev): If `NEXT_PUBLIC_WORLDCOIN_VERIFY_MOCK=true` and `WORLDCOIN_VERIFY_MOCK=true`:
  - When MiniKit is installed: runs the normal verify.
  - When MiniKit is not installed: clicking the button creates a dev session without external checks (same button path).
- SSR guards: Server calls `ensureVerifiedNullifier({ allowAutoMock: false })` to avoid silently creating sessions on protected pages; user must click the button.
- Clear session: `window.clearSession()` clears cookie and client caches, then reloads.

---

## Run Locally

Env (server):

- `WORLD_APP_ID` — World App ID (app_...)
- `WORLDCOIN_VERIFY_MOCK` — `true` to enable mock verification server‑side
- `DEV_PORTAL_API_KEY` — for payment confirmation (prod only)
- `WORLD_PAY_TO_ADDRESS` — payments recipient (prod only)
- `SUPABASE_SECRET_KEY` — server admin key

Env (client):

- `NEXT_PUBLIC_WORLD_ACTION` — action slug (e.g., `voting-action`)
- `NEXT_PUBLIC_WORLDCOIN_VERIFY_MOCK` — `true` to enable mock in client UI
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Install and run:

- `pnpm install`
- `pnpm dev`

Open in World App to test MiniKit, or use mock mode to verify without it.

---

## Security Notes

- Authorization uses HttpOnly cookie `w_nh`; client storage is non‑authoritative.
- Supabase browser client is configured not to persist sessions: `{ auth: { persistSession: false, autoRefreshToken: false } }`.
- Server Actions are rate‑limited per IP for sensitive operations.

---
