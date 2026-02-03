import { useMediaQuery } from 'react-responsive';
import logoImg from '../../assets/images/logo.svg';
import noiseImg from '../../assets/images/noise.webp';
import globalImage from '../../assets/images/global.webp';
import ScrollProgress from '../../components/ScrollProgress';
import Calendar from '../../components/Calendar';
import { autoRotateTexts } from '../../constants';

// Inline Corner SVG Component
const CornerSVG = ({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) => (
  <svg
    className={`corner-svg ${className}`}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
    width="40"
    height="40"
    viewBox="0 0 40 40"
    fill="none"
  >
    <g clipPath="url(#clip0_240_73)">
      <path
        d="M40 20H46.3556V47.7343H20V40C20 40 27.2434 38.2101 33.0695 33.7639C38.8957 29.3176 40 20 40 20Z"
        fill="black"
      />
      <path
        className="corner-stroke-path"
        d="M38.8867 -0.0556641V19.9997C38.8867 31.9909 28.5619 38.9206 20.002 38.9206H-0.101562"
        stroke="white"
      />
    </g>
    <defs>
      <clipPath id="clip0_240_73">
        <rect width="40" height="40" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

const HomeSticky = () => {
  // Responsive fade distance: 90px for xl screens (≥1280px), 70px for lg screens (≥1024px)
  const isXl = useMediaQuery({ minWidth: 1280 }); // Tailwind xl breakpoint
  const isLg = useMediaQuery({ minWidth: 1024 }); // Tailwind lg breakpoint
  const fadeDistance = isXl ? 90 : isLg ? 70 : 40; // 100 for xl, 70 for lg and 40 for below

  const borderWidth = isLg ? 30 : 5; // Width for left/right, height for top
  const borderSize = isLg ? 3 : 1; // Border thickness in pixels
  const bottomHeight = 80; // Larger height for bottom

  // Calculate positions: top/bottom start after left/right borders, left/right extend 1px into top/bottom (0.5px each side)
  const topLeft = borderWidth; // Start after left border
  const topRight = borderWidth; // End before right border
  const leftTop = borderWidth - 1.5; // Start 1.5px before top border ends (extends 0.5px into top)
  const leftBottom = bottomHeight - 1.5; // End 1.5px before bottom border starts (extends 0.5px into bottom)

  return (
    <section className="pointer-events-none fixed top-0 left-0 z-[9999] h-[100dvh] w-full">
      <div
        className="absolute top-1 right-1 -z-1 flex h-16 w-[calc(100%-150px)] items-center pl-4 text-base text-white lg:hidden"
        style={{
          background:
            'linear-gradient(to bottom, #000 0%, #000 60%, rgba(0, 0, 0, 0.8) 75%, rgba(0, 0, 0, 0.6) 85%, rgba(0, 0, 0, 0.3) 92%, transparent 100%)',
        }}
      >
        <div className="relative h-full w-full">
          {/* AUTO ROTATE TEXT ANIMATION */}
          <div className="font-grid absolute inset-0 z-0 overflow-hidden text-lg">
            <div className="scroll-text-animation left-1/2 flex h-full w-fit flex-row items-center gap-[calc(99vw-150px)]">
              {autoRotateTexts.map((text: string, index: number) => (
                <div
                  key={text.slice(0, 5) + index}
                  className="text-textPrimary whitespace-nowrap"
                >
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Top border container - fills corner, inner div has border */}
      <div
        className="bg-bgPrimary absolute top-0 right-0 left-0"
        style={{ height: `${borderWidth}px` }}
      >
        <div
          className="absolute top-0 h-full"
          style={{
            left: `${topLeft}px`,
            right: `${topRight}px`,
            borderBottom: `${borderSize}px solid #fff`,
          }}
        />
      </div>
      {/* Right border container - fills corner, inner div has border */}
      <div
        className="bg-bgPrimary absolute top-0 right-0 bottom-0"
        style={{ width: `${borderWidth}px` }}
      >
        <div
          className="absolute right-0 w-full"
          style={{
            top: `${leftTop}px`,
            bottom: `${leftBottom}px`,
            borderLeft: `${borderSize}px solid #fff`,
          }}
        />
      </div>
      {/* Bottom border container - fills corner, inner div has border */}
      <div
        className="bg-bgPrimary absolute right-0 bottom-0 left-0 grid grid-cols-3 px-8 py-2.5"
        style={{ height: `${bottomHeight}px` }}
      >
        <div
          className="absolute bottom-0 h-full"
          style={{
            left: `${topLeft}px`,
            right: `${topRight - 1.5}px`,
            borderTop: `${borderSize}px solid #fff`,
          }}
        />

        {/* BOTTOM - LEFT SIDE CONTENT */}
        {isLg && (
          <div
            id="home-sticky-bottom-left"
            className="relative flex h-full items-center gap-4"
          >
            {/* GLOBAL IMAGE */}
            <div className="border-textPrimary relative w-14 overflow-hidden rounded-md border-3 p-1">
              <div className="flicker-animation relative h-full w-full">
                <img src={globalImage} alt="Global" className="block" />
                <div
                  className="noise-glitch-fast-animation absolute inset-0 z-0"
                  style={{
                    backgroundImage: `url(${noiseImg})`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '100px 100px',
                  }}
                />
              </div>
            </div>

            {/* AUTO ROTATE TEXT */}
            <div className="border-textPrimary relative h-full w-[20vw] overflow-hidden rounded-md border-3">
              <div className="relative h-full w-full">
                <div
                  className="noise-glitch-slow-animation absolute inset-0 z-0"
                  style={{
                    backgroundImage: `url(${noiseImg})`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '100px 100px',
                  }}
                />
                {/* AUTO ROTATE TEXT ANIMATION */}
                <div className="font-grid absolute inset-0 z-0 overflow-hidden text-4xl">
                  <div className="scroll-text-animation left-1/2 flex h-full flex-row items-center gap-[20vw]">
                    {autoRotateTexts.map((text: string, index: number) => (
                      <div
                        key={text.slice(0, 5) + index}
                        className="text-textPrimary whitespace-nowrap"
                      >
                        {text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM - CENTER CONTENT */}
        <div></div>

        {/* BOTTOM - RIGHT SIDE CONTENT */}
        {isLg && (
          <div id="home-sticky-bottom-right">
            <ScrollProgress totalLeaves={16} />
          </div>
        )}
      </div>
      {/* Left border container - fills corner, inner div has border */}
      <div
        className="bg-bgPrimary absolute top-0 bottom-0 left-0"
        style={{ width: `${borderWidth}px` }}
      >
        <div
          className="absolute left-0 w-full"
          style={{
            top: `${leftTop}px`,
            bottom: `${leftBottom}px`,
            borderRight: `${borderSize}px solid #fff`,
          }}
        />
      </div>
      {/* Noise background - fills space between borders with gradient fade to transparent center */}
      <div
        id="home-sticky-noise"
        className="noise-glitch-animation pointer-events-none absolute opacity-20"
        style={
          {
            left: `${topLeft}px`,
            right: `${topRight}px`,
            top: `${leftTop}px`,
            bottom: `${leftBottom}px`,
            backgroundImage: `url(${noiseImg})`,
            backgroundRepeat: 'repeat',
            backgroundSize: 'auto',
            '--fade-px': `${fadeDistance}px`,
            maskImage: `
            linear-gradient(to bottom, 
              rgba(255, 255, 255, 1) 0, 
              rgba(255, 255, 255, 0.5) calc(var(--fade-px) * 0.7), 
              rgba(255, 255, 255, 0) calc(var(--fade-px) * 1.125), 
              transparent calc(var(--fade-px) * 1.25), 
              transparent calc(100% - var(--fade-px) * 1.25), 
              rgba(255, 255, 255, 0) calc(100% - var(--fade-px) * 1.125), 
              rgba(255, 255, 255, 0.5) calc(100% - var(--fade-px) * 0.7), 
              rgba(255, 255, 255, 1) 100%
            ),
            linear-gradient(to right, 
              rgba(255, 255, 255, 1) 0, 
              rgba(255, 255, 255, 0.5) calc(var(--fade-px) * 0.7), 
              rgba(255, 255, 255, 0) calc(var(--fade-px) * 1.125), 
              transparent calc(var(--fade-px) * 1.25), 
              transparent calc(100% - var(--fade-px) * 1.25), 
              rgba(255, 255, 255, 0) calc(100% - var(--fade-px) * 1.125), 
              rgba(255, 255, 255, 0.5) calc(100% - var(--fade-px) * 0.7), 
              rgba(255, 255, 255, 1) 100%
            )
          `,
            WebkitMaskImage: `
            linear-gradient(to bottom, 
              rgba(255, 255, 255, 0.1) 0, 
              rgba(255, 255, 255, 0.5) calc(var(--fade-px) * 0.5), 
              rgba(255, 255, 255, 0) calc(var(--fade-px) * 1.125), 
              transparent calc(var(--fade-px) * 1.25), 
              transparent calc(100% - var(--fade-px) * 1.25), 
              rgba(255, 255, 255, 0) calc(100% - var(--fade-px) * 1.125), 
              rgba(255, 255, 255, 0.5) calc(100% - var(--fade-px) * 0.5), 
              rgba(255, 255, 255, 1) 100%
            ),
            linear-gradient(to right, 
              rgba(255, 255, 255, 1) 0, 
              rgba(255, 255, 255, 0.5) calc(var(--fade-px) * 0.5), 
              rgba(255, 255, 255, 0) calc(var(--fade-px) * 1.125), 
              transparent calc(var(--fade-px) * 1.25), 
              transparent calc(100% - var(--fade-px) * 1.25), 
              rgba(255, 255, 255, 0) calc(100% - var(--fade-px) * 1.125), 
              rgba(255, 255, 255, 0.5) calc(100% - var(--fade-px) * 0.5), 
              rgba(255, 255, 255, 1) 100%
            )
          `,
            maskComposite: 'add',
            WebkitMaskComposite: 'add',
          } as React.CSSProperties
        }
      />
      {/* Corner SVGs at each intersection where borders connect - positioned more inside */}
      {/* Top-left corner - faces outward from top-left */}
      <CornerSVG
        className="absolute max-lg:z-10"
        style={{
          left: `${isLg ? borderWidth - 2 : 4}px`,
          top: `${isLg ? borderWidth - 2 : 65.7}px`,
          width: `${isLg ? borderWidth : borderWidth + 24}px`,
          height: `${isLg ? borderWidth : borderWidth + 24}px`,
          transform: 'rotate(180deg)',
        }}
      />
      {/* Top-right corner - faces outward from top-right */}
      <CornerSVG
        className="absolute"
        style={{
          right: `${isLg ? borderWidth - 2 : 4}px`,
          top: `${isLg ? borderWidth - 2 : 3.3}px`,
          width: `${isLg ? borderWidth : borderWidth + 26}px`,
          height: `${isLg ? borderWidth : borderWidth + 26}px`,
          transform: 'rotate(-90deg)',
        }}
      />
      {/* Bottom-left corner - faces outward from bottom-left */}
      <CornerSVG
        className="absolute"
        style={{
          left: `${isLg ? borderWidth - 2 : 4}px`,
          bottom: `${isLg ? bottomHeight - 2 : bottomHeight - 1}px`,
          width: `${isLg ? borderWidth : borderWidth + 26}px`,
          height: `${isLg ? borderWidth : borderWidth + 26}px`,
          transform: 'rotate(90deg)',
        }}
      />
      {/* Bottom-right corner - faces outward from bottom-right */}
      <CornerSVG
        className="absolute"
        style={{
          right: `${isLg ? borderWidth - 2 : 4}px`,
          bottom: `${isLg ? bottomHeight - 2 : bottomHeight - 1}px`,
          width: `${isLg ? borderWidth : borderWidth + 26}px`,
          height: `${isLg ? borderWidth : borderWidth + 26}px`,
          transform: 'rotate(0deg)',
        }}
      />
      {/* Logo at top center */}
      <div
        className="bg-bgPrimary absolute left-0 z-3 flex w-38 translate-x-[4px] items-center justify-center border-t-transparent max-lg:border-l-0 lg:left-1/2 lg:w-48 lg:-translate-x-1/2 lg:border-[3px]"
        style={{
          top: `${isLg ? borderWidth - borderSize - 1 : borderWidth - borderSize}px`,
        }}
      >
        <img
          id="home-sticky-logo"
          src={logoImg}
          alt="Logo"
          className="mt-1 mb-2 block h-full max-h-9/10 w-full max-w-8/10 object-contain lg:-mt-4 lg:max-w-34"
        />

        {/* Corner SVGs at all corners of logo container */}

        <svg
          className="desktop-logo-corner absolute -z-2 hidden lg:block"
          style={{
            right: `-50%`,
            bottom: `-9%`,
            width: `200%`,
            height: `110%`,
            transform: 'rotate(0deg)',
          }}
          xmlns="http://www.w3.org/2000/svg"
          width="348"
          height="79"
          viewBox="0 0 348 79"
          fill="none"
        >
          <defs>
            <clipPath id="clip-top-stroke">
              <rect x="0" y="2.5" width="348" height="76.5" />
            </clipPath>
          </defs>
          <mask id="path-1-inside-1_2947_42" fill="white">
            <path d="M29.4995 0.5H318.119V53.1812C318.119 66.9883 306.926 78.1812 293.119 78.1812H54.4995C40.6924 78.1812 29.4995 66.9883 29.4995 53.1812V0.5Z" />
          </mask>
          <path
            d="M29.4995 0.5H318.119V53.1812C318.119 66.9883 306.926 78.1812 293.119 78.1812H54.4995C40.6924 78.1812 29.4995 66.9883 29.4995 53.1812V0.5Z"
            fill="black"
            stroke="white"
            clipPath="url(#clip-top-stroke)"
          />
          <path
            d="M29.4995 0.5H318.119H29.4995ZM319.119 53.1812C319.119 67.5406 307.478 79.1812 293.119 79.1812H54.4995C40.1401 79.1812 28.4995 67.5406 28.4995 53.1812H30.4995C30.4995 66.436 41.2447 77.1812 54.4995 77.1812H293.119C306.373 77.1812 317.119 66.436 317.119 53.1812H319.119ZM54.4995 79.1812C40.1401 79.1812 28.4995 67.5406 28.4995 53.1812V0.5H30.4995V53.1812C30.4995 66.436 41.2447 77.1812 54.4995 77.1812V79.1812ZM319.119 0.5V53.1812C319.119 67.5406 307.478 79.1812 293.119 79.1812V77.1812C306.373 77.1812 317.119 66.436 317.119 53.1812V0.5H319.119Z"
            fill="white"
            mask="url(#path-1-inside-1_2947_42)"
          />
          <path
            d="M317.641 30.5L304.706 30.5L304.706 0.500057L347.641 0.500001C347.641 0.500001 334.711 2.02764 326.604 9.346C318.497 16.6644 317.641 30.5 317.641 30.5Z"
            fill="black"
          />
          <path
            d="M317.641 30.5C317.641 13.9315 331.072 0.5 347.641 0.5"
            stroke="white"
          />
          <path
            d="M29.9998 30.5L42.9346 30.5L42.9346 0.500057L-0.000168204 0.500001C-0.000168204 0.500001 12.9295 2.02764 21.0364 9.346C29.1433 16.6644 29.9998 30.5 29.9998 30.5Z"
            fill="black"
          />
          <path
            d="M30 30.5C30 13.9315 16.5685 0.5 -3.57746e-07 0.5"
            stroke="white"
          />
        </svg>

        <svg
          className="desktop-logo-corner absolute -z-2 block lg:hidden"
          style={{
            right: `-20%`,
            bottom: `-47%`,
            width: `140%`,
            height: `160%`,
            transform: 'rotate(0deg)',
          }}
          xmlns="http://www.w3.org/2000/svg"
          width="170"
          height="82"
          viewBox="0 0 170 82"
          fill="none"
        >
          <mask id="path-1-inside-1_211_38" fill="white">
            <path d="M0 0.0107422H146.777V38.5029C146.777 49.5486 137.823 58.5029 126.777 58.5029H0V0.0107422Z" />
          </mask>
          <path
            d="M0 0.0107422H146.777V38.5029C146.777 49.5486 137.823 58.5029 126.777 58.5029H0V0.0107422Z"
            fill="black"
          />
          <path
            d="M0 0.0107422H146.777H0ZM147.777 38.5029C147.777 50.1009 138.375 59.5029 126.777 59.5029H0V57.5029H126.777C137.271 57.5029 145.777 48.9963 145.777 38.5029H147.777ZM0 58.5029V0.0107422V58.5029ZM147.777 0.0107422V38.5029C147.777 50.1009 138.375 59.5029 126.777 59.5029V57.5029C137.271 57.5029 145.777 48.9963 145.777 38.5029V0.0107422H147.777Z"
            fill="white"
            mask="url(#path-1-inside-1_211_38)"
          />
          <path
            d="M146.275 30.8965L136.123 30.8965L136.123 0L169.823 4.01869e-07L169.822 7.34961C169.822 7.34961 159.674 8.54864 153.311 14.2928C146.948 20.037 146.275 30.8965 146.275 30.8965Z"
            fill="black"
          />
          <path
            d="M146.277 30.8965C146.277 17.8919 156.82 7.34961 169.824 7.34961"
            stroke="white"
          />
          <path
            d="M10.1532 81.5498L0.000781626 81.5498L4.01888e-07 54.5305L33.7001 54.5305L33.7001 58.0029C33.7001 58.0029 23.5516 59.202 17.1886 64.9461C10.8255 70.6903 10.1532 81.5498 10.1532 81.5498Z"
            fill="black"
          />
          <path
            d="M10.1543 81.5498C10.1543 68.5452 20.6966 58.0029 33.7012 58.0029"
            stroke="white"
          />
        </svg>
      </div>
      <Calendar />
    </section>
  );
};

export default HomeSticky;
