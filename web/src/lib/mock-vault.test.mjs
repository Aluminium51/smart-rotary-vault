import test from "node:test";
import assert from "node:assert/strict";
import { createMockCommandId, getScenario, getVisibleEvents, simulateCommandResult } from "./mock-vault.ts";

test("offline scenario does not permit remote commands", () => {
  const state = getScenario("offline");
  assert.equal(state.connection, "offline");
  assert.equal(state.commandsAvailable, false);
});

test("lockout uses the three-attempt demonstration threshold", () => {
  assert.equal(getScenario("lockout").failedAttempts, 3);
  assert.match(getVisibleEvents("secured", []).find((event) => event.id === "EVT-1046").detail, /3 of 3/);
});

test("commands require a simulated acknowledgment before execution", () => {
  assert.equal(simulateCommandResult("lockout", "pending"), "pending");
  assert.equal(simulateCommandResult("lockout", "acknowledged"), "executed");
  assert.equal(simulateCommandResult("silence", "rejected"), "rejected");
});

test("mock commands receive distinct IDs without randomUUID", () => {
  const first = createMockCommandId();
  const second = createMockCommandId();
  assert.match(first, /^SIM-[A-F0-9]{16}$/);
  assert.notEqual(first, second);
});

test("event history reflects the selected scenario and session commands", () => {
  const command = { id: "SIM-0000000000000001", kind: "silence", status: "executed", createdAt: "2026-10-28T10:00:00+07:00" };
  const visible = getVisibleEvents("alarm", [command]);
  assert.equal(visible[0].type, "command");
  assert.equal(visible[0].title, "Alarm silence acknowledged");
  assert.equal(visible[1].title, "Tamper detected");
  assert.equal(visible.some((event) => event.title === "Vault secured"), true);
});
