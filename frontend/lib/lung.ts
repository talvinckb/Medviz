// Util file to load and decode the lung model

import { useFBX } from "@react-three/drei";
import * as THREE from "three";

export function generate_lung_model() {
  // TODO: dynamic load model from backend ?
  const fbx = useFBX("/models/lungs.fbx");

  // IMPORTANT: clone the FBX model to avoid mutating the original when applying materials
  const clonedFbx = fbx.clone();

  // Apply materials to give it a blue/green translucent look
  // Means that we override the materials of the original model with a custom one
  clonedFbx.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // colors were given by a friend...
      child.material = new THREE.MeshPhysicalMaterial({
        color: 0x60a5fa,
        emissive: 0x1e3a8a,
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 0.6,
        roughness: 0.2,
        metalness: 0.1,
        transmission: 0.8,
        ior: 1.5,
        side: THREE.DoubleSide,
        depthWrite: false, // seems to help when the object has transparency
      });
    }
  });

  return clonedFbx;
}
