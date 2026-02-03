import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FlakesTexture } from '../assets/js/FlakesTexture';
import { gsap } from 'gsap';
import { registerModel3DRef, getModel3DRef } from '../utils/revealAnimation';
import { HDREnvironment } from './HDREnvironmentDefault';
import starModelUrl from '../assets/models/starr.glb?url';

interface Hero3DModelProps {
  onModelReady?: (modelRef: React.RefObject<THREE.Group | null>) => void;
}

const StarModel = ({
  onModelReady,
}: {
  onModelReady?: (modelRef: React.RefObject<THREE.Group | null>) => void;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const clonedObjRef = useRef<THREE.Object3D | null>(null);
  const loaderRef = useRef<{
    loader: GLTFLoader;
    dracoLoader: DRACOLoader;
  } | null>(null);
  const materialReadyRef = useRef(false);
  const { scene } = useThree();
  const [materialReady, setMaterialReady] = useState(false);
  const [gltf, setGltf] = useState<GLTF | null>(null);

  // Load GLB with DRACOLoader configured
  useEffect(() => {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(dracoLoader);
    loaderRef.current = { loader, dracoLoader };

    loader.load(
      starModelUrl,
      (loadedGltf) => {
        setGltf(loadedGltf);
      },
      undefined,
      (error) => {
        console.error('Error loading GLB model:', error);
      },
    );

    return () => {
      if (loaderRef.current) {
        loaderRef.current.dracoLoader.dispose();
        loaderRef.current = null;
      }
    };
  }, []);

  // Generate flakes texture for material normal map
  const flakesTexture = useMemo(() => {
    const canvas = new FlakesTexture(512, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 6);
    return texture;
  }, []);

  // Apply metallic material to mesh when model and environment are ready
  useEffect(() => {
    if (gltf && groupRef.current && scene.environment && !materialReady) {
      // Dispose previous clone if exists (only if we're re-initializing)
      if (clonedObjRef.current && groupRef.current) {
        clonedObjRef.current.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((mat) => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
        groupRef.current.remove(clonedObjRef.current);
      }

      const clonedObj = gltf.scene.clone();
      clonedObjRef.current = clonedObj;

      clonedObj.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          // Mirror-like material: perfect reflection with environment map
          const ballMaterial = new THREE.MeshPhysicalMaterial({
            clearcoat: 1.0,
            clearcoatRoughness: 0.0,
            metalness: 1.0,
            roughness: 0.0,
            color: 0xffffff,
            normalMap: flakesTexture,
            normalScale: new THREE.Vector2(0.15, 0.15),
            envMap: scene.environment,
            envMapIntensity: 2.5,
          });

          // Explicitly set envMap after creation to ensure it's applied
          ballMaterial.envMap = scene.environment;
          ballMaterial.envMapIntensity = 2.5;
          ballMaterial.needsUpdate = true;

          (child as THREE.Mesh).material = ballMaterial;
        }
      });

      groupRef.current.clear();
      groupRef.current.add(clonedObj);
      // Rotate to stand upright (initial state for GSAP animation)
      groupRef.current.rotation.set(-Math.PI / 2, 0, 0);
      groupRef.current.scale.set(0.2, 0.2, 0.5);

      setMaterialReady(true);
      materialReadyRef.current = true;
      registerModel3DRef(groupRef);
      window.dispatchEvent(new CustomEvent('model3DReady'));

      if (onModelReady) {
        onModelReady(groupRef);
      }
    }
  }, [gltf, materialReady, flakesTexture, onModelReady, scene]);

  // Separate cleanup effect that only runs on unmount
  useEffect(() => {
    return () => {
      // Cleanup cloned object and materials only on unmount
      const clonedObj = clonedObjRef.current;
      const group = groupRef.current;
      const isReady = materialReadyRef.current;

      if (clonedObj && group) {
        clonedObj.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((mat) => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
        group.remove(clonedObj);
        clonedObjRef.current = null;
      }
      if (isReady) {
        registerModel3DRef(undefined);
      }
      // Don't dispose flakesTexture - it's shared and created in useMemo
    };
  }, []); // Empty deps - only runs on unmount

  return <group ref={groupRef} />;
};

