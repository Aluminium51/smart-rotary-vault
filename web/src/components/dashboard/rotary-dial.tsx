import type { VaultTelemetry } from "@/types/vault";

export function RotaryDial({ position, direction }: Pick<VaultTelemetry, "position" | "direction">) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-4">
      <div className="relative aspect-square w-[min(100%,260px)]" role="img" aria-label={`Rotary position ${position}, direction ${direction}`}>
        <div className="dial-track absolute inset-0 rounded-full border border-white/25" />
        <div className="dial-core absolute inset-[12%] rounded-full border border-white/30" />
        <div className="dial-pointer absolute inset-[7%]" style={{ transform: `rotate(${position * 3.6}deg)` }}>
          <div className="absolute left-1/2 top-0 h-7 w-[2px] -translate-x-1/2 bg-white" />
        </div>
        <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full border border-white/15 bg-elevated text-center">
          <span className="technical-label">Position</span>
          <span className="text-[clamp(2.5rem,7vw,4.25rem)] leading-none tabular-nums">{String(position).padStart(2, "0")}</span>
          <span className="mt-2 text-xs text-muted">/ 100</span>
        </div>
      </div>
      <div className="flex w-full max-w-[260px] justify-between border-t hairline pt-3 text-xs uppercase">
        <span className="text-muted">Rotation</span><span>{direction === "IDLE" ? "Stationary" : direction}</span>
      </div>
    </div>
  );
}
