"use server"

import { assertRateLimit } from '@/server/lib/rate-limit'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { ensureVerifiedNullifier } from '@/server/lib/world-verify'

type ExaClient = any

function getExa(): ExaClient {
  // Lazy import to avoid Next bundling issues
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Exa = require('exa-js')?.default || require('exa-js')
  const apiKey = process.env.EXA_API_KEY
  if (!apiKey) throw new Error('Missing EXA_API_KEY')
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
    const exa = getExa()
    const res = await exa.search(q, { numResults: 5 })
    const items: ExaItem[] = (res?.results || res || []).slice(0, 5).map((r: any) => ({
      title: r.title || r.url || 'Untitled',
      url: r.url || '',
      summary: r.text || r.summary || r.snippet || '',
      thumbnail: r.image || r.thumbnail || null,
    }))
    return { ok: true, results: items }
  } catch (e) {
    console.error('exaSearchAction error:', e)
    return { ok: false, error: 'Failed to search with Exa' }
  }
}

export type ExaCrawlInput = { url: string }
export type ExaCrawlResult = { ok: true; item: ExaItem } | { ok: false; error: string }

export async function exaCrawlAction(input: ExaCrawlInput): Promise<ExaCrawlResult> {
  try {
    await assertRateLimit('exa-crawl', 10, 60000)
    const url = (input.url || '').trim()
    if (!url) return { ok: false, error: 'Empty URL' }
    const exa = getExa()
    // Many Exa SDKs expose .getContents or .crawl; attempt a general call
    let r: any
    if (typeof exa.getContents === 'function') {
      r = await exa.getContents({ urls: [url] })
      // Shape: { contents: [{ url, title, text, image? }]} — normalize first entry
      const first = r?.contents?.[0] || r?.[0] || r
      const item: ExaItem = {
        title: first?.title || url,
        url: first?.url || url,
        summary: first?.text || first?.summary || '',
        thumbnail: first?.image || first?.thumbnail || null,
      }
      return { ok: true, item }
    }
    if (typeof exa.crawl === 'function') {
      r = await exa.crawl(url)
      const item: ExaItem = {
        title: r?.title || url,
        url: r?.url || url,
        summary: r?.text || r?.summary || '',
        thumbnail: r?.image || r?.thumbnail || null,
      }
      return { ok: true, item }
    }
    return { ok: false, error: 'Exa crawl not supported in SDK version' }
  } catch (e) {
    console.error('exaCrawlAction error:', e)
    return { ok: false, error: 'Failed to crawl URL with Exa' }
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
    const { nullifier_hash } = await ensureVerifiedNullifier({})
    const supabase = getSupabaseAdmin()
    const title = (input.item.title || '').slice(0, 200)
    const url = input.item.url
    const summary = (input.item.summary || '').slice(0, 2000)
    const description = summary ? `${summary}\n\n${url}` : url
    // Look up world username for display and storage
    const { data: prof } = await supabase
      .from('profiles')
      .select('world_username, username')
      .eq('worldcoin_nullifier', nullifier_hash)
      .single()
    const uploaded_by_username = (prof?.world_username || prof?.username || 'anon').slice(0, 80)
    const category = classifyCategoryFromItem({ title, url, summary })
    const { data, error } = await supabase
      .from('media_inbox')
      .insert({
        title,
        subtitle: safeHostname(url),
        color: input.color || '#0ea5e9',
        description,
        category: input.category || (category as any),
        uploaded_by: nullifier_hash,
        uploaded_by_username,
        source_url: url,
        thumbnail_url: input.item.thumbnail || null,
      })
      .select('id')
      .single()
    if (error) {
      console.error('submitMediaFromExaAction insert error:', error)
      return { ok: false, error: 'Failed to post to inbox' }
    }
    return { ok: true, id: data.id }
  } catch (e) {
    console.error('submitMediaFromExaAction error:', e)
    return { ok: false, error: 'Internal server error' }
  }
}

export type ProcessPastedValueInput = { value: string }
export type ProcessPastedValueResult =
  | { ok: true; mode: 'search'; results: ExaItem[] }
  | { ok: true; mode: 'posted'; id: string }
  | { ok: false; error: string }

export async function processPastedValueAction(input: ProcessPastedValueInput): Promise<ProcessPastedValueResult> {
  try {
    await assertRateLimit('process-pasted', 20, 60000)
    const value = (input.value || '').trim()
    if (!value) return { ok: false, error: 'Empty value' }
    const isUrl = /^https?:\/\//i.test(value) || /^[a-z0-9.-]+\.[a-z]{2,}([/\?#].*)?$/i.test(value)
    if (isUrl) {
      // Normalize to a proper URL if missing scheme
      const url = /^https?:\/\//i.test(value) ? value : `https://${value}`
      const crawled = await exaCrawlAction({ url })
      if (!crawled.ok) return { ok: false, error: crawled.error }
      const posted = await submitMediaFromExaAction({ item: crawled.item })
      if (!posted.ok) return { ok: false, error: posted.error }
      return { ok: true, mode: 'posted', id: posted.id }
    }
    const prompt = value.slice(0, 240)
    const searched = await exaSearchAction({ query: prompt })
    if (!searched.ok) return { ok: false, error: searched.error }
    return { ok: true, mode: 'search', results: searched.results }
  } catch (e) {
    console.error('processPastedValueAction error:', e)
    return { ok: false, error: 'Internal server error' }
  }
}

function safeHostname(u: string): string {
  try { return new URL(u).hostname } catch { return u }
}

function classifyCategoryFromItem(it: { title: string; url: string; summary?: string }): 'env' | 'tools' | 'shelter' | 'education' | 'crypto' {
  const hay = `${it.title} ${it.summary || ''} ${safeHostname(it.url)}`.toLowerCase()
  const host = safeHostname(it.url)
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
