/**
 * Text Splitting Utilities
 * ========================
 *
 * Currently exposes only the text randomization animation used in HeroSection.
 * GSAP SplitText (now free) handles the splitting internally.
 */

import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

/**
 * Configuration for text randomization animation
 */
export interface TextRandomizationConfig {
  /** Characters to use for randomization */
  randomChars?: string;
  /** Number of randomization cycles */
  cycles?: number;
  /** Duration between each randomization cycle (in seconds) */
  cycleDuration?: number;
  /** Interval between animations (in milliseconds). Pass 0 to disable the auto-cycle. */
  interval?: number;
  /** Initial delay before first animation (in milliseconds) */
  initialDelay?: number;
  /** CSS class for character elements */
  charsClass?: string;
}

/**
 * Handle returned by animateTextRandomization.
 * - `cleanup()` tears down timers and reverts the SplitText.
 * - `trigger()` runs one randomization pass on demand (e.g. from a hover handler).
 *   Re-entrant calls while a pass is already running are ignored.
 */
export interface TextRandomizationHandle {
  cleanup: () => void;
  trigger: () => void;
}

/**
 * Text Randomization Animation
 * ===========================
 *
 * Splits text into characters and periodically randomizes them,
 * then resets to original text.
 *
 * @param element - Element containing the text to animate
 * @param config - Configuration options
 * @returns Handle with `cleanup()` and `trigger()`
 */
export const animateTextRandomization = (
  element: HTMLElement,
  config: TextRandomizationConfig = {},
): TextRandomizationHandle => {
  const {
    randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?',
    cycles = 8,
    cycleDuration = 0.05,
    interval = 3000,
    initialDelay = 2000,
    charsClass = 'char',
  } = config;

  const split = SplitText.create(element, {
    type: 'chars',
    charsClass,
  });

  const charElements = Array.from(split.chars) as HTMLElement[];

  // SplitText may treat whitespace differently — capture the actual rendered text
  // so we can restore it exactly after randomizing.
  const originalCharContents: string[] = charElements.map(
    (el) => el.textContent || '',
  );

  const randomCharsLength = randomChars.length;

  const getRandomChar = (): string => {
    return randomChars[Math.floor(Math.random() * randomCharsLength)];
  };

  const spaceIndices = new Set<number>();
  originalCharContents.forEach((char, index) => {
    if (char.trim() === '' || char === ' ') {
      spaceIndices.add(index);
    }
  });

  // Guard against re-entry: if a randomization pass is already in flight (e.g. the
  // auto-cycle fires at the same moment the user hovers), the second call no-ops.
  // Without this two timelines would race and write conflicting textContent.
  let isRunning = false;

  const randomizeText = () => {
    if (isRunning) return;
    isRunning = true;

    const randomizeSequence = () => {
      for (let i = 0; i < charElements.length; i++) {
        if (spaceIndices.has(i)) {
          charElements[i].textContent = ' ';
        } else {
          charElements[i].textContent = getRandomChar();
        }
      }
    };

    const tl = gsap.timeline({
      onComplete: () => {
        isRunning = false;
      },
    });

    for (let i = 0; i < cycles; i++) {
      tl.call(randomizeSequence).to({}, { duration: cycleDuration });
    }

    tl.call(() => {
      for (let i = 0; i < charElements.length; i++) {
        if (i < originalCharContents.length) {
          charElements[i].textContent = originalCharContents[i];
        }
      }
    });
  };

  const timers: number[] = [];

  const initialTimer = setTimeout(() => {
    randomizeText();
  }, initialDelay);
  timers.push(initialTimer);

  // interval=0 disables the auto-cycle. Useful when you want trigger() to be the
  // only thing that fires (purely interactive, no idle animation).
  if (interval > 0) {
    const intervalTimer = setInterval(() => {
      randomizeText();
    }, interval);
    timers.push(intervalTimer);
  }

  return {
    cleanup: () => {
      timers.forEach((timer) => {
        clearTimeout(timer);
        clearInterval(timer);
      });

      try {
        split.revert();
      } catch {
        // Already reverted or element removed, ignore silently
      }
    },
    trigger: randomizeText,
  };
};
