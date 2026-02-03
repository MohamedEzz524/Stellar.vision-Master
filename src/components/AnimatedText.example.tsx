/**
 * AnimatedText Component Usage Examples
 * =====================================
 * 
 * This component provides scroll-triggered text animations.
 * It uses IntersectionObserver for performance and respects prefers-reduced-motion.
 * 
 * Available animation types:
 * - 'flip': Letters rotate from rotateX 90deg to 0deg (3D flip effect)
 * - 'slide': Text slides up from translateY(100%) to 0 (with overflow hidden)
 * 
 * Example Usage:
 */

import AnimatedText from './AnimatedText';

// Example 1: Flip animation (default)
function Example1() {
  return (
    <div>
      <AnimatedText type="flip">
        This text will flip in when it enters the viewport
      </AnimatedText>
    </div>
  );
}

// Example 2: Slide animation
function Example2() {
  return (
    <div>
      <AnimatedText type="slide">
        This text will slide up when it enters the viewport
      </AnimatedText>
    </div>
  );
}

// Example 3: Custom timing and styling
function Example3() {
  return (
    <div>
      <AnimatedText
        type="flip"
        className="text-4xl font-bold"
        delay={0.2}
        stagger={0.08}
        duration={0.8}
        rootMargin="0px 0px -50px 0px"
        threshold={0.2}
      >
        Custom animated text
      </AnimatedText>
    </div>
  );
}

// Example 4: Multiple animated texts
function Example4() {
  return (
    <section>
      <h1>
        <AnimatedText type="flip" stagger={0.1}>
          Welcome to Our Site
        </AnimatedText>
      </h1>
      <p>
        <AnimatedText type="slide" delay={0.3}>
          This paragraph will slide up after the heading flips in.
        </AnimatedText>
      </p>
    </section>
  );
}

export { Example1, Example2, Example3, Example4 };

