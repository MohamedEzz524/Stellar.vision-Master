import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Project } from './ProjectsSection';
import './ProjectsSection.css';

gsap.registerPlugin(ScrollTrigger);

interface ProjectsSectionDesktopProps {
  projects: Project[];
  sectionId?: string;
}

// Corner SVG Component
const CornerSVG = ({
  className,
  uniqueId,
}: {
  className: string;
  uniqueId?: string;
}) => {
  const cornerType = className.replace('corner ', '').trim();
  const filterId = `filter-${cornerType}-${uniqueId || Math.random().toString(36).substr(2, 9)}`;

  const paths = {
    first: 'M7 21V7H21',
    second: 'M20 21V7H6',
    third: 'M7 6V20H21',
    fourth: 'M20 6V20H6',
  };

  const offsets = {
    first: { x: '0.25', y: '0.25' },
    second: { x: '0', y: '0.25' },
    third: { x: '0.25', y: '0' },
    fourth: { x: '0', y: '0' },
  };

  const path = paths[cornerType as keyof typeof paths] || paths.first;
  const offset = offsets[cornerType as keyof typeof offsets] || offsets.first;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      viewBox="0 0 31 31"
      fill="none"
      className={className}
    >
      <g filter={`url(#${filterId})`}>
        <path d={path} stroke="#fff" strokeWidth="1.5" />
      </g>
      <defs>
        <filter
          id={filterId}
          x={offset.x}
          y={offset.y}
          width="30.75"
          height="30.75"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dx="2" dy="2" />
          <feGaussianBlur stdDeviation="4" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0.458824 0 0 0 0 1 0 0 0 1 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_8375_688"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_8375_688"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
};

