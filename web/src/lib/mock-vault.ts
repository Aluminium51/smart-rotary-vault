import type { CommandKind, CommandStatus, RemoteCommand, SecurityEvent, VaultTelemetry } from "../types/vault.ts";

export const scenarioLabels = {
  secured: "Locked / secured",
  unlocked: "Local unlock",
  attempts: "Failed attempts",
  alarm: "Tamper alarm",
  lockout: "Access lockout",
  offline: "Device offline",
} as const;

export type Scenario = keyof typeof scenarioLabels;

const base: VaultTelemetry = {
  mode: "locked",
  connection: "online",
  updatedAt: "2026-10-28T09:42:18+07:00",
  position: 24,
  direction: "CW",
  failedAttempts: 0,
  tamper: false,
  warning: "No active security warnings.",
  commandsAvailable: true,
};

export function getScenario(scenario: Scenario): VaultTelemetry {
  switch (scenario) {
    case "unlocked":
      return { ...base, mode: "unlocked", position: 38, direction: "CCW", warning: "Local authentication accepted." };
    case "attempts":
      return { ...base, position: 15, direction: "CCW", failedAttempts: 3, warning: "Repeated access attempts detected." };
    case "alarm":
      return { ...base, mode: "alarm", position: 24, direction: "IDLE", tamper: true, warning: "Tamper sensor triggered. Inspect device locally." };
    case "lockout":
      return { ...base, mode: "lockout", direction: "IDLE", failedAttempts: 5, warning: "Authentication locked out after repeated failures." };
    case "offline":
      return { ...base, connection: "offline", updatedAt: "2026-10-28T09:27:04+07:00", direction: "IDLE", warning: "Device offline. Status may be stale.", commandsAvailable: false };
    default:
      return { ...base };
  }
}

export function simulateCommandResult(_kind: CommandKind, response: "pending" | "acknowledged" | "rejected"): CommandStatus {
  if (response === "pending") return "pending";
  return response === "acknowledged" ? "executed" : "rejected";
}

export function createMockCommandId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `SIM-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

export const events: SecurityEvent[] = [
  { id: "EVT-1048", at: "2026-10-28T09:42:18+07:00", type: "access", severity: "info", title: "Vault secured", detail: "Local lock state confirmed by controller." },
  { id: "EVT-1047", at: "2026-10-28T09:41:02+07:00", type: "authentication", severity: "info", title: "Local unlock accepted", detail: "Rotary authentication completed at device." },
  { id: "EVT-1046", at: "2026-10-28T09:38:41+07:00", type: "authentication", severity: "warning", title: "Access denied", detail: "Invalid local rotary entry; attempt 3 of 5." },
  { id: "EVT-1045", at: "2026-10-28T09:38:10+07:00", type: "authentication", severity: "warning", title: "Access denied", detail: "Invalid local rotary entry; attempt 2 of 5." },
  { id: "EVT-1044", at: "2026-10-28T08:26:54+07:00", type: "tamper", severity: "critical", title: "Tamper detected", detail: "Impact sensor triggered; alarm activated." },
  { id: "EVT-1043", at: "2026-10-28T08:20:16+07:00", type: "command", severity: "info", title: "Alarm silence acknowledged", detail: "Simulated controller acknowledgment recorded." },
  { id: "EVT-1041", at: "2026-10-28T07:56:29+07:00", type: "connection", severity: "info", title: "Gateway reconnected", detail: "Telemetry resumed after reconnect." },
  { id: "EVT-1042", at: "2026-10-28T07:55:03+07:00", type: "connection", severity: "warning", title: "Gateway disconnected", detail: "ESP32-S3 connection lost; telemetry paused." },
];

const scenarioEvents: Partial<Record<Scenario, SecurityEvent>> = {
  unlocked: { id: "SCN-unlocked", at: "2026-10-28T09:48:00+07:00", type: "access", severity: "info", title: "Local unlock accepted", detail: "Selected demonstration scenario; controller state simulated." },
  attempts: { id: "SCN-attempts", at: "2026-10-28T09:48:00+07:00", type: "authentication", severity: "warning", title: "Repeated access denied", detail: "Three failed local authentication attempts simulated." },
  alarm: { id: "SCN-alarm", at: "2026-10-28T09:48:00+07:00", type: "tamper", severity: "critical", title: "Tamper detected", detail: "Selected demonstration scenario; alarm state simulated." },
  lockout: { id: "SCN-lockout", at: "2026-10-28T09:48:00+07:00", type: "authentication", severity: "critical", title: "Access lockout active", detail: "Failed-attempt threshold simulated at device." },
  offline: { id: "SCN-offline", at: "2026-10-28T09:48:00+07:00", type: "connection", severity: "warning", title: "Device offline", detail: "Connection loss simulated; last telemetry is stale." },
};

export function getVisibleEvents(scenario: Scenario, commands: RemoteCommand[]): SecurityEvent[] {
  const commandEvents: SecurityEvent[] = commands.map((command) => ({
    id: command.id,
    at: command.createdAt,
    type: "command",
    severity: command.status === "executed" ? "info" : "warning",
    title: command.status === "executed" ? `${command.kind === "silence" ? "Alarm silence" : "Lockout"} acknowledged`
      : `Command ${command.status}`,
    detail: `Simulated ${command.kind} request; ${command.status}. No hardware action.`,
  }));
  const currentScenario = scenarioEvents[scenario];
  return [...commandEvents, ...(currentScenario ? [currentScenario] : []), ...events]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
