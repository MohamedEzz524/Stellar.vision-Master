import React, { useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Model } from './Button3d';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { HDREnvironment } from './HDREnvironmentDefault';

interface Button3dWrapperProps {
  onClick?: () => void;
  text?: string;
  className?: string;
  viewState?: number;
}

// Configure renderer: tone mapping and color encoding (same as star)
const RendererConfig = () => {
  const { gl } = useThree();
  useEffect(() => {
    // @ts-expect-error - outputEncoding exists in this version of Three.js
    gl.outputEncoding = THREE.sRGBEncoding;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 14;
  }, [gl]);
  return null;
};

const Button3dWrapper: React.FC<Button3dWrapperProps> = ({
  onClick,
  text,
  className = '',
  viewState = 0,
}) => {
  const modelRef = useRef<THREE.Group>(null);

  // Animate rotation when viewState changes
  useEffect(() => {
    if (modelRef.current) {
      const targetRotationX = viewState === 0 ? Math.PI / 2 : (3 * Math.PI) / 2; // 90deg to 270deg
      gsap.to(modelRef.current.rotation, {
        x: targetRotationX,
        duration: 0.6,
        ease: 'power2.out',
      });
    }
  }, [viewState]);

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <RendererConfig />
        <HDREnvironment
          rotationY={0.024}
          rotationX={0.08}
          rotationZ={0.033}
          intensity={5.2}
        />
        <Model ref={modelRef} scale={2.5} rotation={[Math.PI / 2, 0, 0]} />
      </Canvas>
      {text && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="font-grid text-2xl font-bold text-white uppercase lg:text-4xl">
            {text}
          </span>
        </div>
      )}
    </div>
  );
};

export default Button3dWrapper;
