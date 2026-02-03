import { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { Mesh, Group, Object3D } from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import rockModelUrl from '../assets/models/rock2.compressed.glb?url';

gsap.registerPlugin(ScrollTrigger, SplitText);

const START_OFFSET_VH = 50; // was effectively 150vh before

interface Model3DProps {
  scene: Object3D | null;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  onModelReady?: (ref: React.RefObject<Group | null>) => void;
}

const Model3D = ({
  scene,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  onModelReady,
}: Model3DProps) => {
  const groupRef = useRef<Group>(null);
  const clonedSceneRef = useRef<Object3D | null>(null);
  const onModelReadyRef = useRef(onModelReady);

  // Keep callback ref updated without causing re-renders
  useEffect(() => {
    onModelReadyRef.current = onModelReady;
  }, [onModelReady]);

  useEffect(() => {
    if (scene && groupRef.current) {
      // Dispose previous clone if exists
      if (clonedSceneRef.current) {
        clonedSceneRef.current.traverse((child) => {
          if (child instanceof Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((mat) => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
        groupRef.current.remove(clonedSceneRef.current);
      }

      const clonedScene = scene.clone();
      clonedSceneRef.current = clonedScene;

      groupRef.current.clear();
      groupRef.current.add(clonedScene);

      groupRef.current.rotation.x = rotation[0];
      groupRef.current.rotation.y = rotation[1];
      groupRef.current.rotation.z = rotation[2];
      groupRef.current.scale.set(scale, scale, scale);
      groupRef.current.position.set(position[0], position[1], position[2]);

      if (onModelReadyRef.current) {
        onModelReadyRef.current(groupRef);
      }
    }

    return () => {
      // Cleanup on unmount
      const clonedScene = clonedSceneRef.current;
      if (clonedScene) {
        clonedScene.traverse((child: Object3D) => {
          if (child instanceof Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((mat) => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      }
    };
  }, [scene, position, rotation, scale]);

  return <group ref={groupRef} />;
};

interface ScrollTrigger3DSectionProps {
  texts?: string[];
  objectAnimationStartVh?: {
    row1?: number; // vh to scroll after pinning before row1 reaches end state, default 70vh
    row2?: number; // vh to scroll after pinning before row2 reaches end state, default 110vh
  };
}

const ScrollTrigger3DSection = ({
  texts = [],
  objectAnimationStartVh = {
    row1: 70, // Default 70vh
    row2: 180, // Default 110vh
  },
}: ScrollTrigger3DSectionProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const textTrackRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const objectRefs = useRef<Array<React.RefObject<Group | null>>>([]);
  const objectContainerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const splitInstancesRef = useRef<SplitText[]>([]);
  const textElementsRef = useRef<HTMLElement[]>([]);
  const lineElementsRef = useRef<HTMLElement[]>([]);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const [sharedModelScene, setSharedModelScene] = useState<Object3D | null>(
    null,
  );
  const loaderRef = useRef<{
    loader: GLTFLoader;
    dracoLoader: DRACOLoader;
  } | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const cachedLineRectsRef = useRef<Map<HTMLElement, DOMRect>>(new Map());

  // Initialize refs for 4 objects - moved to useEffect to avoid running on every render
  useEffect(() => {
    for (let i = 0; i < 4; i++) {
      if (!objectRefs.current[i]) {
        objectRefs.current[i] = { current: null };
      }
      objectContainerRefs.current[i] = null;
    }
  }, []);

  // Load model once and share across all instances
  useEffect(() => {
    if (sharedModelScene) return;

    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(dracoLoader);
    loaderRef.current = { loader, dracoLoader };

    loader.load(
      rockModelUrl,
      (loadedGltf) => {
        setSharedModelScene(loadedGltf.scene);
      },
      undefined,
      (error) => {
        console.error('Error loading GLB model:', error);
      },
    );

    return () => {
      if (loaderRef.current) {
        loaderRef.current.dracoLoader.dispose();
        loaderRef.current = null;
      }
    };
  }, [sharedModelScene]);

  // Cleanup shared scene on unmount
  useEffect(() => {
    return () => {
      if (sharedModelScene) {
        sharedModelScene.traverse((child: Object3D) => {
          if (child instanceof Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((mat) => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      }
    };
  }, [sharedModelScene]);

  // Main effect: Setup ScrollTrigger immediately (text animation works without 3D)
  useEffect(() => {
    if (
      !sectionRef.current ||
      !textTrackRef.current ||
      !textContainerRef.current
    ) {
      return;
    }

    const section = sectionRef.current;
    const textTrack = textTrackRef.current;
    const textContainer = textContainerRef.current;
    const cachedRects = cachedLineRectsRef.current;

    // Split text into lines using SplitText
    const splitTextIntoLines = () => {
      // Clear previous split instances
      splitInstancesRef.current.forEach((split) => split.revert());
      splitInstancesRef.current = [];
      lineElementsRef.current = [];
      textElementsRef.current = [];

      // Get all text elements
      const textElements = textContainer.querySelectorAll(
        '[data-text-index]',
      ) as NodeListOf<HTMLElement>;

      textElements.forEach((textEl) => {
        textElementsRef.current.push(textEl);

        // Split text into lines
        const split = SplitText.create(textEl, {
          type: 'lines',
          linesClass: 'line',
        });

        splitInstancesRef.current.push(split);

        const lines = split.lines as HTMLElement[];

        // Set initial opacity to 0 for all lines
        lines.forEach((line) => {
          gsap.set(line, { opacity: 0 });
          lineElementsRef.current.push(line);
        });
      });
    };

    // Track height will be measured from actual content height (text is relative, not absolute)

    // Initial state:
    // Track: top 0%, translateY(150vh)
    // Row 1: top 110%
    // Row 2: top 170%
    gsap.set(textTrack, { willChange: 'transform' });

    // Set initial positions for object containers (relative to section height)
    // Row 1: top 110% of section height
    // Row 2: top 170% of section height
    const vhToPx = (vh: number) => (vh * window.innerHeight) / 100;
    // const offsetPx = vhToPx(100);
    const sectionHeight = section.offsetHeight;
    const row1InitialTop = (sectionHeight * 105) / 100;
    const row2InitialTop = (sectionHeight * 170) / 100;
    // const row1InitialTop = (sectionHeight * 105) / 100 - offsetPx;
    // const row2InitialTop = (sectionHeight * 170) / 100 - offsetPx;

    // Object 0: add static offset down by 200% of its height
    if (objectContainerRefs.current[0]) {
      const container0Height = objectContainerRefs.current[0].offsetHeight;
      const offset0 = (container0Height * 100) / 100; // 100% of height (down)
      gsap.set(objectContainerRefs.current[0], {
        top: `${row1InitialTop + offset0}px`,
        y: '0px',
      });
    }
    // Object 1: normal position
    if (objectContainerRefs.current[1]) {
      gsap.set(objectContainerRefs.current[1], {
        top: `${row1InitialTop}px`,
        y: '0px',
      });
    }
    // Object 2: normal position
    if (objectContainerRefs.current[2]) {
      gsap.set(objectContainerRefs.current[2], {
        top: `${row2InitialTop}px`,
        y: '0px',
      });
    }
    // Object 3: add static offset up by 150% of its height
    if (objectContainerRefs.current[3]) {
      const container3Height = objectContainerRefs.current[3].offsetHeight;
      const offset3 = (container3Height * -150) / 100; // -150% of height (up)
      gsap.set(objectContainerRefs.current[3], {
        top: `${row2InitialTop + offset3}px`,
        y: '0px',
      });
    }

    // Split text into lines after a short delay to ensure DOM is ready
    setTimeout(() => {
      splitTextIntoLines();
    }, 100);

    // Setup ScrollTrigger (works immediately without 3D elements)
    const setupScrollTrigger = () => {
      // Don't recreate if it already exists
      if (scrollTriggerRef.current) {
        return scrollTriggerRef.current;
      }

      // Measure actual track height from content (text is relative, not absolute)
      const trackHeight =
        textContainer.scrollHeight || textContainer.offsetHeight;

      // Single ScrollTrigger at top top
      // Initial state:
      // - Track: top 0%, translateY(50vh)
      // - Row 1: top 110%
      // - Row 2: top 170%
      // When pinned, animate:
      // - Track: from translateY(150vh) to translateY(-100% + 50vh)
      // - Row 1: from top 110% to top 0%
      // - Row 2: from top 170% to top -20%
      const scrollTrigger = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: () => {
          return `+=${trackHeight + window.innerHeight * 0.5}px`;
        },
        pin: section,
        pinSpacing: true,
        scrub: true,
        invalidateOnRefresh: false, // Prevent recalculation on refresh
        anticipatePin: 1, // Smooth pinning transitions
        onUpdate: (self) => {
          // Throttle updates to ~60fps
          const now = performance.now();
          if (now - lastUpdateTimeRef.current < 16) return; // ~60fps
          lastUpdateTimeRef.current = now;

          const progress = self.progress;

          const trackStartY = vhToPx(START_OFFSET_VH);
          const trackEndY = -trackHeight + vhToPx(10);
          const trackCurrentY =
            trackStartY + (trackEndY - trackStartY) * progress;
          gsap.set(textTrack, { y: `${trackCurrentY}px` });

          // Animate line opacity based on viewport position
          // Fade in: 30vh below center to center (fades from 0 to 1)
          // Fade out: center to 30vh above center (fades from 1 to 0)
          if (lineElementsRef.current.length > 0) {
            const viewportHeight = window.innerHeight;
            const viewportCenter = viewportHeight * 0.5; // Center of viewport
            const fadeZone = viewportHeight * 0.4; // 30vh fade zone

            // Cache getBoundingClientRect calls - only update every few frames
            const shouldUpdateRects = Math.floor(progress * 100) % 3 === 0;

            lineElementsRef.current.forEach((line) => {
              let lineRect: DOMRect;
              if (shouldUpdateRects || !cachedRects.has(line)) {
                lineRect = line.getBoundingClientRect();
                cachedRects.set(line, lineRect);
              } else {
                lineRect = cachedRects.get(line)!;
              }

              const lineCenter = lineRect.top + lineRect.height * 0.5;

              // Calculate distance from line center to viewport center
              // Negative = below center, Positive = above center
              const distanceFromCenter = lineCenter - viewportCenter;

              let opacity: number;

              if (distanceFromCenter <= -fadeZone) {
                // More than 30vh below center: opacity 0
                opacity = 0;
              } else if (distanceFromCenter < 0) {
                // Between 30vh below center and center: fade in from 0 to 1
                // Linear interpolation: map [-fadeZone, 0] to [0, 1]
                const fadeProgress = (distanceFromCenter + fadeZone) / fadeZone;
                opacity = Math.max(0, Math.min(1, fadeProgress));
              } else if (distanceFromCenter <= fadeZone) {
                // Between center and 30vh above center: fade out from 1 to 0
                // Linear interpolation: map [0, fadeZone] to [1, 0]
                const fadeProgress = distanceFromCenter / fadeZone;
                opacity = Math.max(0, Math.min(1, 1 - fadeProgress));
              } else {
                // More than 30vh above center: opacity 0
                opacity = 0;
              }

              gsap.set(line, { opacity });
            });
          }

          // Animate object containers (Row 1 and Row 2) during pinned scroll
          // Objects reach end state after objectAnimationStartVh (row1: 70vh, row2: 110vh) of scroll
          // Then continue to move back 40% of their path
          // const offsetPx = vhToPx(100);
          const sectionHeight = section.offsetHeight;
          // const row1StartTop = (sectionHeight * 110) / 100 - offsetPx;
          const row1StartTop = (sectionHeight * 110) / 100;
          const row1EndTop = 0;
          const row1PathLength = row1StartTop - row1EndTop;
          const row1BackTop = row1EndTop + (row1PathLength * 20) / 100;

          // const row2StartTop = (sectionHeight * 170) / 100 - offsetPx;
          const row2StartTop = (sectionHeight * 170) / 100;
          const row2EndTop = (sectionHeight * -20) / 100;
          const row2PathLength = row2StartTop - row2EndTop;
          const row2BackTop = row2EndTop + (row2PathLength * 40) / 100;

          // Calculate pixels scrolled after pinning using progress
          const totalScrollDistance = Number(self.end) - Number(self.start);
          const pixelsScrolled = progress * totalScrollDistance;

          // Convert vh to pixels for row1 and row2
          const row1StartPixels = vhToPx(objectAnimationStartVh.row1 ?? 70);
          const row2StartPixels = vhToPx(objectAnimationStartVh.row2 ?? 110);

          let row1CurrentTop: number;
          let row2CurrentTop: number;

          // Row 1 animation
          if (pixelsScrolled <= row1StartPixels) {
            // Phase 1: Move forward to end state
            const forwardProgress = pixelsScrolled / row1StartPixels;
            row1CurrentTop =
              row1StartTop + (row1EndTop - row1StartTop) * forwardProgress;
          } else {
            // Phase 2: Move back 40% of path
            const remainingPixels = pixelsScrolled - row1StartPixels;
            const remainingScrollDistance =
              totalScrollDistance - row1StartPixels;
            const backProgress = Math.min(
              1,
              remainingPixels / remainingScrollDistance,
            );
            row1CurrentTop =
              row1EndTop + (row1BackTop - row1EndTop) * backProgress;
          }

          // Row 2 animation
          if (pixelsScrolled <= row2StartPixels) {
            // Phase 1: Move forward to end state
            const forwardProgress = pixelsScrolled / row2StartPixels;
            row2CurrentTop =
              row2StartTop + (row2EndTop - row2StartTop) * forwardProgress;
          } else {
            // Phase 2: Move back 40% of path
            const remainingPixels = pixelsScrolled - row2StartPixels;
            const remainingScrollDistance =
              totalScrollDistance - row2StartPixels;
            const backProgress = Math.min(
              1,
              remainingPixels / remainingScrollDistance,
            );
            row2CurrentTop =
              row2EndTop + (row2BackTop - row2EndTop) * backProgress;
          }

          // Update object containers with top positioning (in pixels, relative to section)
          // Only update if 3D elements are loaded (use ref to avoid stale closure)
          let rocksFadedIn = false; // outside useEffect

          // inside onUpdate
          if (!rocksFadedIn) {
            rocksFadedIn = true;
            objectContainerRefs.current.forEach((el) => {
              if (el)
                gsap.to(el, { opacity: 1, duration: 0.5, ease: 'power1.out' });
            });
          }

          if (objectContainerRefs.current[0]) {
            // Row 1 objects (indices 0 and 1)
            // Object 0: add static offset down by 200% of its height
            if (objectContainerRefs.current[0]) {
              const container0Height =
                objectContainerRefs.current[0].offsetHeight;
              const offset0 = (container0Height * 100) / 100; // 100% of height (down)
              gsap.set(objectContainerRefs.current[0], {
                top: `${row1CurrentTop + offset0}px`,
                y: '0px',
              });
            }
            // Object 1: normal position
            if (objectContainerRefs.current[1]) {
              gsap.set(objectContainerRefs.current[1], {
                top: `${row1CurrentTop}px`,
                y: '0px',
              });
            }

            // Row 2 objects (indices 2 and 3)
            // Object 2: normal position
            if (objectContainerRefs.current[2]) {
              gsap.set(objectContainerRefs.current[2], {
                top: `${row2CurrentTop}px`,
                y: '0px',
              });
            }
            // Object 3: add static offset up by 150% of its height
            if (objectContainerRefs.current[3]) {
              const container3Height =
                objectContainerRefs.current[3].offsetHeight;
              const offset3 = (container3Height * -150) / 100; // -150% of height (up)
              gsap.set(objectContainerRefs.current[3], {
                top: `${row2CurrentTop + offset3}px`,
                y: '0px',
              });
            }

            // Rotation: rotate on x and y axis (faster rotation)
            const rotationSpeed = 3; // Multiplier for rotation speed
            const maxRotationX = Math.PI; // 90 degrees
            const maxRotationY = Math.PI; // 90 degrees
            const rotationX = maxRotationX * progress * rotationSpeed;
            const rotationY = maxRotationY * progress * rotationSpeed;

            // Update each 3D object rotation only
            objectRefs.current.forEach((objRef) => {
              if (objRef.current) {
                // Rotate
                objRef.current.rotation.x = -Math.PI / 2 + rotationX; // Add base rotation
                objRef.current.rotation.y = rotationY;
                objRef.current.rotation.z = 0;
              }
            });
          }
        },
      });

      scrollTriggerRef.current = scrollTrigger;
      return scrollTrigger;
    };

    // Setup ScrollTrigger immediately (works without 3D elements)
    setupScrollTrigger();

    return () => {
      // Cleanup: kill only our ScrollTrigger instance
      if (scrollTriggerRef.current) {
        scrollTriggerRef.current.kill();
        scrollTriggerRef.current = null;
      }
      // Cleanup SplitText instances
      splitInstancesRef.current.forEach((split) => split.revert());
      splitInstancesRef.current = [];
      lineElementsRef.current = [];
      textElementsRef.current = [];
      if (cachedRects) {
        cachedRects.clear();
      }
    };
  }, [texts, objectAnimationStartVh]); // Removed isLazyLoaded to prevent re-initialization

  // Memoize callbacks to prevent re-renders
  const handleModelReady0 = useCallback(
    (ref: React.RefObject<Group | null>) => {
      objectRefs.current[0] = ref;
    },
    [],
  );

  const handleModelReady1 = useCallback(
    (ref: React.RefObject<Group | null>) => {
      objectRefs.current[1] = ref;
    },
    [],
  );

  const handleModelReady2 = useCallback(
    (ref: React.RefObject<Group | null>) => {
      objectRefs.current[2] = ref;
    },
    [],
  );

  const handleModelReady3 = useCallback(
    (ref: React.RefObject<Group | null>) => {
      objectRefs.current[3] = ref;
    },
    [],
  );

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full overflow-hidden"
    >
      {/* 3D Objects Container - Outside text track, relative to section */}
      {/* Only render 3D elements when lazy loaded */}

      <div className="pointer-events-none absolute inset-0 z-10">
        {/* Container with same max-width as text track for alignment */}
        <div className="relative mx-auto h-full max-w-[344px] lg:max-w-[1000px]">
          {/* Top Row - Left and Right */}
          {/* Left object - top row */}
          <div
            ref={(el) => {
              objectContainerRefs.current[0] = el;
            }}
            className="object-container absolute left-0 z-[15] h-[150px] w-[120px] rotate-45 lg:h-[280px] lg:w-[250px] xl:-left-80"
          >
            <Canvas
              camera={{ position: [0, 0, 6], fov: 50, near: 0.1, far: 1000 }}
              gl={{ antialias: true, alpha: true }}
              style={{ width: '100%', height: '100%' }}
            >
              <ambientLight intensity={1} />
              <directionalLight position={[5, 5, 5]} intensity={2} />
              <pointLight position={[-5, -5, -5]} intensity={1} />
              <Model3D
                scene={sharedModelScene}
                position={[0, 0, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={0.8}
                onModelReady={handleModelReady0}
              />
            </Canvas>
          </div>

          {/* Right object - top row (different Y translation) */}
          <div
            ref={(el) => {
              objectContainerRefs.current[1] = el;
            }}
            className="object-container absolute -right-0 z-[15] h-[150px] w-[120px] lg:h-[180px] lg:w-[150px] xl:-right-30"
          >
            <Canvas
              camera={{ position: [0, 0, 6], fov: 50, near: 0.1, far: 1000 }}
              gl={{ antialias: true, alpha: true }}
              style={{ width: '100%', height: '100%' }}
            >
              <ambientLight intensity={1} />
              <directionalLight position={[5, 5, 5]} intensity={2} />
              <pointLight position={[-5, -5, -5]} intensity={1} />
              <Model3D
                scene={sharedModelScene}
                position={[0, -2, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={0.9}
                onModelReady={handleModelReady1}
              />
            </Canvas>
          </div>

          {/* Bottom Row - Left and Right (30vh below top row) */}
          {/* Left object - bottom row - shifted left, deeper z-axis */}
          <div
            ref={(el) => {
              objectContainerRefs.current[2] = el;
            }}
            className="object-container absolute -left-[20px] z-[5] h-[150px] w-[120px] lg:-left-[75px] lg:h-[180px] lg:w-[150px] xl:-left-40"
          >
            <Canvas
              camera={{ position: [0, 0, 6], fov: 50, near: 0.1, far: 1000 }}
              gl={{ antialias: true, alpha: true }}
              style={{ width: '100%', height: '100%' }}
            >
              <ambientLight intensity={1} />
              <directionalLight position={[5, 5, 5]} intensity={2} />
              <pointLight position={[-5, -5, -5]} intensity={1} />

              <Model3D
                scene={sharedModelScene}
                position={[0, 0, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={0.85}
                onModelReady={handleModelReady2}
              />
            </Canvas>
          </div>

          {/* Right object - bottom row - shifted right, deeper z-axis */}
          <div
            ref={(el) => {
              objectContainerRefs.current[3] = el;
            }}
            className="object-container absolute -right-[30px] z-[5] h-[120px] w-[120px] lg:-right-[75px] lg:h-[500px] lg:w-[500px] xl:-right-40"
          >
            <Canvas
              camera={{ position: [0, 0, 6], fov: 50, near: 0.1, far: 1000 }}
              gl={{ antialias: true, alpha: true }}
              style={{ width: '100%', height: '100%' }}
            >
              <ambientLight intensity={1} />
              <directionalLight position={[5, 5, 5]} intensity={2} />
              <pointLight position={[-5, -5, -5]} intensity={1} />
              <Model3D
                scene={sharedModelScene}
                position={[0, -2, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={0.75}
                onModelReady={handleModelReady3}
              />
            </Canvas>
          </div>
        </div>
      </div>

      {/* Text Wrapper Track */}
      <div
        ref={textTrackRef}
        className="font-grid relative z-20 mx-auto max-w-[344px] translate-y-[50vh] px-1.5 will-change-transform sm:max-w-[600px] lg:max-w-[1000px] lg:px-0"
      >
        <div ref={textContainerRef} className="relative z-20">
          {texts.map((text, index) => (
            <div
              key={index}
              data-text-index={index}
              className="mb-8 text-center text-lg leading-tight font-bold whitespace-pre-line text-white sm:text-xl lg:mb-16 lg:text-6xl lg:leading-tight"
            >
              {text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ScrollTrigger3DSection;
