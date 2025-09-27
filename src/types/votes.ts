// Voting domain shared types

export type RecordVoteInput = { postId: string; yay: boolean }
export type RecordVoteResult = { ok: true; recorded: boolean; yayCount?: number; nayCount?: number }

