# Whole World Catalog

A hackathon mini-app built on the World stack.  
The app creates a human-verified cultural commons: users submit references, vote with a swipe, and unlock themed catalogs using credits or World Wallet payments.

---

## Premise

Discovery online is noisy and bot-driven.  
The Whole World Catalog makes curation human-first:

- **Proof of Humanity (World ID)** ensures only real people can submit and vote.  
- **Gasless Wallet (World Wallet)** allows seamless payments and unlocks.  
- **Credits System** rewards active participation.  

The result: a living, bot-free catalog of cultural references organized by theme.

---

## Core Features

### Authentication

- Users sign in with **World ID**.  
- Each profile is unique and tied to a verified human.

### Submissions

- Submit a cultural reference: title, thumbnail, theme (e.g., environment, shelter, tools).  
- Stored in Supabase as a pending submission.

### Voting

- Tinder-style swipe UI: swipe right = yay, left = nay.  
- Each vote updates counters and earns the voter **+1 credit** (up to 30/day).  
- Votes are one-per-user-per-item, enforced in the backend.

### Catalog Promotion

- Items reaching **30+ yays** with at least **70% positive ratio** are promoted to the Catalog.  
- Promoted items are permanently visible in their theme.

### Unlocking Themes

- Themes are locked by default. Unlock in two ways:
  1. **Credits**: Spend 30 credits earned by voting.  
  2. **Payments**: Pay via World Wallet.  
- Unlock state is tracked per user in Supabase.

### Browsing

- **Swipe Feed**: Pending submissions to vote on.  
- **Catalog View**: Accepted items organized by theme.

---

## Data Model

- **Profiles**: world_user_id, credits, metadata.  
- **Items**: submissions and catalog entries with status, theme, title, thumbnail, yay/nay counts.  
- **Votes**: one per user per item, yay/nay boolean.  
- **User Credits**: earned from votes, spent on unlocks.  
- **Theme Unlocks**: record of which themes a user has unlocked and how (credits or payment).  
- **Payments**: audit of World Wallet transactions.

---

## Tech Stack

- **Next.js (App Router)** — frontend and API routes  
- **Supabase (Postgres + RLS)** — storage, auth integration, credit accounting  
- **World ID** — proof of humanity  
- **World Wallet** — payments and unlocks  

---

## Demo Flow

1. Log in with World ID.  
2. Submit a reference (thumbnail + title + theme).  
3. Swipe vote on others’ submissions, earn credits.  
4. Unlock a theme using credits or World Wallet payment.  
5. Browse the Catalog of accepted items.  

---

## Constraints

- Max 30 votes/day per user.  
- Credits cannot go negative.  
- One vote per user per item.  
- Items immutable after submission.  

---

## Stretch Goals

- Auto payouts to accepted submitters.  
- Daily cultural challenges (theme prompts).  
- Farcaster mini-app integration.  

---

## Progress Log

- **Night 0**: PRD, World + Supabase providers, basic UI
- **Day 1**: Unlock flow (credits + payment), catalog view, threshold logic.
