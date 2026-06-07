import { useMediaQuery } from 'react-responsive';
import logoImg from '../../assets/images/logo.svg';
import noiseImg from '../../assets/images/noise.webp';
import globalImage from '../../assets/images/global.webp';
import ScrollProgress from '../../components/ScrollProgress';
import Calendar from '../../components/Calendar';
import { autoRotateTexts } from '../../constants';

const HomeSticky = () => {
  // Responsive fade distance for the inner noise mask
  const isXl = useMediaQuery({ minWidth: 1280 });
  const isLg = useMediaQuery({ minWidth: 1024 });
  const fadeDistance = isXl ? 90 : isLg ? 70 : 40;

  // Frame dimensions. One source of truth for the rounded-rectangle "hole"
  // that defines the brutalist viewport. CSS reads these via custom properties.
  const frameSide = isLg ? 30 : 5;
  const frameTop = frameSide;
  const frameBottom = 80;
  const frameStroke = isLg ? 3 : 1;
  const frameRadius = isLg ? 24 : 10;

  const frameVars = {
    '--frame-top': `${frameTop}px`,
    '--frame-side': `${frameSide}px`,
    '--frame-bottom': `${frameBottom}px`,
    '--frame-radius': `${frameRadius}px`,
    '--frame-stroke': `${frameStroke}px`,
  } as React.CSSProperties;

  return (
    <section
      className="pointer-events-none fixed top-0 left-0 z-[9999] h-[100dvh] w-full"
      style={frameVars}
    >
      {/* Mobile-only top scrolling text strip */}
      <div
        className="absolute top-1 right-1 -z-1 flex h-16 w-[calc(100%-150px)] items-center pl-4 text-base text-white lg:hidden"
        style={{
          background:
            'linear-gradient(to bottom, #000 0%, #000 60%, rgba(0, 0, 0, 0.8) 75%, rgba(0, 0, 0, 0.6) 85%, rgba(0, 0, 0, 0.3) 92%, transparent 100%)',
        }}
      >
        <div className="relative h-full w-full">
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

      {/* Brutalist rounded frame — single element.
          A transparent rect with border-radius gets a white outline (the visible
          frame line) and a 100vmax outset box-shadow (the dark border extending
          to the viewport edges). The whole frame is ONE shape, so the inner
          corners are truly rounded — no stitched-together SVG approximations. */}
      <div className="brutalist-frame absolute inset-0" />

      {/* Noise glitch pattern inside the inner content area, clipped to the
          rounded shape so it doesn't poke out past the frame's inner corners. */}
      <div
        id="home-sticky-noise"
        className="noise-glitch-animation pointer-events-none absolute opacity-20"
        style={
          {
            left: `${frameSide}px`,
            right: `${frameSide}px`,
            top: `${frameTop}px`,
            bottom: `${frameBottom}px`,
            backgroundImage: `url(${noiseImg})`,
            backgroundRepeat: 'repeat',
            backgroundSize: 'auto',
            borderRadius: `${frameRadius}px`,
            overflow: 'hidden',
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

      {/* Bottom content row (sits over the bottom dark border region) */}
      <div
        className="absolute right-0 bottom-0 left-0 grid grid-cols-3 px-8 py-2.5"
        style={{ height: `${frameBottom}px` }}
      >
        {isLg && (
          <div
            id="home-sticky-bottom-left"
            className="relative flex h-full items-center gap-4"
          >
            {/* GLOBAL IMAGE */}
            <div className="globe-radar border-textPrimary relative w-14 overflow-hidden rounded-md border-3 p-1">
              <div className="flicker-animation relative h-full w-full">
                <img
                  src={globalImage}
                  alt="Global"
                  className="globe-img block"
                />
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
            <div className="marquee-shine border-textPrimary relative h-full w-[20vw] overflow-hidden rounded-md border-3">
              <div className="relative h-full w-full">
                <div
                  className="noise-glitch-slow-animation absolute inset-0 z-0"
                  style={{
                    backgroundImage: `url(${noiseImg})`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '100px 100px',
                  }}
                />
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

        <div />

        {isLg && (
          <div id="home-sticky-bottom-right">
            <ScrollProgress totalLeaves={16} />
          </div>
        )}
      </div>

      {/* Logo at top center.
          Top edge sits exactly at the frame line top, sides and bottom drawn
          in white at `frameStroke`, top border transparent so the frame line
          underneath shows uninterrupted. Top corners are SHARP — the logo's
          top edge welds onto the frame line. Bottom corners are rounded with
          `frameRadius` so the tab feels like a continuous piece of the frame. */}
      <div
        className="bg-bgPrimary absolute left-0 z-3 flex w-38 translate-x-[4px] items-center justify-center lg:left-1/2 lg:w-48 lg:-translate-x-1/2"
        style={{
          top: `${frameTop - frameStroke}px`,
          borderStyle: 'solid',
          borderColor: '#fff',
          borderWidth: `${frameStroke}px`,
          borderTopColor: 'transparent',
          borderLeftWidth: isLg ? `${frameStroke}px` : 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: `${frameRadius}px`,
          borderBottomRightRadius: `${frameRadius}px`,
        }}
      >
        <img
          id="home-sticky-logo"
          src={logoImg}
          alt="Logo"
          className="mt-1 mb-2 block h-full max-h-9/10 w-full max-w-8/10 object-contain lg:-mt-4 lg:max-w-34"
        />
      </div>
      <Calendar />
    </section>
  );
};

export default HomeSticky;