// Desktop ProjectsSection Component
const ProjectsSectionDesktop = ({
  projects,
  sectionId = 'works',
}: ProjectsSectionDesktopProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Calculate initial positions for each card
  const getInitialTransform = (index: number) => {
    const positions = [
      { translate: 'translate(-42%, -80%)', z: 10 },
      { translate: 'translate(-50%, -70%)', z: -170 },
      { translate: 'translate(80%, -50%)', z: -350 },
      { translate: 'translate(-105%, 30%)', z: -530 },
      { translate: 'translate(140%, 50%)', z: -710 },
      { translate: 'translate(-75%, 80%)', z: -890 },
      { translate: 'translate(-110%, -80%)', z: -1070 },
      { translate: 'translate(100%, -50%)', z: -1250 },
      { translate: 'translate(-70%, -40%)', z: -1430 },
      { translate: 'translate(-60%, 20%)', z: -1610 },
      { translate: 'translate(80%, 0%)', z: -1790 },
    ];

    const pos = positions[index] || {
      translate: `translate(${Math.random() * 200 - 100}%, ${Math.random() * 200 - 100}%)`,
      z: -180 * (index + 1),
    };

    return { translate: pos.translate, z: pos.z };
  };

  // Calculate opacity and blur based on z position
  const getOpacityAndBlur = (z: number) => {
    let opacity: number;
    let blur: number;

    if (z >= 0) {
      opacity = 1 + (z - 10) * 0.00067;
      blur = 0;
    } else {
      const absZ = Math.abs(z);
      const zOffset = absZ - 10;
      opacity = Math.max(0, 1 - (zOffset / 180) * 0.1307);
      blur = Math.max(0, (zOffset / 180) * 1.63636);
    }

    return { opacity, blur };
  };

  // GSAP ScrollTrigger setup
  useEffect(() => {
    if (!sectionRef.current || !trackRef.current || !stickyRef.current) {
      return;
    }

    const track = trackRef.current;
    const stickyElement = stickyRef.current;

    // Calculate track height dynamically
    const baseHeightPerProject = 37.5; // 412.5vh / 11 projects
    const trackHeight = projects.length * baseHeightPerProject;
    track.style.height = `${trackHeight + 75}vh`;

    // Calculate scroll distance in pixels (track height in vh converted to px)
    const scrollDistance =
      (trackHeight * window.innerHeight - window.innerWidth * 0.5) / 100;

    // Pre-calculate initial transforms for all cards
    const cardTransforms = projects.map((_, index) =>
      getInitialTransform(index),
    );

    // Calculate the maximum z-offset needed to move all cards out of view
    // Last card (index 10) starts at z: -1790, we want it to move forward enough
    // For 11 projects, we need scrollForwardDistance to move last card to positive z (out of view)
    const lastCardInitialZ =
      cardTransforms[cardTransforms.length - 1]?.z || -1790;
    const maxScrollForwardDistance = Math.abs(lastCardInitialZ) + 200; // Add 200px buffer to ensure cards go out of view

    // Create a single ScrollTrigger that pins the sticky element and updates all cards
    const scrollTrigger = ScrollTrigger.create({
      trigger: stickyElement,
      start: 'top 10%',
      end: `+=${scrollDistance}px`,
      pin: stickyElement,
      pinSpacing: true,
      scrub: true,
      onUpdate: (self) => {
        const progress = self.progress;
        const scrollForwardDistance = progress * maxScrollForwardDistance;

        cardRefs.current.forEach((card, index) => {
          if (!card || index >= cardTransforms.length) return;

          const { translate, z: cardZOffset } = cardTransforms[index];
          const finalZ = cardZOffset + scrollForwardDistance;
          const { opacity, blur } = getOpacityAndBlur(finalZ);
          const transform = `${translate} translate3d(0px, 0px, ${finalZ}px)`;

          card.style.opacity = opacity.toString();
          card.style.filter = `blur(${blur}px)`;
          card.style.transform = transform;
        });
      },
    });

    return () => {
      scrollTrigger.kill();
    };
  }, [projects]);

  // Calculate track height for CSS (static value)
  const baseHeightPerProject = 37.5;
  const trackHeight = projects.length * baseHeightPerProject;

  return (
    <section
      id={sectionId}
      ref={sectionRef}
      className="section cc--clipx cc--cases"
    >
      <div className="container mt-20" style={{ opacity: 1 }}>
        <div
          ref={trackRef}
          className="cases-track"
          style={{ height: `${trackHeight}vh` }}
        >
          <div ref={stickyRef} className="sticky-full-screen w-dyn-list">
            <div
              role="list"
              className="cases-wr w-dyn-items"
              style={{ perspective: '200px' }}
            >
              {projects.map((project, index) => {
                const initialTransform = getInitialTransform(index);
                const isExternalLink = project.href.startsWith('http');

                // Set initial styles for desktop
                const initialZ = initialTransform.z;
                const { opacity, blur } = getOpacityAndBlur(initialZ);
                const initialTransformValue = `${initialTransform.translate} translate3d(0px, 0px, ${initialZ}px)`;

                return (
                  <div
                    key={project.id}
                    ref={(el) => {
                      if (el) {
                        cardRefs.current[index] = el;
                      }
                    }}
                    role="listitem"
                    className="case w-dyn-item"
                    style={{
                      translate: 'none',
                      rotate: 'none',
                      scale: 'none',
                      opacity,
                      filter: `blur(${blur}px)`,
                      transform: initialTransformValue,
                    }}
                  >
                    {isExternalLink ? (
                      <a
                        href={project.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="case-wrapper w-inline-block"
                      >
                        <div className="case-img">
                          <div className="case-element">
                            <img
                              src={project.image}
                              loading="eager"
                              alt={project.imageAlt}
                              title={project.imageAlt}
                              sizes="100vw"
                              className="case-embed"
                            />
                            {project.video && (
                              <div className="w-condition-invisible">
                                <video
                                  loop
                                  muted
                                  autoPlay
                                  playsInline
                                  crossOrigin="anonymous"
                                  preload="metadata"
                                  className="case-embed"
                                >
                                  <source
                                    src={project.video}
                                    type="video/mp4"
                                  />
                                </video>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="case-text">
                          <div className="flex-sides">
                            <div className="additional-text">
                              {project.tags}
                            </div>
                            <div className="additional-text case-year">
                              {project.year}
                            </div>
                          </div>
                          <h3 className="p-large case-heading">
                            {project.title}
                          </h3>
                        </div>
                      </a>
                    ) : (
                      <Link
                        to={project.href}
                        className="case-wrapper w-inline-block"
                      >
                        <div className="case-img">
                          <div className="case-element">
                            <img
                              src={project.image}
                              loading="eager"
                              alt={project.imageAlt}
                              title={project.imageAlt}
                              sizes="100vw"
                              className="case-embed"
                            />
                            {project.video && (
                              <div className="w-condition-invisible">
                                <video
                                  loop
                                  muted
                                  autoPlay
                                  playsInline
                                  crossOrigin="anonymous"
                                  preload="metadata"
                                  className="case-embed"
                                >
                                  <source
                                    src={project.video}
                                    type="video/mp4"
                                  />
                                </video>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="case-text">
                          <div className="flex-sides">
                            <div className="additional-text">
                              {project.tags}
                            </div>
                            <div className="additional-text case-year">
                              {project.year}
                            </div>
                          </div>
                          <h3 className="p-large case-heading">
                            {project.title}
                          </h3>
                        </div>
                      </Link>
                    )}
                    <CornerSVG className="corner first" uniqueId={project.id} />
                    <CornerSVG
                      className="corner second"
                      uniqueId={project.id}
                    />
                    <CornerSVG className="corner third" uniqueId={project.id} />
                    <CornerSVG
                      className="corner fourth"
                      uniqueId={project.id}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProjectsSectionDesktop;
