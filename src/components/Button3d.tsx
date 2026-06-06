import { forwardRef, useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import btnModelUrl from '../assets/models/last button.compressed.glb?url';

export const Model = forwardRef<
  THREE.Group,
  React.ComponentPropsWithoutRef<'group'>
>((props, ref) => {
  const { scene: gltfScene } = useGLTF(btnModelUrl) as unknown as {
    scene: THREE.Group;
  };

  const buttonMeshRef = useRef<THREE.Mesh | null>(null);
  const cubeRef = useRef<THREE.Mesh | null>(null);

  // Find the main button mesh
  useEffect(() => {
    gltfScene.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && !buttonMeshRef.current) {
        buttonMeshRef.current = child;
      }
    });
  }, [gltfScene]);

  const cubeMesh = useMemo(() => {
    if (!buttonMeshRef.current) return null;

    // Get the button's geometry bounding box
    if (!buttonMeshRef.current.geometry.boundingBox) {
      buttonMeshRef.current.geometry.computeBoundingBox();
    }
    const buttonBox = buttonMeshRef.current.geometry.boundingBox!;

    if (!buttonBox) return null;

    const buttonSize = new THREE.Vector3();
    buttonBox.getSize(buttonSize);

    // Create cube with specified proportions
    const geometry = new THREE.BoxGeometry(
      buttonSize.x * 0.9, // width: 90%
      buttonSize.y * 0.9, // height: 90%
      buttonSize.z * 0.5, // depth: 50%
    );

    // Center the cube geometry
    geometry.center();

    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.1,
      transparent: true,
      opacity: 0.8,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    // Position at button's origin
    mesh.position.set(0, 0, 0);

    return mesh;
  }, [buttonMeshRef.current]);

  // Parent cube to button mesh
  useEffect(() => {
    if (cubeMesh && buttonMeshRef.current) {
      buttonMeshRef.current.add(cubeMesh);
      cubeRef.current = cubeMesh;

      return () => {
        buttonMeshRef.current?.remove(cubeMesh);
        cubeMesh.geometry.dispose();
        cubeMesh.material.dispose();
      };
    }
  }, [cubeMesh]);

  return (
    <group ref={ref} {...props}>
      <primitive object={gltfScene} dispose={null} />
    </group>
  );
});

Model.displayName = 'Model';
useGLTF.preload(btnModelUrl);
