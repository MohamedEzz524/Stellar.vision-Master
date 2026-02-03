import { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Mesh } from 'three';
import * as THREE from 'three';
import starModelUrl from '../assets/models/star.obj?url';

gsap.registerPlugin(ScrollTrigger);

// Constants
const MAX_SCATTER_DISTANCE = 2;
const PARTICLES_PER_FACE = 3;
const PIN_DURATION_VH = 2;

interface ParticleSystemProps {
  geometry: THREE.BufferGeometry;
  scrollProgress: React.MutableRefObject<number>;
}

const ParticleSystem = ({ geometry, scrollProgress }: ParticleSystemProps) => {
  const pointsRef = useRef<THREE.Points>(null);
  const particlesRef = useRef<THREE.BufferAttribute | null>(null);
  const originalPositionsRef = useRef<Float32Array | null>(null);
  const scatterDirectionsRef = useRef<Float32Array | null>(null);

  // Generate particles from geometry faces for better coverage
  const { positions, count } = useMemo(() => {
    if (!geometry?.attributes.position) {
      return { positions: null, count: 0 };
    }

    const clonedGeometry = geometry.clone();
    const positionsAttribute = clonedGeometry.attributes.position; // All vertex positions
    const indexAttribute = clonedGeometry.index; // Face indices (triangles)
    const pointPositions: number[] = [];

    // Generate particles from faces if indices available
    if (indexAttribute) {
      const faceCount = indexAttribute.count / 3;

      for (let i = 0; i < faceCount; i++) {
        const i0 = indexAttribute.getX(i * 3);
        const i1 = indexAttribute.getX(i * 3 + 1);
        const i2 = indexAttribute.getX(i * 3 + 2);

        const v0 = {
          x: positionsAttribute.getX(i0),
          y: positionsAttribute.getY(i0),
          z: positionsAttribute.getZ(i0),
        };
        const v1 = {
          x: positionsAttribute.getX(i1),
          y: positionsAttribute.getY(i1),
          z: positionsAttribute.getZ(i1),
        };
        const v2 = {
          x: positionsAttribute.getX(i2),
          y: positionsAttribute.getY(i2),
          z: positionsAttribute.getZ(i2),
        };

        // Generate random points on face using barycentric coordinates
        for (let j = 0; j < PARTICLES_PER_FACE; j++) {
          let u = Math.random();
          let v = Math.random();
          if (u + v > 1) {
            u = 1 - u;
            v = 1 - v;
          }
          const w = 1 - u - v;

          pointPositions.push(
            u * v0.x + v * v1.x + w * v2.x,
            u * v0.y + v * v1.y + w * v2.y,
            u * v0.z + v * v1.z + w * v2.z,
          );
        }
      }
    } else {
      // Fallback: use vertices directly
      const vertexCount = positionsAttribute.count;
      for (let i = 0; i < vertexCount; i++) {
        pointPositions.push(
          positionsAttribute.getX(i),
          positionsAttribute.getY(i),
          positionsAttribute.getZ(i),
        );
      }
    }

    const pointCount = pointPositions.length / 3;
    const positions = new Float32Array(pointPositions);
    const scatterDirections = new Float32Array(pointCount * 3);

    // Generate random scatter directions (spherical coordinates)
    for (let i = 0; i < pointCount; i++) {
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI * 2;
      scatterDirections[i * 3] = Math.cos(angle1) * Math.sin(angle2);
      scatterDirections[i * 3 + 1] = Math.sin(angle1) * Math.sin(angle2);
      scatterDirections[i * 3 + 2] = Math.cos(angle2);
    }

    // Store for animation
    originalPositionsRef.current = new Float32Array(positions);
    scatterDirectionsRef.current = scatterDirections;

    return { positions, count: pointCount };
  }, [geometry]);

  // Get reference to particle positions for updates
  useEffect(() => {
    if (pointsRef.current?.geometry) {
      particlesRef.current = pointsRef.current.geometry.attributes
        .position as THREE.BufferAttribute;
    }
  }, [positions]);

  // Animate particles based on scroll progress
  useFrame(() => {
    if (
      !particlesRef.current ||
      !originalPositionsRef.current ||
      !scatterDirectionsRef.current
    ) {
      return;
    }

    const progress = scrollProgress.current;
    const scatterAmount = 1 - progress; // 1 = scattered, 0 = gathered
    const positions = particlesRef.current.array as Float32Array;
    const originalPositions = originalPositionsRef.current;
    const scatterDirections = scatterDirectionsRef.current;

    // Update each particle position
    for (let i = 0; i < originalPositions.length; i += 3) {
      const originalX = originalPositions[i];
      const originalY = originalPositions[i + 1];
      const originalZ = originalPositions[i + 2];

      const dirX = scatterDirections[i];
      const dirY = scatterDirections[i + 1];
      const dirZ = scatterDirections[i + 2];

      // Calculate scattered position
      const scatteredX = originalX + dirX * MAX_SCATTER_DISTANCE;
      const scatteredY = originalY + dirY * MAX_SCATTER_DISTANCE;
      const scatteredZ = originalZ + dirZ * MAX_SCATTER_DISTANCE;

      // Interpolate between scattered and original
      positions[i] =
        scatteredX + (originalX - scatteredX) * (1 - scatterAmount);
      positions[i + 1] =
        scatteredY + (originalY - scatteredY) * (1 - scatterAmount);
      positions[i + 2] =
        scatteredZ + (originalZ - scatteredZ) * (1 - scatterAmount);
    }

    particlesRef.current.needsUpdate = true;
  });

  // Material and geometry setup
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.05,
        sizeAttenuation: true,
        transparent: true,
        opacity: 1.0,
        blending: THREE.NormalBlending,
      }),
    [],
  );

  const bufferGeometry = useMemo(() => {
    if (!positions || count === 0) {
      return null;
    }

    const geo = new THREE.BufferGeometry();
    const initialPositions = new Float32Array(positions.length);

    // Initialize to scattered state (progress = 0, scatterAmount = 1)
    if (originalPositionsRef.current && scatterDirectionsRef.current) {
      const orig = originalPositionsRef.current;
      const dirs = scatterDirectionsRef.current;

      for (let i = 0; i < orig.length; i += 3) {
        initialPositions[i] = orig[i] + dirs[i] * MAX_SCATTER_DISTANCE;
        initialPositions[i + 1] =
          orig[i + 1] + dirs[i + 1] * MAX_SCATTER_DISTANCE;
        initialPositions[i + 2] =
          orig[i + 2] + dirs[i + 2] * MAX_SCATTER_DISTANCE;
      }
    } else {
      // Fallback: use original positions if refs not ready
      initialPositions.set(positions);
    }

    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(initialPositions, 3),
    );
    return geo;
  }, [positions, count]);

  if (!bufferGeometry) {
    return null;
  }

  return (
    <points ref={pointsRef} geometry={bufferGeometry} material={material} />
  );
};

