import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const config = {
  dotColor: '#ffffff',
  dotSize: 2.0,
  sphereRadius: 0.2,
  shellThickness: 0.3,
  starCount: 15000,
  rotationSpeed: 0.1,
};

const vertexShader = `
  uniform float uTime;
  attribute float aSize;
  attribute float aPhase;
  attribute float aTwinkleSpeed;
  varying float vBrightness;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float twinkle = 0.65 + 0.35 * sin(uTime * aTwinkleSpeed + aPhase);
    vBrightness = twinkle;
    gl_PointSize = ${config.dotSize.toFixed(1)} * aSize * (0.75 + twinkle * 0.5);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying float vBrightness;
  void main() {
    vec2 uv = gl_PointCoord.xy;
    float dist = distance(uv, vec2(0.5));
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
    if (alpha < 0.1) discard;
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha * vBrightness);
  }
`;

interface StarrySphereProps {
  rotationSpeed?: number;
}

const StarrySphere: React.FC<StarrySphereProps> = ({
  rotationSpeed = config.rotationSpeed,
}) => {
  const meshRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(config.starCount * 3);
    const sizes = new Float32Array(config.starCount);
    const phases = new Float32Array(config.starCount);
    const twinkleSpeeds = new Float32Array(config.starCount);
    const innerRadius = config.sphereRadius * (1.0 - config.shellThickness);

    for (let i = 0; i < config.starCount; i++) {
      const i3 = i * 3;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const r =
        innerRadius + (config.sphereRadius - innerRadius) * Math.random();

      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi);

      // Size variation: most stars small/medium, a few bright giants.
      const sizeRoll = Math.random();
      sizes[i] =
        sizeRoll > 0.97
          ? 1.8 + Math.random() * 0.8
          : sizeRoll > 0.85
            ? 1.2 + Math.random() * 0.4
            : 0.55 + Math.random() * 0.55;

      phases[i] = Math.random() * Math.PI * 2;
      twinkleSpeeds[i] = 0.6 + Math.random() * 2.2;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geom.setAttribute(
      'aTwinkleSpeed',
      new THREE.BufferAttribute(twinkleSpeeds, 1),
    );
    return geom;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
        },
      }),
    [],
  );

  // Ambient rotation only. uTime drives twinkling.
  useFrame((_, delta) => {
    if (!meshRef.current || rotationSpeed <= 0) return;
    material.uniforms.uTime.value += delta;
    meshRef.current.rotation.y += rotationSpeed * 0.01;
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
