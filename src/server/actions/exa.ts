"use server"

import { assertRateLimit } from '@/server/lib/rate-limit'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { ensureVerifiedNullifier } from '@/server/lib/world-verify'
import { uploadThumbnailFromUrlAction } from './thumbnails'
import { upsertProfileByNullifier } from '@/server/services/profiles'

// Minimal typings for the Exa SDK surface we use
type ExaSearchOptions = { numResults: number }
type ExaSDKItem = {
  title?: string | null
  url?: string | null
  text?: string | null
  summary?: string | null
  snippet?: string | null
  image?: string | null
  thumbnail?: string | null
}
type ExaSearchResponse = { results?: ExaSDKItem[] } | ExaSDKItem[]
type ExaContentsItem = { url?: string | null; title?: string | null; text?: string | null; image?: string | null; thumbnail?: string | null; summary?: string | null }
type ExaContentsResponse = { contents?: ExaContentsItem[] } | ExaContentsItem[] | ExaContentsItem

interface ExaClient {
  search: (query: string, options: ExaSearchOptions) => Promise<ExaSearchResponse>
}

async function getExa(): Promise<ExaClient> {
  // Lazy dynamic import to satisfy ESM and lint rules
  const mod: any = await import('exa-js')
  const Exa: any = mod?.default ?? mod
  const apiKey = process.env.EXA_API_KEY
  if (!apiKey) throw new Error('Missing EXA_API_KEY')
  // Use string constructor consistently to avoid header issues
  return new Exa(apiKey)
}

export type ExaItem = {
  title: string
  url: string
  summary?: string
  thumbnail?: string | null
}

export type ExaSearchInput = { query: string }
export type ExaSearchResult = { ok: true; results: ExaItem[] } | { ok: false; error: string }

export async function exaSearchAction(input: ExaSearchInput): Promise<ExaSearchResult> {
  try {
    await assertRateLimit('exa-search', 20, 60000)
    const q = (input.query || '').trim()
    if (!q) return { ok: false, error: 'Empty query' }
    const exa = await getExa()
    const searchRes = await exa.search(q, { numResults: 5 })
    const base = normalizeSearchResults(searchRes).slice(0, 5)
    const items: ExaItem[] = base.map((r) => ({
      title: (r.title || r.url || 'Untitled') as string,
      url: (r.url || '') as string,
      summary: (r.summary || r.text || r.snippet || '') as string,
      thumbnail: (r.image || r.thumbnail || null) as string | null,
    }))
    return { ok: true, results: items }
  } catch (e) {
    return { ok: false, error: 'Failed to search with Exa' }
  }
}

export type ExaCrawlInput = { url: string }
export type ExaCrawlResult = { ok: true; item: ExaItem } | { ok: false; error: string }

export async function exaCrawlAction(input: ExaCrawlInput): Promise<ExaCrawlResult> {
  const url = (input.url || '').trim()
  if (!url) return { ok: false, error: 'Empty URL' }
  try {
    // Relax rate limit to avoid blocking paste flows during dev; ignore errors
    const limit = process.env.NODE_ENV === 'development' ? 1000 : 60
    try { await assertRateLimit('exa-crawl', limit, 60000) } catch {}
    // Call Exa Contents API; only keep fields we need
    const c = await fetchExaContents(url)
    if (c) {
      const item: ExaItem = {
        title: c.title || safeHostname(url) || url,
        url: c.url || url,
        summary: c.summary || c.text || '',
        thumbnail: c.image || c.thumbnail || null,
      }
      return { ok: true, item }
    }
    return { ok: true, item: { title: safeHostname(url) || url, url, summary: '', thumbnail: null } }
  } catch {
    // Never surface crawl errors to UI; return minimal item instead
    return { ok: true, item: { title: safeHostname(url) || url, url, summary: '', thumbnail: null } }
  }
}

export type SubmitMediaFromExaInput = {
  item: ExaItem
  category?: string
  color?: string
}
export type SubmitMediaFromExaResult = { ok: true; id: string } | { ok: false; error: string }

