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

  // Create cube mesh in local space, centered at button's origin
  const cubeMesh = useMemo(() => {
    if (!buttonMeshRef.current) return null;

    // Get button's bounding box dimensions
    const box = new THREE.Box3().setFromObject(buttonMeshRef.current);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Create cube with proportional dimensions
    const geometry = new THREE.BoxGeometry(
      size.x * 0.9, // 90% of button width
      size.y * 0.9, // 90% of button height
      size.z * 0.5, // 50% of button depth
    );

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

    // Center the cube geometry at its local origin
    geometry.computeBoundingBox();
    const cubeBox = geometry.boundingBox!;
    const cubeCenter = new THREE.Vector3();
    cubeBox.getCenter(cubeCenter);
    geometry.translate(-cubeCenter.x, -cubeCenter.y, -cubeCenter.z);

    // Position at button's origin (0,0,0 in button's local space)
    mesh.position.set(0, 0, 0);

    return mesh;
  }, [buttonMeshRef.current]);

  // Alternative approach: Create cube using button's dimensions directly
  // This is more reliable if button's geometry is already centered at origin
  const cubeMeshAlt = useMemo(() => {
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
    const meshToUse = cubeMeshAlt || cubeMesh;

    if (meshToUse && buttonMeshRef.current) {
      buttonMeshRef.current.add(meshToUse);
      cubeRef.current = meshToUse;

      return () => {
        buttonMeshRef.current?.remove(meshToUse);
        meshToUse.geometry.dispose();
        meshToUse.material.dispose();
      };
    }
  }, [cubeMesh, cubeMeshAlt]);

  return (
    <group ref={ref} {...props}>
      <primitive object={gltfScene} dispose={null} />
    </group>
  );
});

Model.displayName = 'Model';
useGLTF.preload(btnModelUrl);
