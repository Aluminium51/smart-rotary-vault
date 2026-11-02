"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { RotaryDial } from "@/components/dashboard/rotary-dial";
import type { VaultTelemetry } from "@/types/vault";
import { VaultScene } from "./vault-scene";

class ViewerBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function Fallback({ telemetry }: { telemetry: VaultTelemetry }) {
  return <div role="status" className="flex flex-1 flex-col justify-center py-3"><p className="technical-label text-center">3D unavailable / 2D monitor active</p><RotaryDial position={telemetry.position} direction={telemetry.direction} /></div>;
}

export default function VaultViewer({ telemetry }: { telemetry: VaultTelemetry }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [lost, setLost] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    const frame = window.requestAnimationFrame(() => {
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
        setSupported(Boolean(context));
        context?.getExtension("WEBGL_lose_context")?.loseContext();
      } catch { setSupported(false); }
      update();
    });
    media.addEventListener("change", update);
    return () => { window.cancelAnimationFrame(frame); media.removeEventListener("change", update); };
  }, []);

  const fallback = <Fallback telemetry={telemetry} />;
  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
      <div><p className="technical-label">Digital twin</p><p className="mt-1 text-[.65rem] uppercase tracking-[.1em] text-muted">Simulation</p></div>
      {supported && !lost && !failed && <button type="button" className="border border-white/25 px-3 py-2 text-[.68rem] uppercase hover:bg-elevated" onClick={() => setResetKey((key) => key + 1)}>Reset view</button>}
    </div>
    {telemetry.mode === "unlocked" && telemetry.connection === "online" && <p className="mt-3 shrink-0 border-l-2 border-warning pl-3 text-xs text-warning">Illustrative door position / physical opening unconfirmed</p>}
    {telemetry.connection === "offline" && <p className="mt-3 shrink-0 border-l-2 border-offline pl-3 text-xs text-muted">Mock telemetry offline / last fixture shown</p>}
    {supported === null ? <div role="status" className="flex min-h-[280px] flex-1 items-center justify-center text-xs text-muted">Loading 3D viewer…</div>
      : !supported || lost || failed ? fallback
        : <ViewerBoundary fallback={fallback} onError={() => setFailed(true)}>
          <div className="relative min-h-[280px] w-full flex-1 sm:min-h-[300px]" aria-label="Interactive simulated 3D vault">
            <div className="absolute inset-0">
              <Canvas frameloop="demand" camera={{ position: [4.4, 2.5, 5.5], fov: 38 }} gl={{ antialias: true, powerPreference: "low-power" }}>
                <VaultScene telemetry={telemetry} reducedMotion={reducedMotion} resetKey={resetKey} onContextLost={() => setLost(true)} />
              </Canvas>
            </div>
          </div>
        </ViewerBoundary>}
    <div className="mt-auto shrink-0">
      <div className="flex flex-wrap justify-between gap-2 border-t hairline pt-3 text-[.68rem] uppercase"><span>Position {String(telemetry.position).padStart(2, "0")} / 100</span><span>Direction {telemetry.direction === "IDLE" ? "Idle" : telemetry.direction}</span></div>
      {supported && !lost && !failed && <p className="mt-2 text-[.68rem] text-muted">Drag to rotate · Scroll/pinch to zoom</p>}
    </div>
  </div>;
}
