# Upload Flow Architecture

## Overview

The upload flow tracks media uploads in an inbox system before they become posts, with user-specific view tracking that scales to 100+ users.

## Database Schema

### 1. Media Inbox Table (`media_inbox`)

```sql
- id: uuid (primary key)
- title: text (required)
- subtitle: text (optional)
- color: text (required)
- description: text (optional)
- uploaded_by: text (references profiles.worldcoin_nullifier)
- created_at: timestamptz
```

### 2. User Inbox Views Table (`user_inbox_views`)

```sql
- worldcoin_nullifier: text (references profiles.worldcoin_nullifier)
- inbox_item_id: uuid (references media_inbox.id)
- viewed_at: timestamptz
- PRIMARY KEY (worldcoin_nullifier, inbox_item_id)
```

### 3. Materialized View (`user_unseen_inbox`)

Pre-computed view of unseen items for each user, refreshed periodically for performance.

## Scalability Features

### For 100+ Users

1. **Composite Primary Key**: Efficient lookups and prevents duplicate view records
2. **Strategic Indexing**:
   - User-specific queries: `(worldcoin_nullifier, viewed_at desc)`
   - Item-specific queries: `(inbox_item_id)`
   - Recent items only: `WHERE created_at > now() - interval '30 days'`

3. **Automatic Cleanup**:
   - Old view records (>30 days) are automatically cleaned up
   - Old inbox items (>30 days) are removed
   - Trigger-based cleanup with 1% probability to avoid performance impact

4. **Materialized View**: Pre-computes unseen items for fast user queries

## API Endpoints

### Upload Media

```typescript
uploadMediaAction({
  title: string
  subtitle?: string
  color: string
  description?: string
  uploaded_by: string // worldcoin_nullifier
})
```

### Mark Item as Viewed

```typescript
markInboxItemViewedAction({
  worldcoin_nullifier: string
  inbox_item_id: string
})
```

### Get Unseen Items

```typescript
getUnseenInboxItemsAction({
  worldcoin_nullifier: string
  limit?: number
  cursor?: string
})
```

## Rate Limiting

- Upload: 5 per minute
- Mark viewed: 50 per minute  
- Get unseen: 20 per minute

## Data Lifecycle

1. User uploads media → `media_inbox` table
2. User views item → `user_inbox_views` table
3. Item becomes post → removed from `media_inbox`
4. Old items (>30 days) → automatically cleaned up
5. View records (>30 days) → automatically cleaned up

This architecture ensures efficient scaling while maintaining data integrity and performance.
