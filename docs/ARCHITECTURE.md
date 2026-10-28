# Architecture — Smart Rotary & Tamper Vault

## 1. Overview

Smart Rotary & Tamper Vault is a distributed IoT security system combining embedded controllers, cloud infrastructure, and a real-time web application.

The system supports rotary password authentication, tamper detection, access monitoring, event logging, and remote security commands.

**Architecture Status:** Initial design — subject to hardware integration.

### Design Principles

- Hardware-first security decisions.
- Clear separation of responsibilities.
- Real-time monitoring with eventual consistency.
- Secure and auditable remote commands.
- Simple, maintainable, and modular code.
- Offline-safe embedded operation.

## 2. System Architecture

```text
KY-040 / KY-002 / KY-006 / KY-019*
                  |
                  v
          STM32 Nucleo-F411RE
          - Encoder processing
          - Password verification
          - Security state machine
          - Actuator control
                  |
               UART
                  |
                  v
              ESP32-S3
          - Wi-Fi connectivity
          - UART message parsing
          - Cloud communication
                  |
               HTTPS/TLS
                  |
                  v
        Firebase Realtime Database
          - Device status
          - Security events
          - Remote commands
                  |
                  v
           Next.js Dashboard
          - Monitoring
          - Authentication
          - Remote administration
```

*KY-019 relay integration is planned and must be confirmed with the hardware team.*

## 3. Component Responsibilities

### STM32 — Hardware Controller

- Read KY-040 rotary encoder input.
- Verify password combinations locally.
- Detect tamper events through KY-002.
- Control buzzer and supported actuators.
- Maintain the vault security state machine.
- Send telemetry and execution results through UART.
- Remain operational when Internet connectivity is unavailable.

STM32 is the authoritative source of physical vault state.

### ESP32-S3 — Communication Gateway

- Establish Wi-Fi connectivity.
- Receive UART messages from STM32.
- Validate and serialize device messages.
- Communicate with the cloud over authenticated, encrypted connections.
- Receive remote commands.
- Forward commands to STM32.
- Report acknowledgment, connectivity, and execution results.

ESP32-S3 must not independently decide whether a vault should unlock.

### Firebase — Cloud Data Layer

- Store the latest reported device status.
- Store security events and access history.
- Maintain remote command records.
- Synchronize changes with the web application.
- Enforce database access policies.

Firebase is not the authority for physical lock state.

### Next.js — Web Application

- Display real-time device information.
- Visualize security events and telemetry.
- Authenticate administrators.
- Submit authorized remote commands.
- Track command execution status.
- Present loading, error, stale-data, and offline states.

Next.js combines the frontend and server-side API within a single application.

## 4. Web Application Structure

```text
web/src/
├── app/
│   ├── dashboard/
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   └── api/
│       └── commands/
│           └── route.ts
├── components/
│   ├── ui/
│   └── dashboard/
├── hooks/
├── lib/
├── services/
└── types/
```

### Layer Responsibilities

| Layer | Responsibility |
|---|---|
| `app/` | Routing, pages, layouts, server endpoints |
| `components/` | Reusable presentation components |
| `hooks/` | React state and subscription management |
| `lib/` | Firebase initialization and shared utilities |
| `services/` | Application data-access operations |
| `types/` | Shared TypeScript contracts |

### Dependency Rules

- Presentation components should not directly implement Firebase write operations.
- Hooks may use services to access real-time data.
- Services must not import React UI components.
- Privileged operations must run through authorized server-side endpoints.
- Server-only modules must never be imported into Client Components.
- Shared types should not depend on UI implementation details.

Avoid introducing additional architectural layers unless required.

## 5. Communication Architecture

### Telemetry Uplink

1. STM32 processes sensor input.
2. STM32 sends a structured UART message.
3. ESP32-S3 validates and forwards the event.
4. Firebase stores the latest device state or event.
5. Next.js receives updated data through a real-time listener.

### Command Downlink

1. An authenticated administrator requests a remote action.
2. The Next.js server validates authorization and command parameters.
3. A uniquely identified command is recorded in Firebase.
4. ESP32-S3 receives the command.
5. ESP32-S3 forwards it to STM32 over UART.
6. STM32 validates and executes or rejects the command.
7. STM32 reports the result.
8. Firebase updates the command record.
9. Next.js displays the confirmed result.

Commands must support expiration, acknowledgments, and duplicate detection.

## 6. Data Architecture

Proposed Firebase Realtime Database structure:

```text
vaults/
└── vault-01/
    ├── status/
    ├── commands/
    │   └── {commandId}/
    └── events/
        └── {eventId}/
```

### Data Ownership

| Data | Authorized Writer |
|---|---|
| Device status | Device gateway |
| Sensor telemetry | Device gateway |
| Security events | Device gateway / trusted audit service |
| Remote command requests | Authorized server |
| Command results | Device gateway |
| Administrator identity | Authentication system |

The exact database schema and authentication mechanism must be finalized before integration.

## 7. Security & Reliability

### Security

- Authenticate all administrators.
- Authorize privileged actions server-side.
- Use HTTPS/TLS for cloud communication.
- Never expose privileged credentials to the browser.
- Validate external payloads.
- Record security-sensitive command activity.
- Do not expose stored passcodes or password combinations through cloud telemetry.
- Require hardware acknowledgment for physical state changes.

### Reliability

- STM32 must continue local security operations offline.
- ESP32-S3 must support reconnection.
- The web application must detect stale status updates.
- Expired commands must not execute.
- Repeated commands must not cause unintended state transitions.
- Device-reported state must remain separate from requested state.

## 8. Architectural Constraints

- Do not introduce a separate backend framework without a documented requirement.
- Keep Next.js frontend and backend within the `web/` application.
- Do not move hardware security decisions into Firebase or Next.js.
- Do not bypass the server-side authorization layer for privileged commands.
- Do not modify shared communication contracts silently.
- Do not duplicate authoritative physical state across independent services.
- Avoid unnecessary dependencies and overengineering.

## 9. Current vs. Planned

### Current Direction

- Next.js web application with TypeScript and pnpm.
- Firebase as the primary cloud data platform.
- STM32 and ESP32-S3 as separate embedded controllers.
- UART for inter-board communication.

### Planned Integration

- Hardware telemetry synchronization.
- Authenticated remote command processing.
- Real-time security event monitoring.
- Device connectivity and command acknowledgments.
- Relay-based physical lock control, pending hardware confirmation.

Implementation status must be verified against source code rather than inferred from this document.

## 10. Architecture Change Policy

When a task affects system architecture:

1. Review this document and the existing implementation.
2. Identify affected components and interfaces.
3. Prefer backward-compatible changes.
4. Coordinate changes to shared hardware/cloud contracts.
5. Update this document after an approved architectural change.
6. Record important design decisions in the repository.

Do not rewrite the architecture merely to accommodate a small feature.