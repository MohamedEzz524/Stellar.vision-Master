import { useEffect, useRef, useMemo } from 'react';
import { animateTextRandomization } from '../../utils/textSplitting';
import Hero3DModel from '../../components/Hero3DModel';
import { heroSectionParagraph } from '../../constants';

// Move utility functions outside component to avoid recreation
const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
};

const formatDate = (): string => {
  const now = new Date();
  const dayOfWeek = now
    .toLocaleDateString('en-US', { weekday: 'short' })
    .slice(0, 3);
  const day = now.getDate();
  const month = now
    .toLocaleDateString('en-US', { month: 'short' })
    .slice(0, 3)
    .toLowerCase();
  const ordinal = getOrdinalSuffix(day);
  return `${dayOfWeek}, ${day}${ordinal} of ${month}.`;
};

// Extract thermometer SVG to component
const ThermometerIcon = () => (
  <svg
    width="6"
    height="16"
    viewBox="0 0 6 16"
    className="thermometer-icon-inline"
    aria-hidden="true"
  >
    <rect
      x="1"
      y="0"
      width="4"
      height="12"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    />
    <circle
      cx="3"
      cy="14"
      r="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    />
    <rect x="1.5" y="4" width="3" height="8" rx="1.5" fill="currentColor" />
    <circle cx="3" cy="14" r="1.5" fill="currentColor" />
  </svg>
);

const HeroSection = () => {
  const cleanupFunctionsRef = useRef<Array<() => void>>([]);
  const currentDate = useMemo(() => formatDate(), []);

  useEffect(() => {
    const h2Elements = document.querySelectorAll<HTMLElement>('h2');
    const animationConfig = {
      interval: 7000,
      initialDelay: 2000,
      cycles: 8,
      cycleDuration: 0.05,
      charsClass: 'char',
    } as const;

    // Apply randomization animation to each h2
    h2Elements.forEach((h2) => {
      cleanupFunctionsRef.current.push(
        animateTextRandomization(h2, animationConfig),
      );
    });

    return () => {
      cleanupFunctionsRef.current.forEach((cleanup) => cleanup());
      cleanupFunctionsRef.current = [];
    };
  }, []);

  return (
    <section id="hero-section" className="hero-section overflow-hidden">
      <div className="container">
        {/* row-1 */}
        <div className="font-grid -mt-8 flex h-full flex-col justify-center gap-4">
          <div className="hidden grid-cols-1 gap-2 lg:grid lg:grid-cols-2">
            <div className="overflow-hidden">
              <h2>THE BEST</h2>
            </div>
            <div className="ml-auto hidden max-w-96 flex-col font-sans leading-relaxed uppercase lg:flex">
              <div className="overflow-hidden">
                <p>Time: {currentDate}</p>
              </div>
              <div className="overflow-hidden">
                <p>
                  weather: our websites are so hot that your device is
                  overheating right now!{' '}
                  <span
                    id="temperature-display"
                    className="hot-temperature-text"
                  >
                    <ThermometerIcon />
                    <span id="temperature-value">0</span>°C
                  </span>
                </p>
              </div>
            </div>
          </div>
          {/* row-2 */}
          <span className="font-grid relative -mb-4 block text-[11px] uppercase lg:hidden">
            THE BEST
          </span>
          <div className="relative flex overflow-hidden lg:justify-end">
            <h2>WEB DESIGN</h2>
          </div>
          {/* row-3 */}
          <div className="overflow-hidden">
            <h2>STUDIO</h2>
          </div>
          {/* row-4 */}
          <div className="flex overflow-hidden lg:justify-end">
            <h2>IN</h2>
          </div>
          {/* row-1-mobile */}
          <div className="flex justify-end overflow-hidden lg:hidden">
            <h2>THE</h2>
          </div>
          {/* row-2-mobile */}
          <div className="flex justify-end overflow-hidden lg:hidden">
            <h2>WHOLE</h2>
          </div>
          {/* row-5 */}
          <div className="flex flex-col-reverse justify-between gap-4 lg:mt-8 lg:flex-row">
            <div className="relative h-fit overflow-hidden pl-6 leading-tight uppercase lg:pl-10 lg:leading-snug">
              <span
                id="hero-vertical-bar"
                className="bg-textPrimary absolute top-0 left-2 h-full w-1 origin-bottom lg:left-4 lg:w-2"
              />
              <p className="max-w-[480px]">{heroSectionParagraph}</p>
            </div>
            <div className="mb-12 flex justify-end overflow-hidden lg:mb-0 lg:justify-start">
              <h2>MENA REGION</h2>
            </div>
          </div>
        </div>
      </div>

      {/* HERO 3D MODEL */}
      <Hero3DModel />

      {/* Fluid distortion effect overlay - disabled for 3D model */}
      {/* {isDesktop && <HeroImageDistortion />} */}
    </section>
  );
};

export default HeroSection;
