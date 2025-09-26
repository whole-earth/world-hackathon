"use client"

import { useCallback, useMemo, useRef, useState } from "react";
import { ChannelsList } from "./ChannelsList";
import { FiltersPane } from "./FiltersPane";

// Layout: [ Filters | Channels ]
// Default shows Channels (translated -100%). Swipe right to reveal Filters.

export function SwipeShell() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 0 = show Channels, 1 = show Filters (to the left)
  const [view, setView] = useState<0 | 1>(0);
  const [dragPx, setDragPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number | null>(null);

  // Base offset in px: when showing Channels (default), offset = -containerWidth
  const getContainerWidth = () => containerRef.current?.clientWidth || window.innerWidth || 1;
  const baseOffsetPx = useMemo(() => (view === 0 ? -getContainerWidth() : 0), [view]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setDragPx(0);
    setIsDragging(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startXRef.current == null) return;
    const dx = e.touches[0].clientX - startXRef.current;
    const width = getContainerWidth();
    const min = view === 0 ? 0 : -width; // channels -> only right (positive), filters -> only left (negative)
    const max = view === 0 ? width : 0;
    const clamped = Math.max(Math.min(dx, max), min);
    setDragPx(clamped);
  }, [view]);

  const onTouchEnd = useCallback(() => {
    const width = getContainerWidth();
    const thresholdPx = width * 0.2; // 20%
    let next = view;
    if (view === 0 && dragPx > thresholdPx) next = 1;      // reveal Filters
    else if (view === 1 && dragPx < -thresholdPx) next = 0; // return to Channels
    if (next !== view) {
      try {
        // Light haptic tick on snap (supported on some devices)
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          // @ts-expect-error: vibrate exists in some browsers
          navigator.vibrate?.(15);
        }
      } catch {}
    }
    setView(next);
    setDragPx(0);
    setIsDragging(false);
  }, [dragPx, view]);

  // Pointer (mouse/pen) support for desktop
  const pointerIdRef = useRef<number | null>(null);
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    pointerIdRef.current = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
    setDragPx(0);
    setIsDragging(true);
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerIdRef.current == null || startXRef.current == null) return;
    const dx = e.clientX - startXRef.current;
    const width = getContainerWidth();
    const min = view === 0 ? 0 : -width;
    const max = view === 0 ? width : 0;
    const clamped = Math.max(Math.min(dx, max), min);
    setDragPx(clamped);
  }, [view]);
  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (pointerIdRef.current != null) {
      (e.currentTarget as HTMLElement).releasePointerCapture(pointerIdRef.current);
    }
    pointerIdRef.current = null;
    onTouchEnd();
  }, [onTouchEnd]);

  const translatePx = baseOffsetPx + dragPx;

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden bg-black text-white">
      <div
        className="absolute inset-0 flex h-full w-[200%] touch-pan-y select-none"
        style={{ transform: `translate3d(${translatePx}px, 0, 0)`, transition: isDragging ? "none" : "transform 200ms ease" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <section className="w-1/2 h-full bg-neutral-900 border-r border-neutral-800">
          <FiltersPane onClose={() => setView(0)} />
        </section>
        <section className="w-1/2 h-full bg-neutral-950">
          <ChannelsList onOpenFilters={() => setView(1)} />
        </section>
      </div>

      {/* Bottom tab hint */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="mx-auto max-w-sm rounded-full bg-white/10 backdrop-blur px-2 py-1 flex items-center justify-between border border-white/15">
          <button
            className={`flex-1 text-center text-sm py-1 rounded-full transition-colors ${view === 1 ? 'text-white bg-white/10' : 'text-white/60'}`}
            onClick={() => setView(1)}
          >
            Filters
          </button>
          <button
            className={`flex-1 text-center text-sm py-1 rounded-full transition-colors ${view === 0 ? 'text-white bg-white/10' : 'text-white/60'}`}
            onClick={() => setView(0)}
          >
            Channels
          </button>
        </div>
      </div>
    </div>
  );
}
