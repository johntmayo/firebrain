import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const SHOW_DELAY_MS = 350;
const GAP_PX = 6;
const EDGE_PX = 8;

/** Touch-first device: hover tooltips are suppressed and `title` carries the hint instead. */
export function isCoarsePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}

/**
 * A `title` for controls that also have a hover tooltip: only set where the
 * tooltip cannot show (coarse pointers), so desktop never shows two tips for
 * one control. Controls without a visible label still need an `aria-label`.
 */
export function titleFallback(text: string | undefined): string | undefined {
  return text && isCoarsePointer() ? text : undefined;
}

interface TooltipPosition {
  left: number;
  top: number;
  placement: 'above' | 'below';
}

interface UseTooltipResult {
  /** Spread onto the anchor element. */
  anchorProps: {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => void;
    onMouseLeave: () => void;
    onFocus: (e: React.FocusEvent<HTMLElement>) => void;
    onBlur: () => void;
  };
  /** Render anywhere in the tree; it portals to <body>. */
  tooltip: React.ReactNode;
}

/**
 * useTooltip — hover/focus tooltip with a show delay, portaled to <body> and
 * positioned below the anchor (flipping above when there's no room).
 * Hidden under `pointer: coarse`; touch gets its details from the dialog.
 */
export function useTooltip(content: React.ReactNode, enabled = true): UseTooltipResult {
  const [pos, setPos] = useState<TooltipPosition | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const tipW = tipRef.current?.offsetWidth ?? 240;
    const tipH = tipRef.current?.offsetHeight ?? 60;
    let left = r.left + r.width / 2 - tipW / 2;
    left = Math.max(EDGE_PX, Math.min(left, window.innerWidth - tipW - EDGE_PX));
    const below = r.bottom + GAP_PX;
    const fitsBelow = below + tipH <= window.innerHeight - EDGE_PX;
    const top = fitsBelow ? below : r.top - GAP_PX - tipH;
    setPos({ left, top, placement: fitsBelow ? 'below' : 'above' });
  }, []);

  const scheduleShow = useCallback((el: HTMLElement, delay: number) => {
    if (!enabled || !content) return;
    if (isCoarsePointer()) return;
    anchorRef.current = el;
    clear();
    timer.current = setTimeout(() => {
      // Position with estimated size first, then correct once measured.
      place();
      requestAnimationFrame(place);
    }, delay);
  }, [clear, content, enabled, place]);

  const hide = useCallback(() => {
    clear();
    setPos(null);
  }, [clear]);

  useEffect(() => clear, [clear]);

  // If the anchor becomes disabled (e.g. drag starts) while a tip is up, drop it.
  useEffect(() => {
    if (!enabled) hide();
  }, [enabled, hide]);

  // While visible, watch the real pointer. React's synthetic mouseleave does not
  // fire when the pointer moves into a *portaled* descendant (the ⋯ menu, the
  // tooltip itself), and a card that opens a dialog or starts a drag never gets a
  // leave at all — so the tip would otherwise persist until the next hover.
  useEffect(() => {
    if (!pos) return;
    const onPointerMove = (e: PointerEvent) => {
      const anchor = anchorRef.current;
      if (!anchor || !anchor.isConnected) { hide(); return; }
      if (!(e.target instanceof Node) || !anchor.contains(e.target)) hide();
    };
    const onPointerDown = () => hide();
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
    const onScroll = () => hide();
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    window.addEventListener('blur', onScroll);
    return () => {
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('blur', onScroll);
    };
  }, [pos, hide]);

  const anchorProps = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => scheduleShow(e.currentTarget, SHOW_DELAY_MS),
    onMouseLeave: hide,
    onFocus: (e: React.FocusEvent<HTMLElement>) => scheduleShow(e.currentTarget, 80),
    onBlur: hide,
  };

  const tooltip = pos && content
    ? createPortal(
        <div
          ref={tipRef}
          role="tooltip"
          className={`tooltip tooltip--${pos.placement}`}
          style={{ left: pos.left, top: pos.top }}
        >
          {content}
        </div>,
        document.body,
      )
    : null;

  return { anchorProps, tooltip };
}

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  /** Make the anchor a block/flex child instead of inline. */
  block?: boolean;
  className?: string;
}

/**
 * Tooltip — wraps a single element in an anchor span. For elements that
 * must own their root (cards), use `useTooltip` directly.
 */
export function Tooltip({ content, children, block, className = '' }: TooltipProps) {
  const { anchorProps, tooltip } = useTooltip(content);
  return (
    <>
      <span className={`tip-anchor ${block ? 'tip-anchor--block' : ''} ${className}`.trim()} {...anchorProps}>
        {children}
      </span>
      {tooltip}
    </>
  );
}
