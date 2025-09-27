# Auth — WorldAuth Provider Intent

This document describes the intended behavior and constraints of the WorldAuth flow used across the app. It is kept separate so developers can quickly understand how auth works during development.

## Goals

- Require the same "Verify with World ID" button flow for all users.
- Use a secure server-side HttpOnly cookie (`w_nh`) as the authorization source of truth.
- Keep client UI state session-scoped so clearing the browser session resets the flow.
- Support a convenient development mode (mock) which bypasses external checks when the button is clicked, but never auto-enters without user intent.

## Key Behaviors

- Button-only entry: Users must click the Verify button to enter, even in mock mode. No auto-verify on mount.
- Session-only UI state: The client stores the nullifier in `sessionStorage` (`worldcoin_nullifier`). This is non-authoritative and clears with the browsing session.
- Server authority: The server sets/reads an HttpOnly cookie `w_nh` and uses it for all authorization.
- Mock mode: When `NEXT_PUBLIC_WORLDCOIN_VERIFY_MOCK=true` (client) and `WORLDCOIN_VERIFY_MOCK=true` (server), clicking Verify bypasses external checks and creates a dev session. The same button is used either way.
- SSR guards: Server code calls `ensureVerifiedNullifier({ allowAutoMock: false })` on protected pages to avoid implicitly creating sessions. In mock mode, missing sessions will not be auto-created by SSR; the user must click Verify.
- Clear session: A developer convenience command `window.clearSession()` clears the cookie plus client caches and reloads the app, making it easy to re-run the flow.

## Files

- Client provider: `src/providers/WorldAuthProvider.tsx`
- Button (landing): `src/components/LandingScreen.tsx`
- Cookie helper: `src/server/lib/cookies.ts`
- SSR guard: `src/server/lib/world-verify.ts`
- Dev console command: `src/components/util/ConsoleCommands.tsx`

## Rationale

- Keeping verification behind a button avoids unexpected session creation during navigation, especially in mock mode.
- SessionStorage prevents sticky UI state across browser restarts, aligning the UI with the cookie’s session semantics.
- Mock mode exists to streamline local development; it should be explicit (via button press) and never silently grant a session on load.
