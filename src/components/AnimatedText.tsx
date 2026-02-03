import { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useScrollTrigger } from '../hooks/useScrollTrigger';

// Register SplitText plugin
gsap.registerPlugin(SplitText);

export type TextAnimationType = 'flip' | 'slide';

interface AnimatedTextProps {
  children: string;
  type?: TextAnimationType;
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean;
}

const AnimatedText = ({
  children,
  type = 'flip',
  className = '',
  delay = 0,
  stagger = 0.05,
  duration = 0.6,
  rootMargin = '0px 0px -100px 0px',
  threshold = 0.1,
  triggerOnce = true,
}: AnimatedTextProps) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const { elementRef, isVisible } = useScrollTrigger({
    rootMargin,
    threshold,
    triggerOnce,
  });
  const hasAnimatedRef = useRef(false);
  const animationRef = useRef<gsap.core.Timeline | null>(null);
  const splitInstanceRef = useRef<SplitText | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const prefersReducedMotionRef = useRef(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  const cleanup = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.kill();
      animationRef.current = null;
    }
    if (splitInstanceRef.current) {
      splitInstanceRef.current.revert();
      splitInstanceRef.current = null;
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isVisible || hasAnimatedRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const text = children?.trim() || '';

    if (!text) {
      hasAnimatedRef.current = true;
      return;
    }

    if (prefersReducedMotionRef.current) {
      hasAnimatedRef.current = true;
      return;
    }

    cleanup();

    if (type === 'flip') {
      container.classList.add('animated-text-flip');
      container.textContent = text;
      container.style.visibility = 'visible';
      container.style.opacity = '1';

      // Use SplitText to split into chars
      const split = SplitText.create(container, {
        type: 'chars',
        charsClass: 'char',
      });

      splitInstanceRef.current = split;

      const letterElements = split.chars as HTMLElement[];

      if (letterElements.length === 0) {
        hasAnimatedRef.current = true;
        return;
      }

      // Set initial state and styles
      letterElements.forEach((el) => {
        el.style.display = 'inline-block';
        el.style.transformOrigin = 'top';
        el.style.willChange = 'transform, opacity';
        gsap.set(el, { rotationX: 90, opacity: 0 });
      });

      const tl = gsap.timeline({
        delay,
        onComplete: () => {
          letterElements.forEach((el) => {
            el.style.willChange = 'auto';
          });
        },
      });

      tl.to(letterElements, {
        rotationX: 0,
        opacity: 1,
        duration,
        stagger,
        ease: 'power2.out',
      });

      animationRef.current = tl;
      hasAnimatedRef.current = true;
    } else if (type === 'slide') {
      container.style.display = 'block';
      container.style.visibility = 'hidden';
      container.textContent = text;

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;

        // Use SplitText to split into lines
        const split = SplitText.create(container, {
          type: 'lines',
          linesClass: 'line',
        });

        splitInstanceRef.current = split;

        const lineElements = split.lines as HTMLElement[];

        if (lineElements.length === 0) {
          container.style.visibility = 'visible';
          hasAnimatedRef.current = true;
          return;
        }

        // Wrap each line for overflow hidden effect
        const wrappedElements: HTMLElement[] = [];
        lineElements.forEach((lineEl) => {
          const lineWrapper = document.createElement('div');
          lineWrapper.style.overflow = 'hidden';
          lineWrapper.style.display = 'block';
          lineWrapper.style.willChange = 'transform';

          // Move line element into wrapper
          const parent = lineEl.parentNode;
          if (parent) {
            parent.insertBefore(lineWrapper, lineEl);
            lineWrapper.appendChild(lineEl);

            lineEl.style.display = 'block';
            lineEl.style.willChange = 'transform';
            gsap.set(lineEl, { y: '100%' });

            wrappedElements.push(lineEl);
          }
        });

        container.style.visibility = 'visible';

        const tl = gsap.timeline({
          delay,
          onComplete: () => {
            wrappedElements.forEach((el) => {
              el.style.willChange = 'auto';
              const wrapper = el.parentElement;
              if (wrapper) {
                wrapper.style.willChange = 'auto';
              }
            });
          },
        });

        tl.to(wrappedElements, {
          y: '0%',
          duration,
          stagger,
          ease: 'power2.out',
        });

        animationRef.current = tl;
        hasAnimatedRef.current = true;
      });
    }

    return cleanup;
  }, [isVisible, children, type, delay, stagger, duration, cleanup]);

  useEffect(() => {
    hasAnimatedRef.current = false;
    cleanup();
    if (containerRef.current) {
      containerRef.current.classList.remove(
        'animated-text-flip',
        'animated-text-slide',
      );
      containerRef.current.style.display = '';
      containerRef.current.style.visibility = '';
    }
  }, [children, cleanup]);

  return (
    <span
      ref={(node) => {
        elementRef.current = node;
        containerRef.current = node;
      }}
      className={className}
      style={{
        visibility: isVisible ? 'visible' : 'hidden',
        opacity: isVisible ? 1 : 0,
      }}
    >
      {children}
    </span>
  );
};

export default AnimatedText;
