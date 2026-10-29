export type VaultMode = "locked" | "unlocked" | "alarm" | "lockout";
export type Connection = "online" | "offline";
export type Direction = "CW" | "CCW" | "IDLE";
export type Severity = "info" | "warning" | "critical";
export type EventType = "access" | "authentication" | "tamper" | "connection" | "command";
export type CommandKind = "lockout" | "silence";
export type CommandStatus = "pending" | "acknowledged" | "executed" | "rejected" | "failed";

export interface VaultTelemetry {
  mode: VaultMode;
  connection: Connection;
  updatedAt: string;
  position: number;
  direction: Direction;
  failedAttempts: number;
  tamper: boolean;
  warning: string;
  commandsAvailable: boolean;
}

export interface SecurityEvent {
  id: string;
  at: string;
  type: EventType;
  severity: Severity;
  title: string;
  detail: string;
}

export interface RemoteCommand {
  id: string;
  kind: CommandKind;
  status: CommandStatus;
  createdAt: string;
}
