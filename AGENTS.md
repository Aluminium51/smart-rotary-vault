<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

# AGENTS.md — Smart Rotary & Tamper Vault

## 1. Project Overview

Smart Rotary & Tamper Vault is an IoT-based security system that combines embedded hardware, cloud connectivity, and a real-time web dashboard.

The system supports rotary password authentication, tamper detection, security event logging, and remote administration.

This repository contains the Next.js web application and firmware for STM32 and ESP32-S3 microcontrollers.

## 2. Technology Stack

### Web Application
- Next.js (App Router)
- React and TypeScript
- Tailwind CSS
- shadcn/ui and Lucide React
- Firebase Authentication
- Firebase Realtime Database
- Recharts
- pnpm

### Embedded Systems
- STM32 — Sensor processing, authentication state machine, and actuator control
- ESP32-S3 — Wi-Fi connectivity and cloud communication
- UART — Communication between microcontrollers

## 3. System Architecture

```text
Sensors & Actuators
        |
       STM32
        |
       UART
        |
     ESP32-S3
        |
    Wi-Fi / TLS
        |
 Firebase Realtime Database
        |
  Next.js Dashboard
```

### Responsibilities

- **STM32:** Owns the physical vault state, password verification, tamper detection, and hardware control.
- **ESP32-S3:** Bridges communication between STM32 and Firebase.
- **Firebase:** Stores device status, commands, and security event logs.
- **Next.js:** Provides monitoring, authentication, visualization, and authorized remote commands.

The STM32 is the source of truth for physical security states.

The web application must never assume a hardware command has succeeded without device acknowledgment.

## 4. Repository Structure

```text
smart-rotary-vault/
├── web/
│   └── src/
│       ├── app/
│       ├── components/
│       │   └── ui/
│       ├── hooks/
│       ├── lib/
│       ├── services/
│       └── types/
├── firmware/
│   ├── stm32/
│   └── esp32/
├── docs/
└── README.md
```

Follow the existing repository structure. Do not create new architectural layers or directories without a clear need.

## 5. Coding Standards

### General Principles

- Write simple, readable, maintainable, and production-minded code.
- Prefer the simplest solution that satisfies the requirements.
- Follow existing conventions before introducing new patterns.
- Avoid unnecessary abstractions, dependencies, and premature optimization.
- Keep functions small and focused on a single responsibility.
- Use descriptive and consistent naming.
- Avoid duplicated logic.
- Do not introduce features beyond the requested scope.

### TypeScript

- Use strict TypeScript typing.
- Avoid `any`; prefer explicit types or `unknown` with validation.
- Define reusable data types in `src/types/`.
- Validate external data at system boundaries.
- Prefer named types for shared interfaces and API contracts.
- Handle null, undefined, loading, and error states explicitly.

### React & Next.js

- Use App Router conventions.
- Prefer Server Components by default.
- Use Client Components only when interactivity, hooks, or browser APIs are required.
- Avoid unnecessary `useEffect` and client-side state.
- Use custom hooks for reusable stateful behavior.
- Keep presentation components separate from data-access logic.
- Use Next.js Route Handlers for server-side operations.
- Never expose server-only credentials or privileged logic to Client Components.

### Styling & UI

- Use Tailwind CSS for styling.
- Reuse existing shadcn/ui components before creating custom primitives.
- Use Lucide React for icons.
- Maintain a consistent dark security-dashboard aesthetic.
- Design responsive, accessible interfaces.
- Provide clear loading, empty, error, and offline states.
- Use semantic HTML and accessible labels.
- Avoid unnecessary animations or visual complexity.

## 6. Firebase & IoT Rules

### Firebase

- Centralize Firebase initialization in `src/lib/`.
- Keep database operations in services or dedicated hooks.
- Use Firebase listeners only where real-time updates are necessary.
- Unsubscribe listeners during component cleanup.
- Avoid redundant subscriptions and unnecessary database reads.
- Use structured, typed database paths.
- Never store credentials or sensitive secrets in source code.
- Enforce access control through Firebase Security Rules and trusted server-side operations.

### Device Communication

- Treat incoming hardware telemetry as external, untrusted data.
- Validate incoming data before displaying or processing it.
- Keep telemetry separate from remote commands.
- Represent remote commands using unique command IDs.
- Track command lifecycle states and acknowledgments.
- Handle device disconnections, timeouts, and stale data.
- Never display a command as successful until the hardware confirms execution.
- Do not modify firmware communication protocols without coordinating changes to the shared data contract.

### Security

- Never expose Firebase Admin credentials to the browser.
- Never bypass authentication or authorization.
- Never allow unauthorized clients to write privileged commands.
- Require confirmation for security-sensitive actions.
- Keep an audit trail of remote security commands.
- Fail safely when the device is offline or commands expire.
- Do not weaken hardware security behavior for UI convenience.

## 7. Development Workflow

Before making changes:

1. Read the relevant files and understand the existing implementation.
2. Identify the scope, dependencies, and potential side effects.
3. Reuse existing utilities and components where practical.
4. For complex or cross-layer changes, provide a concise implementation plan.
5. Avoid modifying unrelated files.

While implementing:

1. Make small, focused changes.
2. Follow established architecture and naming conventions.
3. Handle expected failures and edge cases.
4. Keep components modular and testable.
5. Do not install new dependencies unless necessary.
6. Preserve existing functionality.

After implementing:

1. Review the changed files.
2. Run relevant validation commands.
3. Fix errors introduced by the changes.
4. Check for security and regression issues.
5. Summarize the implementation and any remaining limitations.

Do not claim tests passed unless they were actually executed.

## 8. Commands

Run web commands from the `web/` directory.

```bash
pnpm install
pnpm dev
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Use `pnpm` as the package manager. Do not switch to npm or Yarn.

Run tests when a test script exists and is relevant to the changes.

Do not overwrite or regenerate firmware projects without explicit authorization.

## 9. Agent Behavior

- Act as a pragmatic senior software engineer.
- Prioritize correctness, security, readability, and maintainability.
- Prefer minimal, focused changes over large rewrites.
- Do not invent APIs, environment variables, database fields, or hardware capabilities.
- Inspect the codebase before making assumptions.
- Ask for clarification when an essential requirement is genuinely ambiguous.
- When safe assumptions are possible, proceed and state them clearly.
- Explain meaningful architectural decisions briefly.
- Do not silently change public interfaces or shared data contracts.
- Never claim hardware integration has been tested without actual hardware verification.

## 10. Definition of Done

A task is complete when:

- The requested behavior is implemented.
- Existing functionality is preserved.
- TypeScript and lint checks pass, or remaining issues are reported.
- Relevant tests are executed when available.
- Loading, error, and edge cases are handled.
- Security requirements are respected.
- No secrets or unrelated files are included.
- The final response clearly summarizes changes, verification, and limitations.

<!-- END:nextjs-agent-rules -->
