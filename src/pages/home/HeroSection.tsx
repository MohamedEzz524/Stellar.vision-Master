import { useEffect, useRef, useMemo } from 'react';
import { animateTextRandomization } from '../../utils/textSplitting';
import Hero3DModel from '../../components/Hero3DModel';
import { heroSectionParagraph } from '../../constants';

// Move utility functions outside component to avoid recreation
const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
};

const formatDate = (): string => {
  const now = new Date();
  const dayOfWeek = now
    .toLocaleDateString('en-US', { weekday: 'short' })
    .slice(0, 3);
  const day = now.getDate();
  const month = now
    .toLocaleDateString('en-US', { month: 'short' })
    .slice(0, 3)
    .toLowerCase();
  const ordinal = getOrdinalSuffix(day);
  return `${dayOfWeek}, ${day}${ordinal} of ${month}.`;
};

// Extract thermometer SVG to component
const ThermometerIcon = () => (
  <svg
    width="6"
    height="16"
    viewBox="0 0 6 16"
    className="thermometer-icon-inline"
    aria-hidden="true"
  >
    <rect
      x="1"
      y="0"
      width="4"
      height="12"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    />
    <circle
      cx="3"
      cy="14"
      r="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    />
    <rect x="1.5" y="4" width="3" height="8" rx="1.5" fill="currentColor" />
    <circle cx="3" cy="14" r="1.5" fill="currentColor" />
  </svg>
);

