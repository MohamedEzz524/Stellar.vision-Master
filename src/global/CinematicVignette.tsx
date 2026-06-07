import { useEffect, useRef } from 'react';

/**
 * Cinematic vignette + section-change grain flash.
 *
 * Two layers fixed above the page:
 *   1. A persistent radial vignette (subtle dark edges) that makes every
 *      section feel like a film frame instead of a flat web canvas.
 *   2. A faint film-grain overlay that briefly flashes when the next <section>
 *      enters the viewport — like the camera changing reels.
 *
 * The vignette is pointer-events: none and uses mix-blend-mode: multiply, so
 * it only affects perception (darkens edges) without touching layout.
 */
const CinematicVignette = () => {
  const vignetteRef = useRef<HTMLDivElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const vignette = vignetteRef.current;
    const grain = grainRef.current;
    if (!vignette || !grain) return;

    // Don't flash for sections that are already visible at mount — only future
    // entries should trigger the transition flash.
    let firedInitial = false;

    const flash = () => {
      // Intensify the dark vignette briefly + pulse the grain layer.
      vignette.style.setProperty('--vignette-opacity', '0.9');
      grain.style.opacity = '0.18';
      window.setTimeout(() => {
        vignette.style.setProperty('--vignette-opacity', '0.45');
        grain.style.opacity = '0';
      }, 320);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!firedInitial) {
          firedInitial = true;
          return; // ignore the initial paint batch
        }
        for (const entry of entries) {
          if (entry.isIntersecting) {
            flash();
            break; // one flash per batch is enough
          }
        }
      },
      { threshold: 0.15 },
    );

    // Observe every <section> on the page. New sections that mount later
    // (e.g. lazy-loaded routes) wouldn't be observed — fine for now since
    // routes are page-level and Cinematic mounts once per route.
    const sections = document.querySelectorAll('section');
    sections.forEach((s) => observer.observe(s));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        ref={vignetteRef}
        className="cinematic-vignette pointer-events-none fixed inset-0 z-[9998]"
        aria-hidden="true"
      />
      <div
        ref={grainRef}
        className="cinematic-grain pointer-events-none fixed inset-0 z-[9999]"
        aria-hidden="true"
      />
    </>
  );
};

export default CinematicVignette;
