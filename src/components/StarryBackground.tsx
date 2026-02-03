import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Configuration
const config = {
  dotColor: '#ffffff',
  dotSize: 2.0,
  sphereRadius: 0.2,
  shellThickness: 0.3,
  starCount: 15000,
  rotationSpeed: 0.1,
};

// Vertex Shader
const vertexShader = `
  varying vec3 vPosition;
  void main() {
    vPosition = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = ${config.dotSize.toFixed(1)};
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment Shader
const fragmentShader = `
  varying vec3 vPosition;
  void main() {
    vec2 uv = gl_PointCoord.xy;
    float dist = distance(uv, vec2(0.5));
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
    if (alpha < 0.1) discard;
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
  }
`;

interface StarrySphereProps {
  rotationSpeed?: number;
}

const StarrySphere: React.FC<StarrySphereProps> = ({
  rotationSpeed = config.rotationSpeed,
}) => {
  const meshRef = useRef<THREE.Points>(null);

  // Create hollow sphere geometry
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(config.starCount * 3);
    const innerRadius = config.sphereRadius * (1.0 - config.shellThickness);

    for (let i = 0; i < config.starCount * 3; i += 3) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const r =
        innerRadius + (config.sphereRadius - innerRadius) * Math.random();

      positions[i] = r * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = r * Math.cos(phi);
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geom;
  }, []);

  // Material
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  // Auto-rotation animation
  useFrame(() => {
    if (meshRef.current && rotationSpeed > 0) {
      meshRef.current.rotation.y += rotationSpeed * 0.01;
    }
  });

  return <points ref={meshRef} geometry={geometry} material={material} />;
};

const StarryBackground: React.FC = () => {
  return (
    <div
      id="background-container"
      className="fixed top-0 left-0 z-[-1] h-full w-full"
    >
      <Canvas
        camera={{ position: [0, 0, 0], fov: 75, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <StarrySphere rotationSpeed={config.rotationSpeed} />
      </Canvas>
    </div>
  );
};

export default StarryBackground;
