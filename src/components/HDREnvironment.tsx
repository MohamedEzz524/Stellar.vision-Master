import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import hdrTextureUrl from '../assets/models/hdr.jpeg?url';

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
 * Loads and sets up HDR environment map or regular image (JPEG/PNG) for IBL lighting
 * Supports both .hdr files and regular images (assumes equirectangular/360° format)
 * The image acts like a sphere surrounding the scene, emitting light based on pixel brightness
 * Add this component inside any Canvas to provide environment lighting
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
    // Check if the file is an HDR file or a regular image
    const isHDR = hdrUrl.toLowerCase().endsWith('.hdr');
    const isEXR = hdrUrl.toLowerCase().endsWith('.exr');

    const setupEnvironmentMap = (texture: THREE.Texture) => {
      let finalTexture = texture;

      finalTexture.mapping = THREE.EquirectangularReflectionMapping;
      finalTexture.flipY = false;
      finalTexture.wrapS = THREE.RepeatWrapping;
      finalTexture.wrapT = THREE.RepeatWrapping;

      // For regular images (JPEG/PNG), apply intensity multiplier to boost "emission"
      if (!isHDR && !isEXR && intensity !== 1.0) {
        // Create a canvas to multiply the texture intensity
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = finalTexture.image;
        if (ctx && img && img instanceof HTMLImageElement) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Multiply RGB values by intensity (clamped to 0-255)
          for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] * intensity); // R
            data[i + 1] = Math.min(255, data[i + 1] * intensity); // G
            data[i + 2] = Math.min(255, data[i + 2] * intensity); // B
            // Alpha stays the same
          }

          ctx.putImageData(imageData, 0, 0);
          const adjustedTexture = new THREE.CanvasTexture(canvas);
          adjustedTexture.mapping = finalTexture.mapping;
          adjustedTexture.flipY = finalTexture.flipY;
          adjustedTexture.wrapS = finalTexture.wrapS;
          adjustedTexture.wrapT = finalTexture.wrapT;

          // Dispose original texture
          finalTexture.dispose();
          finalTexture = adjustedTexture;
        }
      }

      try {
        // Convert to PMREM for optimized IBL - this is crucial for proper lighting
        const pmremGenerator = new THREE.PMREMGenerator(gl);
        pmremGenerator.compileEquirectangularShader();
        const envMapResult = pmremGenerator.fromEquirectangular(finalTexture);
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
        finalTexture.dispose();

        setEnvMap(envMapTexture);
      } catch {
        // If PMREM conversion fails, use texture directly
        scene.environment = finalTexture;
        // Apply rotation even without PMREM
        scene.environmentRotation = new THREE.Euler(
          rotationX * 2 * Math.PI,
          rotationY * 2 * Math.PI,
          rotationZ * 2 * Math.PI,
          'XYZ',
        );
        setEnvMap(finalTexture);
      }
    };

    if (isHDR || isEXR) {
      // Load HDR/EXR file
      const loader = new HDRLoader();
      loader.load(
        hdrUrl,
        (texture: THREE.DataTexture) => {
          setupEnvironmentMap(texture);
        },
        undefined,
        (error: unknown) => {
          console.error('Error loading HDR texture:', error);
          console.error('HDR URL was:', hdrUrl);
        },
      );
    } else {
      // Load regular image (JPEG, PNG, etc.)
      const loader = new THREE.TextureLoader();
      loader.load(
        hdrUrl,
        (texture: THREE.Texture) => {
          setupEnvironmentMap(texture);
        },
        undefined,
        (error: unknown) => {
          console.error('Error loading image texture:', error);
          console.error('Image URL was:', hdrUrl);
        },
      );
    }
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
