import { useEffect, useRef, useState } from 'react';

/**
 * Component that creates a fluid distortion effect on hero image
 * using canvas displacement mapping to actually warp the image pixels
 */
const HeroImageDistortion = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  const mousePosRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const frameSkipRef = useRef(0); // For frame skipping optimization
  const wavesRef = useRef<
    Array<{
      x: number;
      y: number;
      radius: number;
      strength: number;
      life: number;
    }>
  >([]);
  const timeRef = useRef(0);
  const imageLoadedRef = useRef(false);
  const heroImageRef = useRef<HTMLImageElement | null>(null);
  const originalImageDataRef = useRef<ImageData | null>(null);
  const lastMouseMoveTimeRef = useRef(0);
  const displacementStrengthRef = useRef(1); // 1 = full distortion, 0 = no distortion
  const displacementMapRef = useRef<Float32Array | null>(null); // Stores displacement vectors (dx, dy) per pixel
  const magneticElementsRef = useRef<
    Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      strength: number;
    }>
  >([]);

  // Listen for reveal animation completion
  useEffect(() => {
    const handleAnimationComplete = () => {
      setIsAnimationComplete(true);
    };

    window.addEventListener('revealAnimationComplete', handleAnimationComplete);

    return () => {
      window.removeEventListener(
        'revealAnimationComplete',
        handleAnimationComplete,
      );
    };
  }, []);

  useEffect(() => {
    if (!isAnimationComplete) return;

    const heroImageContainer = document.getElementById('hero-image');
    const heroImg = heroImageContainer?.querySelector(
      'img',
    ) as HTMLImageElement;
    if (!heroImageContainer || !heroImg || !containerRef.current) return;

    heroImageRef.current = heroImg;

    // Performance optimization: reduce canvas resolution
    // Canvas is rendered at 70% size, then upscaled with CSS
    // This reduces pixel processing by ~50% while maintaining visual quality
    const PERFORMANCE_SCALE = 0.7;

    // Create canvas to replace the image
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '50%';
    canvas.style.left = '50%';
    canvas.style.transform = 'translate(-50%, -50%)';
    canvas.style.objectFit = 'contain';
    canvasRef.current = canvas;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Keep original image visible - will hide it only after canvas is ready
    // Set canvas to be hidden initially
    canvas.style.opacity = '0';

    // Load and draw image to canvas
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = heroImg.src;

    // Function to calculate actual rendered image size and position (accounting for object-contain)
    const getActualImageSize = () => {
      const containerRect = heroImageContainer.getBoundingClientRect();

      // Get natural image dimensions
      const naturalWidth = heroImg.naturalWidth || img.width;
      const naturalHeight = heroImg.naturalHeight || img.height;

      // Calculate aspect ratios
      const containerAspect = containerRect.width / containerRect.height;
      const imageAspect = naturalWidth / naturalHeight;

      // Calculate actual rendered size (object-contain behavior)
      let renderedWidth: number;
      let renderedHeight: number;
      let offsetX: number;
      let offsetY: number;

      if (imageAspect > containerAspect) {
        // Image is wider - fit to width
        renderedWidth = containerRect.width;
        renderedHeight = containerRect.width / imageAspect;
        offsetX = 0;
        offsetY = (containerRect.height - renderedHeight) / 2;
      } else {
        // Image is taller - fit to height
        renderedHeight = containerRect.height;
        renderedWidth = containerRect.height * imageAspect;
        offsetX = (containerRect.width - renderedWidth) / 2;
        offsetY = 0;
      }

      return {
        width: Math.round(renderedWidth),
        height: Math.round(renderedHeight),
        offsetX: Math.round(offsetX),
        offsetY: Math.round(offsetY),
        naturalWidth,
        naturalHeight,
      };
    };

    // Convert container coordinates to canvas coordinates
    const containerToCanvas = (containerX: number, containerY: number) => {
      const size = getActualImageSize();

      // Convert from container space to canvas space (accounting for performance scale)
      const canvasX = (containerX - size.offsetX) * PERFORMANCE_SCALE;
      const canvasY = (containerY - size.offsetY) * PERFORMANCE_SCALE;

      // Clamp to canvas bounds (only if canvas is initialized)
      const maxX = canvas.width || size.width * PERFORMANCE_SCALE;
      const maxY = canvas.height || size.height * PERFORMANCE_SCALE;

      return {
        x: Math.max(0, Math.min(maxX, canvasX)),
        y: Math.max(0, Math.min(maxY, canvasY)),
      };
    };

    img.onload = () => {
      imageLoadedRef.current = true;

      // Get actual rendered image size
      const size = getActualImageSize();

      // OPTIMIZATION: Reduce canvas resolution for better performance
      // Scale down to 70% of actual size, then upscale with CSS
      // This reduces pixel processing by ~50% while maintaining visual quality
      canvas.width = Math.round(size.width * PERFORMANCE_SCALE);
      canvas.height = Math.round(size.height * PERFORMANCE_SCALE);

      // Set canvas CSS size to match actual rendered image size (upscale for display)
      canvas.style.width = `${size.width}px`;
      canvas.style.height = `${size.height}px`;

      // Draw image to canvas at reduced resolution
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Store original image data for reset
      originalImageDataRef.current = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );

      // Initialize displacement map (2 values per pixel: dx, dy)
      displacementMapRef.current = new Float32Array(
        canvas.width * canvas.height * 2,
      );

      // Now that canvas is ready, smoothly transition from original image to canvas
      requestAnimationFrame(() => {
        canvas.style.transition = 'opacity 0.2s ease-in';
        canvas.style.opacity = '1';
        heroImg.style.transition = 'opacity 0.2s ease-in';
        heroImg.style.opacity = '0';
      });
    };

    // Insert canvas after image
    heroImageContainer.insertBefore(canvas, heroImg.nextSibling);

    // Set canvas size - recalculate based on actual image size
    const resizeCanvas = () => {
      if (!imageLoadedRef.current || !img.complete) return;

      const size = getActualImageSize();

      // OPTIMIZATION: Use same performance scale
      canvas.width = Math.round(size.width * PERFORMANCE_SCALE);
      canvas.height = Math.round(size.height * PERFORMANCE_SCALE);

      // Set canvas CSS size to match actual size (upscale for display)
      canvas.style.width = `${size.width}px`;
      canvas.style.height = `${size.height}px`;

      // Redraw image at reduced resolution
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Update original image data after resize
      originalImageDataRef.current = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );

      // Reinitialize displacement map for new size
      displacementMapRef.current = new Float32Array(
        canvas.width * canvas.height * 2,
      );
    };

    resizeCanvas();
    const resizeHandler = () => resizeCanvas();
    window.addEventListener('resize', resizeHandler);

    // Find magnetic elements (h2, p, etc.) in hero section
    const updateMagneticElements = () => {
      const heroSection = document.getElementById('hero-section');
      if (!heroSection) return;

      magneticElementsRef.current = [];

      // Find all text elements (h2, p) that could attract distortion
      const textElements = heroSection.querySelectorAll('h2, p');
      textElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const heroRect = heroImageContainer.getBoundingClientRect();

        // Convert to relative coordinates within hero image container
        const containerX = rect.left + rect.width / 2 - heroRect.left;
        const containerY = rect.top + rect.height / 2 - heroRect.top;

        // Convert to canvas coordinates
        const canvasCoords = containerToCanvas(containerX, containerY);

        // Only include elements that are within or near the hero image area
        if (
          canvasCoords.x > -100 &&
          canvasCoords.x < canvas.width + 100 &&
          canvasCoords.y > -100 &&
          canvasCoords.y < canvas.height + 100
        ) {
          magneticElementsRef.current.push({
            x: canvasCoords.x,
            y: canvasCoords.y,
            width: rect.width,
            height: rect.height,
            strength: Math.min((rect.width * rect.height) / 10000, 1.5), // Larger elements = stronger attraction
          });
        }
      });
    };

    // Update magnetic elements initially and on resize
    updateMagneticElements();
    const resizeObserver = new ResizeObserver(() => {
      updateMagneticElements();
    });
    resizeObserver.observe(heroImageContainer);

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      // Reset displacement strength when mouse moves (restart distortion)
      displacementStrengthRef.current = 1;
      lastMouseMoveTimeRef.current = Date.now();

      const rect = heroImageContainer.getBoundingClientRect();
      const containerX = e.clientX - rect.left;
      const containerY = e.clientY - rect.top;

      // Convert to canvas coordinates
      const canvasCoords = containerToCanvas(containerX, containerY);
      const x = canvasCoords.x;
      const y = canvasCoords.y;

      // Calculate velocity for fluid effect (in canvas space)
      mousePosRef.current.vx = x - mousePosRef.current.x;
      mousePosRef.current.vy = y - mousePosRef.current.y;
      mousePosRef.current.x = x;
      mousePosRef.current.y = y;

      // Add wave at mouse position with strength based on velocity
      const velocity = Math.sqrt(
        mousePosRef.current.vx ** 2 + mousePosRef.current.vy ** 2,
      );
      const strength = Math.min(velocity / 8, 2);

      wavesRef.current.push({
        x,
        y,
        radius: 0,
        strength: strength,
        life: 1,
      });

      // Limit number of waves
      if (wavesRef.current.length > 10) {
        wavesRef.current.shift();
      }
    };

    // Mouse leave handler - just clear mouse position, let distortion settle naturally
    const handleMouseLeave = () => {
      // Clear mouse position - displacement will naturally decay
      mousePosRef.current = { x: 0, y: 0, vx: 0, vy: 0 };
    };

    // Update displacement map - adds new displacement and applies gradual decay
    const updateDisplacementMap = () => {
      if (!displacementMapRef.current || !canvas) return;

      const map = displacementMapRef.current;
      const width = canvas.width;
      const height = canvas.height;

      // Gradually decay existing displacement (like rubber tension returning)
      const decayRate = displacementStrengthRef.current > 0.1 ? 0.88 : 0.85; // Faster decay for quicker return
      for (let i = 0; i < map.length; i += 2) {
        map[i] *= decayRate; // dx
        map[i + 1] *= decayRate; // dy
      }

      // Add new displacement from waves and mouse - circular distortion area
      for (const wave of wavesRef.current) {
        const radius = wave.radius;
        const distortionRadius = Math.min(radius, 150); // Max circular distortion radius
        const minX = Math.max(0, Math.floor(wave.x - distortionRadius));
        const maxX = Math.min(width, Math.ceil(wave.x + distortionRadius));
        const minY = Math.max(0, Math.floor(wave.y - distortionRadius));
        const maxY = Math.min(height, Math.ceil(wave.y + distortionRadius));

        for (let y = minY; y < maxY; y++) {
          for (let x = minX; x < maxX; x++) {
            const dx = x - wave.x;
            const dy = y - wave.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Circular shape - only apply distortion within circle
            if (distance < distortionRadius) {
              // Smooth falloff from center to edge of circle
              const normalizedDist = distance / distortionRadius;
              const influence =
                (1 - normalizedDist) * wave.life * wave.strength;

              // Radial displacement (push pixels outward from center)
              const angle = Math.atan2(dy, dx);
              const force = influence * 15 * displacementStrengthRef.current;

              const index = (y * width + x) * 2;
              map[index] += Math.cos(angle) * force; // dx
              map[index + 1] += Math.sin(angle) * force; // dy
            }
          }
        }
      }

      // Add mouse position influence - circular distortion with magnetic attraction to nearby content
      const { x: mx, y: my } = mousePosRef.current;
      if (mx > 0 && my > 0) {
        const mouseRadius = 120; // Circular distortion radius

        // Find nearest magnetic element
        let nearestElement: (typeof magneticElementsRef.current)[0] | null =
          null;
        let nearestDistance = Infinity;

        for (const element of magneticElementsRef.current) {
          const dx = mx - element.x;
          const dy = my - element.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < nearestDistance && distance < 200) {
            // Only consider elements within 200px
            nearestDistance = distance;
            nearestElement = element;
          }
        }

        // Calculate effective center - blend mouse position with nearest element (magnetic attraction)
        let effectiveX = mx;
        let effectiveY = my;
        let magneticInfluence = 0;

        if (nearestElement) {
          // Magnetic pull: the closer the mouse is to an element, the more it's attracted
          const attractionStrength =
            Math.max(0, 1 - nearestDistance / 200) *
            nearestElement.strength *
            0.6;
          magneticInfluence = attractionStrength;

          // Blend mouse position with element position
          effectiveX =
            mx * (1 - attractionStrength) +
            nearestElement.x * attractionStrength;
          effectiveY =
            my * (1 - attractionStrength) +
            nearestElement.y * attractionStrength;
        }

        const minX = Math.max(0, Math.floor(effectiveX - mouseRadius));
        const maxX = Math.min(width, Math.ceil(effectiveX + mouseRadius));
        const minY = Math.max(0, Math.floor(effectiveY - mouseRadius));
        const maxY = Math.min(height, Math.ceil(effectiveY + mouseRadius));

        for (let y = minY; y < maxY; y++) {
          for (let x = minX; x < maxX; x++) {
            const dx = x - effectiveX;
            const dy = y - effectiveY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Circular shape - only apply distortion within circle
            if (distance < mouseRadius) {
              // Smooth falloff from center to edge
              const normalizedDist = distance / mouseRadius;
              // Increase influence if near magnetic element
              const baseInfluence = (1 - normalizedDist) * 0.4;
              const influence = baseInfluence * (1 + magneticInfluence);
              const angle = Math.atan2(dy, dx);
              const force = influence * 8 * displacementStrengthRef.current;

              const index = (y * width + x) * 2;
              map[index] += Math.cos(angle) * force; // dx
              map[index + 1] += Math.sin(angle) * force; // dy
            }
          }
        }
      }
    };

    // Apply displacement map to image - pixels return to original positions as displacement decays
    const applyDisplacement = () => {
      if (!ctx || !canvas || !imageLoadedRef.current || !img.complete) return;
      if (!displacementMapRef.current) return;

      // Check if displacement map has any significant values
      const displacementMap = displacementMapRef.current;
      let hasDisplacement = false;
      for (let i = 0; i < displacementMap.length; i += 2) {
        if (
          Math.abs(displacementMap[i]) > 0.1 ||
          Math.abs(displacementMap[i + 1]) > 0.1
        ) {
          hasDisplacement = true;
          break;
        }
      }

      if (
        !hasDisplacement &&
        wavesRef.current.length === 0 &&
        mousePosRef.current.x === 0
      ) {
        // Fully settled, restore original
        if (originalImageDataRef.current) {
          ctx.putImageData(originalImageDataRef.current, 0, 0);
        }
        return;
      }

      // Get original image data (pixels will return to original positions as displacement decays)
      const originalData = originalImageDataRef.current?.data;
      if (!originalData) return;

      const newData = new Uint8ClampedArray(originalData);
      const width = canvas.width;
      const height = canvas.height;

      // Apply displacement map - read from original positions with displacement offset
      // Pixels naturally return to original positions as displacement vectors decay
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 2;
          const dx = displacementMap[index];
          const dy = displacementMap[index + 1];

          // Get source pixel from original position + displacement (pixels return as displacement decays)
          const sourceX = Math.round(x + dx);
          const sourceY = Math.round(y + dy);

          // Clamp to canvas bounds
          if (
            sourceX >= 0 &&
            sourceX < width &&
            sourceY >= 0 &&
            sourceY < height
          ) {
            const sourceIndex = (sourceY * width + sourceX) * 4;
            const targetIndex = (y * width + x) * 4;

            newData[targetIndex] = originalData[sourceIndex]; // R
            newData[targetIndex + 1] = originalData[sourceIndex + 1]; // G
            newData[targetIndex + 2] = originalData[sourceIndex + 2]; // B
            newData[targetIndex + 3] = originalData[sourceIndex + 3]; // A
          }
        }
      }

      // Put modified image data back
      const newImageData = new ImageData(newData, width, height);
      ctx.putImageData(newImageData, 0, 0);
    };

    // Animation loop
    const animate = () => {
      if (!ctx || !canvas || !imageLoadedRef.current || !img.complete) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      timeRef.current += 0.016; // ~60fps

      // Gradually reduce displacement strength when mouse stops moving (settling effect)
      const timeSinceLastMove = Date.now() - lastMouseMoveTimeRef.current;
      const isSettling = timeSinceLastMove > 100;

      if (isSettling) {
        // Start settling after 100ms of no movement - faster decay
        displacementStrengthRef.current = Math.max(
          0,
          displacementStrengthRef.current - 0.05,
        );
      }

      // OPTIMIZATION: Skip frames when settling (process every 2nd frame)
      // This reduces CPU usage by ~50% when distortion is decaying
      frameSkipRef.current++;
      const shouldSkip = isSettling && frameSkipRef.current % 2 === 0;

      if (shouldSkip) {
        // Still update waves and decay, but skip expensive displacement processing
        for (let i = wavesRef.current.length - 1; i >= 0; i--) {
          const wave = wavesRef.current[i];
          wave.radius += 3 + wave.strength * 2;
          wave.life -= 0.02;
          wave.strength *= 0.97;
          if (
            wave.life <= 0 ||
            wave.radius > Math.max(canvas.width, canvas.height) * 1.5
          ) {
            wavesRef.current.splice(i, 1);
          }
        }

        // Apply decay to displacement map
        if (displacementMapRef.current) {
          const map = displacementMapRef.current;
          const decayRate = displacementStrengthRef.current > 0.1 ? 0.88 : 0.85;
          for (let i = 0; i < map.length; i += 2) {
            map[i] *= decayRate;
            map[i + 1] *= decayRate;
          }
        }

        // Redraw with current displacement (no new calculations)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        applyDisplacement();
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      // Full processing when active or every other frame when settling
      // Redraw base image first
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Update waves (fade out naturally during reset)
      for (let i = wavesRef.current.length - 1; i >= 0; i--) {
        const wave = wavesRef.current[i];

        // Natural fade
        wave.radius += 3 + wave.strength * 2;
        wave.life -= 0.02;
        wave.strength *= 0.97;

        if (
          wave.life <= 0 ||
          wave.radius > Math.max(canvas.width, canvas.height) * 1.5
        ) {
          wavesRef.current.splice(i, 1);
        }
      }

      // Update displacement map (adds new displacement and decays existing)
      updateDisplacementMap();

      // Apply displacement map to warp image (pixels return as displacement decays)
      applyDisplacement();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    heroImageContainer.addEventListener('mousemove', handleMouseMove);
    heroImageContainer.addEventListener('mouseleave', handleMouseLeave);
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      heroImageContainer.removeEventListener('mousemove', handleMouseMove);
      heroImageContainer.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', resizeHandler);
      resizeObserver.disconnect();
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      // Restore original image
      if (heroImg) {
        heroImg.style.opacity = '1';
      }
    };
  }, [isAnimationComplete]);

  if (!isAnimationComplete) return null;

  return <div ref={containerRef} className="hidden" />;
};

export default HeroImageDistortion;
