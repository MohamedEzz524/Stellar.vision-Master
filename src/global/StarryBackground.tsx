import { useEffect, useState, useRef, useCallback } from 'react';

interface Star {
  id: number;
  left: number;
  top: number;
  dirX: number;
  dirY: number;
  speed: number;
  initialSize: number;
  brightness: number;
  createdAt: number; // Timestamp when star was created
}

const MAX_STARS = 100; // Maximum stars to prevent memory issues
const CLEANUP_INTERVAL = 5000; // Clean up every 5 seconds (optimized from 1s)
const ANIMATION_SPEED = 60; // Same speed for all stars in seconds

export default function StarryBackground() {
  const [stars, setStars] = useState<Star[]>([]);
  const starIdCounter = useRef(0);

  // Memoize generateStar to prevent recreation on every render
  const generateStar = useCallback((): Star => {
    const centerX = 50;
    const centerY = 50;

    // Randomly choose starting region: left, right, bottom, or top
    const region = Math.random();
    let startX: number, startY: number;

    if (region < 0.25) {
      // Left side - start on left, move left (closer to center)
      startX = 40 + Math.random() * 8; // 40-48% from left (closer to center)
      startY = 45 + Math.random() * 10; // 45-55% vertically (closer to center)
    } else if (region < 0.5) {
      // Right side - start on right, move right (closer to center)
      startX = 52 + Math.random() * 8; // 52-60% from left (closer to center)
      startY = 45 + Math.random() * 10; // 45-55% vertically (closer to center)
    } else if (region < 0.75) {
      // Bottom side - start at bottom, move down (closer to center)
      startX = 45 + Math.random() * 10; // 45-55% horizontally (closer to center)
      startY = 52 + Math.random() * 8; // 52-60% from top (closer to center)
    } else {
      // Top side - start at top, move up (closer to center)
      startX = 45 + Math.random() * 10; // 45-55% horizontally (closer to center)
      startY = 40 + Math.random() * 8; // 40-48% from top (closer to center)
    }

    // Calculate direction based on starting position relative to center
    // Stars move away from center in the direction they started from
    const dx = startX - centerX;
    const dy = startY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Normalize direction - pointing away from center
    const dirX = dx / (distance || 1);
    const dirY = dy / (distance || 1);

    // Initial size - visible from start
    const initialSize = 1; // Fixed at 1px so max scale of 4 = 4px max size

    // Random brightness variation
    const brightness = 0.7 + Math.random() * 0.3; // 0.7-1.0

    return {
      id: starIdCounter.current++,
      left: startX,
      top: startY,
      dirX: dirX,
      dirY: dirY,
      speed: ANIMATION_SPEED,
      initialSize: initialSize,
      brightness: brightness,
      createdAt: Date.now(),
    };
  }, []);

  useEffect(() => {
    // Spawn initial wave of stars (3-6 stars)
    const initialCount = 2 + Math.floor(Math.random() * 3); // 2-4 stars
    const initialStars = Array.from({ length: initialCount }).map(() =>
      generateStar(),
    );
    setStars(initialStars);

    // Spawn new waves continuously
    // Animation duration is 15s, so spawn waves frequently to maintain continuous flow
    const spawnWave = () => {
      setStars((prev) => {
        // Prevent exceeding max stars limit
        if (prev.length >= MAX_STARS) {
          return prev;
        }
        const starsPerWave = 2 + Math.floor(Math.random() * 3); // 2-4 stars per wave (spread out)
        const newStars = Array.from({ length: starsPerWave })
          .map(() => generateStar())
          .slice(0, MAX_STARS - prev.length); // Only add stars up to max limit
        return [...prev, ...newStars];
      });
    };

    // Spawn new waves every 1-2 seconds (randomized for organic feel)
    // This ensures continuous spawning while previous stars are still animating
    let spawnInterval: ReturnType<typeof setTimeout>;

    const scheduleNextSpawn = () => {
      const delay = 1000 + Math.random() * 1000; // 1-2 seconds
      spawnInterval = setTimeout(() => {
        spawnWave();
        scheduleNextSpawn(); // Schedule next spawn
      }, delay);
    };

    scheduleNextSpawn(); // Start spawning

    // Clean up stars that have finished their animation cycle
    // Optimized: Run cleanup less frequently (every 5s instead of 1s)
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const animationDuration = ANIMATION_SPEED * 1000; // Convert to milliseconds

      setStars((prev) => {
        // Only filter if we have stars that might be expired
        const filtered = prev.filter(
          (star) => now - star.createdAt < animationDuration + 500,
        );
        // Only update state if stars were actually removed (avoid unnecessary re-renders)
        return filtered.length !== prev.length ? filtered : prev;
      });
    }, CLEANUP_INTERVAL);

    return () => {
      clearTimeout(spawnInterval);
      clearInterval(cleanupInterval);
    };
  }, [generateStar]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-1 overflow-hidden">
      {stars.map((star) => (
        <div
          key={star.id}
          className="star-diving"
          style={
            {
              left: `${star.left}%`,
              top: `${star.top}%`,
              '--star-dir-x': star.dirX,
              '--star-dir-y': star.dirY,
              '--star-speed': `${star.speed}s`,
              '--star-initial-size': `${star.initialSize}px`,
              '--star-brightness': star.brightness,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
