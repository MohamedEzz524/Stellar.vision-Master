import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';
import { playRevealAnimation, waitForModel3D } from '../utils/revealAnimation';

// Animation timing constants
const TIMINGS = {
  INITIAL_DELAY: 0.3,
  SECOND_PRELOADER_DELAY: 1,
  REF_READY_DELAY: 0.1,
  ELEMENT_FILL_DELAY: 0.1,
  FADE_OUT_DELAY: 0.2, // Reduced from 0.5 for faster transition
  BLINK_START_DELAY: 0.3,
  BLINK_DURATION: 0.5,
  BUTTON_SHOW_DELAY: 0.3,
  BUTTON_BLINK_DELAY: 0.1,
  REVEAL_DELAY: 0.3,
  REVEAL_ANIMATION: 1,
} as const;

// Optimized helper to extract X coordinate from transform matrix
// Cached regex for better performance
const MATRIX_X_REGEX = /matrix\([^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([^,]+)/;
const getXFromTransform = (transform: string | null): number => {
  if (!transform) return 0;
  const xMatch = transform.match(MATRIX_X_REGEX);
  return xMatch ? parseFloat(xMatch[1]) : 0;
};

const Preloader = () => {
  // Consolidated state - using single state object to reduce re-renders
  const [state, setState] = useState({
    firstPreloaderVisible: false,
    secondPreloaderVisible: false,
    isRevealing: false,
    preloaderHidden: false,
  });

  const secondPreloaderRef = useRef<HTMLDivElement>(null);
  const firstPreloaderRef = useRef<HTMLDivElement>(null);
  const leftHalfGroupRef = useRef<HTMLDivElement | null>(null);
  const rightHalfGroupRef = useRef<HTMLDivElement | null>(null);
  const gElementsRef = useRef<SVGGElement[] | null>(null);
  const sortedElementsRef = useRef<Array<{
    x: number;
    originalIndex: number;
  }> | null>(null);
  const mainTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const revealAnimationCleanupRef = useRef<(() => void) | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (mainTimelineRef.current) {
      mainTimelineRef.current.kill();
      mainTimelineRef.current = null;
    }
    if (revealAnimationCleanupRef.current) {
      revealAnimationCleanupRef.current();
      revealAnimationCleanupRef.current = null;
    }
  }, []);

  // Update state helper to batch updates
  const updateState = useCallback((updates: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Update your initial useEffect:
  useEffect(() => {
    // Add a CSS class to the body that prevents all scrolling
    document.body.classList.add('no-scroll');

    // Check if scrollbar is present and compensate for layout shift
    const hasScrollbar =
      window.innerWidth > document.documentElement.clientWidth;
    if (hasScrollbar) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.classList.remove('no-scroll');
      document.body.style.paddingRight = '';
    };
  }, []);

  // Update the useEffect that handles overflow auto:
  useEffect(() => {
    if (state.isRevealing) {
      const timer = setTimeout(() => {
        document.body.classList.remove('no-scroll');
        document.body.style.paddingRight = '';
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [state.isRevealing]);

  // Get left and right half divs from the first preloader and set initial position
  useEffect(() => {
    // Use a small delay to ensure refs are attached
    const checkRefs = () => {
      if (firstPreloaderRef.current) {
        const leftHalf = firstPreloaderRef.current.querySelector(
          '#left-half-group',
        ) as HTMLDivElement;
        const rightHalf = firstPreloaderRef.current.querySelector(
          '#right-half-group',
        ) as HTMLDivElement;

        if (
          leftHalf &&
          rightHalf &&
          (!leftHalfGroupRef.current || !rightHalfGroupRef.current)
        ) {
          leftHalfGroupRef.current = leftHalf;
          rightHalfGroupRef.current = rightHalf;

          // Set initial position: not expanded (touching with gap-3)
          // Compensate for margins (10px each) to make them appear touching with just gap-3
          gsap.set(leftHalf, {
            x: 100, // Move right to compensate for right margin
            immediateRender: true,
            force3D: true,
          });
          gsap.set(rightHalf, {
            x: -100, // Move left to compensate for left margin
            immediateRender: true,
            force3D: true,
          });
        }
      }
    };

    // Check immediately
    checkRefs();

    // Also check after a short delay to catch late-rendered elements
    const timeoutId = setTimeout(checkRefs, 50);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []); // Run once on mount

  // Get all <g> elements from the second preloader SVG and cache sorted order
  useEffect(() => {
    if (
      state.secondPreloaderVisible &&
      secondPreloaderRef.current &&
      !gElementsRef.current
    ) {
      const svg = secondPreloaderRef.current.querySelector('svg');
      if (svg) {
        const clipPathGroup = svg.querySelector('g[clip-path]');
        if (clipPathGroup) {
          const gElements = Array.from(
            clipPathGroup.querySelectorAll('g[style*="display: block"]'),
          ) as SVGGElement[];

          // Cache elements array
          gElementsRef.current = gElements;

          // Sort and cache elements by X position (left to right) - only once
          sortedElementsRef.current = gElements
            .map((el, idx) => {
              const transform = el.getAttribute('transform');
              const x = getXFromTransform(transform);
              return { x, originalIndex: idx };
            })
            .sort((a, b) => a.x - b.x);
        }
      }
    }
  }, [state.secondPreloaderVisible]);

  // Wait for DOM to be ready before starting animation
  useEffect(() => {
    // Ensure DOM is fully loaded and refs are available
    const startAnimation = () => {
      // Double-check that refs are available
      if (!firstPreloaderRef.current) {
        // Retry after a short delay if refs aren't ready
        setTimeout(startAnimation, 50);
        return;
      }

      const tl = gsap.timeline();
      mainTimelineRef.current = tl;

      // Step 1: First preloader fades in
      tl.to({}, { duration: TIMINGS.INITIAL_DELAY })
        .call(() => {
          // Ensure initial positions are set before making visible
          const leftHalf = leftHalfGroupRef.current;
          const rightHalf = rightHalfGroupRef.current;
          const parentContainer = firstPreloaderRef.current;

          if (leftHalf && rightHalf && parentContainer) {
            // Set initial position: not expanded (touching with gap-3)
            // Compensate for margins (10px each) to make them appear touching with just gap-3
            gsap.set(leftHalf, {
              x: 100, // Move right to compensate for right margin
              immediateRender: true,
              force3D: true,
            });
            gsap.set(rightHalf, {
              x: -100, // Move left to compensate for left margin
              immediateRender: true,
              force3D: true,
            });
            // Reset parent rotation
            gsap.set(parentContainer, {
              rotation: 0,
              immediateRender: true,
              force3D: true,
              transformOrigin: 'center center',
            });
            // Set initial opacity for L shapes (they'll fade out during reveal)
            const lShapes = [
              leftHalf.querySelector('.preloader-l-top-left'),
              leftHalf.querySelector('.preloader-l-bottom-left'),
              rightHalf.querySelector('.preloader-l-top-right'),
              rightHalf.querySelector('.preloader-l-bottom-right'),
            ].filter(Boolean) as HTMLElement[];
            lShapes.forEach((shape) => {
              gsap.set(shape, {
                opacity: 1,
                x: 0,
                y: 0,
                immediateRender: true,
                force3D: true,
              });
            });
          }
        })
        .call(() => updateState({ firstPreloaderVisible: true }))
        .to({}, { duration: 0.1 }) // Small delay to ensure visibility transition completes
        .call(() => {
          const leftHalf = leftHalfGroupRef.current;
          const rightHalf = rightHalfGroupRef.current;
          const parentContainer = firstPreloaderRef.current;

          if (leftHalf && rightHalf && parentContainer) {
            // Step 1: Rotate parent 360deg FIRST (before expansion)
            gsap.to(parentContainer, {
              rotation: 360,
              duration: 1.2,
              ease: 'power2.inOut',
              force3D: true,
            });
          }
        })
        .to({}, { duration: 1.2 }) // Wait for rotation to complete
        .call(() => {
          const leftHalf = leftHalfGroupRef.current;
          const rightHalf = rightHalfGroupRef.current;

          if (leftHalf && rightHalf) {
            // Step 2: Expand AFTER rotation completes (move left/right apart to reveal second loader)
            gsap.to(leftHalf, {
              x: 10,
              duration: 0.6,
              ease: 'power2.out',
              force3D: true,
            });
            gsap.to(rightHalf, {
              x: -10,
              duration: 0.6,
              ease: 'power2.out',
              force3D: true,
            });
          }
        })
        // Step 2: Show second preloader immediately after expansion
        .call(() => updateState({ secondPreloaderVisible: true }))
        .to({}, { duration: 0.2 }) // Increased delay for refs to be ready
        .call(() => {
          // Re-query SVG elements to ensure they're available
          if (secondPreloaderRef.current && !gElementsRef.current) {
            const svg = secondPreloaderRef.current.querySelector('svg');
            if (svg) {
              const clipPathGroup = svg.querySelector('g[clip-path]');
              if (clipPathGroup) {
                const gElements = Array.from(
                  clipPathGroup.querySelectorAll('g[style*="display: block"]'),
                ) as SVGGElement[];
                gElementsRef.current = gElements;
                sortedElementsRef.current = gElements
                  .map((el, idx) => {
                    const transform = el.getAttribute('transform');
                    const x = getXFromTransform(transform);
                    return { x, originalIndex: idx };
                  })
                  .sort((a, b) => a.x - b.x);
              }
            }
          }

          const elements = gElementsRef.current;
          const sortedElements = sortedElementsRef.current;

          if (elements && sortedElements && elements.length > 0) {
            // Get current timeline time for absolute positioning
            const startTime = tl.time();

            // Fill from left to right with varied timing (not uniform)
            sortedElements.forEach(({ originalIndex }, i) => {
              // Vary the delay: base delay + random variation for more organic feel
              const baseDelay = i * TIMINGS.ELEMENT_FILL_DELAY;
              // Increased variation: ±50ms to make timing differences more noticeable
              const randomVariation = (Math.random() - 0.5) * 0.1;
              const delay = Math.max(0, baseDelay + randomVariation);

              tl.call(
                () => {
                  const el = elements[originalIndex];
                  if (el) el.setAttribute('opacity', '1');
                },
                undefined,
                startTime + delay,
              );
            });

            // Calculate end time with buffer for the random variations
            const fillEndTime =
              startTime +
              sortedElements.length * TIMINGS.ELEMENT_FILL_DELAY +
              0.15;

            // Hide second preloader elements and close first preloader after fill
            tl.call(
              () => {
                // Hide all second preloader elements efficiently
                for (let i = 0; i < elements.length; i++) {
                  elements[i].setAttribute('opacity', '0');
                }
                updateState({
                  secondPreloaderVisible: false,
                });
              },
              undefined,
              fillEndTime,
            )
              // Step 4: Close (move left/right back to not expanded state)
              .call(() => {
                const leftHalf = leftHalfGroupRef.current;
                const rightHalf = rightHalfGroupRef.current;
                if (leftHalf && rightHalf) {
                  // Move back to not expanded state (far apart)
                  gsap.to(leftHalf, {
                    x: 100,
                    duration: 0.8,
                    ease: 'power2.out',
                    force3D: true,
                  });
                  gsap.to(rightHalf, {
                    x: -100,
                    duration: 0.8,
                    ease: 'power2.out',
                    force3D: true,
                  });
                }
              })
              .to({}, { duration: 0.8 }) // Wait for closing animation
              // Step 5: Move all 4 L shapes simultaneously away from viewport center
              // AND start reveal animation at the same time
              .call(() => {
                const leftHalf = leftHalfGroupRef.current;
                const rightHalf = rightHalfGroupRef.current;
                const parentContainer = firstPreloaderRef.current;

                if (leftHalf && rightHalf && parentContainer) {
                  const lShapes = [
                    leftHalf.querySelector('.preloader-l-top-left'),
                    leftHalf.querySelector('.preloader-l-bottom-left'),
                    rightHalf.querySelector('.preloader-l-top-right'),
                    rightHalf.querySelector('.preloader-l-bottom-right'),
                  ].filter(Boolean) as HTMLElement[];

                  // Calculate viewport center
                  const viewportCenterX = window.innerWidth / 2;
                  const viewportCenterY = window.innerHeight / 2;
                  const vh20 = window.innerHeight * 0.2;

                  // Angles matching the shapes array order:
                  // [left-top (135°), left-bottom (225°), right-top (45°), right-bottom (315°)]
                  const angles = [225, 135, 315, 45];

                  // Calculate target positions for each L shape from viewport center
                  const animations = lShapes
                    .map((shape, index) => {
                      if (!shape) return null;

                      const angle = angles[index];
                      const rad = (angle * Math.PI) / 180;

                      // Get current position of the shape relative to viewport
                      const rect = shape.getBoundingClientRect();
                      const currentX = rect.left + rect.width / 2;
                      const currentY = rect.top + rect.height / 2;

                      // Calculate target position from viewport center
                      const targetX = viewportCenterX + Math.cos(rad) * vh20;
                      const targetY = viewportCenterY + Math.sin(rad) * vh20;

                      // Calculate the delta needed to reach target
                      const deltaX = targetX - currentX;
                      const deltaY = targetY - currentY;

                      return { shape, deltaX, deltaY };
                    })
                    .filter(Boolean) as Array<{
                    shape: HTMLElement;
                    deltaX: number;
                    deltaY: number;
                  }>;

                  // Animate all L shapes simultaneously
                  animations.forEach(({ shape, deltaX, deltaY }) => {
                    gsap.set(shape, {
                      transformOrigin: 'center center',
                      force3D: true,
                    });

                    gsap.to(shape, {
                      opacity: 0,
                      x: `+=${deltaX}`,
                      y: `+=${deltaY}`,
                      duration: 1.2,
                      ease: 'power2.out',
                      force3D: true,
                    });
                  });
                }

                // Start reveal animation at the same time as L shapes move
                updateState({ isRevealing: true });
                // Wait for 3D model to be loaded before starting reveal animation
                waitForModel3D(() => {
                  // Trigger reveal animation for hero section
                  revealAnimationCleanupRef.current = playRevealAnimation();
                });
              })
              .to({}, { duration: 1.2 }) // Wait for L shapes animation and reveal to start
              // Hide first preloader
              .call(() => {
                updateState({
                  firstPreloaderVisible: false,
                });
              })
              // Hide preloader after reveal animation
              .to({}, { duration: TIMINGS.REVEAL_ANIMATION })
              .call(() => {
                updateState({ preloaderHidden: true });
              });
          } else {
            // Fallback: if ref not ready, auto-reveal after delay
            tl.to({}, { duration: 3 })
              .call(() => {
                updateState({
                  firstPreloaderVisible: false,
                  secondPreloaderVisible: false,
                });
              })
              .to({}, { duration: TIMINGS.REVEAL_DELAY })
              .call(() => {
                updateState({ isRevealing: true });
                // Wait for 3D model to be loaded before starting reveal animation
                waitForModel3D(() => {
                  // Trigger reveal animation for hero section
                  revealAnimationCleanupRef.current = playRevealAnimation();
                });
              })
              .to({}, { duration: TIMINGS.REVEAL_ANIMATION })
              .call(() => {
                updateState({ preloaderHidden: true });
              });
          }
        });
    };

    // Wait for DOM to be ready
    if (
      document.readyState === 'complete' ||
      document.readyState === 'interactive'
    ) {
      // DOM is already ready, start immediately
      setTimeout(startAnimation, 100); // Small delay to ensure React has rendered
    } else {
      // Wait for DOM to be ready
      window.addEventListener('load', startAnimation, { once: true });
      // Also try after a short delay as fallback
      setTimeout(startAnimation, 500);
    }

    return () => {
      cleanup();
      window.removeEventListener('load', startAnimation);
    };
  }, [updateState, cleanup]);

  // Memoize class names
  const topLayerClassName = useMemo(
    () =>
      `absolute top-0 left-0 h-[calc(50%+2px)] w-full bg-black transition-transform duration-1000 ease-in-out ${
        state.isRevealing ? '-translate-y-full' : ''
      }`,
    [state.isRevealing],
  );

  const bottomLayerClassName = useMemo(
    () =>
      `absolute bottom-0 left-0 h-1/2 w-full bg-black transition-transform duration-1000 ease-in-out ${
        state.isRevealing ? 'translate-y-full' : ''
      }`,
    [state.isRevealing],
  );

  // Memoize container style
  const containerStyle = useMemo(
    () => ({
      visibility: state.preloaderHidden
        ? ('hidden' as const)
        : ('visible' as const),
      pointerEvents: state.preloaderHidden
        ? ('none' as const)
        : ('auto' as const),
    }),
    [state.preloaderHidden],
  );

  return (
    <div
      data-v-a05bfe24=""
      data-v-4378bf6c=""
      className="preloader-container fixed inset-0 z-[99999]"
      style={containerStyle}
    >
      {/* Top Image Layer - 50% height, full width */}
      <div
        className={topLayerClassName}
        style={{
          backgroundImage: 'url("")', // Add your top image URL here
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Bottom Image Layer - 50% height, full width */}
      <div
        className={bottomLayerClassName}
        style={{
          backgroundImage: 'url("")', // Add your bottom image URL here
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Overlay Button Container */}
      <div
        data-v-a05bfe24=""
        className="preloader pointer-events-none absolute top-0 left-0 z-10 flex h-screen w-screen flex-col items-center justify-center"
      >
        <div data-v-a05bfe24="" className="relative flex w-full text-center">
          <div
            data-v-a05bfe24=""
            className="relative mx-auto h-[400px] max-md:flex-1 md:h-[600px] md:w-[600px]"
          >
            {/* First Preloader */}
            <div
              ref={firstPreloaderRef}
              data-v-a05bfe24=""
              className="absolute inset-0 flex items-center justify-center gap-4"
              style={{
                opacity: state.firstPreloaderVisible ? 1 : 0,
                visibility: state.firstPreloaderVisible ? 'visible' : 'hidden',
                transition:
                  'opacity 0.5s ease-in-out, visibility 0.5s ease-in-out',
              }}
            >
              {/* Left Half */}
              <div
                id="left-half-group"
                className="preloader-half preloader-half-left"
              >
                {/* Top L shape (facing up) */}
                <div className="preloader-l-shape preloader-l-top-left" />
                {/* Bottom L shape (facing down) */}
                <div className="preloader-l-shape preloader-l-bottom-left" />
              </div>
              {/* Right Half */}
              <div
                id="right-half-group"
                className="preloader-half preloader-half-right"
              >
                {/* Top L shape (facing up) */}
                <div className="preloader-l-shape preloader-l-top-right" />
                {/* Bottom L shape (facing down) */}
                <div className="preloader-l-shape preloader-l-bottom-right" />
              </div>
            </div>

            {/* Second Preloader */}
            <div
              ref={secondPreloaderRef}
              data-v-a05bfe24=""
              className="absolute inset-0"
              style={{
                translate: 'none',
                rotate: 'none',
                scale: 'none',
                transformOrigin: '50% 50% 0px',
                visibility: state.secondPreloaderVisible ? 'visible' : 'hidden',
                opacity: state.secondPreloaderVisible ? 1 : 0,
                transform: 'translate(0px)',
                transition:
                  'opacity 0.5s ease-in-out, visibility 0.5s ease-in-out',
                pointerEvents: 'none',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                viewBox="0 0 1920 1080"
                width="1920"
                height="1080"
                style={{
                  width: '100%',
                  height: '100%',
                  transform: 'translate3d(0px, 0px, 0px)',
                  contentVisibility: 'visible',
                }}
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <clipPath id="__lottie_element_24">
                    <rect width="1920" height="1080" x="0" y="0"></rect>
                  </clipPath>
                </defs>
                <g clipPath="url(#__lottie_element_24)">
                  <g
                    data-g-index="0"
                    style={{ display: 'block' }}
                    transform="matrix(1,0,0,1,726.1430053710938,564.7100219726562)"
                    opacity="0"
                    fill="rgb(235,235,235)"
                    fontSize="100"
                    fontFamily="H.01"
                    fontStyle="normal"
                    fontWeight="400"
                    aria-label="/"
                  >
                    <g
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                      strokeMiterlimit="4"
                      style={{ display: 'inherit' }}
                      transform="matrix(1,0,0,1,0,0)"
                      opacity="1"
                    >
                      <g>
                        <g
                          style={{ display: 'block' }}
                          transform="matrix(1,0,0,1,0,0)"
                          opacity="1"
                        >
                          <path d=" M1.309000015258789,0 C1.309000015258789,0 27.895999908447266,0 27.895999908447266,0 C27.895999908447266,0 99.39900207519531,-71.50299835205078 99.39900207519531,-71.50299835205078 C99.39900207519531,-71.50299835205078 72.81199645996094,-71.50299835205078 72.81199645996094,-71.50299835205078 C72.81199645996094,-71.50299835205078 1.309000015258789,0 1.309000015258789,0z"></path>
                          <g opacity="1" transform="matrix(1,0,0,1,0,0)"></g>
                        </g>
                      </g>
                    </g>
                  </g>
                  <g
                    data-g-index="1"
                    style={{ display: 'block' }}
                    transform="matrix(1,0,0,1,602.6669921875,245.33299255371094)"
                    opacity="0"
                    fill="rgb(235,235,235)"
                    fontSize="100"
                    fontFamily="H.01"
                    fontStyle="normal"
                    fontWeight="400"
                    aria-label=""
                  ></g>
                  <g
                    data-g-index="2"
                    style={{ display: 'block' }}
                    transform="matrix(1,0,0,1,785.0999755859375,564.7100219726562)"
                    opacity="0"
                    fill="rgb(235,235,235)"
                    fontSize="100"
                    fontFamily="H.01"
                    fontStyle="normal"
                    fontWeight="400"
                    aria-label="/"
                  >
                    <g
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                      strokeMiterlimit="4"
                      style={{ display: 'inherit' }}
                      transform="matrix(1,0,0,1,0,0)"
                      opacity="1"
                    >
                      <g>
                        <g
                          style={{ display: 'block' }}
                          transform="matrix(1,0,0,1,0,0)"
                          opacity="1"
                        >
                          <path d=" M1.309000015258789,0 C1.309000015258789,0 27.895999908447266,0 27.895999908447266,0 C27.895999908447266,0 99.39900207519531,-71.50299835205078 99.39900207519531,-71.50299835205078 C99.39900207519531,-71.50299835205078 72.81199645996094,-71.50299835205078 72.81199645996094,-71.50299835205078 C72.81199645996094,-71.50299835205078 1.309000015258789,0 1.309000015258789,0z"></path>
                          <g opacity="1" transform="matrix(1,0,0,1,0,0)"></g>
                        </g>
                      </g>
                    </g>
                  </g>
                  <g
                    data-g-index="3"
                    style={{ display: 'block' }}
                    transform="matrix(1,0,0,1,844.0999755859375,564.7100219726562)"
                    opacity="0"
                    fill="rgb(235,235,235)"
                    fontSize="100"
                    fontFamily="H.01"
                    fontStyle="normal"
                    fontWeight="400"
                    aria-label="/"
                  >
                    <g
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                      strokeMiterlimit="4"
                      style={{ display: 'inherit' }}
                      transform="matrix(1,0,0,1,0,0)"
                      opacity="1"
                    >
                      <g>
                        <g
                          style={{ display: 'block' }}
                          transform="matrix(1,0,0,1,0,0)"
                          opacity="1"
                        >
                          <path d=" M1.309000015258789,0 C1.309000015258789,0 27.895999908447266,0 27.895999908447266,0 C27.895999908447266,0 99.39900207519531,-71.50299835205078 99.39900207519531,-71.50299835205078 C99.39900207519531,-71.50299835205078 72.81199645996094,-71.50299835205078 72.81199645996094,-71.50299835205078 C72.81199645996094,-71.50299835205078 1.309000015258789,0 1.309000015258789,0z"></path>
                          <g opacity="1" transform="matrix(1,0,0,1,0,0)"></g>
                        </g>
                      </g>
                    </g>
                  </g>
                  <g
                    data-g-index="4"
                    style={{ display: 'block' }}
                    transform="matrix(1,0,0,1,908.0999755859375,564.7100219726562)"
                    opacity="0"
                    fill="rgb(235,235,235)"
                    fontSize="100"
                    fontFamily="H.01"
                    fontStyle="normal"
                    fontWeight="400"
                    aria-label="/"
                  >
                    <g
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                      strokeMiterlimit="4"
                      style={{ display: 'inherit' }}
                      transform="matrix(1,0,0,1,0,0)"
                      opacity="1"
                    >
                      <g>
                        <g
                          style={{ display: 'block' }}
                          transform="matrix(1,0,0,1,0,0)"
                          opacity="1"
                        >
                          <path d=" M1.309000015258789,0 C1.309000015258789,0 27.895999908447266,0 27.895999908447266,0 C27.895999908447266,0 99.39900207519531,-71.50299835205078 99.39900207519531,-71.50299835205078 C99.39900207519531,-71.50299835205078 72.81199645996094,-71.50299835205078 72.81199645996094,-71.50299835205078 C72.81199645996094,-71.50299835205078 1.309000015258789,0 1.309000015258789,0z"></path>
                          <g opacity="1" transform="matrix(1,0,0,1,0,0)"></g>
                        </g>
                      </g>
                    </g>
                  </g>
                  <g
                    data-g-index="5"
                    style={{ display: 'block' }}
                    transform="matrix(1,0,0,1,967.0999755859375,564.7100219726562)"
                    opacity="0"
                    fill="rgb(235,235,235)"
                    fontSize="100"
                    fontFamily="H.01"
                    fontStyle="normal"
                    fontWeight="400"
                    aria-label="/"
                  >
                    <g
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                      strokeMiterlimit="4"
                      style={{ display: 'inherit' }}
                      transform="matrix(1,0,0,1,0,0)"
                      opacity="1"
                    >
                      <g>
                        <g
                          style={{ display: 'block' }}
                          transform="matrix(1,0,0,1,0,0)"
                          opacity="1"
                        >
                          <path d=" M1.309000015258789,0 C1.309000015258789,0 27.895999908447266,0 27.895999908447266,0 C27.895999908447266,0 99.39900207519531,-71.50299835205078 99.39900207519531,-71.50299835205078 C99.39900207519531,-71.50299835205078 72.81199645996094,-71.50299835205078 72.81199645996094,-71.50299835205078 C72.81199645996094,-71.50299835205078 1.309000015258789,0 1.309000015258789,0z"></path>
                          <g opacity="1" transform="matrix(1,0,0,1,0,0)"></g>
                        </g>
                      </g>
                    </g>
                  </g>
                  <g
                    data-g-index="6"
                    style={{ display: 'block' }}
                    transform="matrix(1,0,0,1,1027.0999755859375,564.7100219726562)"
                    opacity="0"
                    fill="rgb(235,235,235)"
                    fontSize="100"
                    fontFamily="H.01"
                    fontStyle="normal"
                    fontWeight="400"
                    aria-label="/"
                  >
                    <g
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                      strokeMiterlimit="4"
                      style={{ display: 'inherit' }}
                      transform="matrix(1,0,0,1,0,0)"
                      opacity="1"
                    >
                      <g>
                        <g
                          style={{ display: 'block' }}
                          transform="matrix(1,0,0,1,0,0)"
                          opacity="1"
                        >
                          <path d=" M1.309000015258789,0 C1.309000015258789,0 27.895999908447266,0 27.895999908447266,0 C27.895999908447266,0 99.39900207519531,-71.50299835205078 99.39900207519531,-71.50299835205078 C99.39900207519531,-71.50299835205078 72.81199645996094,-71.50299835205078 72.81199645996094,-71.50299835205078 C72.81199645996094,-71.50299835205078 1.309000015258789,0 1.309000015258789,0z"></path>
                          <g opacity="1" transform="matrix(1,0,0,1,0,0)"></g>
                        </g>
                      </g>
                    </g>
                  </g>
                  <g
                    data-g-index="7"
                    style={{ display: 'block' }}
                    transform="matrix(1,0,0,1,861.4320068359375,606.885986328125)"
                    opacity="0"
                    fill="rgb(235,235,235)"
                    fontSize="18"
                    fontFamily="Ubuntu Sans Mono"
                    fontStyle="normal"
                    fontWeight="400"
                    aria-label="INITIALIZING"
                  >
                    <g
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                      strokeMiterlimit="4"
                      style={{ display: 'inherit' }}
                      transform="matrix(1,0,0,1,0,0)"
                      opacity="1"
                    >
                      <g>
                        <g
                          style={{ display: 'block' }}
                          transform="matrix(1,0,0,1,0,0)"
                          opacity="1"
                        >
                          <path d=" M8.06,0 C8.06,0 8.06,-1.21 8.06,-1.21 C8.06,-1.21 5.74,-1.21 5.74,-1.21 C5.74,-1.21 5.74,-11.27 5.74,-11.27 C5.74,-11.27 8.06,-11.27 8.06,-11.27 C8.06,-11.27 8.06,-12.47 8.06,-12.47 C8.06,-12.47 2.02,-12.47 2.02,-12.47 C2.02,-12.47 2.02,-11.27 2.02,-11.27 C2.02,-11.27 4.34,-11.27 4.34,-11.27 C4.34,-11.27 4.34,-1.21 4.34,-1.21 C4.34,-1.21 2.02,-1.21 2.02,-1.21 C2.02,-1.21 2.02,0 2.02,0 C2.02,0 8.06,0 8.06,0z"></path>
                          <g
                            opacity="1"
                            transform="matrix(0.18000000715255737,0,0,0.18000000715255737,0,0)"
                          ></g>
                        </g>
                      </g>
                    </g>
                    <g
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                      strokeMiterlimit="4"
                      style={{ display: 'inherit' }}
                      transform="matrix(1,0,0,1,10.079999923706055,0)"
                      opacity="1"
                    >
                      <g>
                        <g
                          style={{ display: 'block' }}
                          transform="matrix(1,0,0,1,0,0)"
                          opacity="1"
                        >
                          <path d=" M2.47,0 C2.47,0 2.47,-10.46 2.47,-10.46 C2.83,-9.74 3.19,-9.02 3.56,-8.31 C3.92,-7.59 4.3,-6.83 4.68,-6.02 C5.06,-5.21 5.47,-4.32 5.9,-3.34 C6.34,-2.36 6.8,-1.25 7.31,0 C7.31,0 8.91,0 8.91,0 C8.91,0 8.91,-12.47 8.91,-12.47 C8.91,-12.47 7.61,-12.47 7.61,-12.47 C7.61,-12.47 7.61,-2.3 7.61,-2.3 C7.25,-3.2 6.93,-3.99 6.65,-4.66 C6.37,-5.33 6.1,-5.95 5.83,-6.53 C5.57,-7.09 5.29,-7.66 5,-8.24 C4.72,-8.8 4.39,-9.43 4.04,-10.11 C3.69,-10.78 3.26,-11.57 2.77,-12.47 C2.77,-12.47 1.17,-12.47 1.17,-12.47 C1.17,-12.47 1.17,0 1.17,0 C1.17,0 2.47,0 2.47,0z"></path>
                          <g
                            opacity="1"
                            transform="matrix(0.18000000715255737,0,0,0.18000000715255737,0,0)"
                          ></g>
                        </g>
                      </g>
                    </g>
                    <g
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                      strokeMiterlimit="4"
                      style={{ display: 'inherit' }}
                      transform="matrix(1,0,0,1,20.15999984741211,0)"
                      opacity="1"
                    >
                      <g>
                        <g
                          style={{ display: 'block' }}
                          transform="matrix(1,0,0,1,0,0)"
                          opacity="1"
                        >
                          <path d=" M8.06,0 C8.06,0 8.06,-1.21 8.06,-1.21 C8.06,-1.21 5.74,-1.21 5.74,-1.21 C5.74,-1.21 5.74,-11.27 5.74,-11.27 C5.74,-11.27 8.06,-11.27 8.06,-11.27 C8.06,-11.27 8.06,-12.47 8.06,-12.47 C8.06,-12.47 2.02,-12.47 2.02,-12.47 C2.02,-12.47 2.02,-11.27 2.02,-11.27 C2.02,-11.27 4.34,-11.27 4.34,-11.27 C4.34,-11.27 4.34,-1.21 4.34,-1.21 C4.34,-1.21 2.02,-1.21 2.02,-1.21 C2.02,-1.21 2.02,0 2.02,0 C2.02,0 8.06,0 8.06,0z"></path>
                          <g
                            opacity="1"
                            transform="matrix(0.18000000715255737,0,0,0.18000000715255737,0,0)"
                          ></g>
                        </g>
                      </g>
                    </g>
                    <g
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                      strokeMiterlimit="4"
                      style={{ display: 'inherit' }}
                      transform="matrix(1,0,0,1,30.240001678466797,0)"
                      opacity="1"
                    >
                      <g>
                        <g
                          style={{ display: 'block' }}
                          transform="matrix(1,0,0,1,0,0)"
                          opacity="1"
                        >
                          <path d=" M5.74,0 C5.74,0 5.74,-11.27 5.74,-11.27 C5.74,-11.27 9.2,-11.27 9.2,-11.27 C9.2,-11.27 9.2,-12.47 9.2,-12.47 C9.2,-12.47 0.88,-12.47 0.88,-12.47 C0.88,-12.47 0.88,-11.27 0.88,-11.27 C0.88,-11.27 4.34,-11.27 4.34,-11.27 C4.34,-11.27 4.34,0 4.34,0 C4.34,0 5.74,0 5.74,0z"></path>
                          <g
                            opacity="1"
                            transform="matrix(0.18000000715255737,0,0,0.18000000715255737,0,0)"
                          ></g>
                        </g>
                      </g>
                    </g>
                    <g
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                      strokeMiterlimit="4"
                      style={{ display: 'inherit' }}
                      transform="matrix(1,0,0,1,40.31999969482422,0)"
                      opacity="1"
                    >
                      <g>
                        <g
                          style={{ display: 'block' }}
                          transform="matrix(1,0,0,1,0,0)"
                          opacity="1"
                        >
                          <path d=" M8.06,0 C8.06,0 8.06,-1.21 8.06,-1.21 C8.06,-1.21 5.74,-1.21 5.74,-1.21 C5.74,-1.21 5.74,-11.27 5.74,-11.27 C5.74,-11.27 8.06,-11.27 8.06,-11.27 C8.06,-11.27 8.06,-12.47 8.06,-12.47 C8.06,-12.47 2.02,-12.47 2.02,-12.47 C2.02,-12.47 2.02,-11.27 2.02,-11.27 C2.02,-11.27 4.34,-11.27 4.34,-11.27 C4.34,-11.27 4.34,-1.21 4.34,-1.21 C4.34,-1.21 2.02,-1.21 2.02,-1.21 C2.02,-1.21 2.02,0 2.02,0 C2.02,0 8.06,0 8.06,0z"></path>
                          <g
                            opacity="1"
                            transform="matrix(0.18000000715255737,0,0,0.18000000715255737,0,0)"
                          ></g>
                        </g>
                      </g>
                    </g>
                    <g
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                      strokeMiterlimit="4"
                      style={{ display: 'inherit' }}
                      transform="matrix(1,0,0,1,50.400001525878906,0)"
                      opacity="1"
                    >
                      <g>
                        <g
                          style={{ display: 'block' }}
                          transform="matrix(1,0,0,1,0,0)"
                          opacity="1"
                        >
                          <path d=" M3.54,-7.08 C3.81,-7.92 4.07,-8.7 4.33,-9.43 C4.59,-10.16 4.82,-10.79 5.02,-11.32 C5.23,-10.82 5.46,-10.2 5.72,-9.48 C5.97,-8.75 6.23,-7.97 6.5,-7.12 C6.76,-6.27 7.01,-5.42 7.25,-4.55 C7.25,-4.55 2.75,-4.55 2.75,-4.55 C3.01,-5.41 3.27,-6.25 3.54,-7.08z M1.6,0 C1.6,0 2.38,-3.37 2.38,-3.37 C2.38,-3.37 7.61,-3.37 7.61,-3.37 C7.61,-3.37 8.41,0 8.41,0 C8.41,0 9.9,0 9.9,0 C9.68,-0.79 9.44,-1.69 9.16,-2.7 C8.89,-3.71 8.58,-4.77 8.25,-5.89 C7.92,-7 7.57,-8.12 7.2,-9.25 C6.83,-10.38 6.43,-11.45 6.01,-12.47 C6.01,-12.47 4.14,-12.47 4.14,-12.47 C3.71,-11.45 3.3,-10.38 2.92,-9.25 C2.53,-8.12 2.17,-7 1.84,-5.88 C1.5,-4.75 1.19,-3.69 0.92,-2.68 C0.64,-1.67 0.4,-0.78 0.18,0 C0.18,0 1.6,0 1.6,0z"></path>
                          <g
                            opacity="1"
                            transform="matrix(0.18000000715255737,0,0,0.18000000715255737,0,0)"
                          ></g>
                        </g>
                      </g>
                    </g>
                    <g
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                      strokeMiterlimit="4"
                      style={{ display: 'inherit' }}
                      transform="matrix(1,0,0,1,60.47999954223633,0)"
                      opacity="1"
                    >
                      <g>
                        <g
                          style={{ display: 'block' }}
                          transform="matrix(1,0,0,1,0,0)"
                          opacity="1"
                        >
                          <path d=" M9.27,0 C9.27,0 9.27,-1.21 9.27,-1.21 C9.27,-1.21 3.37,-1.21 3.37,-1.21 C3.37,-1.21 3.37,-12.47 3.37,-12.47 C3.37,-12.47 1.96,-12.47 1.96,-12.47 C1.96,-12.47 1.96,0 1.96,0 C1.96,0 9.27,0 9.27,0z"></path>
                          <g
                            opacity="1"
                            transform="matrix(0.18000000715255737,0,0,0.18000000715255737,0,0)"
                          ></g>
                        </g>
                      </g>
                    </g>
                    <g
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                      strokeMiterlimit="4"
                      style={{ display: 'inherit' }}
                      transform="matrix(1,0,0,1,70.55999755859375,0)"
                      opacity="1"
                    >
                      <g>
                        <g
                          style={{ display: 'block' }}
                          transform="matrix(1,0,0,1,0,0)"
                          opacity="1"
                        >
                          <path d=" M8.06,0 C8.06,0 8.06,-1.21 8.06,-1.21 C8.06,-1.21 5.74,-1.21 5.74,-1.21 C5.74,-1.21 5.74,-11.27 5.74,-11.27 C5.74,-11.27 8.06,-11.27 8.06,-11.27 C8.06,-11.27 8.06,-12.47 8.06,-12.47 C8.06,-12.47 2.02,-12.47 2.02,-12.47 C2.02,-12.47 2.02,-11.27 2.02,-11.27 C2.02,-11.27 4.34,-11.27 4.34,-11.27 C4.34,-11.27 4.34,-1.21 4.34,-1.21 C4.34,-1.21 2.02,-1.21 2.02,-1.21 C2.02,-1.21 2.02,0 2.02,0 C2.02,0 8.06,0 8.06,0z"></path>
                          <g
                            opacity="1"
                            transform="matrix(0.18000000715255737,0,0,0.18000000715255737,0,0)"
                          ></g>
                        </g>
                      </g>
                    </g>
                    <g
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                      strokeMiterlimit="4"
                      style={{ display: 'inherit' }}
                      transform="matrix(1,0,0,1,80.63999938964844,0)"
                      opacity="1"
                    >
                      <g>
                        <g
                          style={{ display: 'block' }}
                          transform="matrix(1,0,0,1,0,0)"
                          opacity="1"
                        >
                          <path d=" M9.2,0 C9.2,0 9.2,-1.21 9.2,-1.21 C9.2,-1.21 2.75,-1.21 2.75,-1.21 C3.08,-1.83 3.45,-2.51 3.88,-3.26 C4.3,-4 4.75,-4.76 5.22,-5.54 C5.69,-6.31 6.16,-7.06 6.63,-7.79 C7.11,-8.53 7.55,-9.2 7.97,-9.81 C8.38,-10.42 8.74,-10.93 9.04,-11.34 C9.04,-11.34 9.04,-12.47 9.04,-12.47 C9.04,-12.47 1.44,-12.47 1.44,-12.47 C1.44,-12.47 1.44,-11.27 1.44,-11.27 C1.44,-11.27 7.42,-11.27 7.42,-11.27 C7.07,-10.8 6.69,-10.26 6.27,-9.66 C5.86,-9.05 5.43,-8.4 4.99,-7.7 C4.54,-7.01 4.1,-6.28 3.65,-5.54 C3.2,-4.78 2.75,-4.02 2.32,-3.25 C1.89,-2.48 1.49,-1.72 1.12,-0.97 C1.12,-0.97 1.12,0 1.12,0 C1.12,0 9.2,0 9.2,0z"></path>
                          <g
                            opacity="1"
                            transform="matrix(0.18000000715255737,0,0,0.18000000715255737,0,0)"
                          ></g>
                        </g>
                      </g>
                    </g>
                    <g
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                      strokeMiterlimit="4"
                      style={{ display: 'inherit' }}
                      transform="matrix(1,0,0,1,90.72000122070312,0)"
                      opacity="1"
                    >
                      <g>
                        <g
                          style={{ display: 'block' }}
                          transform="matrix(1,0,0,1,0,0)"
                          opacity="1"
                        >
                          <path d=" M8.06,0 C8.06,0 8.06,-1.21 8.06,-1.21 C8.06,-1.21 5.74,-1.21 5.74,-1.21 C5.74,-1.21 5.74,-11.27 5.74,-11.27 C5.74,-11.27 8.06,-11.27 8.06,-11.27 C8.06,-11.27 8.06,-12.47 8.06,-12.47 C8.06,-12.47 2.02,-12.47 2.02,-12.47 C2.02,-12.47 2.02,-11.27 2.02,-11.27 C2.02,-11.27 4.34,-11.27 4.34,-11.27 C4.34,-11.27 4.34,-1.21 4.34,-1.21 C4.34,-1.21 2.02,-1.21 2.02,-1.21 C2.02,-1.21 2.02,0 2.02,0 C2.02,0 8.06,0 8.06,0z"></path>
                          <g
                            opacity="1"
                            transform="matrix(0.18000000715255737,0,0,0.18000000715255737,0,0)"
                          ></g>
                        </g>
                      </g>
                    </g>
                    <g
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                      strokeMiterlimit="4"
                      style={{ display: 'inherit' }}
                      transform="matrix(1,0,0,1,100.80000305175781,0)"
                      opacity="1"
                    >
                      <g>
                        <g
                          style={{ display: 'block' }}
                          transform="matrix(1,0,0,1,0,0)"
                          opacity="1"
                        >
                          <path d=" M2.47,0 C2.47,0 2.47,-10.46 2.47,-10.46 C2.83,-9.74 3.19,-9.02 3.56,-8.31 C3.92,-7.59 4.3,-6.83 4.68,-6.02 C5.06,-5.21 5.47,-4.32 5.9,-3.34 C6.34,-2.36 6.8,-1.25 7.31,0 C7.31,0 8.91,0 8.91,0 C8.91,0 8.91,-12.47 8.91,-12.47 C8.91,-12.47 7.61,-12.47 7.61,-12.47 C7.61,-12.47 7.61,-2.3 7.61,-2.3 C7.25,-3.2 6.93,-3.99 6.65,-4.66 C6.37,-5.33 6.1,-5.95 5.83,-6.53 C5.57,-7.09 5.29,-7.66 5,-8.24 C4.72,-8.8 4.39,-9.43 4.04,-10.11 C3.69,-10.78 3.26,-11.57 2.77,-12.47 C2.77,-12.47 1.17,-12.47 1.17,-12.47 C1.17,-12.47 1.17,0 1.17,0 C1.17,0 2.47,0 2.47,0z"></path>
                          <g
                            opacity="1"
                            transform="matrix(0.18000000715255737,0,0,0.18000000715255737,0,0)"
                          ></g>
                        </g>
                      </g>
                    </g>
                    <g
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                      strokeMiterlimit="4"
                      style={{ display: 'inherit' }}
                      transform="matrix(1,0,0,1,110.87999725341797,0)"
                      opacity="1"
                    >
                      <g>
                        <g
                          style={{ display: 'block' }}
                          transform="matrix(1,0,0,1,0,0)"
                          opacity="1"
                        >
                          <path d=" M7.95,0.05 C8.51,-0.1 8.9,-0.22 9.14,-0.31 C9.14,-0.31 9.14,-6.05 9.14,-6.05 C9.14,-6.05 7.74,-6.05 7.74,-6.05 C7.74,-6.05 7.74,-1.28 7.74,-1.28 C7.66,-1.22 7.5,-1.15 7.26,-1.08 C7.03,-1.01 6.68,-0.97 6.21,-0.97 C5.41,-0.97 4.73,-1.2 4.18,-1.67 C3.62,-2.13 3.21,-2.76 2.93,-3.56 C2.64,-4.35 2.5,-5.25 2.5,-6.25 C2.5,-7.33 2.66,-8.26 2.99,-9.05 C3.31,-9.85 3.75,-10.46 4.3,-10.89 C4.85,-11.32 5.46,-11.54 6.12,-11.54 C6.59,-11.54 7.03,-11.46 7.44,-11.3 C7.86,-11.15 8.23,-10.95 8.55,-10.71 C8.55,-10.71 9.05,-11.92 9.05,-11.92 C8.96,-12 8.79,-12.11 8.55,-12.24 C8.31,-12.37 7.99,-12.49 7.59,-12.6 C7.18,-12.71 6.68,-12.76 6.08,-12.76 C5.16,-12.76 4.32,-12.51 3.56,-12 C2.79,-11.49 2.19,-10.75 1.74,-9.77 C1.29,-8.8 1.06,-7.63 1.06,-6.25 C1.06,-4.88 1.27,-3.71 1.69,-2.74 C2.11,-1.76 2.69,-1.02 3.44,-0.5 C4.18,0.01 5.05,0.27 6.03,0.27 C6.75,0.27 7.39,0.19 7.95,0.05z"></path>
                          <g
                            opacity="1"
                            transform="matrix(0.18000000715255737,0,0,0.18000000715255737,0,0)"
                          ></g>
                        </g>
                      </g>
                    </g>
                  </g>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preloader;
