"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, ClipboardPaste, Link2, Search } from 'lucide-react'
import Image from 'next/image'
import { exaSearchAction, processPastedValueAction, submitMediaFromExaAction } from '@/server/actions'
import { useWorldVerification } from '@/hooks/useWorldVerification'

type Props = {
  onDone?: () => void
}

export function UploadPanel({ onDone }: Props) {
  const { isHuman, verifyHumanity } = useWorldVerification()
  const [query, setQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPasteCatcher, setShowPasteCatcher] = useState(false)
  const [stage, setStage] = useState<'input' | 'process'>('input')
  const [payload, setPayload] = useState<
    | { kind: 'search'; query: string }
    | { kind: 'text'; text: string }
    | { kind: 'image'; items: { mime: string; bytes: number }[] }
    | { kind: 'blob'; items: { mime: string; bytes: number }[] }
    | null
  >(null)

  const canSubmit = useMemo(() => query.trim().length > 0 && !submitting, [query, submitting])

  // Reset Upload UI to initial state
  const resetUploadUI = useCallback(() => {
    setQuery('')
    setSubmitting(false)
    setError(null)
    setShowPasteCatcher(false)
    setStage('input')
    setPayload(null)
  }, [])

  // Back to Inbox: reset UI then navigate
  const handleBackToInbox = useCallback(() => {
    resetUploadUI()
    onDone?.()
  }, [onDone, resetUploadUI])

  // Broadcast swipe lock state to the shell so it can disable horizontal swipes
  useEffect(() => {
    const locked = stage === 'process' || submitting || showPasteCatcher
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('swipe:lock', { detail: locked }))
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('swipe:lock', { detail: false }))
      }
    }
  }, [stage, submitting, showPasteCatcher])

  const looksLikeUrl = useCallback((value: string) => {
    const v = value.trim()
    if (!v) return false
    if (/^https?:\/\//i.test(v)) return true
    // bare domain like example.com/path
    return /^[a-z0-9.-]+\.[a-z]{2,}([/\?#].*)?$/i.test(v)
  }, [])

  const handleSubmit = useCallback(async () => {
    const q = query.trim()
    if (!q) return
    if (!isHuman) {
      setError('Please verify your humanity to upload.')
      try { await verifyHumanity() } catch {}
      return
    }
    // If it looks like a URL, route through pasted-value processor (crawl+post)
    if (looksLikeUrl(q)) {
      setPayload({ kind: 'text', text: q })
      setStage('process')
    } else {
      // Otherwise, perform Exa search and show top results
      setPayload({ kind: 'search', query: q })
      setStage('process')
    }
  }, [query, looksLikeUrl, isHuman, verifyHumanity])

  const handlePasteFromClipboard = useCallback(async () => {
    setSubmitting(true)
    try {
      if (!isHuman) {
        setError('Please verify your humanity to upload.')
        try { await verifyHumanity() } catch {}
        return
      }
      console.log('[UploadPanel] Paste button clicked')
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        console.warn('[UploadPanel] Not a secure context; advanced clipboard read may be blocked. Falling back to readText if available.')
      }
      if (!navigator.clipboard) {
        console.error('[UploadPanel] navigator.clipboard is undefined')
        return
      }
      // 1) Try text first (widely supported)
      let textLogged = false
      if ('readText' in navigator.clipboard) {
        try {
          const text = await navigator.clipboard.readText()
          if (typeof text === 'string') {
            // Log even if empty to confirm the path executed
            console.log('[UploadPanel] readText result:', text)
            if (text.trim().length > 0) {
              setPayload({ kind: 'text', text: text.trim() })
              setStage('process')
              return
            }
            textLogged = true
          }
        } catch (e: unknown) {
          console.warn('[UploadPanel] clipboard.readText() failed; trying read()', e)
        }
      } else {
        console.log('[UploadPanel] navigator.clipboard.readText not available; trying read()')
      }

      // 2) Try full clipboard read to support images/other MIME
      if ('read' in navigator.clipboard) {
        try {
          type ClipboardWithRead = Clipboard & { read?: () => Promise<ClipboardItems> }
          const clip = navigator.clipboard as unknown as ClipboardWithRead
          const items = await clip.read!()
          console.log('[UploadPanel] navigator.clipboard.read() items:', Array.isArray(items) ? items.length : typeof items)
          if (Array.isArray(items) && items.length > 0) {
            const first = items[0]
            const types = first.types || []
            if (types.includes('text/plain')) {
              const blob = await first.getType('text/plain')
              const text = await blob.text()
              console.log('[UploadPanel] Pasted text (via read):', text)
              setPayload({ kind: 'text', text: text })
              setStage('process')
              return
            }
            const imageMime = types.find(t => t.startsWith('image/'))
            if (imageMime) {
              const blob = await first.getType(imageMime)
              const arrayBuffer = await blob.arrayBuffer()
              console.log('[UploadPanel] Pasted image', { mime: imageMime, bytes: arrayBuffer.byteLength })
              setPayload({ kind: 'image', items: [{ mime: imageMime, bytes: arrayBuffer.byteLength }] })
              setStage('process')
              return
            }
            if (types.length > 0) {
              const mime = types[0]
              const blob = await first.getType(mime)
              const arrayBuffer = await blob.arrayBuffer()
              console.log('[UploadPanel] Pasted blob', { mime, bytes: arrayBuffer.byteLength })
              setPayload({ kind: 'blob', items: [{ mime, bytes: arrayBuffer.byteLength }] })
              setStage('process')
              return
            }
          }
        } catch (err: unknown) {
          console.warn('[UploadPanel] clipboard.read() failed', err)
        }
      } else {
        console.log('[UploadPanel] navigator.clipboard.read not available')
      }

      // 3) As a last resort, show a paste-catcher to let user press Cmd/Ctrl+V
      setShowPasteCatcher(true)
      if (!textLogged) {
        console.warn('[UploadPanel] Clipboard appears blocked; prompting manual paste')
      }
    } catch (e: unknown) {
      console.error('[UploadPanel] Clipboard error:', e)
    } finally {
      setSubmitting(false)
    }
  }, [isHuman, verifyHumanity])

  if (stage === 'process' && payload) {
    return (
      <div data-swipe-lock>
        <UploadStageTwo
          payload={payload}
          onBack={() => setStage('input')}
          onDone={handleBackToInbox}
        />
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col" {...(submitting || showPasteCatcher ? { 'data-swipe-lock': true } : {})}>
      <main className="flex-1 pt-16 pb-14 px-4 overflow-auto">
        <div className="mx-auto max-w-sm">
          {/* Gray box */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-center text-white/70 mb-3 flex items-center justify-center gap-2">
              <Link2 className="h-4 w-4" />
              <span>Start typing or paste a link</span>
            </div>

            {/* Search input row */}
            <div className="relative mb-3">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
                <Search className="h-5 w-5" />
              </div>
              <input
                value={query}
                readOnly={!isHuman}
                onClick={() => { if (!isHuman) void verifyHumanity() }}
                onFocus={() => { if (!isHuman) void verifyHumanity() }}
                onKeyDown={(e) => {
                  if (!isHuman) {
                    e.preventDefault()
                    void verifyHumanity()
                    return
                  }
                  if (e.key === 'Enter' && canSubmit) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
                onChange={(e) => {
                  if (!isHuman) {
                    void verifyHumanity()
                    return
                  }
                  setQuery(e.target.value)
                }}
                placeholder="Search or paste URL"
                className="w-full rounded-lg bg-black/30 border border-white/10 text-white placeholder-white/40 pl-10 pr-10 py-3 outline-none focus:ring-2 focus:ring-white/20"
              />
              {query.trim().length > 0 && (
                <button
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-md bg-white/15 hover:bg-white/25 disabled:opacity-50"
                  aria-label="Submit search"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Paste button */}
            <button
              disabled={submitting}
              onClick={handlePasteFromClipboard}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white py-2.5"
            >
              <ClipboardPaste className="h-5 w-5" />
              {submitting ? 'Reading from clipboard…' : 'Paste from clipboard'}
            </button>

            {error && (
              <div className="mt-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {showPasteCatcher && (
              <PasteCatcher
                onClose={() => setShowPasteCatcher(false)}
                onPastedText={(text) => { setPayload({ kind: 'text', text }); setStage('process') }}
                onPastedFiles={(files) => {
                  const mapped = files.map(f => ({ mime: f.type || 'application/octet-stream', bytes: f.size }))
                  setPayload({ kind: 'image', items: mapped })
                  setStage('process')
                }}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

// (no longer needed; keeping space for future binary flows)

function PasteCatcher({ onClose, onPastedText, onPastedFiles }: { onClose: () => void, onPastedText: (text: string) => void, onPastedFiles: (files: File[]) => void }) {
  const [hint, setHint] = useState('Press Cmd/Ctrl+V to paste')
  const onPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    try {
      const dt = e.clipboardData
      const text = dt.getData('text/plain')
      if (text) {
        console.log('[UploadPanel] Pasted text (manual):', text)
        onPastedText(text)
      }
      const files = Array.from(dt.files || [])
      if (files.length > 0) {
        files.forEach((f) => {
          console.log('[UploadPanel] Pasted file (manual):', { name: f.name, type: f.type, size: f.size })
        })
        onPastedFiles(files)
      }
      if (!text && files.length === 0) {
        console.log('[UploadPanel] Paste event contained no text/files')
      }
      setHint('Captured! You can close this prompt.')
    } catch (err) {
      console.error('[UploadPanel] Manual paste failed:', err)
    }
  }, [onPastedText, onPastedFiles])
  return (
    <div className="mt-4 p-3 rounded-lg border border-white/10 bg-black/40">
      <div className="text-white/80 text-sm mb-2">{hint}</div>
      <textarea
        autoFocus
        onPaste={onPaste}
        placeholder="Click here, then press Cmd/Ctrl+V"
        className="w-full h-24 rounded-md bg-black/40 border border-white/10 text-white p-2 outline-none focus:ring-2 focus:ring-white/20"
      />
      <div className="mt-2 flex justify-end">
        <button onClick={onClose} className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/10 text-white text-sm">Close</button>
      </div>
    </div>
  )
}

type StageTwoPayload = { kind: 'search'; query: string } | { kind: 'text'; text: string } | { kind: 'image' | 'blob'; items: { mime: string; bytes: number }[] }

function UploadStageTwo({ payload, onBack, onDone }: {
  payload: StageTwoPayload,
  onBack: () => void,
  onDone?: () => void,
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<Array<{ title: string; url: string; summary?: string; thumbnail?: string | null }>>([])
  const [postedItem, setPostedItem] = useState<{ title: string; url: string; summary?: string; thumbnail?: string | null } | null>(null)
  const [postedMsg] = useState<string | null>(null)

  // Run once per payload; avoid including server actions in deps to prevent HMR re-runs
  useEffect(() => {
    let cancelled = false
    async function run() {
      setError(null)
      setLoading(true)
      try {
        if (payload.kind === 'search') {
          const res = await exaSearchAction({ query: payload.query })
          if (!res.ok) throw new Error(res.error)
          if (!cancelled) setResults(res.results || [])
        } else if (payload.kind === 'text') {
          const r = await processPastedValueAction({ value: payload.text })
          if (!r.ok) throw new Error(r.error)
          if (r.mode === 'posted') {
            if (!cancelled) {
              try { if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(10) } catch {}
              setPostedItem({
                title: r.item.title,
                url: r.item.url,
                summary: r.item.summary,
                thumbnail: r.item.thumbnail,
              })
            }
          } else if (r.mode === 'search') {
            if (!cancelled) setResults(r.results || [])
          }
        } else {
          // Images/blobs: not supported yet
          if (!cancelled) setError('Images are not supported yet. Paste a link or text.')
        }
      } catch (e: unknown) {
        const message = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : 'Failed to process input'
        if (!cancelled) setError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [payload, onDone])

  const postSelection = useCallback(async (idx: number) => {
    try {
      setLoading(true)
      setError(null)
      const item = results[idx]
      if (!item) return
      const res = await submitMediaFromExaAction({ item })
      if (!res.ok) throw new Error(res.error)
      try { if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(10) } catch {}
      setPostedItem(item)
      setResults([])
    } catch (e: unknown) {
      const message = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : 'Failed to submit'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [results])

  return (
    <div className="h-full w-full flex flex-col">
      <main className="flex-1 pt-16 pb-14 px-4 overflow-auto">
        <div className="mx-auto max-w-sm">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-white text-base font-medium mb-3">{postedItem ? 'Upload — Step 3' : 'Upload — Step 2'}</div>
            {!postedItem && (
              <div className="text-white/80 text-sm mb-4">
                {payload.kind === 'search' && 'Select a result to post'}
                {payload.kind === 'text' && 'Processing pasted input…'}
                {(payload.kind === 'image' || payload.kind === 'blob') && 'Images are not supported yet'}
              </div>
            )}

            {postedMsg && (
              <div className="mt-4">
                <div className="mx-auto w-fit px-3 py-1.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 text-sm">
                  {postedMsg}
                </div>
              </div>
            )}

            {!postedItem && error && (
              <div className="text-red-300 text-sm mb-3">{error}</div>
            )}

            {!postedItem && loading && results.length === 0 && (
              <div className="text-white/70 text-sm mb-3">Loading…</div>
            )}

            {/* Posted confirmation view */}
            {postedItem && (
              <div className="space-y-2 mb-4">
                <div className="w-full text-left rounded-md bg-black/30 border border-white/10 p-3">
                  <div className="flex items-start gap-3">
                    <div className="h-14 w-14 rounded-md overflow-hidden bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
                      {postedItem.thumbnail ? (
                        <Image src={postedItem.thumbnail} alt="thumbnail" width={56} height={56} className="h-full w-full object-cover" unoptimized />
                      ) : (
                        <Link2 className="h-6 w-6 text-white/60" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-medium truncate">{postedItem.title}</div>
                      <div className="text-white/60 text-xs truncate">{postedItem.url}</div>
                      {postedItem.summary && (
                        <div className="text-white/70 text-sm line-clamp-2 mt-1">{postedItem.summary}</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mx-auto w-fit px-3 py-1.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 text-sm">Posted</div>
                <div className="flex justify-center">
                  <button onClick={onDone} className="mt-1 px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 border border-white/10 text-white text-sm">Back to Inbox</button>
                </div>
              </div>
            )}

            {/* Results list */}
            {!postedItem && results.length > 0 && (
              <div className="space-y-2 mb-4">
                {results.map((r, idx) => (
                  <button
                    key={idx}
                    onClick={() => postSelection(idx)}
                    className="w-full text-left rounded-md bg-black/30 hover:bg-black/40 border border-white/10 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-14 w-14 rounded-md overflow-hidden bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
                        {r.thumbnail ? (
                          <Image src={r.thumbnail} alt="thumbnail" width={56} height={56} className="h-full w-full object-cover" unoptimized />
                        ) : (
                          <Link2 className="h-6 w-6 text-white/60" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate">{r.title}</div>
                        <div className="text-white/60 text-xs truncate">{r.url}</div>
                        {r.summary && (
                          <div className="text-white/70 text-sm line-clamp-3 mt-1">{r.summary}</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!postedItem && (
              <div className="flex items-center justify-between gap-2">
                <button onClick={onBack} className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 border border-white/10 text-white">Back</button>
                {payload.kind === 'search' && (
                  <div className="text-white/60 text-xs">Tap a result to post</div>
                )}
                {results.length === 0 && payload.kind === 'search' && !loading && !error && (
                  <div className="text-white/50 text-sm">No results. Try a different query.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