export async function submitMediaFromExaAction(input: SubmitMediaFromExaInput): Promise<SubmitMediaFromExaResult> {
  try {
    await assertRateLimit('submit-media-from-exa', 20, 60000)
    const supabase = getSupabaseAdmin()
    // Resolve uploader (verified or mock-in-dev)
    let nullifier_hash: string | null = null
    try {
      const v = await ensureVerifiedNullifier({})
      nullifier_hash = v.nullifier_hash
    } catch {
      const allowMock = process.env.NEXT_PUBLIC_WORLDCOIN_VERIFY_MOCK === 'true' || process.env.WORLDCOIN_VERIFY_MOCK === 'true' || process.env.NODE_ENV === 'development'
      if (!allowMock) {
        return { ok: false, error: 'Verification required' }
      }
      nullifier_hash = 'mock-nullifier'
      try {
        await upsertProfileByNullifier({ worldcoin_nullifier: nullifier_hash, username: 'mock', world_username: null })
      } catch {}
    }
    const title = (input.item.title || '').slice(0, 200)
    const url = input.item.url
    // Give classifier more context to improve tag accuracy
    const summary = (input.item.summary || '').slice(0, 4000)
    const description = summary ? `${summary}\n\n${url}` : url
    // Look up world username for display and storage
    const { data: prof } = await supabase
      .from('profiles')
      .select('world_username, username')
      .eq('worldcoin_nullifier', nullifier_hash)
      .single()
    const uploaded_by_username = (prof?.world_username || prof?.username || 'anon').slice(0, 80)
    // Lightweight, deterministic tagger using regex rules with fallback to heuristic
    const hay = `${title}\n${summary}\n${safeHostname(url)}`.toLowerCase()
    const ranked = scoreTags(hay)
    const category = (ranked[0]?.tag as AllowedTag | undefined) || classifyCategoryFromItem({ title, url, summary })
    // Prefer user-provided category if it matches our enum
    const dbCategory: AllowedTag = isAllowedTag(input.category) ? (input.category as AllowedTag) : category
    // Optionally mirror thumbnail to Supabase Storage bucket
    let finalThumb = input.item.thumbnail || null
    if (finalThumb && /^https?:\/\//i.test(finalThumb)) {
      try {
        const up = await uploadThumbnailFromUrlAction({ url: finalThumb })
        if (up.ok) finalThumb = up.publicUrl
      } catch {}
    }

    const fullPayload: any = {
      title,
      subtitle: safeHostname(url),
      color: input.color || '#0ea5e9',
      description,
      category: dbCategory,
      uploaded_by: nullifier_hash,
      uploaded_by_username,
      source_url: url,
      thumbnail_url: finalThumb,
    }
    const { data, error } = await supabase
      .from('media_inbox')
      .insert(fullPayload)
      .select('id')
      .single()
    if (!error && data) return { ok: true, id: data.id }
    // Fallback: insert with minimal columns (schema compatibility)
    const minimalPayload: any = {
      title,
      subtitle: safeHostname(url),
      color: input.color || '#0ea5e9',
      description,
      uploaded_by: nullifier_hash,
    }
    const { data: data2, error: error2 } = await supabase
      .from('media_inbox')
      .insert(minimalPayload)
      .select('id')
      .single()
    if (!error2 && data2) return { ok: true, id: data2.id }
    return { ok: false, error: 'Failed to post to inbox' }
  } catch (e) {
    return { ok: false, error: 'Internal server error' }
  }
}

export type ProcessPastedValueInput = { value: string }
export type ProcessPastedValueResult =
  | { ok: true; mode: 'search'; results: ExaItem[] }
  | { ok: true; mode: 'posted'; id: string; item: ExaItem }
  | { ok: false; error: string }

export async function processPastedValueAction(input: ProcessPastedValueInput): Promise<ProcessPastedValueResult> {
  try {
    // Relax rate limit during development to avoid blocking iteration
    const limit = process.env.NODE_ENV === 'development' ? 1000 : 60
    await assertRateLimit('process-pasted', limit, 60000)
    const value = (input.value || '').trim()
    if (!value) return { ok: false, error: 'Empty value' }
    const isUrl = /^https?:\/\//i.test(value) || /^[a-z0-9.-]+\.[a-z]{2,}([/\?#].*)?$/i.test(value)
    if (isUrl) {
      // Normalize to a proper URL if missing scheme
      const url = /^https?:\/\//i.test(value) ? value : `https://${value}`
      const crawled = await exaCrawlAction({ url })
      const item = crawled.ok ? crawled.item : { title: safeHostname(url) || url, url, summary: '', thumbnail: null }
      const posted = await submitMediaFromExaAction({ item })
      if (!posted.ok) return { ok: false, error: posted.error }
      return { ok: true, mode: 'posted', id: posted.id, item }
    }
    const prompt = value.slice(0, 240)
    const searched = await exaSearchAction({ query: prompt })
    if (!searched.ok) return { ok: false, error: searched.error }
    return { ok: true, mode: 'search', results: searched.results }
  } catch (e) {
    // Fail-soft: return an empty search result set instead of surfacing an error
    return { ok: true, mode: 'search', results: [] }
  }
}

