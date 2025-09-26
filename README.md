# Whole World Catalog

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Worldcoin / MiniKit

- Status widget: see `src/components/WorldcoinStatus.tsx` on the home page.
- MiniKit is detected via `@worldcoin/minikit-js` within `AppProvider`.
- Verification: Server Action `verifyWorldcoinAction` (no REST needed for internal flows).
- Config: client `WORLD_ACTION` in `src/config/worldcoin.ts`; server config in `src/server/config/worldcoin.ts`.
- Transaction debug proxy: `src/app/api/worldcoin/transaction/debug/route.ts`.

### Environment

Add these to `.env` (see `.env` for placeholders):

```
APP_ID=your_app_id
# Optional for local dev only
WORLDCOIN_VERIFY_MOCK=true
# Optional: if you have a developer API key
# WORLDCOIN_DEV_API_KEY=...
```

### Testing in World App

1. Run: `npm run dev` (default port 3022)
2. Expose locally: `ngrok http http://localhost:3022`
3. Open the ngrok URL inside World App (Mini Apps) to enable MiniKit
4. The status panel should show “MiniKit Installed: ✅ Yes” and “Ready: ✅ Yes” inside World App

Use the “Transaction Debug Tool” in the status panel to fetch debug info for a `transaction_id` via `/api/worldcoin/transaction/debug`.

### Verification (Server Action)

Call the server action directly from the client after obtaining a MiniKit proof:

```
import { verifyWorldcoinAction } from '@/server/actions'

const { finalPayload } = await MiniKit.commandsAsync.verify({ action: 'your-action' })
const result = await verifyWorldcoinAction({ payload: finalPayload, signal: 'optional' })
// result = { ok: true, nullifier_hash, verifyRes }
```

If `WORLDCOIN_VERIFY_MOCK=true`, passing `{ nullifier_hash: 'dev-nullifier' }` is sufficient in local development.

### Profile registration (Server Action)

Registration (saving a username for a verified World user) is handled via a Next.js Server Action, not a REST API:

- Action: `verifyAndUpsertProfileAction` in `src/server/actions`
- Usage examples:

Client with a real MiniKit payload:

```
import { verifyAndUpsertProfileAction } from '@/server/actions'

await verifyAndUpsertProfileAction({
  username: 'alice',
  payload: finalPayload, // ISuccessResult from MiniKit
  signal: 'optional',
})
```

Local dev (mock):

```
await verifyAndUpsertProfileAction({
  world_username: 'alice',
  nullifier_hash: 'dev-nullifier',
})
```

This keeps secrets and DB access on the server while avoiding an extra API layer for app-internal flows.

Rate limiting

- Basic in-memory limit is applied in server actions (10/min per IP). See `src/server/lib/rate-limit.ts`.

### Pulling World Usernames

- Schema: migrations/2025-09-26T010000_profiles_add_world_username.sql adds `world_username` (unique).
- Registration is via Server Action (no REST): use `verifyAndUpsertProfileAction` to upsert `profiles` with `username`/`world_username` after verification (or mock in dev).
- UI: `WorldUsernameCard` tries to detect a username from query params (e.g. `?world_username=`) and lets you save it after verification.

## Domain Model (Channels & Posts)

- Channels: Replaces the old “themes” concept; defined in the `channels` table (seeded with a few defaults). Add/edit channels by inserting into this table.
- Posts: User submissions (what “items” used to be). A post belongs to a channel and is submitted by a verified World user (keyed by `worldcoin_nullifier`).
- Votes: One per user per post (PK `(post_id, voter_nullifier)`).
- User credits: Tracked per `worldcoin_nullifier`.
- Channel unlocks: Records which user unlocked which channel (via credits or payment).
- Payments: World wallet payments for unlocks or credits.

Migrations:
- `migrations/2025-09-26T020000_channels_and_posts.sql` defines `channels`, `posts`, `votes`, `user_credits`, `channel_unlocks`, and `payments`.
