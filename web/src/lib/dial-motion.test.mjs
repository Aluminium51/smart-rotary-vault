import test from "node:test";
import assert from "node:assert/strict";
import { nextDialAngle } from "./dial-motion.ts";

test("clockwise wrap advances one step", () => {
  assert.deepEqual(nextDialAngle(99, 99 * 3.6, 0, "CW"), { angle: 360, animate: true });
});

test("counterclockwise wrap retreats one step", () => {
  assert.deepEqual(nextDialAngle(0, 0, 99, "CCW"), { angle: -3.6, animate: true });
});

test("idle, unchanged, and large jumps do not spin", () => {
  assert.deepEqual(nextDialAngle(10, 36, 10, "CW"), { angle: 36, animate: false });
  assert.deepEqual(nextDialAngle(10, 36, 20, "IDLE"), { angle: 72, animate: false });
  assert.deepEqual(nextDialAngle(10, 36, 80, "CW"), { angle: 288, animate: false });
});

test("latest position takes precedence during rapid changes", () => {
  const first = nextDialAngle(99, 356.4, 0, "CW");
  assert.deepEqual(nextDialAngle(0, first.angle, 1, "CW"), { angle: 363.6, animate: true });
});
