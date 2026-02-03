import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import hdrTextureUrl from '../assets/texture/vertopal.com_360_F_273357547_Ic0xehzpiQgKdGqsyaDFo8jcJtUnMGnU.hdr?url';

// HDR rotation on Y-axis: 0.0 = 0°, 0.25 = 90°, 0.5 = 180°, 0.75 = 270°
const HDR_ROTATION_Y = 0.25; // Adjust this value to rotate the HDR environment horizontally
// HDR rotation on X-axis: 0.0 = 0°, 0.25 = 90°, 0.5 = 180°, 0.75 = 270°
const HDR_ROTATION_X = 0.0; // Adjust this value to rotate the HDR environment vertically
// HDR rotation on Z-axis: 0.0 = 0°, 0.25 = 90°, 0.5 = 180°, 0.75 = 270°
const HDR_ROTATION_Z = 0.0; // Adjust this value to rotate the HDR environment around the forward/back axis (roll/tilt)

interface HDREnvironmentProps {
  hdrUrl?: string;
  rotationY?: number;
  rotationX?: number;
  rotationZ?: number;
  intensity?: number; // Intensity multiplier for regular images (default: 1.0, can be increased for more "emission")
}

/**
 * HDR Environment Component
 * Loads and sets up HDR environment map for IBL lighting
 * Add this component inside any Canvas to provide HDR lighting
 */
export const HDREnvironment = ({
  hdrUrl = hdrTextureUrl,
  rotationY = HDR_ROTATION_Y,
  rotationX = HDR_ROTATION_X,
  rotationZ = HDR_ROTATION_Z,
  intensity = 2.0,
}: HDREnvironmentProps) => {
  const { gl, scene } = useThree();
  const [envMap, setEnvMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new HDRLoader();

    loader.load(
      hdrUrl,
      (texture: THREE.DataTexture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.flipY = false;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        try {
          // Convert to PMREM for optimized IBL - this is crucial for proper lighting
          const pmremGenerator = new THREE.PMREMGenerator(gl);
          pmremGenerator.compileEquirectangularShader();
          const envMapResult = pmremGenerator.fromEquirectangular(texture);
          const envMapTexture = envMapResult.texture;

          // Set as scene environment - provides IBL lighting to all materials
          scene.environment = envMapTexture;

          // Apply rotation using scene.environmentRotation (works with PMREM)
          // Convert normalized rotation values (0-1) to radians (0-2π)
          // rotationX = vertical rotation (pitch), rotationY = horizontal rotation (yaw), rotationZ = roll/tilt
          scene.environmentRotation = new THREE.Euler(
            rotationX * 2 * Math.PI,
            rotationY * 2 * Math.PI,
            rotationZ * 2 * Math.PI,
            'XYZ',
          );

          // Don't dispose envMapResult - it contains the texture we need
          // Only dispose the generator and original texture
          pmremGenerator.dispose();
          texture.dispose();

          setEnvMap(envMapTexture);
        } catch (pmremError) {
          console.error(
            'PMREM conversion failed, using texture directly:',
            pmremError,
          );
          scene.environment = texture;
          // Apply rotation even without PMREM
          scene.environmentRotation = new THREE.Euler(
            rotationX * 2 * Math.PI,
            rotationY * 2 * Math.PI,
            rotationZ * 2 * Math.PI,
            'XYZ',
          );
          setEnvMap(texture);
        }
      },
      (error: unknown) => {
        console.error('Error loading HDR texture:', error);
        console.error('HDR URL was:', hdrUrl);
      },
    );
  }, [gl, scene, hdrUrl, rotationY, rotationX, rotationZ, intensity]);

  // Cleanup: clear scene environment and dispose textures
  useEffect(() => {
    return () => {
      if (scene.environment === envMap) {
        scene.environment = null;
      }
      if (envMap) {
        envMap.dispose();
      }
    };
  }, [envMap, scene]);

  return null;
};
