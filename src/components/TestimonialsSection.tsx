import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { TestimonialVideos } from '../constants';
import { animateTextRandomization } from '../utils/textSplitting';
import './TestimonialsSection.css';
import { useMediaQuery } from 'react-responsive';
import arrowRightIcon from '../assets/arrow-right.svg';
import projectorImage from '../assets/images/projector.webp';
import firstFrameImage from '../assets/images/first_frame.webp'; // Add your first frame image

// Cinematic progress bar tied to the active video's currentTime.
const ProgressBar = ({
  videoEl,
}: {
  videoEl: HTMLVideoElement | null | undefined;
}) => {
  const fillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!videoEl) return;
    let rafId = 0;
    const tick = () => {
      const cur = videoEl.currentTime || 0;
      const dur = videoEl.duration || 0;
      const p = dur > 0 ? cur / dur : 0;
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${p})`;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [videoEl]);

  return (
    <div className="testimonials-progress" aria-hidden="true">
      <div className="testimonials-progress-track">
        <span ref={fillRef} className="testimonials-progress-fill" />
      </div>
    </div>
  );
};

// Cinematic viewfinder UI laid over the playing testimonial video.
// Corner brackets at the four corners, REC indicator with pulsing red dot,
// and a running MM:SS:FF timecode tied to the active video's currentTime.
const ViewfinderOverlay = ({
  videoEl,
}: {
  videoEl: HTMLVideoElement | null | undefined;
}) => {
  const tcRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!videoEl) return;
    let rafId = 0;
    const tick = () => {
      const t = videoEl.currentTime || 0;
      const mm = Math.floor(t / 60).toString().padStart(2, '0');
      const ss = Math.floor(t % 60).toString().padStart(2, '0');
      const ff = Math.floor((t * 24) % 24).toString().padStart(2, '0');
      if (tcRef.current) tcRef.current.textContent = `${mm}:${ss}:${ff}`;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [videoEl]);

  return (
    <div className="viewfinder-overlay" aria-hidden="true">
      <span className="viewfinder-bracket viewfinder-bracket-tl" />
      <span className="viewfinder-bracket viewfinder-bracket-tr" />
      <span className="viewfinder-bracket viewfinder-bracket-bl" />
      <span className="viewfinder-bracket viewfinder-bracket-br" />

      <div className="viewfinder-rec">
        <span className="viewfinder-rec-dot" />
        <span className="viewfinder-rec-label">REC</span>
      </div>

      <div className="viewfinder-tc">
        <span className="viewfinder-tc-label">TC</span>
        <span ref={tcRef} className="viewfinder-tc-value">
          00:00:00
        </span>
      </div>
    </div>
  );
};

const TestimonialsSection = () => {
  const isLg = useMediaQuery({ minWidth: 1024 });

  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const currentIndexRef = useRef(0);
  const isInViewRef = useRef(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasUserStarted, setHasUserStarted] = useState(false);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;

      gsap.set(video, {
        opacity: index === currentIndexRef.current ? 1 : 0,
        zIndex: index === currentIndexRef.current ? 2 : 1,
      });
    });
  }, []);

  // Section title — letter magnetism: each char is pulled toward the cursor
  // when within ~150px, with quadratic falloff + lerp smoothing.
  // Splits chars via animateTextRandomization (cycles: 0 → no scramble, just split).
  useEffect(() => {
    const el = titleRef.current;
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
      const R = 160;
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

  /* ----------------------------- Dimensions ----------------------------- */

  const getVideoWrapperDimensions = useCallback(() => {
    if (isLg) {
      return {
        width: Math.min(window.innerWidth * 0.23, 400),
        aspectRatio: 2 / 3.3,
      };
    }
    return {
      width: window.innerWidth * 0.9,
      aspectRatio: 2 / 2.5,
    };
  }, [isLg]);

  useEffect(() => {
    const update = () => {
      if (!videoWrapperRef.current) return;
      const { width, aspectRatio } = getVideoWrapperDimensions();
      videoWrapperRef.current.style.width = `${width}px`;
      videoWrapperRef.current.style.height = `${width / aspectRatio}px`;
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [getVideoWrapperDimensions]);

  /* ----------------------------- Initial Play ----------------------------- */

  const handleInitialPlay = useCallback(() => {
    if (hasUserStarted) return;

    setHasUserStarted(true);
    isInViewRef.current = true;

    const video = videoRefs.current[currentIndexRef.current];
    if (!video) return;

    video.muted = false;
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => {});
    });
  }, [hasUserStarted]);

  /* ----------------------------- Navigation ----------------------------- */

  const animateTransition = useCallback(
    (_direction: 'next' | 'prev', newIndex: number) => {
      if (isAnimating) return;

      const currentVideo = videoRefs.current[currentIndexRef.current];
      const nextVideo = videoRefs.current[newIndex];
      if (!currentVideo || !nextVideo) return;

      setIsAnimating(true);

      // Z-order
      currentVideo.style.zIndex = '2';
      nextVideo.style.zIndex = '3';

      // Prepare next
      gsap.set(nextVideo, { opacity: 0 });

      const tl = gsap.timeline({
        onComplete: () => {
          currentVideo.pause();
          gsap.set(currentVideo, { opacity: 0, zIndex: 1 });

          currentIndexRef.current = newIndex;
          setCurrentIndex(newIndex);

          nextVideo.muted = false;
          nextVideo.play().catch(() => {});
          gsap.set(nextVideo, { opacity: 1, zIndex: 2 });

          setIsAnimating(false);
        },
      });

      // Flicker twice
      tl.to(currentVideo, { opacity: 0, duration: 0.08 })
        .to(currentVideo, { opacity: 1, duration: 0.08 })
        .to(currentVideo, { opacity: 0, duration: 0.08 })
        .to(currentVideo, { opacity: 1, duration: 0.08 })
        // Final disappear
        .to(currentVideo, { opacity: 0, duration: 0.15 })
        // Fade in next
        .to(nextVideo, { opacity: 1, duration: 0.25 }, '-=0.1');
    },
    [isAnimating],
  );

  const navigate = useCallback(
    (dir: 'next' | 'prev') => {
      if (!hasUserStarted) return;

      const idx = currentIndexRef.current;
      const newIndex =
        dir === 'next'
          ? (idx + 1) % TestimonialVideos.length
          : (idx - 1 + TestimonialVideos.length) % TestimonialVideos.length;

      animateTransition(dir, newIndex);
    },
    [animateTransition, hasUserStarted],
  );

  /* ----------------------------- Observer ----------------------------- */

  useEffect(() => {
    if (!hasUserStarted) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isInViewRef.current = entry.isIntersecting;

        const video = videoRefs.current[currentIndexRef.current];
        if (!video) return;

        if (!entry.isIntersecting) video.pause();
        else video.play().catch(() => {});
      },
      { threshold: 0.5 },
    );

    if (videoWrapperRef.current) {
      observer.observe(videoWrapperRef.current);
    }

    return () => observer.disconnect();
  }, [hasUserStarted]);

  /* ----------------------------- Navigation UI ----------------------------- */

  const navigationButtons = useMemo(
    () =>
      hasUserStarted && (
        <div className="testimonials-navigation-overlay">
          <div
            className="testimonials-nav-area testimonials-nav-left"
            onClick={() => navigate('prev')}
            data-cursor="link"
            data-cursor-label="Prev"
          >
            <img
              src={arrowRightIcon}
              className="testimonials-nav-arrow testimonials-nav-arrow-left"
              alt="Previous testimonial"
            />
          </div>
          <div
            className="testimonials-nav-area testimonials-nav-right"
            onClick={() => navigate('next')}
            data-cursor="link"
            data-cursor-label="Next"
          >
            <img
              src={arrowRightIcon}
              className="testimonials-nav-arrow testimonials-nav-arrow-right"
              alt="Next testimonial"
            />
          </div>
        </div>
      ),
    [navigate, hasUserStarted],
  );

  /* ----------------------------- Render ----------------------------- */

  return (
    <section className="testimonials-section">
      {/* Celestial decor — orbital ring (brand continuity with HomeHeader) */}
      <div className="testimonials-decor" aria-hidden="true">
        <div className="testimonials-decor-orbit">
          <div className="testimonials-decor-orbit-rotator">
            <span className="testimonials-decor-orbit-satellite" />
          </div>
        </div>
      </div>

      <div className="testimonials-container container">
        <h2
          ref={titleRef}
          className="testimonials-title font-grid"
          data-cursor="link"
        >
          TESTIMONIALS
        </h2>

        <div className="testimonials-projector-wrapper">
          <div className="testimonials-projector-side">
            <img
              src={projectorImage}
              className="testimonials-projector-img testimonials-projector-left"
              alt=""
            />
          </div>

          <div className="testimonials-video-container">
            <div ref={videoWrapperRef} className="testimonials-video-wrapper">
              {/* First Frame Image - Shows before play */}
              {!hasUserStarted && (
                <>
                  <img
                    src={firstFrameImage}
                    className="testimonial-first-frame"
                    alt="Testimonial preview"
                  />
                  <div
                    className="testimonials-play-overlay"
                    onClick={handleInitialPlay}
                    data-cursor="video"
                    data-cursor-label="Play"
                  >
                    <span
                      className="testimonials-play-button"
                      title="Play testimonials"
                    ></span>
                  </div>
                </>
              )}

              {/* Videos - Hidden until play starts */}
              {TestimonialVideos.map((item, index) => (
                <video
                  key={item.id}
                  ref={(el) => {
                    if (el) videoRefs.current[index] = el;
                  }}
                  className="testimonial-video"
                  src={item.video}
                  loop
                  playsInline
                  preload="auto"
                  muted={index !== currentIndex}
                  style={{
                    opacity: index === currentIndex ? 1 : 0,
                    zIndex: index === currentIndex ? 2 : 1,
                  }}
                />
              ))}

              {/* Cinematic viewfinder overlay (corner brackets + REC + timecode) */}
              {hasUserStarted && (
                <ViewfinderOverlay videoEl={videoRefs.current[currentIndex]} />
              )}
            </div>
          </div>

          <div className="testimonials-projector-side">
            <img
              src={projectorImage}
              className="testimonials-projector-img testimonials-projector-right"
              alt=""
            />
          </div>
        </div>

        {/* Cinematic progress bar tied to the active video's currentTime */}
        {hasUserStarted && (
          <ProgressBar videoEl={videoRefs.current[currentIndex]} />
        )}

        {/* Pagination dots — shows current position in the testimonial sequence */}
        {hasUserStarted && (
          <div className="testimonials-pagination" aria-hidden="true">
            {TestimonialVideos.map((_, i) => (
              <span
                key={i}
                className={`testimonials-dot${i === currentIndex ? ' testimonials-dot-active' : ''}`}
              />
            ))}
          </div>
        )}

        {navigationButtons}
      </div>
    </section>
  );
};

export default TestimonialsSection;
