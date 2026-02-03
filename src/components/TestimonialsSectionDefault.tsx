import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { gsap } from 'gsap';
import { TestimonialVideos } from '../constants';
import './TestimonialsSection.css';
import { useMediaQuery } from 'react-responsive';
import arrowRightIcon from '../assets/arrow-right.svg';

const INITIAL_INDEX = Math.ceil(TestimonialVideos.length / 2);

const TestimonialsSection = () => {
  const isLg = useMediaQuery({ minWidth: 1024 });
  const sliderRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [currentIndex, setCurrentIndex] = useState(INITIAL_INDEX);
  const [videoLoadingStates, setVideoLoadingStates] = useState<boolean[]>(() =>
    new Array(TestimonialVideos.length).fill(false),
  );

  const isAnimatingRef = useRef(false);
  const isInitializedRef = useRef(false);
  const currentIndexRef = useRef(INITIAL_INDEX);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const videoLoadedRef = useRef<boolean[]>(
    new Array(TestimonialVideos.length).fill(false),
  );
  const videoLoadingRef = useRef<boolean[]>(
    new Array(TestimonialVideos.length).fill(false),
  );
  const hasLoadedIndex0Ref = useRef(false);

  const getCardDimensions = useCallback(() => {
    const gap = isLg ? window.innerWidth * 0.06 : 10;
    const widthPercentage = isLg ? 33 : 55;
    const cardWidth = (window.innerWidth * widthPercentage) / 100;
    return { cardWidth, gap };
  }, [isLg]);

  const getCardHeight = useCallback(
    (cardWidth: number, isActive: boolean = false) => {
      const baseAspectRatio = isLg ? 1 : 9 / 16;
      const aspectRatio =
        !isLg && isActive ? baseAspectRatio / 1.1 : baseAspectRatio;
      return cardWidth / aspectRatio;
    },
    [isLg],
  );

  const getSliderPositionForCard = useCallback(
    (cardIndex: number) => {
      const { cardWidth, gap } = getCardDimensions();
      const viewportWidth = window.innerWidth;
      const centerX = viewportWidth / 2 - cardWidth / 2;
      const offset = cardWidth + gap;
      const totalCardsWidth =
        TestimonialVideos.length * cardWidth +
        (TestimonialVideos.length - 1) * gap;
      const containerOffset = (viewportWidth - totalCardsWidth) / 2;
      return centerX - containerOffset - cardIndex * offset;
    },
    [getCardDimensions],
  );

  useEffect(() => {
    if (!sliderRef.current) return;

    const updateSlider = () => {
      const { cardWidth, gap } = getCardDimensions();

      cardRefs.current.forEach((card, index) => {
        if (card) {
          const isActive = index === currentIndex;
          card.style.width = `${cardWidth}px`;
          card.style.height = `${getCardHeight(cardWidth, isActive)}px`;
          card.style.marginRight =
            index < TestimonialVideos.length - 1 ? `${gap}px` : '0';
        }
      });

      if (!isInitializedRef.current && sliderRef.current) {
        requestAnimationFrame(() => {
          if (sliderRef.current) {
            const startPosition = getSliderPositionForCard(INITIAL_INDEX);
            gsap.set(sliderRef.current, { x: startPosition });
            isInitializedRef.current = true;
            setCurrentIndex(INITIAL_INDEX);
            currentIndexRef.current = INITIAL_INDEX;
          }
        });
      }
    };

    updateSlider();
    window.addEventListener('resize', updateSlider);
    return () => window.removeEventListener('resize', updateSlider);
  }, [
    getSliderPositionForCard,
    getCardDimensions,
    getCardHeight,
    currentIndex,
  ]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const navigate = useCallback(
    (direction: 'prev' | 'next') => {
      if (isAnimatingRef.current || !sliderRef.current) return;

      isAnimatingRef.current = true;
      const currentIdx = currentIndexRef.current;
      const newIndex =
        direction === 'next'
          ? (currentIdx + 1) % TestimonialVideos.length
          : (currentIdx - 1 + TestimonialVideos.length) %
            TestimonialVideos.length;

      gsap.to(sliderRef.current, {
        x: getSliderPositionForCard(newIndex),
        duration: 0.6,
        ease: 'power2.inOut',
        onComplete: () => {
          isAnimatingRef.current = false;
          setCurrentIndex(newIndex);
        },
      });
    },
    [getSliderPositionForCard],
  );

  const updateVideoLoadingState = useCallback(
    (index: number, isLoading: boolean) => {
      videoLoadingRef.current[index] = isLoading;
      setVideoLoadingStates((prev) => {
        const newStates = [...prev];
        newStates[index] = isLoading;
        return newStates;
      });
    },
    [],
  );

  const loadVideoIfNeeded = useCallback(
    (index: number) => {
      const video = videoRefs.current[index];
      if (
        !video ||
        videoLoadedRef.current[index] ||
        videoLoadingRef.current[index]
      )
        return;

      updateVideoLoadingState(index, true);
      video.load();
    },
    [updateVideoLoadingState],
  );

  useEffect(() => {
    loadVideoIfNeeded(currentIndex);
    const prevIndex =
      (currentIndex - 1 + TestimonialVideos.length) % TestimonialVideos.length;
    const nextIndex = (currentIndex + 1) % TestimonialVideos.length;
    loadVideoIfNeeded(prevIndex);
    loadVideoIfNeeded(nextIndex);
    // Ensure index 0 is loaded on initial mount to prevent stuck loading state
    if (!hasLoadedIndex0Ref.current && currentIndex !== 0) {
      loadVideoIfNeeded(0);
      hasLoadedIndex0Ref.current = true;
    }
  }, [currentIndex, loadVideoIfNeeded]);

  const playActiveVideo = useCallback((index: number) => {
    const video = videoRefs.current[index];
    if (
      video &&
      videoLoadedRef.current[index] &&
      video.readyState >= 2 &&
      video.paused
    ) {
      video.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;

      if (index === currentIndex) {
        playActiveVideo(index);
      } else {
        if (!video.paused) video.pause();
        if (video.currentTime > 0) video.currentTime = 0;
      }
    });
  }, [currentIndex, playActiveVideo]);

  useEffect(() => {
    if (!videoRefs.current.length) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          const videoIndex = videoRefs.current.indexOf(video);
          const isActive = videoIndex === currentIndexRef.current;

          if (entry.intersectionRatio < 0.5) {
            if (!video.paused) video.pause();
          } else if (
            isActive &&
            videoLoadedRef.current[videoIndex] &&
            video.readyState >= 2 &&
            video.paused
          ) {
            video.play().catch(() => {});
          } else if (!isActive && !video.paused) {
            video.pause();
            if (video.currentTime > 0) video.currentTime = 0;
          }
        });
      },
      { threshold: [0, 0.5, 1], rootMargin: '0px' },
    );

    videoRefs.current.forEach((video) => {
      if (video) observerRef.current?.observe(video);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const handleVideoLoaded = useCallback(
    (index: number) => {
      videoLoadedRef.current[index] = true;
      updateVideoLoadingState(index, false);
      if (index === currentIndexRef.current) {
        playActiveVideo(index);
      }
    },
    [updateVideoLoadingState, playActiveVideo],
  );

  const handleVideoLoadStart = useCallback(
    (index: number) => {
      if (!videoLoadingRef.current[index]) {
        updateVideoLoadingState(index, true);
      }
    },
    [updateVideoLoadingState],
  );

  const handleVideoPlay = useCallback((index: number) => {
    if (index !== currentIndexRef.current) {
      const video = videoRefs.current[index];
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    }
  }, []);

  const navigationButtons = useMemo(
    () => (
      <div className="testimonials-navigation-overlay">
        <div
          className="testimonials-nav-area testimonials-nav-left"
          onClick={() => navigate('prev')}
          aria-label="Previous testimonial"
        >
          <img
            src={arrowRightIcon}
            alt="Previous"
            className="testimonials-nav-arrow testimonials-nav-arrow-left relative -left-15"
          />
        </div>
        <div
          className="testimonials-nav-area testimonials-nav-right"
          onClick={() => navigate('next')}
          aria-label="Next testimonial"
        >
          <img
            src={arrowRightIcon}
            alt="Next"
            className="testimonials-nav-arrow testimonials-nav-arrow-right relative -right-15"
          />
        </div>
      </div>
    ),
    [navigate],
  );

  return (
    <section className="testimonials-section">
      <div className="testimonials-container">
        <div className="testimonials-slider-wrapper">
          <div ref={sliderRef} className="testimonials-slider">
            {TestimonialVideos.map((testimonial, index) => (
              <div
                key={testimonial.id}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
                className="testimonial-card"
              >
                <div className="testimonial-video-wrapper">
                  {videoLoadingStates[index] && (
                    <div className="testimonial-video-preloader">
                      <div className="testimonial-preloader-spinner"></div>
                    </div>
                  )}
                  <video
                    ref={(el) => {
                      videoRefs.current[index] = el;
                    }}
                    className="testimonial-video"
                    src={testimonial.video}
                    loop
                    playsInline
                    preload="none"
                    onLoadStart={() => handleVideoLoadStart(index)}
                    onLoadedData={() => handleVideoLoaded(index)}
                    onCanPlay={() => handleVideoLoaded(index)}
                    onError={() => {
                      videoLoadedRef.current[index] = true;
                      updateVideoLoadingState(index, false);
                    }}
                    onPlay={() => handleVideoPlay(index)}
                  />
                </div>
              </div>
            ))}
          </div>
          {navigationButtons}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
