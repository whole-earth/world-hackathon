"use server"

import { assertRateLimit } from '@/server/lib/rate-limit'

export type PastedContentInput =
  | { kind: 'text'; text: string }
  | { kind: 'image'; items: { mime: string; dataBase64: string }[] }
  | { kind: 'blob'; items: { mime: string; dataBase64: string }[] }

export type PastedContentResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

// Stub: queues pasted content for processing. Replace with real pipeline later.
export async function processPastedContentAction(input: PastedContentInput): Promise<PastedContentResult> {
  try {
    await assertRateLimit('pasted-content', 30, 60000)
    if (input.kind === 'text' && !input.text.trim()) {
      return { ok: false, error: 'Empty text' }
    }
    if ((input.kind === 'image' || input.kind === 'blob') && (!input.items || input.items.length === 0)) {
      return { ok: false, error: 'No clipboard items' }
    }
    const id = `p_${Math.random().toString(36).slice(2)}`
    return { ok: true, id }
  } catch {
    return { ok: false, error: 'Internal server error' }
  }
}
