"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { nextDialAngle } from "@/lib/dial-motion";
import type { VaultTelemetry } from "@/types/vault";

export function VaultModel({ telemetry, reducedMotion }: { telemetry: VaultTelemetry; reducedMotion: boolean }) {
  const door = useRef<Group>(null);
  const dial = useRef<Group>(null);
  const previous = useRef({ position: telemetry.position, angle: telemetry.position * 3.6 });
  const target = useRef({ door: telemetry.mode === "unlocked" && telemetry.connection === "online" ? -1.05 : 0, dial: telemetry.position * 3.6 });
  const { invalidate } = useThree();

  useEffect(() => {
    const next = nextDialAngle(previous.current.position, previous.current.angle, telemetry.position, telemetry.direction);
    previous.current = { position: telemetry.position, angle: next.angle };
    target.current = { door: telemetry.mode === "unlocked" && telemetry.connection === "online" ? -1.05 : 0, dial: next.angle };
    if (dial.current && (!next.animate || reducedMotion)) dial.current.rotation.z = -next.angle * Math.PI / 180;
    if (door.current && reducedMotion) door.current.rotation.y = target.current.door;
    invalidate();
  }, [telemetry.position, telemetry.direction, telemetry.mode, telemetry.connection, reducedMotion, invalidate]);

  useFrame((_, delta) => {
    if (!door.current || !dial.current) return;
    const factor = reducedMotion ? 1 : 1 - Math.exp(-7 * Math.min(delta, 0.05));
    const dialTarget = -target.current.dial * Math.PI / 180;
    door.current.rotation.y += (target.current.door - door.current.rotation.y) * factor;
    dial.current.rotation.z += (dialTarget - dial.current.rotation.z) * factor;
    if (Math.abs(target.current.door - door.current.rotation.y) > 0.002 || Math.abs(dialTarget - dial.current.rotation.z) > 0.002) invalidate();
  });

  const indicator = telemetry.connection === "offline" ? "#858b94" : telemetry.mode === "alarm" || telemetry.mode === "lockout" ? "#f07878" : telemetry.mode === "unlocked" ? "#f0c674" : "#73d9aa";

  return <group position={[0, 0, 0]}>
    <mesh position={[0, 0, -0.08]} castShadow receiveShadow><boxGeometry args={[2.7, 2.6, 1.95]} /><meshStandardMaterial color="#30353c" metalness={0.55} roughness={0.75} /></mesh>
    <mesh position={[0, 0, 0.92]}><boxGeometry args={[2.34, 2.3, 0.12]} /><meshStandardMaterial color="#15191e" metalness={0.4} roughness={0.85} /></mesh>
    {[-1.23, 1.23].map((x) => <mesh key={`v${x}`} position={[x, 0, 0.95]}><boxGeometry args={[0.12, 2.48, 0.16]} /><meshStandardMaterial color="#555b62" metalness={0.65} roughness={0.62} /></mesh>)}
    {[-1.2, 1.2].map((y) => <mesh key={`h${y}`} position={[0, y, 0.95]}><boxGeometry args={[2.5, 0.12, 0.16]} /><meshStandardMaterial color="#555b62" metalness={0.65} roughness={0.62} /></mesh>)}
    <group ref={door} position={[-1.12, 0, 1.07]}>
      <mesh position={[1.12, 0, 0.1]} castShadow><boxGeometry args={[2.2, 2.16, 0.22]} /><meshStandardMaterial color="#41474e" metalness={0.6} roughness={0.7} /></mesh>
      <mesh position={[1.12, 0, 0.225]}><boxGeometry args={[1.98, 1.94, 0.025]} /><meshStandardMaterial color="#373d44" metalness={0.55} roughness={0.8} /></mesh>
      <group position={[1.02, 0.1, 0.27]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.48, 0.48, 0.07, 40]} /><meshStandardMaterial color="#1d2228" metalness={0.7} roughness={0.55} /></mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.045]}><cylinderGeometry args={[0.39, 0.39, 0.06, 40]} /><meshStandardMaterial color="#666d73" metalness={0.75} roughness={0.52} /></mesh>
        <group ref={dial} position={[0, 0, 0.09]}>
          {Array.from({ length: 20 }, (_, i) => <mesh key={i} position={[Math.sin(i * Math.PI / 10) * 0.32, Math.cos(i * Math.PI / 10) * 0.32, 0.02]} rotation={[0, 0, -i * Math.PI / 10]}><boxGeometry args={[0.015, i % 5 === 0 ? 0.09 : 0.05, 0.018]} /><meshStandardMaterial color="#e0e2e2" /></mesh>)}
          <mesh position={[0, 0.22, 0.06]}><boxGeometry args={[0.025, 0.15, 0.02]} /><meshStandardMaterial color="#f5f5f5" /></mesh>
        </group>
      </group>
      <mesh position={[1.12, 0.63, 0.28]}><boxGeometry args={[0.32, 0.055, 0.055]} /><meshStandardMaterial color="#a0a5ae" metalness={0.7} roughness={0.5} /></mesh>
      <mesh position={[1.93, -0.58, 0.27]}><boxGeometry args={[0.2, 0.34, 0.09]} /><meshStandardMaterial color="#777e85" metalness={0.7} roughness={0.5} /></mesh>
      <mesh position={[1.58, 0.72, 0.29]}><sphereGeometry args={[0.055, 12, 8]} /><meshBasicMaterial color={indicator} /></mesh>
    </group>
    {[-0.75, 0.75].map((y) => <mesh key={y} position={[-1.29, y, 1.12]}><cylinderGeometry args={[0.09, 0.09, 0.4, 12]} /><meshStandardMaterial color="#858b94" metalness={0.75} roughness={0.52} /></mesh>)}
  </group>;
}
