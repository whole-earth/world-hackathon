"use client"

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useSearchParams } from 'next/navigation'
import { useCredits } from "@/providers/CreditsProvider";
import { ChannelsList } from "./ExplorePanel/ChannelsList";
import { FiltersPane } from "./SortPanel/FiltersPane";
import { Inbox, Newspaper, Plus } from 'lucide-react'
import { HeaderCreditsPill } from '@/components/Header/HeaderCreditsPill'
import { UploadPanel } from './UploadPanel'

// Layout: [ Upload | Filters | Channels ]
// Default shows Channels (translated -2 * width).

export function SwipeShell() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { flush } = useCredits();
  const searchParams = useSearchParams();

  // Progress in [0..2]: 0 = Upload (far left), 1 = Filters (middle), 2 = Channels (right)
  // Default to Channels
  const [progress, setProgress] = useState(2);
  const [isDragging, setIsDragging] = useState(false); // true only when horizontally swiping
  const startXRef = useRef<number | null>(null);
  const startProgressRef = useRef<number>(2);
  const startYRef = useRef<number | null>(null);
  const axisRef = useRef<'none' | 'x' | 'y'>('none');
  const [uploadLocked, setUploadLocked] = useState(false);

  const getContainerWidth = () => containerRef.current?.clientWidth || window.innerWidth || 1;

  const clamp02 = (v: number) => Math.max(0, Math.min(2, v));

  const snapTo = useCallback((target: 0 | 1 | 2) => {
    const from = progress;
    if (target !== Math.round(from)) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(15); } catch {}
      }
      // Trigger a server-side mutation flush when switching tabs
      try { void flush(); } catch {}
      
      // Reset channels state when navigating to channels panel
      if (target === 2) {
        console.log('SwipeShell: Dispatching channels:reset event')
        window.dispatchEvent(new CustomEvent('channels:reset'));
      }
    }
    setProgress(target);
  }, [progress, flush]);

  // Respect a `?tab=` query on mount or when it changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'filters') setProgress(1);
    else if (tab === 'channels') setProgress(2);
    else if (tab === 'upload') setProgress(0);
  }, [searchParams]);

  // Listen for upload swipe lock events from UploadPanel
  useEffect(() => {
    const isCustomEvent = (e: Event): e is CustomEvent<unknown> => 'detail' in (e as unknown as Record<string, unknown>)
    function onLock(e: Event) {
      if (isCustomEvent(e)) setUploadLocked(Boolean(e.detail))
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('swipe:lock', onLock as EventListener)
      return () => window.removeEventListener('swipe:lock', onLock as EventListener)
    }
    return () => {}
  }, [])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Global lock when Upload is active and processing
    if (uploadLocked && Math.round(progress) === 0) {
      startXRef.current = null
      startYRef.current = null
      axisRef.current = 'none'
      setIsDragging(false)
      return
    }
    const target = e.target as Element | null
    if (target && target.closest('[data-swipe-lock]')) {
      // Ignore shell swipe if starting inside a locked region (e.g., Tinder stack)
      startXRef.current = null
      startYRef.current = null
      axisRef.current = 'none'
      setIsDragging(false)
      return
    }
    const t = e.touches[0];
    startXRef.current = t.clientX;
    startYRef.current = t.clientY;
    startProgressRef.current = progress;
    axisRef.current = 'none';
    setIsDragging(false);
  }, [progress, uploadLocked]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startXRef.current == null || startYRef.current == null) return;
    const t = e.touches[0];
    const dx = t.clientX - startXRef.current;
    const dy = t.clientY - startYRef.current;
    const lockThreshold = 12; // px
    if (axisRef.current === 'none') {
      if (Math.abs(dx) > lockThreshold || Math.abs(dy) > lockThreshold) {
        axisRef.current = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        setIsDragging(axisRef.current === 'x');
      }
    }
    if (axisRef.current !== 'x') return;
    const width = getContainerWidth();
    // Reversed: swiping right (dx > 0) moves to the left (toward 0)
    const next = clamp02(startProgressRef.current - dx / width);
    setProgress(next);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (axisRef.current === 'x') {
      if (uploadLocked && Math.round(progress) === 0) {
        // Keep on Upload when locked
        snapTo(0)
        axisRef.current = 'none'
        startXRef.current = null
        startYRef.current = null
        setIsDragging(false)
        return
      }
      const start = startProgressRef.current;
      const curr = progress;
      const threshold = 0.2; // panel width fraction
      const delta = Math.abs(curr - start);
      if (delta < threshold) {
        snapTo(Math.round(start) as 0 | 1 | 2);
      } else {
        snapTo(Math.round(curr) as 0 | 1 | 2);
      }
    }
    axisRef.current = 'none';
    startXRef.current = null;
    startYRef.current = null;
    setIsDragging(false);
  }, [progress, snapTo, uploadLocked]);

  // Pointer (mouse/pen) support for desktop
  const pointerIdRef = useRef<number | null>(null);
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (uploadLocked && Math.round(progress) === 0) {
      pointerIdRef.current = null
      startXRef.current = null
      startYRef.current = null
      axisRef.current = 'none'
      setIsDragging(false)
      return
    }
    const target = e.target as Element | null
    if (target && target.closest('[data-swipe-lock]')) {
      // Do not start shell swipe when interacting inside locked region
      pointerIdRef.current = null
      startXRef.current = null
      startYRef.current = null
      axisRef.current = 'none'
      setIsDragging(false)
      return
    }
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    startProgressRef.current = progress;
    axisRef.current = 'none';
    setIsDragging(false);
  }, [progress, uploadLocked]);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerIdRef.current == null || startXRef.current == null) return;
    const dx = e.clientX - startXRef.current;
    const dy = (startYRef.current != null ? e.clientY - startYRef.current : 0);
    const lockThreshold = 12;
    if (axisRef.current === 'none') {
      if (Math.abs(dx) > lockThreshold || Math.abs(dy) > lockThreshold) {
        axisRef.current = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        setIsDragging(axisRef.current === 'x');
      }
    }
    if (axisRef.current !== 'x') return;
    const width = getContainerWidth();
    // Reversed: swiping right (dx > 0) moves to the left (toward 0)
    const next = clamp02(startProgressRef.current - dx / width);
    setProgress(next);
  }, []);
  const onPointerUp = useCallback(() => {
    pointerIdRef.current = null;
    onTouchEnd();
  }, [onTouchEnd]);

  const translatePx = useMemo(() => -progress * getContainerWidth(), [progress]);
  // Indicator only tracks Filters(1) <-> Channels(2)
  const pillIndicator = useMemo(() => Math.max(0, Math.min(1, progress - 1)), [progress]);
  // Crossfade pill indicator out as we move toward Upload (0..1)
  const pillOpacity = useMemo(() => (progress >= 1 ? 1 : Math.max(0, progress)), [progress]);
  // Upload button glow increases as we approach Upload
  const uploadGlow = useMemo(() => Math.max(0, 1 - Math.min(progress, 1)), [progress]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full overflow-hidden bg-black text-white"
    >
      {/* Fixed Header with crossfading title, perfectly centered */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10">
        <div className="flex items-center">
          {/* Invisible spacer to balance right pill width */}
          <div className="invisible">
            <HeaderCreditsPill />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="relative h-6">
              <span
                className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 text-lg font-semibold whitespace-nowrap"
                style={{ opacity: Math.max(0, 1 - Math.min(1, Math.abs(progress - 0))), transition: isDragging ? 'none' : 'opacity 220ms ease' }}
              >
                Upload
              </span>
              <span
                className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 text-lg font-semibold whitespace-nowrap"
                style={{ opacity: Math.max(0, 1 - Math.min(1, Math.abs(progress - 1))), transition: isDragging ? 'none' : 'opacity 220ms ease' }}
              >
                Filters
              </span>
              <span
                className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 text-lg font-semibold whitespace-nowrap"
                style={{ opacity: Math.max(0, 1 - Math.min(1, Math.abs(progress - 2))), transition: isDragging ? 'none' : 'opacity 220ms ease' }}
              >
                Channels
              </span>
            </div>
          </div>
          <div>
            <HeaderCreditsPill />
          </div>
        </div>
      </div>
      <div
        className="absolute inset-0 flex h-full w-[300%] touch-pan-y select-none"
        style={{ transform: `translate3d(${translatePx}px, 0, 0)`, transition: isDragging ? "none" : "transform 220ms ease" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Upload - far left */}
        <section className="w-1/3 h-full bg-neutral-900 border-r border-neutral-800" {...(uploadLocked ? { 'data-swipe-lock': true } : {})}>
          <UploadPanel onDone={() => snapTo(1)} />
        </section>
        {/* Filters - middle */}
        <section className="w-1/3 h-full bg-neutral-900 border-r border-neutral-800">
          <FiltersPane showHeader={false} />
        </section>
        {/* Channels - right */}
        <section className="w-1/3 h-full bg-neutral-950">
          <ChannelsList showHeader={false} />
        </section>
      </div>

      {/* Bottom pill tabs (body is max-width:700px) */}
      <div className="absolute bottom-8 left-0 right-0">
        <div className="w-full px-4 flex justify-center">
          <div className={`relative w-48 rounded-full bg-white/10 backdrop-blur px-1 py-1 flex items-center border border-white/15 ${uploadLocked && Math.round(progress) === 0 ? 'pointer-events-none opacity-70' : ''}`}>
          {/* Sliding indicator */}
          <div
            className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white/20"
            style={{
              transform: `translate3d(${pillIndicator * 100}%, 0, 0)`,
              opacity: pillOpacity,
              transition: isDragging ? 'none' : 'transform 220ms ease, opacity 220ms ease',
            }}
          />
          <button
            className={`relative z-10 flex-1 inline-flex flex-col items-center justify-center gap-0.5 text-[10px] py-1 ${progress < 1.5 ? 'text-white' : 'text-white/80'}`}
            onClick={() => { if (!(uploadLocked && Math.round(progress) === 0)) snapTo(1) }}
          >
            <Inbox className="h-6 w-6" />
            <span>Filters</span>
          </button>
          <button
            className={`relative z-10 flex-1 inline-flex flex-col items-center justify-center gap-0.5 text-[10px] py-1 ${progress >= 1.5 ? 'text-white' : 'text-white/80'}`}
            onClick={() => { if (!(uploadLocked && Math.round(progress) === 0)) snapTo(2) }}
          >
            <Newspaper className="h-6 w-6" />
            <span>Channels</span>
          </button>
          </div>
        </div>
      </div>

      {/* Upload button - absolute bottom-left aligned with content padding */}
      <div className="absolute bottom-10 left-4">
        <button
          aria-label="Upload"
          onClick={() => snapTo(0)}
          className="relative top-1.5 overflow-hidden h-14 w-14 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center transition-colors"
        >
          {/* Glow overlay that fades in when Upload is active */}
          <div
            className="absolute inset-0 rounded-full bg-white/25"
            style={{ opacity: uploadGlow, transition: isDragging ? 'none' : 'opacity 220ms ease' }}
          />
          <Plus className="relative z-10 h-6 w-6 text-white" />
        </button>
      </div>
    </div>
  );
}
