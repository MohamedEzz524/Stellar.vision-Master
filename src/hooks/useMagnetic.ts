import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface UseMagneticOptions {
  /**
   * Distance in pixels at which the element starts being attracted to the cursor.
   * Measured from the cursor to the element's center. Default 80.
   */
  radius?: number;
  /**
   * How much of the cursor's offset to apply. 0 = no movement, 1 = element
   * sits exactly under the cursor. Default 0.4 — enough to feel alive,
   * not enough to lose the element's silhouette.
   */
  strength?: number;
}

/**
 * Magnetic CTA hook.
 *
 * Attach the returned ref to a button (or any element) and it will tilt
 * toward the cursor whenever the cursor is within `radius` of the element's
 * center, then spring back when the cursor leaves the radius.
 *
 * Implementation notes:
 *  - Listens on `window` for mousemove so the magnetism kicks in BEFORE the
 *    cursor reaches the element — that's what makes it feel like a pull
 *    rather than a hover-only effect.
 *  - Coalesces mousemove events into a single update per animation frame so
 *    we never do more than 60 transform writes per second, regardless of
 *    how aggressively the OS samples the mouse.
 *  - No-ops on touch/pen devices (no `hover: hover` or `pointer: fine`),
 *    where magnetic CTAs feel weird and waste CPU.
 *  - Honors prefers-reduced-motion by disabling itself entirely.
 */
export const useMagnetic = <T extends HTMLElement>(
  { radius = 80, strength = 0.4 }: UseMagneticOptions = {},
) => {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const supportsHover = window.matchMedia(
      '(hover: hover) and (pointer: fine)',
    ).matches;
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (!supportsHover || prefersReducedMotion) return;

    let rafId = 0;
    let lastX = 0;
    let lastY = 0;
    let isPulled = false;

    const apply = () => {
      rafId = 0;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = lastX - cx;
      const dy = lastY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist < radius) {
        const pull = (radius - dist) / radius;
        gsap.to(el, {
          x: dx * pull * strength,
          y: dy * pull * strength,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
        });
        isPulled = true;
      } else if (isPulled) {
        // Springy release so the button "rebounds" when the cursor walks away.
        gsap.to(el, {
          x: 0,
          y: 0,
          duration: 0.6,
          ease: 'elastic.out(1, 0.5)',
          overwrite: 'auto',
        });
        isPulled = false;
      }
    };

    const handleMove = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (!rafId) rafId = requestAnimationFrame(apply);
    };

    window.addEventListener('mousemove', handleMove, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMove);
      gsap.set(el, { x: 0, y: 0 });
    };
  }, [radius, strength]);

  return ref;
};
