import { useEffect, useRef } from 'react';

/**
 * Cursor variants. Any element with `data-cursor="link"` (etc.) will switch
 * the cursor into that variant on hover. No text labels — the variant only
 * changes the cursor's size and contrast. mix-blend-mode: difference handles
 * automatic color inversion against whatever background is underneath.
 */
type CursorVariant = 'default' | 'link' | 'cta' | 'image' | 'video';

/**
 * Custom cursor.
 *
 * - Position is updated via a ref + RAF (no React re-renders per mousemove).
 * - Variant switches on a delegated `mouseover` listener: when the cursor
 *   moves over an element with `[data-cursor]`, we set a data attribute on
 *   the cursor wrapper and CSS handles the visual change.
 * - mix-blend-mode: difference (in index.css) means the cursor always reads
 *   as the inverse of whatever's underneath. No light/dark logic needed.
 */
const CustomCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    // --- Position (ref-based, no setState) ---------------------------------
    let rafId = 0;
    let nextX = 0;
    let nextY = 0;

    const applyPosition = () => {
      cursor.style.transform = `translate3d(${nextX}px, ${nextY}px, 0) translate(-50%, -50%)`;
      rafId = 0;
    };

    const updateCursor = (e: MouseEvent) => {
      nextX = e.clientX;
      nextY = e.clientY;
      if (!rafId) rafId = requestAnimationFrame(applyPosition);
    };

    // --- Variant (delegated, data-attribute driven) ------------------------
    let currentVariant: CursorVariant = 'default';

    const applyVariant = (variant: CursorVariant) => {
      if (variant === currentVariant) return;
      currentVariant = variant;
      cursor.dataset.variant = variant;
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const cursorEl = target.closest('[data-cursor]') as HTMLElement | null;
      if (cursorEl) {
        const variant = (cursorEl.dataset.cursor as CursorVariant) || 'default';
        applyVariant(variant);
      } else {
        applyVariant('default');
      }
    };

    // --- Visibility (hide when cursor leaves the window) -------------------
    const showCursor = () => {
      cursor.style.visibility = 'visible';
    };
    const hideCursor = () => {
      cursor.style.visibility = 'hidden';
    };

    window.addEventListener('mousemove', updateCursor);
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseenter', showCursor);
    document.addEventListener('mouseleave', hideCursor);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', updateCursor);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseenter', showCursor);
      document.removeEventListener('mouseleave', hideCursor);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      data-variant="default"
      className="custom-cursor pointer-events-none fixed top-0 left-0 z-[999999] hidden h-12 w-12 items-center justify-center will-change-transform lg:flex"
    >
      <div className="cursor-outer" />
      <div className="cursor-inner" />
    </div>
  );
};

export default CustomCursor;
