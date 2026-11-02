import test from "node:test";
import assert from "node:assert/strict";
import { commandStatusLabels, createMockCommandId, getRecentEvents, getScenario, getVisibleEvents, simulateCommandResult } from "./mock-vault.ts";

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
  assert.equal(visible[0].title, "Alarm silence / SIMULATION COMPLETE");
  assert.equal(visible[1].title, "Tamper detected");
  assert.equal(visible.some((event) => event.title === "Vault secured"), true);
});

test("all command outcomes use explicit simulation labels", () => {
  assert.deepEqual(commandStatusLabels, {
    pending: "SIMULATION PENDING",
    acknowledged: "SIMULATED ACK",
    executed: "SIMULATION COMPLETE",
    rejected: "SIMULATED REJECTION",
    failed: "SIMULATION TIMED OUT",
  });
});

test("repeated command presentation preserves every audit ID, timestamp, and record", () => {
  const statuses = ["pending", "acknowledged", "executed", "rejected", "failed"];
  const commands = Array.from({ length: 25 }, (_, index) => ({
    id: `SIM-${index}`, kind: "silence", status: statuses[index % statuses.length],
    createdAt: new Date(Date.UTC(2026, 10, 2, 3, 0, index)).toISOString(),
  }));
  const original = structuredClone(commands);
  const visible = getVisibleEvents("alarm", commands);
  const commandEvents = visible.filter((event) => event.type === "command" && event.id.startsWith("SIM-"));
  assert.equal(commandEvents.length, 25);
  for (const command of commands) {
    const event = commandEvents.find((event) => event.id === command.id);
    assert.equal(event.at, command.createdAt);
    assert.equal(event.title, `Alarm silence / ${commandStatusLabels[command.status]}`);
    assert.match(event.detail, /No hardware action/);
  }
  assert.deepEqual(commands, original);
  const recent = getRecentEvents(visible, true);
  assert.equal(recent.length, 4);
  assert.equal(recent.some((event) => event.id === "SCN-alarm"), true);
});

test("active tamper event remains in recent events after silence command outcomes", () => {
  const commands = ["executed", "rejected", "failed", "executed", "rejected"].map((status, index) => ({
    id: `SIM-${index}`, kind: "silence", status, createdAt: `2026-11-02T10:00:0${index}+07:00`,
  }));
  const visible = getVisibleEvents("alarm", commands);
  const recent = getRecentEvents([...visible, visible[0]], getScenario("alarm").tamper);
  assert.equal(recent.length, 4);
  assert.equal(new Set(recent.map((event) => event.id)).size, 4);
  assert.equal(recent.some((event) => event.id === "SCN-alarm" && event.severity === "critical"), true);
  assert.deepEqual(recent.map((event) => event.at), [...recent].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).map((event) => event.at));
  assert.equal(getScenario("alarm").tamper, true);
  assert.equal(getScenario("alarm").mode, "alarm");
});

test("authentication failures do not retain a historical tamper event", () => {
  for (const scenario of ["secured", "unlocked", "attempts", "lockout", "offline"]) {
    const telemetry = getScenario(scenario);
    const visible = getVisibleEvents(scenario, []);
    assert.equal(telemetry.tamper, false);
    assert.deepEqual(getRecentEvents(visible, telemetry.tamper), visible.slice(0, 4));
  }
});
