"use server"

import { getSupabaseAdmin } from '@/lib/supabase/server'
import { assertRateLimit } from '@/server/lib/rate-limit'
import nodeCrypto from 'crypto'

export type UploadThumbnailInput = { url: string }
export type UploadThumbnailResult = { ok: true; publicUrl: string; path: string } | { ok: false; error: string }

const BUCKET = 'media-thumbnails'
const MAX_BYTES = 5 * 1024 * 1024 // 5MB

export async function uploadThumbnailFromUrlAction(input: UploadThumbnailInput): Promise<UploadThumbnailResult> {
  try {
    await assertRateLimit('upload-thumb', 20, 60000)
    const src = (input.url || '').trim()
    if (!/^https?:\/\//i.test(src)) return { ok: false, error: 'Invalid URL' }
    const res = await fetch(src, { method: 'GET' })
    if (!res.ok) return { ok: false, error: `Fetch failed (${res.status})` }
    const contentType = res.headers.get('content-type') || 'application/octet-stream'
    if (!contentType.startsWith('image/')) return { ok: false, error: 'Not an image' }
    const arrayBuffer = await res.arrayBuffer()
    if (arrayBuffer.byteLength > MAX_BYTES) return { ok: false, error: 'Image too large' }

    // Name by hash of URL to dedupe
    const hash = sha1Hex(src)
    const ext = mimeToExt(contentType) || 'jpg'
    const path = `${hash}.${ext}`

    const supabase = getSupabaseAdmin()
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, Buffer.from(arrayBuffer), { contentType, upsert: true })
    const hasStatusCode = (err: unknown): err is { statusCode?: string | number } =>
      typeof err === 'object' && err !== null && 'statusCode' in err
    if (upErr && !(hasStatusCode(upErr) && upErr.statusCode === '409')) {
      // 409 can occur if exists and upsert not honored; try to continue
      return { ok: false, error: 'Upload failed' }
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return { ok: true, publicUrl: data.publicUrl, path }
  } catch {
    return { ok: false, error: 'Internal server error' }
  }
}

function sha1Hex(str: string): string {
  return nodeCrypto.createHash('sha1').update(str).digest('hex')
}

function mimeToExt(mime: string): string | null {
  if (mime.includes('png')) return 'png'
  if (mime.includes('jpeg')) return 'jpg'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('gif')) return 'gif'
  return null
}