interface StarModelProps {
  scrollProgress: React.MutableRefObject<number>;
}

const StarModel = ({ scrollProgress }: StarModelProps) => {
  const obj = useLoader(OBJLoader, starModelUrl);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    if (!obj) return;

    const geometries: THREE.BufferGeometry[] = [];

    obj.traverse((child) => {
      if (child instanceof Mesh && child.geometry) {
        const geo = child.geometry.clone();
        if (child.matrixWorld) {
          geo.applyMatrix4(child.matrixWorld);
        }
        geometries.push(geo);
      }
    });

    if (geometries.length > 0) {
      setGeometry(geometries[0]);
    } else {
      console.warn('No geometry found in model');
      setGeometry(new THREE.SphereGeometry(1, 32, 32));
    }
  }, [obj]);

  if (!geometry) {
    return null;
  }

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} scale={[0.5, 0.5, 0.5]}>
      <ParticleSystem geometry={geometry} scrollProgress={scrollProgress} />
    </group>
  );
};

const Particle3DSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const scrollProgress = useRef<number>(0);

  useEffect(() => {
    if (!sectionRef.current) return;

    const section = sectionRef.current;
    scrollProgress.current = 0;

    const scrollTrigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => `+=${window.innerHeight * PIN_DURATION_VH}`,
      pin: true,
      pinSpacing: true,
      scrub: 1,
      onUpdate: (self) => {
        scrollProgress.current = self.progress;
      },
      onEnter: () => {
        scrollProgress.current = 0;
      },
      onLeave: () => {
        scrollProgress.current = 1;
      },
      onEnterBack: () => {
        scrollProgress.current = scrollTrigger.progress;
      },
      onLeaveBack: () => {
        scrollProgress.current = 0;
      },
    });

    // Refresh ScrollTrigger after initialization
    const timeoutId = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      scrollTrigger.kill();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full overflow-hidden bg-black"
    >
      <div className="absolute inset-0 z-10">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50, near: 0.1, far: 1000 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} />
          <pointLight position={[-5, -5, -5]} intensity={0.5} />
          <StarModel scrollProgress={scrollProgress} />
        </Canvas>
      </div>
    </section>
  );
};

export default Particle3DSection;
