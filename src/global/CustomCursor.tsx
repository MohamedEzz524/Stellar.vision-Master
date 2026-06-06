import { useEffect, useRef } from 'react';

/**
 * Custom cursor that follows the mouse on desktop.
 *
 * Position is written directly to the DOM via a ref instead of going through
 * React state — `mousemove` fires 60+ times per second and calling `setState`
 * on every event would trigger a re-render flood. The ref-based update path
 * stays off the React reconciler entirely.
 */
const CustomCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    let rafId = 0;
    let nextX = 0;
    let nextY = 0;

    const apply = () => {
      cursor.style.transform = `translate3d(${nextX}px, ${nextY}px, 0) translate(-50%, -50%)`;
      rafId = 0;
    };

    const updateCursor = (e: MouseEvent) => {
      nextX = e.clientX;
      nextY = e.clientY;
      // Coalesce many mousemove events into a single style write per frame.
      if (!rafId) rafId = requestAnimationFrame(apply);
    };

    const showCursor = () => {
      cursor.style.visibility = 'visible';
    };

    const hideCursor = () => {
      cursor.style.visibility = 'hidden';
    };

    window.addEventListener('mousemove', updateCursor);
    document.addEventListener('mouseenter', showCursor);
    document.addEventListener('mouseleave', hideCursor);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', updateCursor);
      document.removeEventListener('mouseenter', showCursor);
      document.removeEventListener('mouseleave', hideCursor);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="custom-cursor pointer-events-none fixed top-0 left-0 z-[999999] hidden items-center justify-center will-change-transform lg:flex"
    >
      <div className="cursor-outer" />
      <div className="cursor-inner" />
    </div>
  );
};

export default CustomCursor;
