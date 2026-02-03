/**
 * Reveal Animation Timeline
 * =========================
 *
 * GSAP timeline animation that runs after preloader reveals.
 * Animates HeroSection and HomeSticky elements in sequence.
 */

import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { Group } from 'three';

// Register SplitText plugin
gsap.registerPlugin(SplitText);

// Store 3D model ref globally so revealAnimation can access it
let model3DRef: React.RefObject<Group | null> | undefined;
let modelReadyCallback: (() => void) | null = null;

/**
 * Register 3D model ref for animation
 */
export const registerModel3DRef = (
  ref: React.RefObject<Group | null> | undefined,
) => {
  model3DRef = ref;
  // If model is ready and we have a callback waiting, call it
  if (ref?.current && modelReadyCallback) {
    modelReadyCallback();
    modelReadyCallback = null;
  }
};

/**
 * Check if 3D model is ready (loaded and ref registered)
 */
export const isModel3DReady = (): boolean => {
  return model3DRef?.current !== null && model3DRef?.current !== undefined;
};

/**
 * Get the 3D model ref for external use (e.g., mouse interaction)
 */
export const getModel3DRef = (): React.RefObject<Group | null> | undefined => {
  return model3DRef;
};

/**
 * Wait for 3D model to be ready, then call callback
 */
export const waitForModel3D = (callback: () => void): void => {
  if (isModel3DReady()) {
    callback();
  } else {
    modelReadyCallback = callback;
  }
};

/**
 * Creates and plays the reveal animation timeline
 * Should be called after preloader sets isRevealing to true
 */
