"use client"

import { useCallback, useMemo, useRef, useState } from "react";
import { ChannelsList } from "./ChannelsList";
import { FiltersPane } from "./FiltersPane";

// Layout: [ Filters | Channels ]
// Default shows Channels (translated -100%). Swipe right to reveal Filters.

export function SwipeShell() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Progress in [0..1]: 0 = Filters (left), 1 = Channels (right)
  // Default to Channels
  const [progress, setProgress] = useState(1);
  const [isDragging, setIsDragging] = useState(false); // true only when horizontally swiping
  const startXRef = useRef<number | null>(null);
  const startProgressRef = useRef<number>(1);
  const startYRef = useRef<number | null>(null);
  const axisRef = useRef<'none' | 'x' | 'y'>('none');

  const getContainerWidth = () => containerRef.current?.clientWidth || window.innerWidth || 1;

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  const snapTo = useCallback((target: 0 | 1) => {
    const from = progress;
    if (target !== (from < 0.5 ? 0 : 1)) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(15); } catch {}
      }
    }
    setProgress(target);
  }, [progress]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    startXRef.current = t.clientX;
    startYRef.current = t.clientY;
    startProgressRef.current = progress;
    axisRef.current = 'none';
    setIsDragging(false);
  }, [progress]);

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
    // Reversed: swiping right (dx > 0) moves to Filters (progress toward 0)
    const next = clamp01(startProgressRef.current - dx / width);
    setProgress(next);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (axisRef.current === 'x') {
      const delta = progress - startProgressRef.current;
      const threshold = 0.2; // 20%
      if (delta > threshold) snapTo(1);
      else if (delta < -threshold) snapTo(0);
      else snapTo((startProgressRef.current < 0.5 ? 0 : 1) as 0 | 1);
    }
    axisRef.current = 'none';
    startXRef.current = null;
    startYRef.current = null;
    setIsDragging(false);
  }, [progress, snapTo]);

  // Pointer (mouse/pen) support for desktop
  const pointerIdRef = useRef<number | null>(null);
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    startProgressRef.current = progress;
    axisRef.current = 'none';
    setIsDragging(false);
  }, [progress]);
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
    // Reversed: swiping right (dx > 0) moves to Filters (progress toward 0)
    const next = clamp01(startProgressRef.current - dx / width);
    setProgress(next);
  }, []);
  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointerIdRef.current = null;
    onTouchEnd();
  }, [onTouchEnd]);

  const translatePx = useMemo(() => -progress * getContainerWidth(), [progress]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full overflow-hidden bg-black text-white"
    >
      <div
        className="absolute inset-0 flex h-full w-[200%] touch-pan-y select-none"
        style={{ transform: `translate3d(${translatePx}px, 0, 0)`, transition: isDragging ? "none" : "transform 220ms ease" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <section className="w-1/2 h-full bg-neutral-900 border-r border-neutral-800">
          <FiltersPane onClose={() => snapTo(1)} />
        </section>
        <section className="w-1/2 h-full bg-neutral-950">
          <ChannelsList onOpenFilters={() => snapTo(0)} />
        </section>
      </div>

      {/* Bottom pill tabs (body is max-width:700px) */}
      <div className="absolute bottom-4 left-0 right-0">
        <div className="w-full px-4 flex justify-center">
          <div className="relative w-56 rounded-full bg-white/10 backdrop-blur px-1 py-1 flex items-center border border-white/15">
          {/* Sliding indicator */}
          <div
            className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white/20"
            style={{
              transform: `translate3d(${progress * 100}%, 0, 0)`,
              transition: isDragging ? 'none' : 'transform 220ms ease',
            }}
          />
          <button
            className={`relative z-10 flex-1 text-center text-sm py-1 ${progress < 0.5 ? 'text-white' : 'text-white/80'}`}
            onClick={() => snapTo(0)}
          >
            Filters
          </button>
          <button
            className={`relative z-10 flex-1 text-center text-sm py-1 ${progress >= 0.5 ? 'text-white' : 'text-white/80'}`}
            onClick={() => snapTo(1)}
          >
            Channels
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
