import { useState, useEffect, useRef } from 'react';
import fillLeafSvg from '../assets/fill-leaf.svg';
import emptyLeafSvg from '../assets/empty-leaf.svg';

const throttle = <T extends () => void>(func: T, limit: number): (() => void) => {
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
      const scrollableHeight = documentHeight - windowHeight;
      const currentScroll = Math.min(scrollTop, scrollableHeight);
      const percentage =
        scrollableHeight > 0 ? (currentScroll / scrollableHeight) * 100 : 0;
      const leavesToFill = Math.min(
        Math.ceil((percentage / 100) * totalLeaves),
        totalLeaves,
      );
      setScrollPercentage(Math.round(percentage));
      setFilledLeaves(leavesToFill);
    };

    const handleScroll = throttle(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(calculateScrollProgress);
    }, 16);

    calculateScrollProgress();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [totalLeaves]);

  return (
    <div className="text-textPrimary flex flex-col items-end gap-2">
      <p className="text-[18px] transition-all duration-300">
        YOU'RE AT{' '}
        <span className="scroll-percent-display">{scrollPercentage}</span>% OF
        THE WEBSITE
      </p>
      <div className="flex">
        {Array.from({ length: totalLeaves }).map((_, index) => {
          const isFilled = index < filledLeaves;
          const isEdge = isFilled && index === filledLeaves - 1;
          const trailDist = filledLeaves - 1 - index;
          const trailClass =
            isFilled && !isEdge && trailDist >= 1 && trailDist <= 3
              ? `leaf-trail-${trailDist}`
              : '';
          return (
            <img
              key={`leaf-${index}`}
              className={`leaf-transition -ml-3 h-4.5 w-7.5 ${
                isFilled ? 'leaf-filled' : 'leaf-empty'
              } ${isEdge ? 'leaf-edge' : ''} ${trailClass}`}
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
