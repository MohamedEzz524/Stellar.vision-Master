import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import type { Project } from './ProjectsSection';
import './ProjectsSectionMobile.css';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

interface ProjectsSectionMobileProps {
  projects: Project[];
  sectionId?: string;
}

// Constants for particle system
const PARTICLES_GRID_SIZE = 40; // 40x40 = 1600 particles per card
const MAX_SCATTER_DISTANCE = 10;
const CARD_HORIZONTAL_PADDING = 1.5; // Padding on left and right (in Three.js units)

const ProjectsSectionMobile = ({
  projects,
  sectionId = 'works-mobile',
}: ProjectsSectionMobileProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cardsSceneRef = useRef<THREE.Scene | null>(null);
  const cardsCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cardsMeshesRef = useRef<THREE.Mesh[]>([]);
  const cardsParticlesRef = useRef<THREE.Points[]>([]);
  const cardTexturesRef = useRef<THREE.Texture[]>([]);
  // Add new state for info visibility
  const [isInfoVisible, setIsInfoVisible] = useState(false);
  const infoContainerRef = useRef<HTMLDivElement>(null);
  const cardParticlePositionsRef = useRef<
    Array<{
      positions: THREE.BufferAttribute;
      originalPositions: Float32Array;
      scatterDirections: Float32Array;
      opacity: number;
    }>
  >([]);
  const animationFrameRef = useRef<number | null>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const updateCardsAnimationRef = useRef<((progress: number) => void) | null>(
    null,
  );
  const activeCardIndexRef = useRef<number | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);
  const navigationButtonsRef = useRef<HTMLDivElement>(null);

  const lerp = (start: number, end: number, t: number) =>
    start + (end - start) * t;

  // Initialize Three.js scene
  useEffect(() => {
    if (!sectionRef.current) return;

    const cardsScene = new THREE.Scene();
    cardsSceneRef.current = cardsScene;

    const cardsCamera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    cardsCamera.position.setZ(20);
    cardsCameraRef.current = cardsCamera;

    const cardsRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    cardsRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    cardsRenderer.setSize(window.innerWidth, window.innerHeight);
    cardsRenderer.setClearColor(0x000000, 0);
    cardsRenderer.domElement.id = 'cards-canvas';
    cardsRendererRef.current = cardsRenderer;

    sectionRef.current.appendChild(cardsRenderer.domElement);

    return () => {
      cardsRenderer.dispose();
      cardsScene.clear();
    };
  }, []);

  // Load images and create individual card meshes
  useEffect(() => {
    if (!projects || !projects.length || !cardsSceneRef.current) {
      console.warn('ProjectsSectionMobile: No projects data provided');
      return;
    }

    const loadImage = (url: string): Promise<THREE.Texture> =>
      new Promise((resolve, reject) => {
        new THREE.TextureLoader().load(
          url,
          (loadedTexture) => {
            loadedTexture.generateMipmaps = true;
            loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
            loadedTexture.magFilter = THREE.LinearFilter;
            loadedTexture.anisotropy =
              cardsRendererRef.current?.capabilities.getMaxAnisotropy() || 16;
            loadedTexture.colorSpace = THREE.SRGBColorSpace; // <--- critical
            resolve(loadedTexture);
          },
          undefined,
          (error) => reject(error),
        );
      });

    // Load all project images
    const imagePromises = projects
      .filter((p) => p && p.image)
      .map((p) => loadImage(p.image));

    Promise.all(imagePromises).then((textures) => {
      cardTexturesRef.current = textures;
      const meshes: THREE.Mesh[] = [];
      const particles: THREE.Points[] = [];
      const particleData: Array<{
        positions: THREE.BufferAttribute;
        originalPositions: Float32Array;
        scatterDirections: Float32Array;
        opacity: number;
      }> = [];

      // Shader for texture-based particles
      const particleVertexShader = `
        attribute float opacity;
        varying float vOpacity;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 3.0 * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `;

      const particleFragmentShader = `
        uniform sampler2D uTexture;
        varying float vOpacity;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(uTexture, vUv);
          color.a *= vOpacity;
          if (color.a < 0.01) discard;
          gl_FragColor = color;
        }
      `;

      // Create particle system for each card
      textures.forEach((texture, textureIndex) => {
        // Set z-position based on index: newer cards (higher index) are in front
        // Use small increments to avoid depth fighting while ensuring proper layering
        const zOffset = textureIndex * 0.01;

        // Reduce card width to add padding on left and right
        const cardWidth = 12 - CARD_HORIZONTAL_PADDING * 2;
        const cardHeight = 16;
        const image = texture.image;
        if (!(image instanceof HTMLImageElement)) return;
        const aspectRatio = image.width / image.height;
        const adjustedWidth =
          aspectRatio > cardWidth / cardHeight
            ? cardWidth
            : cardHeight * aspectRatio;
        const adjustedHeight =
          aspectRatio > cardWidth / cardHeight
            ? cardWidth / aspectRatio
            : cardHeight;

        // Create normal mesh for high-quality display
        const meshGeometry = new THREE.PlaneGeometry(
          adjustedWidth,
          adjustedHeight,
        );
        const meshMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 1,
          depthTest: true,
          depthWrite: true,
        });
        const cardMesh = new THREE.Mesh(meshGeometry, meshMaterial);
        cardMesh.position.set(0, -12, zOffset);
        cardMesh.scale.set(0.8, 0.8, 1);
        cardMesh.rotation.set(0, 0, 0);
        // Set renderOrder: higher index = higher renderOrder (renders last = on top)
        cardMesh.renderOrder = textureIndex;
        cardMesh.visible = true;
        cardsSceneRef.current?.add(cardMesh);
        meshes.push(cardMesh);

        // Create grid of particles
        const particleCount = PARTICLES_GRID_SIZE * PARTICLES_GRID_SIZE;
        const positions = new Float32Array(particleCount * 3);
        const uvs = new Float32Array(particleCount * 2);
        const opacities = new Float32Array(particleCount);
        const scatterDirections = new Float32Array(particleCount * 3);

        // Generate particle grid
        const gridStepX = adjustedWidth / PARTICLES_GRID_SIZE;
        const gridStepY = adjustedHeight / PARTICLES_GRID_SIZE;
        const startX = -adjustedWidth / 2;
        const startY = adjustedHeight / 2;

        for (let i = 0; i < PARTICLES_GRID_SIZE; i++) {
          for (let j = 0; j < PARTICLES_GRID_SIZE; j++) {
            const index = i * PARTICLES_GRID_SIZE + j;
            const x = startX + j * gridStepX + gridStepX / 2;
            const y = startY - i * gridStepY - gridStepY / 2;

            positions[index * 3] = x;
            positions[index * 3 + 1] = y;
            positions[index * 3 + 2] = 0;

            // UV coordinates (flip V to match PlaneGeometry orientation)
            uvs[index * 2] = (j + 0.5) / PARTICLES_GRID_SIZE;
            uvs[index * 2 + 1] = 1.0 - (i + 0.5) / PARTICLES_GRID_SIZE;

            opacities[index] = 0;

            // Random scatter direction (spherical coordinates)
            const angle1 = Math.random() * Math.PI * 2;
            const angle2 = Math.random() * Math.PI * 2;
            scatterDirections[index * 3] = Math.cos(angle1) * Math.sin(angle2);
            scatterDirections[index * 3 + 1] =
              Math.sin(angle1) * Math.sin(angle2);
            scatterDirections[index * 3 + 2] = Math.cos(angle2);
          }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          'position',
          new THREE.BufferAttribute(positions, 3),
        );
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geometry.setAttribute(
          'opacity',
          new THREE.BufferAttribute(opacities, 1),
        );

        const material = new THREE.ShaderMaterial({
          vertexShader: particleVertexShader,
          fragmentShader: particleFragmentShader,
          uniforms: {
            uTexture: { value: texture },
          },
          transparent: true,
          depthTest: true,
          depthWrite: false,
        });

        const points = new THREE.Points(geometry, material);
        // Start position: bottom center (below view)
        // Use same z-offset as corresponding mesh to maintain layering
        points.position.set(0, -12, zOffset);
        points.scale.set(0.8, 0.8, 1);
        points.rotation.set(0, 0, 0);
        // Set renderOrder: higher index = higher renderOrder (renders last = on top)
        points.renderOrder = textureIndex;
        points.visible = false; // Hidden initially, only show during scatter phase
        cardsSceneRef.current?.add(points);
        particles.push(points);

        // Store particle data for animation
        particleData.push({
          positions: geometry.attributes.position as THREE.BufferAttribute,
          originalPositions: new Float32Array(positions),
          scatterDirections,
          opacity: 0,
        });
      });

      cardsMeshesRef.current = meshes;
      cardsParticlesRef.current = particles;
      cardParticlePositionsRef.current = particleData;

      // Function to update card animations based on scroll progress
      const updateCardsAnimation = (scrollProgress: number) => {
        const numCards = meshes.length;
        if (numCards === 0) return;

        // Each card has: move phase (50%) + fade phase (50%)
        // Cards animate sequentially - next card starts only when previous finishes
        // Total progress per card: 50% move + 50% fade = 100%
        const movePhaseRatio = 0.5; // 50% of card's timeline to reach center
        const fadePhaseRatio = 0.5; // 50% of card's timeline to fade out at center
        const cardPhaseRatio = movePhaseRatio + fadePhaseRatio; // Total per card = 1.0
        const totalProgressNeeded = numCards * cardPhaseRatio;

        // Normalize progress to account for all cards
        const normalizedProgress = Math.min(
          scrollProgress * totalProgressNeeded,
          totalProgressNeeded,
        );

        // Track which card is currently active (centered and clickable)
        let newActiveCardIndex: number | null = null;
        let showInfo = false;

        // First pass: calculate each card's local progress
        const cardProgresses: number[] = [];
        meshes.forEach((_, index) => {
          const cardStartTime = index * cardPhaseRatio;
          const cardEndTime = cardStartTime + cardPhaseRatio;

          let localProgress = 0;
          if (
            normalizedProgress >= cardStartTime &&
            normalizedProgress <= cardEndTime
          ) {
            localProgress =
              (normalizedProgress - cardStartTime) / cardPhaseRatio;
          } else if (normalizedProgress > cardEndTime) {
            localProgress = 1;
          }
          cardProgresses[index] = localProgress;
        });

        meshes.forEach((mesh, index) => {
          const points = particles[index];
          const particleData = cardParticlePositionsRef.current[index];
          if (!particleData || !points) return;

          const localProgress = cardProgresses[index];
          // Show info when card reaches 30% of its move phase
          if (localProgress > 0.3 && localProgress <= 1) {
            showInfo = true;
          }
          const positions = particleData.positions.array as Float32Array;
          const originalPositions = particleData.originalPositions;
          const scatterDirections = particleData.scatterDirections;
          const opacityAttribute = (
            points.geometry.attributes.opacity as THREE.BufferAttribute
          ).array as Float32Array;
          const particleCount = originalPositions.length / 3;
          const meshMaterial = mesh.material as THREE.MeshBasicMaterial;

          // Check if next card exists and its progress
          const nextCardIndex = index + 1;
          const hasNextCard = nextCardIndex < numCards;
          const nextCardProgress = hasNextCard
            ? cardProgresses[nextCardIndex]
            : 0;
          const nextCardMoveProgress = hasNextCard
            ? nextCardProgress / movePhaseRatio
            : 0;

          // Threshold for when next card is "close enough" to trigger scatter
          // When next card reaches 40% of its move phase, start current card's scatter
          const nextCardTriggerThreshold = 0.4;

          // Maintain z-offset based on index (newer cards in front)
          const zOffset = index * 0.01;

          if (localProgress === 0) {
            // Before animation starts: hidden at bottom
            mesh.position.set(0, -12, zOffset);
            mesh.scale.set(0.8, 0.8, 1);
            mesh.rotation.set(0, 0, 0);
            mesh.visible = true;
            meshMaterial.opacity = 1;
            points.visible = false;
            points.position.set(0, -12, zOffset);
            points.scale.set(0.8, 0.8, 1);
            points.rotation.set(0, 0, 0);
            // Reset particles to original positions
            for (let i = 0; i < particleCount; i++) {
              positions[i * 3] = originalPositions[i * 3];
              positions[i * 3 + 1] = originalPositions[i * 3 + 1];
              positions[i * 3 + 2] = originalPositions[i * 3 + 2];
              opacityAttribute[i] = 0;
            }
            particleData.positions.needsUpdate = true;
            points.geometry.attributes.opacity.needsUpdate = true;
          } else if (localProgress <= movePhaseRatio) {
            // Moving phase: bottom to center with full opacity (use mesh for high quality)
            const moveProgress = localProgress / movePhaseRatio;
            mesh.position.set(0, lerp(-12, 0, moveProgress), zOffset);
            mesh.scale.set(0.8, 0.8, 1);
            mesh.rotation.set(0, 0, 0);
            mesh.visible = true;
            meshMaterial.opacity = 1;
            points.visible = false;
            // Keep particles in original positions for when we switch
            for (let i = 0; i < particleCount; i++) {
              positions[i * 3] = originalPositions[i * 3];
              positions[i * 3 + 1] = originalPositions[i * 3 + 1];
              positions[i * 3 + 2] = originalPositions[i * 3 + 2];
              opacityAttribute[i] = 1;
            }
            particleData.positions.needsUpdate = true;
            points.geometry.attributes.opacity.needsUpdate = true;
            // Card is active when it's past halfway to center (more visible)
            if (moveProgress > 0.5) {
              newActiveCardIndex = index;
            }
          } else {
            // After move phase: check if we should start fade/scatter
            // Start scatter only when next card has reached the trigger threshold
            // OR if this is the last card (no next card), start scatter immediately
            const shouldStartScatter =
              !hasNextCard || nextCardMoveProgress >= nextCardTriggerThreshold;

            if (!shouldStartScatter) {
              // Wait phase: stay at center, keep mesh visible, wait for next card
              mesh.position.set(0, 0, zOffset);
              mesh.scale.set(0.8, 0.8, 1);
              mesh.rotation.set(0, 0, 0);
              mesh.visible = true;
              meshMaterial.opacity = 1;
              points.visible = false;
              // Keep particles ready
              for (let i = 0; i < particleCount; i++) {
                positions[i * 3] = originalPositions[i * 3];
                positions[i * 3 + 1] = originalPositions[i * 3 + 1];
                positions[i * 3 + 2] = originalPositions[i * 3 + 2];
                opacityAttribute[i] = 1;
              }
              particleData.positions.needsUpdate = true;
              points.geometry.attributes.opacity.needsUpdate = true;
              // Card is active during wait phase
              newActiveCardIndex = index;
            } else {
              // Fade phase: stay at center, switch to particles and scatter
              // Calculate fade progress based on next card's progress
              let fadeProgress = 0;
              if (hasNextCard) {
                // Scatter starts when next card reaches threshold (40% of move)
                // Scatter completes when next card reaches center (100% of move)
                // Map next card's progress from threshold to center (0.4 to 1.0) to fade progress (0 to 1)
                const progressRange = 1.0 - nextCardTriggerThreshold; // 0.6 (from 0.4 to 1.0)
                const progressBeyondThreshold =
                  nextCardMoveProgress - nextCardTriggerThreshold;
                fadeProgress = Math.max(
                  0,
                  Math.min(1, progressBeyondThreshold / progressRange),
                );
              } else {
                // Last card: use normal fade progress based on local progress
                const progressAfterMove = localProgress - movePhaseRatio;
                fadeProgress = progressAfterMove / fadePhaseRatio;
              }

              mesh.position.set(0, 0, zOffset);
              mesh.scale.set(0.8, 0.8, 1);
              mesh.rotation.set(0, 0, 0);
              // Hide mesh, show particles
              mesh.visible = false;
              points.visible = true;
              points.position.set(0, 0, zOffset);
              const scale = lerp(0.8, 0.3, fadeProgress);
              points.scale.set(scale, scale, 1);
              points.rotation.set(0, 0, 0);
              // Scatter particles outward
              const scatterAmount = fadeProgress * fadeProgress * fadeProgress; // Cubic for acceleration
              for (let i = 0; i < particleCount; i++) {
                const origX = originalPositions[i * 3];
                const origY = originalPositions[i * 3 + 1];
                const origZ = originalPositions[i * 3 + 2];
                const dirX = scatterDirections[i * 3];
                const dirY = scatterDirections[i * 3 + 1];
                const dirZ = scatterDirections[i * 3 + 2];
                // Scatter outward from original position
                positions[i * 3] =
                  origX + dirX * MAX_SCATTER_DISTANCE * scatterAmount;
                positions[i * 3 + 1] =
                  origY + dirY * MAX_SCATTER_DISTANCE * scatterAmount;
                positions[i * 3 + 2] =
                  origZ + dirZ * MAX_SCATTER_DISTANCE * scatterAmount;
                opacityAttribute[i] = lerp(1, 0, fadeProgress);
              }
              particleData.positions.needsUpdate = true;
              points.geometry.attributes.opacity.needsUpdate = true;
              // Card is active during fade phase (at center, before fully scattered)
              if (fadeProgress < 0.8) {
                // Active until 80% of fade phase (before too scattered)
                newActiveCardIndex = index;
              }
            }
          }
        });

        // Update active card index only if it changed
        if (activeCardIndexRef.current !== newActiveCardIndex) {
          activeCardIndexRef.current = newActiveCardIndex;
          setActiveCardIndex(newActiveCardIndex);

          // Show/hide info based on whether there's an active card
          if (newActiveCardIndex !== null && showInfo) {
            setIsInfoVisible(true);
          } else {
            setIsInfoVisible(false);
          }
        } else if (activeCardIndexRef.current !== null && showInfo) {
          // Keep info visible if we already have an active card
          setIsInfoVisible(true);
        } else if (!showInfo) {
          setIsInfoVisible(false);
        }
      };

      updateCardsAnimationRef.current = updateCardsAnimation;

      // Initial state
      updateCardsAnimation(0);
    });

    return () => {
      // Cleanup
      cardsMeshesRef.current.forEach((mesh) => {
        cardsSceneRef.current?.remove(mesh);
        mesh.geometry.dispose();
        const material = mesh.material as THREE.MeshBasicMaterial;
        material.map?.dispose();
        material.dispose();
      });
      cardsParticlesRef.current.forEach((points) => {
        cardsSceneRef.current?.remove(points);
        points.geometry.dispose();
        (
          points.material as THREE.ShaderMaterial
        ).uniforms.uTexture.value?.dispose();
        (points.material as THREE.ShaderMaterial).dispose();
      });
      cardsMeshesRef.current = [];
      cardsParticlesRef.current = [];
      cardParticlePositionsRef.current = [];
      cardTexturesRef.current.forEach((texture) => texture.dispose());
      cardTexturesRef.current = [];
      updateCardsAnimationRef.current = null;
    };
  }, [projects]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (
        cardsRendererRef.current &&
        cardsSceneRef.current &&
        cardsCameraRef.current
      ) {
        cardsRendererRef.current.render(
          cardsSceneRef.current,
          cardsCameraRef.current,
        );
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // ScrollTrigger setup
  useEffect(() => {
    if (!sectionRef.current) return;

    const navEl = navigationButtonsRef.current;

    // Initial hidden state
    gsap.set(navEl, { autoAlpha: 0, y: -20 });

    let isVisible = false;

    const scrollTrigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: () => `+=${Math.max(projects.length * 100, 200)}%`,
      pin: true,
      pinSpacing: true,
      scrub: 1,
      onUpdate: (self) => {
        const progress = self.progress;
        if (updateCardsAnimationRef.current) {
          updateCardsAnimationRef.current(progress);
        }
        if (progress >= 0.25 && !isVisible) {
          isVisible = true;
          gsap.to(navEl, {
            autoAlpha: 1,
            y: 0,
            duration: 0.4,
            ease: 'power2.out',
          });
        }

        if (progress < 0.25 && isVisible) {
          isVisible = false;
          gsap.to(navEl, {
            autoAlpha: 0,
            y: -20,
            duration: 0.3,
            ease: 'power2.in',
          });
        }
      },
    });

    scrollTriggerRef.current = scrollTrigger;

    // Refresh ScrollTrigger after initialization to ensure Lenis integration
    // Lenis is already initialized globally in App.tsx via useLenis hook
    // and connected to ScrollTrigger in useLenis.ts, so smooth scrolling should work automatically
    const timeoutId = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      scrollTrigger.kill();
    };
  }, [projects.length]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (cardsCameraRef.current) {
        cardsCameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cardsCameraRef.current.updateProjectionMatrix();
      }

      if (cardsRendererRef.current) {
        cardsRendererRef.current.setSize(window.innerWidth, window.innerHeight);
        cardsRendererRef.current.setPixelRatio(
          Math.min(window.devicePixelRatio, 2),
        );
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Get the active project for the overlay link
  const activeProject =
    activeCardIndex !== null ? projects[activeCardIndex] : null;
  const isExternalLink =
    activeProject?.href && activeProject.href.startsWith('http');

  const scrollToSection = (direction: 'prev' | 'next') => {
    if (!sectionRef.current) return;

    let targetSection: HTMLElement | null = null;

    if (direction === 'prev') {
      // Find previous section (TestimonialsSection)
      const allSections = Array.from(document.querySelectorAll('section'));
      const currentIndex = allSections.indexOf(sectionRef.current);
      if (currentIndex > 0) {
        targetSection = allSections[currentIndex - 1];
      }
    } else {
      // Find next section (ScrollTrigger3DSection)
      const allSections = Array.from(document.querySelectorAll('section'));
      const currentIndex = allSections.indexOf(sectionRef.current);
      if (currentIndex < allSections.length - 1) {
        targetSection = allSections[currentIndex + 1];
      }
    }

    if (targetSection) {
      const targetY =
        targetSection.getBoundingClientRect().top + window.scrollY;
      gsap.to(window, {
        duration: 1.5,
        scrollTo: targetY,
        ease: 'power2.inOut',
      });
    }
  };

  return (
    <section id={sectionId} ref={sectionRef} className="work-section-mobile">
      {/* Navigation Buttons */}
      <div
        ref={navigationButtonsRef}
        className="projects-mobile-navigation font-grid"
      >
        <button
          onClick={() => scrollToSection('prev')}
          className="projects-nav-button projects-nav-button-prev calendar-day-disabled"
        >
          Get Back
        </button>

        <button
          onClick={() => scrollToSection('next')}
          className="projects-nav-button projects-nav-button-next big calendar-day-available"
        >
          Skip to Next
        </button>
      </div>
      {/* Project Info Display */}
      <div
        ref={infoContainerRef}
        className={`project-info-container ${isInfoVisible ? 'visible' : ''}`}
      >
        <div className="project-info-wrapper">
          <div className="project-info-content">
            {activeProject && (
              <>
                <div className="project-info-header">
                  <div className="project-tags">{activeProject.tags}</div>
                  <div className="project-year">{activeProject.year}</div>
                </div>
                <h3 className="project-title">{activeProject.title}</h3>
              </>
            )}
          </div>
        </div>
      </div>

      {activeProject && (
        <div className="card-link-overlay">
          {isExternalLink ? (
            <a
              href={activeProject.href}
              target="_blank"
              rel="noopener noreferrer"
              className="card-link"
              aria-label={`View project: ${activeProject.title}`}
            />
          ) : (
            <Link
              to={activeProject.href}
              className="card-link"
              aria-label={`View project: ${activeProject.title}`}
            />
          )}
        </div>
      )}
    </section>
  );
};

export default ProjectsSectionMobile;
