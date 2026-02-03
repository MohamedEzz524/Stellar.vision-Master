/**
 * Text Splitting Utilities
 * ========================
 *
 * Wrapper around GSAP SplitText plugin for text splitting.
 * SplitText is now FREE and provides better performance, accessibility,
 * and edge case handling compared to custom implementations.
 */

import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

// Register plugin once at module level
gsap.registerPlugin(SplitText);

// Helper to get text content from SplitText result
const getTextFromElements = (elements: Element[]): string[] => {
  return elements.map((el) => (el as HTMLElement).textContent || '');
};

/**
 * Split text into individual characters using SplitText
 * Returns both the string array and the SplitText instance for cleanup
 *
 * @param element - Element containing the text to split
 * @param className - Optional CSS class for character elements
 * @returns Object with chars array and SplitText instance
 */
export const splitIntoChars = (
  element: HTMLElement,
  className: string = 'char',
): { chars: string[]; splitInstance: SplitText } => {
  const split = SplitText.create(element, {
    type: 'chars',
    charsClass: className,
  });

  return {
    chars: getTextFromElements(split.chars as Element[]),
    splitInstance: split,
  };
};

/**
 * Split text into words using SplitText
 * Returns both the string array and the SplitText instance for cleanup
 *
 * @param element - Element containing the text to split
 * @param className - Optional CSS class for word elements
 * @returns Object with words array and SplitText instance
 */
export const splitIntoWords = (
  element: HTMLElement,
  className: string = 'word',
): { words: string[]; splitInstance: SplitText } => {
  const split = SplitText.create(element, {
    type: 'words',
    wordsClass: className,
  });

  return {
    words: getTextFromElements(split.words as Element[]),
    splitInstance: split,
  };
};

/**
 * Split text into visual lines using SplitText
 * SplitText handles font loading and measurement automatically
 * Returns both the string array and the SplitText instance for cleanup
 *
 * @param element - Element containing the text to split
 * @param className - Optional CSS class for line elements
 * @returns Object with lines array and SplitText instance
 */
export const splitIntoLines = (
  element: HTMLElement,
  className: string = 'line',
): { lines: string[]; splitInstance: SplitText } => {
  const split = SplitText.create(element, {
    type: 'lines',
    linesClass: className,
  });

  return {
    lines: getTextFromElements(split.lines as Element[]),
    splitInstance: split,
  };
};

/**
 * Split text into chars, words, and lines in one call
 * Most efficient when you need multiple split types
 *
 * @param element - Element containing the text to split
 * @param config - Configuration object with optional class names
 * @returns Object with arrays and SplitText instance
 */
export const splitText = (
  element: HTMLElement,
  config: {
    type?:
      | 'chars'
      | 'words'
      | 'lines'
      | 'chars,words'
      | 'chars,lines'
      | 'words,lines'
      | 'chars,words,lines';
    charsClass?: string;
    wordsClass?: string;
    linesClass?: string;
  } = {},
): SplitText => {
  return SplitText.create(element, {
    type: config.type || 'chars',
    charsClass: config.charsClass || 'char',
    wordsClass: config.wordsClass || 'word',
    linesClass: config.linesClass || 'line',
  });
};

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

  // Split text into characters
  const split = SplitText.create(element, {
    type: 'chars',
    charsClass,
  });

  // Get character elements
  const charElements = Array.from(split.chars) as HTMLElement[];

  // Store the ACTUAL text content from each split element (this is the source of truth)
  // SplitText might handle spaces/formatting differently, so we capture what it actually created
  const originalCharContents: string[] = charElements.map(
    (el) => el.textContent || '',
  );

  // Cache randomChars length for performance
  const randomCharsLength = randomChars.length;

  // Optimized random character generator
  const getRandomChar = (): string => {
    return randomChars[Math.floor(Math.random() * randomCharsLength)];
  };

  // Pre-compute space indices for faster lookup (based on actual split content)
  const spaceIndices = new Set<number>();
  originalCharContents.forEach((char, index) => {
    if (char.trim() === '' || char === ' ') {
      spaceIndices.add(index);
    }
  });

  // Randomize text animation
  const randomizeText = () => {
    // Fast randomization sequence
    const randomizeSequence = () => {
      for (let i = 0; i < charElements.length; i++) {
        if (spaceIndices.has(i)) {
          charElements[i].textContent = ' ';
        } else {
          charElements[i].textContent = getRandomChar();
        }
      }
    };

    // Create timeline for randomization
    const tl = gsap.timeline();

    // Randomize multiple times quickly
    for (let i = 0; i < cycles; i++) {
      tl.call(randomizeSequence).to({}, { duration: cycleDuration });
    }

    // Reset to original text (use the actual stored content from split elements)
    tl.call(() => {
      for (let i = 0; i < charElements.length; i++) {
        if (i < originalCharContents.length) {
          charElements[i].textContent = originalCharContents[i];
        }
      }
    });
  };

  // Set up timers
  const timers: number[] = [];

  // Initial delay
  const initialTimer = setTimeout(() => {
    randomizeText();
  }, initialDelay);
  timers.push(initialTimer);

  // Periodic interval
  const intervalTimer = setInterval(() => {
    randomizeText();
  }, interval);
  timers.push(intervalTimer);

  // Cleanup function
  return () => {
    // Clear all timers (both setTimeout and setInterval)
    timers.forEach((timer) => {
      clearTimeout(timer);
      clearInterval(timer);
    });

    // Revert split text
    try {
      split.revert();
    } catch {
      // Already reverted or element removed, ignore silently
    }
  };
};
