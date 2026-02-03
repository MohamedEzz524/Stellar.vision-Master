import AnimatedTextRotation from '../../components/AnimatedTextRotation';
import AnimatedText from '../../components/AnimatedText';
import { texts, homeHeaderParagraphs } from '../../constants';

const HomeHeader = () => {
  return (
    <div className="home-header bg-bgPrimary border-border overflow-hidden border-t pt-8">
      <div className="container">
        <div className="text-textPrimary border-border flex flex-col justify-between gap-8 border-b px-4 pb-6 lg:flex-row lg:items-center lg:gap-4 lg:px-0">
          {/* Left */}
          <div className="text-sm md:text-sm lg:text-lg">
            <AnimatedText
              type="slide"
              className="block w-sm max-w-full lg:w-full lg:max-w-112"
              stagger={0.3}
              duration={0.7}
            >
              {homeHeaderParagraphs.first}
            </AnimatedText>
            <AnimatedText
              type="slide"
              className="block w-full max-w-110"
              stagger={0.3}
              duration={0.7}
            >
              {homeHeaderParagraphs.second}
            </AnimatedText>
          </div>
          {/* Right */}
          <div className="flex flex-1 flex-col items-end gap-4 text-right">
            <div className="flex items-start gap-4 lg:gap-8">
              <p className="text-lg lg:text-xl 2xl:text-2xl">WE DO</p>
              <AnimatedText
                type="flip"
                className="text-textPrimary/60 text-[2.5rem] leading-none font-semibold tracking-tight md:text-7xl lg:text-7xl lg:leading-24 2xl:text-9xl"
                stagger={0.08}
                duration={0.7}
              >
                IMMERSIVE
              </AnimatedText>
            </div>
            {/* Animated text */}
            <AnimatedTextRotation
              texts={texts}
              className="text-textPrimary relative h-12 w-full text-[2.5rem] font-semibold tracking-tight uppercase md:h-20 md:text-5xl lg:h-32 lg:text-6xl 2xl:text-8xl"
              initialDelay={1000}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeHeader;
