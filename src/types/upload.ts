export type MediaInboxRow = {
  id: string
  title: string
  subtitle?: string
  color: string
  description?: string
  category?: string
  uploaded_by: string
  created_at: string
}

export type UserInboxViewRow = {
  worldcoin_nullifier: string
  inbox_item_id: string
  viewed_at: string
}

export type UploadMediaInput = {
  title: string
  subtitle?: string
  color: string
  description?: string
  category?: string
  uploaded_by: string
}

export type MarkInboxItemViewedInput = {
  worldcoin_nullifier: string
  inbox_item_id: string
}

export type GetUnseenInboxItemsInput = {
  worldcoin_nullifier: string
  limit?: number
  cursor?: string
}

export type UnseenInboxItem = {
  id: string
  title: string
  subtitle?: string
  color: string
  description?: string
  category?: string
  created_at: string
}