function safeHostname(u: string): string {
  try { return new URL(u).hostname } catch { return u }
}

type AllowedTag = 'env'|'tools'|'shelter'|'education'|'crypto'

const TAG_RULES: Record<AllowedTag, RegExp[]> = {
  env: [/climate|environment|sustainab|emission|energy|carbon/i],
  tools: [/api|sdk|developer|github|docs|npm|react|next\.js|tool|framework/i],
  shelter: [/housing|shelter|architecture|construction|urban|zoning/i],
  crypto: [/blockchain|crypto|ethereum|bitcoin|\b(sol|eth)\b|onchain|wallet/i],
  education: [/^$/], // fallback bucket; scoreTags won't return this
}

function scoreTags(s: string): { tag: AllowedTag; score: number }[] {
  const scores: { tag: AllowedTag; score: number }[] = []
  for (const tag of Object.keys(TAG_RULES) as AllowedTag[]) {
    const rules = TAG_RULES[tag]
    const hits = rules.reduce((n, rx) => n + (rx.test(s) ? 1 : 0), 0)
    if (hits > 0) scores.push({ tag, score: hits })
  }
  return scores.sort((a, b) => b.score - a.score)
}

async function fetchPageText(_exa: ExaClient, url: string): Promise<string> {
  try {
    const c = await fetchExaContents(url)
    if (c?.text || c?.summary) return (c.summary || c.text) as string
    return ''
  } catch { return '' }
}

function classifyCategoryFromItem(it: { title: string; url: string; summary?: string }): AllowedTag {
  const hay = `${it.title} ${it.summary || ''} ${safeHostname(it.url)}`.toLowerCase()
  const has = (k: string) => hay.includes(k)
  // crypto
  if (has('blockchain') || has('crypto') || has('ethereum') || has('bitcoin') || /\b(sol|eth)\b/.test(hay)) return 'crypto'
  // tools/dev
  if (has('api') || has('sdk') || has('developer') || has('github') || has('docs') || has('npm') || has('react') || has('next.js') || has('tool')) return 'tools'
  // environment
  if (has('climate') || has('environment') || has('sustainab') || has('emissions') || has('energy')) return 'env'
  // shelter/housing
  if (has('housing') || has('shelter') || has('architecture') || has('construction') || has('urban')) return 'shelter'
  // default educational content
  return 'education'
}

function normalizeSearchResults(res: ExaSearchResponse): ExaSDKItem[] {
  if (Array.isArray(res)) return res
  if (res && 'results' in res && Array.isArray(res.results)) return res.results
  return []
}

function getFirstContentsItem(res: ExaContentsResponse): ExaContentsItem | undefined {
  if (!res) return undefined
  if (Array.isArray(res)) return res[0]
  if ('contents' in res && Array.isArray(res.contents)) return res.contents[0]
  return res as ExaContentsItem
}

function isAllowedTag(v: unknown): v is AllowedTag {
  return v === 'env' || v === 'tools' || v === 'shelter' || v === 'education' || v === 'crypto'
}

type ExaContentsOut = { title?: string | null; url?: string | null; text?: string | null; summary?: string | null; image?: string | null; thumbnail?: string | null } | null

async function fetchExaContents(url: string): Promise<ExaContentsOut> {
  const apiKey = process.env.EXA_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch('https://api.exa.ai/contents', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ urls: [url], text: true }),
    })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    const list = data && (Array.isArray(data) ? data : (Array.isArray(data.contents) ? data.contents : null))
    const first = list && list[0]
    if (!first) return null
    return {
      title: first.title ?? null,
      url: first.url ?? url,
      text: first.text ?? null,
      summary: first.summary ?? null,
      image: first.image ?? null,
      thumbnail: first.thumbnail ?? null,
    }
  } catch {
    return null
  }
}
