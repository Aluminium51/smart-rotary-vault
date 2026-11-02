"use client";

import { useEffect, useRef, type ComponentRef } from "react";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import type { VaultTelemetry } from "@/types/vault";
import { VaultModel } from "./vault-model";

const home = new Vector3(4.4, 2.5, 5.5);
const center = new Vector3(0, 0, 0);

export function VaultScene({ telemetry, reducedMotion, resetKey, onContextLost }: {
  telemetry: VaultTelemetry;
  reducedMotion: boolean;
  resetKey: number;
  onContextLost: () => void;
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const resetting = useRef(false);
  const { camera, gl, invalidate } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => { event.preventDefault(); onContextLost(); };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onContextLost]);

  useEffect(() => {
    if (!resetKey) return;
    if (reducedMotion) {
      camera.position.copy(home);
      controls.current?.target.copy(center);
      controls.current?.update();
    } else resetting.current = true;
    invalidate();
  }, [resetKey, reducedMotion, camera, invalidate]);

  useFrame((_, delta) => {
    if (!resetting.current || !controls.current) return;
    const factor = 1 - Math.exp(-9 * Math.min(delta, 0.05));
    camera.position.lerp(home, factor);
    controls.current.target.lerp(center, factor);
    controls.current.update();
    if (camera.position.distanceTo(home) < 0.005 && controls.current.target.distanceTo(center) < 0.005) {
      camera.position.copy(home);
      controls.current.target.copy(center);
      controls.current.update();
      resetting.current = false;
    } else invalidate();
  });

  return <>
    <ambientLight intensity={1.6} />
    <directionalLight position={[3, 5, 6]} intensity={2.6} />
    <directionalLight position={[-4, 2, 4]} intensity={1.2} />
    <VaultModel telemetry={telemetry} reducedMotion={reducedMotion} />
    <OrbitControls ref={controls} onStart={() => { resetting.current = false; }} enablePan={false} enableDamping={!reducedMotion} dampingFactor={0.12} minDistance={5} maxDistance={9} minPolarAngle={0.55} maxPolarAngle={1.85} minAzimuthAngle={-1.35} maxAzimuthAngle={1.35} />
  </>;
}