const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const cleanupFunctionsRef = useRef<Array<() => void>>([]);
  const currentDate = useMemo(() => formatDate(), []);

  useEffect(() => {
    // Scope to this section's h2s only — not all h2s in the document — so we
    // don't accidentally animate headings from other sections that mount later.
    const section = sectionRef.current;
    if (!section) return;

    const h2Elements = section.querySelectorAll<HTMLElement>('h2');
    const animationConfig = {
      interval: 7000,
      initialDelay: 2000,
      cycles: 8,
      cycleDuration: 0.05,
      charsClass: 'char',
    } as const;

    h2Elements.forEach((h2) => {
      const handle = animateTextRandomization(h2, animationConfig);
      cleanupFunctionsRef.current.push(handle.cleanup);
    });

    return () => {
      cleanupFunctionsRef.current.forEach((cleanup) => cleanup());
      cleanupFunctionsRef.current = [];
    };
  }, []);

  // 3D parallax on text rows + letter magnetism on each char.
  // Rows shift slightly with cursor X/Y (different magnitudes per row =
  // stereoscopic depth). Each .char inside the h2s is pulled toward the cursor
  // when within ~170px, with quadratic falloff. All transforms are smoothed via
  // lerp so movement glides instead of snapping. Disabled on non-hover devices
  // and when prefers-reduced-motion.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const supportsHover = window.matchMedia(
      '(hover: hover) and (pointer: fine)',
    ).matches;
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (!supportsHover || prefersReduced) return;

    let rafId = 0;
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let smoothedX = mouseX;
    let smoothedY = mouseY;

    type CharData = {
      el: HTMLElement;
      x: number;
      y: number;
      curX: number;
      curY: number;
    };
    let charsData: CharData[] = [];
    let rows: HTMLElement[] = [];
    let rowDepths: number[] = [];
    let cacheDirty = true;

    const updateCache = () => {
      rows = Array.from(section.querySelectorAll<HTMLElement>('h2'));
      rowDepths = rows.map((_, i) => 0.018 + (i % 4) * 0.013);
      const chars = section.querySelectorAll<HTMLElement>('h2 .char');
      const oldMap = new Map(charsData.map((c) => [c.el, c]));
      charsData = Array.from(chars).map((el) => {
        const r = el.getBoundingClientRect();
        const prev = oldMap.get(el);
        return {
          el,
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          curX: prev?.curX ?? 0,
          curY: prev?.curY ?? 0,
        };
      });
      cacheDirty = false;
    };

    const tick = () => {
      smoothedX += (mouseX - smoothedX) * 0.1;
      smoothedY += (mouseY - smoothedY) * 0.1;

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const offX = smoothedX - cx;
      const offY = smoothedY - cy;

      for (let i = 0; i < rows.length; i++) {
        const d = rowDepths[i];
        rows[i].style.transform = `translate3d(${(-offX * d * 0.35).toFixed(2)}px, ${(-offY * d * 0.3).toFixed(2)}px, 0)`;
      }

      if (cacheDirty) updateCache();

      const R = 170;
      const STRENGTH = 18;
      for (const c of charsData) {
        const dx = mouseX - c.x;
        const dy = mouseY - c.y;
        const d2 = dx * dx + dy * dy;
        let tx = 0;
        let ty = 0;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 1;
          const t = 1 - d / R;
          const force = t * t * STRENGTH;
          tx = (dx / d) * force;
          ty = (dy / d) * force;
        }
        c.curX += (tx - c.curX) * 0.2;
        c.curY += (ty - c.curY) * 0.2;
        c.el.style.transform = `translate(${c.curX.toFixed(2)}px, ${c.curY.toFixed(2)}px)`;
      }

      rafId = requestAnimationFrame(tick);
    };

    const onMouse = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    const onResize = () => {
      cacheDirty = true;
    };

    // SplitText runs synchronously inside the first useEffect, but layout
    // measurement is more reliable on the next frame.
    const initId = requestAnimationFrame(() => {
      cacheDirty = true;
      rafId = requestAnimationFrame(tick);
      window.addEventListener('mousemove', onMouse, { passive: true });
      window.addEventListener('resize', onResize);
      window.addEventListener('scroll', onResize, { passive: true });
    });

    return () => {
      cancelAnimationFrame(initId);
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize);
      rows.forEach((row) => {
        row.style.transform = '';
      });
      charsData.forEach((c) => {
        c.el.style.transform = '';
      });
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="hero-section"
      className="hero-section overflow-hidden"
    >
      <div className="container">
        {/* row-1 */}
        <div className="font-grid -mt-8 flex h-full flex-col justify-center gap-4">
          <div className="hidden grid-cols-1 gap-2 lg:grid lg:grid-cols-2">
            <div className="overflow-visible">
              <h2>THE BEST</h2>
            </div>
            <div className="ml-auto hidden max-w-96 flex-col font-sans leading-relaxed uppercase lg:flex">
              <div className="overflow-hidden">
                <p>Time: {currentDate}</p>
              </div>
              <div className="overflow-hidden">
                <p>
                  weather: our websites are so hot that your device is
                  overheating right now!{' '}
                  <span
                    id="temperature-display"
                    className="hot-temperature-text"
                  >
                    <ThermometerIcon />
                    <span id="temperature-value">0</span>°C
                  </span>
                </p>
              </div>
            </div>
          </div>
          {/* row-2 */}
          <span className="font-grid relative -mb-4 block text-[11px] uppercase lg:hidden">
            THE BEST
          </span>
          <div className="relative flex overflow-visible lg:justify-end">
            <h2>WEB DESIGN</h2>
          </div>
          {/* row-3 */}
          <div className="overflow-visible">
            <h2>STUDIO</h2>
          </div>
          {/* row-4 */}
          <div className="flex overflow-visible lg:justify-end">
            <h2>IN</h2>
          </div>
          {/* row-1-mobile */}
          <div className="flex justify-end overflow-visible lg:hidden">
            <h2>THE</h2>
          </div>
          {/* row-2-mobile */}
          <div className="flex justify-end overflow-visible lg:hidden">
            <h2>WHOLE</h2>
          </div>
          {/* row-5 */}
          <div className="flex flex-col-reverse justify-between gap-4 lg:mt-8 lg:flex-row">
            <div className="relative h-fit overflow-hidden pl-6 leading-tight uppercase lg:pl-10 lg:leading-snug">
              <span
                id="hero-vertical-bar"
                className="bg-textPrimary absolute top-0 left-2 h-full w-1 origin-bottom lg:left-4 lg:w-2"
              />
              <p className="max-w-[480px]">{heroSectionParagraph}</p>
            </div>
            <div className="mb-12 flex justify-end overflow-hidden lg:mb-0 lg:justify-start">
              <h2>MENA REGION</h2>
            </div>
          </div>
        </div>
      </div>

      {/* HERO 3D MODEL */}
      <Hero3DModel />
    </section>
  );
};

export default HeroSection;
