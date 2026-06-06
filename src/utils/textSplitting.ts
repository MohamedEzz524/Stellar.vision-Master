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
  /** Interval between animations (in milliseconds) */
  interval?: number;
  /** Initial delay before first animation (in milliseconds) */
  initialDelay?: number;
  /** CSS class for character elements */
  charsClass?: string;
}

/**
 * Text Randomization Animation
 * ===========================
 *
 * Splits text into characters and periodically randomizes them,
 * then resets to original text. Returns cleanup function.
 *
 * @param element - Element containing the text to animate
 * @param config - Configuration options
 * @returns Cleanup function to stop animation and revert split
 */
export const animateTextRandomization = (
  element: HTMLElement,
  config: TextRandomizationConfig = {},
): (() => void) => {
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

  const randomizeText = () => {
    const randomizeSequence = () => {
      for (let i = 0; i < charElements.length; i++) {
        if (spaceIndices.has(i)) {
          charElements[i].textContent = ' ';
        } else {
          charElements[i].textContent = getRandomChar();
        }
      }
    };

    const tl = gsap.timeline();

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

  const intervalTimer = setInterval(() => {
    randomizeText();
  }, interval);
  timers.push(intervalTimer);

  return () => {
    timers.forEach((timer) => {
      clearTimeout(timer);
      clearInterval(timer);
    });

    try {
      split.revert();
    } catch {
      // Already reverted or element removed, ignore silently
    }
  };
};
