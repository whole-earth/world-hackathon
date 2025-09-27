// Channel unlocks types

export type ChannelUnlockRow = {
  worldcoin_nullifier: string
  channel_slug: string
  unlocked_via: 'payment' | 'credits'
  created_at: string
}

export type CreateChannelUnlockInput = {
  worldcoin_nullifier: string
  channel_slug: string
  unlocked_via: 'payment' | 'credits'
}

export type UnlockChannelWithPaymentInput = { reference: string; channelSlug: string }
export type UnlockChannelWithPaymentResult = {
  ok: true
  unlocked: boolean
  channelSlug: string
  method: 'payment' | 'credits'
}

export type GetUnlockedChannelsResult = { ok: true; channels: string[] }

