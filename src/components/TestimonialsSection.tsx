import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { TestimonialVideos } from '../constants';
import './TestimonialsSection.css';
import { useMediaQuery } from 'react-responsive';
import arrowRightIcon from '../assets/arrow-right.svg';
import projectorImage from '../assets/images/projector.webp';
import firstFrameImage from '../assets/images/first_frame.webp'; // Add your first frame image

const TestimonialsSection = () => {
  const isLg = useMediaQuery({ minWidth: 1024 });

  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const currentIndexRef = useRef(0);
  const isInViewRef = useRef(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasUserStarted, setHasUserStarted] = useState(false);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;

      gsap.set(video, {
        opacity: index === currentIndexRef.current ? 1 : 0,
        zIndex: index === currentIndexRef.current ? 2 : 1,
      });
    });
  }, []);

  /* ----------------------------- Dimensions ----------------------------- */

  const getVideoWrapperDimensions = useCallback(() => {
    if (isLg) {
      return {
        width: Math.min(window.innerWidth * 0.23, 400),
        aspectRatio: 2 / 3.3,
      };
    }
    return {
      width: window.innerWidth * 0.9,
      aspectRatio: 2 / 2.5,
    };
  }, [isLg]);

  useEffect(() => {
    const update = () => {
      if (!videoWrapperRef.current) return;
      const { width, aspectRatio } = getVideoWrapperDimensions();
      videoWrapperRef.current.style.width = `${width}px`;
      videoWrapperRef.current.style.height = `${width / aspectRatio}px`;
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [getVideoWrapperDimensions]);

  /* ----------------------------- Initial Play ----------------------------- */

  const handleInitialPlay = useCallback(() => {
    if (hasUserStarted) return;

    setHasUserStarted(true);
    isInViewRef.current = true;

    const video = videoRefs.current[currentIndexRef.current];
    if (!video) return;

    video.muted = false;
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => {});
    });
  }, [hasUserStarted]);

  /* ----------------------------- Navigation ----------------------------- */

  const animateTransition = useCallback(
    (_direction: 'next' | 'prev', newIndex: number) => {
      if (isAnimating) return;

      const currentVideo = videoRefs.current[currentIndexRef.current];
      const nextVideo = videoRefs.current[newIndex];
      if (!currentVideo || !nextVideo) return;

      setIsAnimating(true);

      // Z-order
      currentVideo.style.zIndex = '2';
      nextVideo.style.zIndex = '3';

      // Prepare next
      gsap.set(nextVideo, { opacity: 0 });

      const tl = gsap.timeline({
        onComplete: () => {
          currentVideo.pause();
          gsap.set(currentVideo, { opacity: 0, zIndex: 1 });

          currentIndexRef.current = newIndex;
          setCurrentIndex(newIndex);

          nextVideo.muted = false;
          nextVideo.play().catch(() => {});
          gsap.set(nextVideo, { opacity: 1, zIndex: 2 });

          setIsAnimating(false);
        },
      });

      // Flicker twice
      tl.to(currentVideo, { opacity: 0, duration: 0.08 })
        .to(currentVideo, { opacity: 1, duration: 0.08 })
        .to(currentVideo, { opacity: 0, duration: 0.08 })
        .to(currentVideo, { opacity: 1, duration: 0.08 })
        // Final disappear
        .to(currentVideo, { opacity: 0, duration: 0.15 })
        // Fade in next
        .to(nextVideo, { opacity: 1, duration: 0.25 }, '-=0.1');
    },
    [isAnimating],
  );

  const navigate = useCallback(
    (dir: 'next' | 'prev') => {
      if (!hasUserStarted) return;

      const idx = currentIndexRef.current;
      const newIndex =
        dir === 'next'
          ? (idx + 1) % TestimonialVideos.length
          : (idx - 1 + TestimonialVideos.length) % TestimonialVideos.length;

      animateTransition(dir, newIndex);
    },
    [animateTransition, hasUserStarted],
  );

  /* ----------------------------- Observer ----------------------------- */

  useEffect(() => {
    if (!hasUserStarted) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isInViewRef.current = entry.isIntersecting;

        const video = videoRefs.current[currentIndexRef.current];
        if (!video) return;

        if (!entry.isIntersecting) video.pause();
        else video.play().catch(() => {});
      },
      { threshold: 0.5 },
    );

    if (videoWrapperRef.current) {
      observer.observe(videoWrapperRef.current);
    }

    return () => observer.disconnect();
  }, [hasUserStarted]);

  /* ----------------------------- Navigation UI ----------------------------- */

  const navigationButtons = useMemo(
    () =>
      hasUserStarted && (
        <div className="testimonials-navigation-overlay">
          <div
            className="testimonials-nav-area testimonials-nav-left"
            onClick={() => navigate('prev')}
          >
            <img
              src={arrowRightIcon}
              className="testimonials-nav-arrow testimonials-nav-arrow-left"
              alt="Previous testimonial"
            />
          </div>
          <div
            className="testimonials-nav-area testimonials-nav-right"
            onClick={() => navigate('next')}
          >
            <img
              src={arrowRightIcon}
              className="testimonials-nav-arrow testimonials-nav-arrow-right"
              alt="Next testimonial"
            />
          </div>
        </div>
      ),
    [navigate, hasUserStarted],
  );

  /* ----------------------------- Render ----------------------------- */

  return (
    <section className="testimonials-section">
      <div className="testimonials-container container">
        <div className="testimonials-projector-wrapper">
          <div className="testimonials-projector-side">
            <img
              src={projectorImage}
              className="testimonials-projector-img testimonials-projector-left"
              alt=""
            />
          </div>

          <div className="testimonials-video-container">
            <div ref={videoWrapperRef} className="testimonials-video-wrapper">
              {/* First Frame Image - Shows before play */}
              {!hasUserStarted && (
                <>
                  <img
                    src={firstFrameImage}
                    className="testimonial-first-frame"
                    alt="Testimonial preview"
                  />
                  <div
                    className="testimonials-play-overlay"
                    onClick={handleInitialPlay}
                  >
                    <span
                      className="testimonials-play-button"
                      title="Play testimonials"
                    ></span>
                  </div>
                </>
              )}

              {/* Videos - Hidden until play starts */}
              {TestimonialVideos.map((item, index) => (
                <video
                  key={item.id}
                  ref={(el) => {
                    if (el) videoRefs.current[index] = el;
                  }}
                  className="testimonial-video"
                  src={item.video}
                  loop
                  playsInline
                  preload="auto"
                  muted={index !== currentIndex}
                  style={{
                    opacity: index === currentIndex ? 1 : 0,
                    zIndex: index === currentIndex ? 2 : 1,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="testimonials-projector-side">
            <img
              src={projectorImage}
              className="testimonials-projector-img testimonials-projector-right"
              alt=""
            />
          </div>
        </div>

        {navigationButtons}
      </div>
    </section>
  );
};

export default TestimonialsSection;
