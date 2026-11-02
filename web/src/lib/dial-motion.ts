import type { Direction } from "../types/vault.ts";

export function nextDialAngle(previousPosition: number, previousAngle: number, position: number, direction: Direction) {
  if (position === previousPosition) return { angle: previousAngle, animate: false };
  const steps = direction === "CW" ? (position - previousPosition + 100) % 100
    : direction === "CCW" ? (previousPosition - position + 100) % 100 : 100;
  if (steps > 25) return { angle: position * 3.6, animate: false };
  const angle = previousAngle + steps * 3.6 * (direction === "CW" ? 1 : -1);
  return { angle: Math.round(angle * 10) / 10, animate: true };
}