const Hero3DModel = ({ onModelReady }: Hero3DModelProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const [shouldRenderCanvas, setShouldRenderCanvas] = useState(false);

  // Render Canvas early so 3D model can load in parallel with preloader
  // This ensures the model is ready when the preloader finishes
  useEffect(() => {
    // Start loading immediately, but hide visually until preloader is done
    // This allows the model to load in the background
    const startLoading = () => {
      setShouldRenderCanvas(true);
    };

    // Start loading as soon as DOM is ready
    if (
      document.readyState === 'complete' ||
      document.readyState === 'interactive'
    ) {
      // DOM is already ready, start immediately
      setTimeout(startLoading, 100);
    } else {
      // Wait for DOM to be ready
      window.addEventListener('load', startLoading, { once: true });
      // Also start after a short delay as fallback
      setTimeout(startLoading, 300);
    }

    return () => {
      window.removeEventListener('load', startLoading);
    };
  }, []);

  // Mouse interaction: rotate model based on cursor position (desktop only)
  useEffect(() => {
    const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;

    let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
    let mouseLeaveHandler: ((e: MouseEvent) => void) | null = null;
    let heroSection: HTMLElement | null = null;
    let animationFrameId: number | null = null;
    let targetRotationX = -Math.PI / 2;
    let targetRotationY = -7 * (Math.PI / 180);

    const lerp = (start: number, end: number, factor: number): number => {
      return start + (end - start) * factor;
    };

    const handleRevealComplete = () => {
      if (!isDesktop()) {
        return;
      }

      heroSection = document.getElementById('hero-section');
      const modelRef = getModel3DRef();

      if (!heroSection || !modelRef?.current) {
        return;
      }

      const baseRotationY = -7 * (Math.PI / 180);
      const maxRotationY = 30 * (Math.PI / 180);
      const maxRotationX = 20 * (Math.PI / 180);
      const lerpFactor = 0.05;

      targetRotationX = -Math.PI / 2;
      targetRotationY = baseRotationY;

      const animate = () => {
        if (!modelRef?.current || !isDesktop()) {
          return;
        }
        modelRef.current.rotation.x = lerp(
          modelRef.current.rotation.x,
          targetRotationX,
          lerpFactor,
        );
        modelRef.current.rotation.y = lerp(
          modelRef.current.rotation.y,
          targetRotationY,
          lerpFactor,
        );
        animationFrameId = requestAnimationFrame(animate);
      };

      animate();

      mouseMoveHandler = (e: MouseEvent) => {
        if (!modelRef?.current || !isDesktop() || !heroSection) {
          return;
        }

        const rect = heroSection.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const offsetX = e.clientX - centerX;
        const offsetY = e.clientY - centerY;
        const normalizedX = Math.max(
          -1,
          Math.min(1, offsetX / (rect.width / 2)),
        );
        const normalizedY = Math.max(
          -1,
          Math.min(1, offsetY / (rect.height / 2)),
        );

        targetRotationY = baseRotationY + normalizedX * maxRotationY;
        targetRotationX = -Math.PI / 2 - normalizedY * maxRotationX;
      };

      mouseLeaveHandler = () => {
        if (!modelRef?.current) {
          return;
        }
        targetRotationX = -Math.PI / 2;
        targetRotationY = baseRotationY;
      };

      heroSection.addEventListener('mousemove', mouseMoveHandler);
      heroSection.addEventListener('mouseleave', mouseLeaveHandler);
    };

    window.addEventListener(
      'revealAnimationComplete',
      handleRevealComplete as EventListener,
    );

    const handleResize = () => {
      if (!isDesktop() && mouseMoveHandler && heroSection) {
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }

        heroSection.removeEventListener('mousemove', mouseMoveHandler);
        if (mouseLeaveHandler) {
          heroSection.removeEventListener('mouseleave', mouseLeaveHandler);
        }
        mouseMoveHandler = null;
        mouseLeaveHandler = null;

        const modelRef = getModel3DRef();
        if (modelRef?.current) {
          const baseRotationY = -20 * (Math.PI / 180);
          gsap.to(modelRef.current.rotation, {
            x: -Math.PI / 2,
            y: baseRotationY,
            duration: 0.5,
            ease: 'power2.out',
          });
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener(
        'revealAnimationComplete',
        handleRevealComplete as EventListener,
      );
      window.removeEventListener('resize', handleResize);

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      if (heroSection && mouseMoveHandler) {
        heroSection.removeEventListener('mousemove', mouseMoveHandler);
      }
      if (heroSection && mouseLeaveHandler) {
        heroSection.removeEventListener('mouseleave', mouseLeaveHandler);
      }
    };
  }, []);

  // Configure renderer: tone mapping and color encoding
  const RendererConfig = () => {
    const { gl } = useThree();
    useEffect(() => {
      // @ts-expect-error - outputEncoding exists in this version of Three.js
      gl.outputEncoding = THREE.sRGBEncoding;
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 12; // Reduced exposure to prevent overexposure
    }, [gl]);
    return null;
  };

  return (
    <div
      id="hero-image"
      className="absolute top-1/2 left-1/2 z-10 flex h-[150px] max-h-[500px] w-[120%] max-w-[390px] -translate-x-1/2 -translate-y-[9.5rem] items-center justify-center lg:h-[100%] lg:max-h-full lg:w-[80%] lg:max-w-full lg:-translate-y-1/2"
      style={{
        // Hide visually until preloader is done, but allow loading in background
        opacity: shouldRenderCanvas ? 1 : 0,
        visibility: shouldRenderCanvas ? 'visible' : 'hidden',
        pointerEvents: shouldRenderCanvas ? 'auto' : 'none',
      }}
    >
      {shouldRenderCanvas && (
        <Canvas
          camera={{ position: [0, 0, 6], fov: 50, near: 0.1, far: 1000 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: '100%', height: '100%', maxHeight: '100%' }}
        >
          <RendererConfig />
          <HDREnvironment rotationY={0.25} rotationX={0.25} />
          {/* <HDREnvironment rotationY={0.5} rotationX={0.0} /> */}
          <StarModel
            onModelReady={(ref) => {
              groupRef.current = ref.current;
              if (onModelReady) {
                onModelReady(groupRef);
              }
            }}
          />
        </Canvas>
      )}
    </div>
  );
};

export default Hero3DModel;