export const playRevealAnimation = (): (() => void) => {
  const tl = gsap.timeline();
  const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
  const isLargeDesktop = window.matchMedia('(min-width: 1280px)').matches;
  // Get elements by ID
  const logo = document.getElementById('home-sticky-logo');
  const bottomLeft = document.getElementById('home-sticky-bottom-left');
  const bottomRight = document.getElementById('home-sticky-bottom-right');
  const heroImage = document.getElementById('hero-image');
  const heroSection = document.getElementById('hero-section');
  const h2Elements = heroSection
    ? heroSection.querySelectorAll<HTMLElement>('h2')
    : [];
  const pElements = heroSection
    ? heroSection.querySelectorAll<HTMLElement>('p')
    : [];
  const temperatureValue = document.getElementById('temperature-value');
  const temperatureDisplay = document.getElementById('temperature-display');
  const verticalBar = document.getElementById('hero-vertical-bar');

  // Store SplitText instances for cleanup
  const splitInstances: SplitText[] = [];

  // Set initial states
  if (logo) {
    gsap.set(logo, { y: -100 });
  }
  if (bottomLeft) {
    gsap.set(bottomLeft, { x: '-100%' });
  }
  if (bottomRight) {
    gsap.set(bottomRight, { x: '100%' });
  }
  if (heroImage) {
    // Ensure hero image is visible when reveal starts
    gsap.set(heroImage, {
      opacity: 1,
      visibility: 'visible',
      pointerEvents: 'auto',
    });

    if (model3DRef?.current) {
      // For 3D model: keep container fixed size and centered, animate model scale instead
      // Initial state is already set in component
    } else {
      // For image: set initial state with transform
      gsap.set(heroImage, {
        rotation: 0,
        width: isDesktop ? '10%' : '10vw',
        x: '-50%',
      });
    }
  }

  // Set initial state (state1) for 3D model if provided
  if (model3DRef?.current) {
    // Ensure state1 is set (already set in component, but ensure it's correct)
    gsap.set(model3DRef.current.rotation, {
      x: -Math.PI / 2, // Stand on ground
      y: 0,
      z: 0,
    });
    gsap.set(model3DRef.current.scale, {
      x: isLargeDesktop ? 0.1 : isDesktop ? 0.05 : 0.03, // state1
      y: isLargeDesktop ? 0.1 : isDesktop ? 0.05 : 0.03,
      z: isLargeDesktop ? 0.1 : isDesktop ? 0.05 : 0.03,
    });
  }

  // Set initial states for h2 elements - they're in overflow-hidden containers
  h2Elements.forEach((h2) => {
    // Ensure parent has overflow hidden
    const parent = h2.parentElement;
    if (parent) {
      gsap.set(parent, { overflow: 'hidden' });
    }
    gsap.set(h2, { y: '150%', rotation: -10 });
  });

  // Split p elements into lines and set initial states
  const pLineElements: HTMLElement[][] = [];
  pElements.forEach((p) => {
    // Ensure parent container has overflow hidden
    const parent = p.parentElement;
    if (parent) {
      gsap.set(parent, { overflow: 'hidden' });
    }
    // Also ensure the p element itself has overflow hidden for its lines
    gsap.set(p, { overflow: 'hidden' });

    const split = SplitText.create(p, {
      type: 'lines',
      linesClass: 'line',
    });
    splitInstances.push(split);

    const lines = Array.from(split.lines) as HTMLElement[];
    pLineElements.push(lines);

    // Wrap each line in an overflow-hidden container
    lines.forEach((line) => {
      // Create wrapper div for each line
      const wrapper = document.createElement('div');
      wrapper.style.overflow = 'hidden';
      wrapper.style.display = 'inline-block';
      wrapper.style.width = '100%';

      // Insert wrapper before line and move line into it
      if (line.parentNode) {
        line.parentNode.insertBefore(wrapper, line);
        wrapper.appendChild(line);
      }

      gsap.set(line, { y: '200%', rotation: -6 });
    });
  });

  // Set initial state for vertical bar (scaleY: 0)
  if (verticalBar) {
    gsap.set(verticalBar, { scaleY: 0, transformOrigin: 'bottom' });
  }

  // Step 1: Hero image expand to 50% / 3D model: state1 → state2
  if (heroImage) {
    if (model3DRef?.current) {
      // For 3D model: animate from state1 to state2
      // state1: scale (0.2, 0.2, 0.5) → state2: scale (0.7, 0.7, 0.8)
      tl.to(model3DRef.current.scale, {
        x: isLargeDesktop ? 0.3 : 0.2,
        y: isLargeDesktop ? 0.3 : 0.2,
        z: isLargeDesktop ? 0.3 : 0.2,
        duration: 0.8,
        ease: 'power2.out',
      });
    } else {
      // For image: animate container width
      tl.to(heroImage, {
        width: '50%',
        duration: 0.8,
        ease: 'power2.out',
      });
    }
  } else {
    // If hero image not found, add empty duration to maintain timeline
    tl.to({}, { duration: 0.8 });
  }

  // Step 2: Logo, bottomLeft, bottomRight reset at same time
  tl.to(
    [logo, bottomLeft, bottomRight].filter(Boolean),
    {
      x: 0,
      y: 0,
      duration: 0.8,
      ease: 'power2.out',
    },
    '-=0.4', // Start 0.4s before step 1 ends
  );

  // Step 4: All h2 elements reset + heroImage goes to -rotate-6
  const h2Animation =
    h2Elements.length > 0
      ? tl.to(
          Array.from(h2Elements),
          {
            y: 0,
            rotation: 0,
            duration: 0.8,
            ease: 'power2.out',
          },
          '-=0.3',
        )
      : null;

  if (heroImage) {
    if (model3DRef?.current) {
      // For 3D model: animate from state2 to state3
      // state2: scale (0.7, 0.7, 0.8) → state3: scale (1, 1, 1), rotation.y = -10°
      tl.to(
        model3DRef.current.scale,
        {
          x: isLargeDesktop ? 0.5 : isDesktop ? 0.3 : 1.2,
          y: isLargeDesktop ? 0.5 : isDesktop ? 0.3 : 1.2,
          z: isLargeDesktop ? 0.5 : isDesktop ? 0.3 : 1.2,
          duration: 0.8,
          ease: 'power2.out',
        },
        h2Animation ? '-=0.8' : '-=0.3',
      );
      tl.to(
        model3DRef.current.rotation,
        {
          y: isDesktop ? -7 * (Math.PI / 180) : -20 * (Math.PI / 180), // -10 degrees
          duration: 0.8,
          ease: 'power2.out',
        },
        h2Animation ? '-=0.8' : '-=0.3',
      );
    } else {
      // For image: animate container width and rotation
      tl.to(
        heroImage,
        {
          width: isDesktop ? '80%' : '120%',
          rotation: isDesktop ? -6 : -30,
          duration: 0.8,
          ease: 'power2.out',
        },
        h2Animation ? '-=0.8' : '-=0.3',
      );
    }
  }

  // Step 5: All p tags slide up as lines + vertical bar expands
  const allLines = pLineElements.flat();
  if (allLines.length > 0) {
    tl.to(
      allLines,
      {
        y: 0,
        rotation: 0,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.05,
      },
      '-=0.4', // Start 0.4s before step 4 ends
    );
  }

  // Animate vertical bar at the same time as p elements
  if (verticalBar) {
    tl.to(
      verticalBar,
      {
        scaleY: 1,
        duration: 0.6,
        ease: 'power2.out',
      },
      allLines.length > 0 ? '-=0.6' : '-=0.4', // Start with p elements
    );
  }

  // Step 6: Animate temperature from 0 to 74 with color change
  if (temperatureValue && temperatureDisplay) {
    // Set initial color (cooler - blue/cyan)
    gsap.set(temperatureDisplay, { color: '#4fc3f7' });

    // Animate temperature counter and color simultaneously
    tl.to(
      { value: 0 },
      {
        value: 74,
        duration: 1.2,
        ease: 'power2.out',
        onUpdate: function () {
          if (temperatureValue) {
            const currentValue = Math.round(this.targets()[0].value);
            temperatureValue.textContent = currentValue.toString();

            // Interpolate color from blue (#4fc3f7) to red (#ff0000) based on temperature
            const progress = currentValue / 74;
            const r = Math.round(79 + (255 - 79) * progress); // 79 -> 255
            const g = Math.round(195 + (0 - 195) * progress); // 195 -> 0
            const b = Math.round(247 + (0 - 247) * progress); // 247 -> 0
            const color = `rgb(${r}, ${g}, ${b})`;

            if (temperatureDisplay) {
              gsap.set(temperatureDisplay, { color });
            }
          }
        },
      },
      '-=0.3', // Start 0.3s before step 5 ends
    );
  }

  // Dispatch custom event when animation completes
  tl.eventCallback('onComplete', () => {
    window.dispatchEvent(new CustomEvent('revealAnimationComplete'));
  });

  // Cleanup function
  const cleanup = () => {
    tl.kill();
    splitInstances.forEach((split) => {
      try {
        split.revert();
      } catch {
        // Already reverted, ignore
      }
    });
  };

  return cleanup;
};
