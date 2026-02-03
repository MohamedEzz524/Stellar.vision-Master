import { useState, useEffect, useRef } from 'react';
import fillLeafSvg from '../assets/fill-leaf.svg';
import emptyLeafSvg from '../assets/empty-leaf.svg';

/**
 * Throttle function to limit how often a function can be called
 */
const throttle = <T extends () => void>(
  func: T,
  limit: number,
): (() => void) => {
  let inThrottle: boolean;
  return function () {
    if (!inThrottle) {
      func();
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

interface ScrollProgressProps {
  totalLeaves?: number;
}

const ScrollProgress = ({ totalLeaves = 16 }: ScrollProgressProps) => {
  const [filledLeaves, setFilledLeaves] = useState(0);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const calculateScrollProgress = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      // Calculate scrollable distance
      const scrollableHeight = documentHeight - windowHeight;
      const currentScroll = Math.min(scrollTop, scrollableHeight);

      // Calculate percentage (0-100)
      const percentage =
        scrollableHeight > 0 ? (currentScroll / scrollableHeight) * 100 : 0;

      // Calculate how many leaves should be filled
      const leavesToFill = Math.min(
        Math.ceil((percentage / 100) * totalLeaves),
        totalLeaves,
      );

      setScrollPercentage(Math.round(percentage));
      setFilledLeaves(leavesToFill);
    };

    // Throttled version using requestAnimationFrame for smooth updates
    const handleScroll = throttle(() => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(calculateScrollProgress);
    }, 16); // ~60fps

    // Initial calculation
    calculateScrollProgress();

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [totalLeaves]);

  return (
    <div className="text-textPrimary flex flex-col items-end gap-2">
      <p className="text-[18px] transition-all duration-300">
        YOU'RE AT {scrollPercentage}% OF THE WEBSITE
      </p>
      <div className="flex">
        {Array.from({ length: totalLeaves }).map((_, index) => {
          const isFilled = index < filledLeaves;
          return (
            <img
              key={`leaf-${index}`}
              className={`leaf-transition -ml-3 h-4.5 w-7.5 ${
                isFilled ? 'leaf-filled' : 'leaf-empty'
              }`}
              src={isFilled ? fillLeafSvg : emptyLeafSvg}
              alt={isFilled ? 'Filled leaf' : 'Empty leaf'}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ScrollProgress;
