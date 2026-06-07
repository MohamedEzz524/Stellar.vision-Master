import { useEffect, useRef } from 'react';
import AnimatedTextRotation from '../../components/AnimatedTextRotation';
import AnimatedText from '../../components/AnimatedText';
import { animateTextRandomization } from '../../utils/textSplitting';
import { texts, homeHeaderParagraphs } from '../../constants';

const HomeHeader = () => {
  const immersiveRef = useRef<HTMLSpanElement>(null);

  // Letter magnetism on IMMERSIVE — same physics as TESTIMONIALS title.
  useEffect(() => {
    const el = immersiveRef.current;
    if (!el) return;

    const handle = animateTextRandomization(el, {
      interval: 0,
      initialDelay: 0,
      cycles: 0,
      cycleDuration: 0,
      charsClass: 'char',
    });

    const supportsHover = window.matchMedia(
      '(hover: hover) and (pointer: fine)',
    ).matches;
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (!supportsHover || prefersReduced) {
      return () => handle.cleanup();
    }

    let rafId = 0;
    let mouseX = -10000;
    let mouseY = -10000;

    type CharData = {
      el: HTMLElement;
      x: number;
      y: number;
      curX: number;
      curY: number;
    };
    let charsData: CharData[] = [];
    let cacheDirty = true;

    const updateCache = () => {
      const chars = el.querySelectorAll<HTMLElement>('.char');
      const oldMap = new Map(charsData.map((c) => [c.el, c]));
      charsData = Array.from(chars).map((c) => {
        const r = c.getBoundingClientRect();
        const prev = oldMap.get(c);
        return {
          el: c,
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          curX: prev?.curX ?? 0,
          curY: prev?.curY ?? 0,
        };
      });
      cacheDirty = false;
    };

    const tick = () => {
      if (cacheDirty) updateCache();
      const R = 170;
      const STRENGTH = 22;
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
      charsData.forEach((c) => {
        c.el.style.transform = '';
      });
      handle.cleanup();
    };
  }, []);

  return (
    <div className="home-header bg-bgPrimary border-border relative overflow-hidden border-t pt-8">
      {/* Celestial orbital ring + satellite */}
      <div
        className="header-orbit pointer-events-none absolute select-none"
        aria-hidden="true"
      >
        <div className="header-orbit-rotator">
          <span className="header-orbit-satellite" />
        </div>
      </div>

      {/* Scattered twinkling stars across the section */}
      <div className="header-stars pointer-events-none absolute inset-0" aria-hidden="true">
        <span className="header-star" />
        <span className="header-star" />
        <span className="header-star header-star-md" />
        <span className="header-star" />
        <span className="header-star header-star-md" />
        <span className="header-star" />
        <span className="header-star" />
        <span className="header-star header-star-sm" />
      </div>

      <div className="container">
        <div className="text-textPrimary border-border flex flex-col justify-between gap-8 border-b px-4 pb-6 lg:flex-row lg:items-center lg:gap-4 lg:px-0">
          {/* Left */}
          <div className="text-sm md:text-sm lg:text-lg">
            <AnimatedText
              type="slide"
              className="block w-sm max-w-full lg:w-full lg:max-w-112"
              stagger={0.3}
              duration={0.7}
            >
              {homeHeaderParagraphs.first}
            </AnimatedText>
            <AnimatedText
              type="slide"
              className="block w-full max-w-110"
              stagger={0.3}
              duration={0.7}
            >
              {homeHeaderParagraphs.second}
            </AnimatedText>
          </div>
          {/* Right */}
          <div className="flex flex-1 flex-col items-end gap-4 text-right">
            <div className="flex items-start gap-4 lg:gap-8">
              <p className="text-lg lg:text-xl 2xl:text-2xl">WE DO</p>
              <span
                ref={immersiveRef}
                className="text-textPrimary/60 text-[2.5rem] leading-none font-semibold tracking-tight md:text-7xl lg:text-7xl lg:leading-24 2xl:text-9xl"
              >
                IMMERSIVE
              </span>
            </div>
            {/* Animated text */}
            <AnimatedTextRotation
              texts={texts}
              className="text-textPrimary relative h-12 w-full text-[2.5rem] font-semibold tracking-tight uppercase md:h-20 md:text-5xl lg:h-32 lg:text-6xl 2xl:text-8xl"
              initialDelay={1000}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeHeader;
