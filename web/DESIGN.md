# DESIGN.md — Smart Rotary & Tamper Vault

## 1. Design Direction

**Style:** Industrial Terminal Brutalism  
**Theme:** Dark Only  
**Keywords:** Precision, Security, Monospace, Minimal, Technical, Industrial

Create a distinctive operational dashboard inspired by terminal interfaces, industrial control panels, and precision instruments.

The design should communicate reliability, control, technical sophistication, and clarity.

### Core Principles

- Function over decoration.
- Typography establishes hierarchy.
- Borders define structure.
- Color communicates meaning.
- Information density should remain readable.
- Every animation must serve a functional purpose.

Avoid generic SaaS dashboards, unnecessary gradients, glassmorphism, decorative glows, and excessive rounded cards.

## 2. Design Tokens

### Colors

| Token | Value | Usage |
|---|---|---|
| Background | `#1F2228` | Main application background |
| Surface | `#252930` | Panels and secondary regions |
| Surface Elevated | `#2B3038` | Interactive surfaces |
| Border | `rgba(255,255,255,0.12)` | Default borders |
| Border Strong | `rgba(255,255,255,0.25)` | Active elements |
| Foreground | `#F5F5F5` | Primary text |
| Muted | `#A0A5AE` | Supporting text |
| Accent | `#FFFFFF` | Primary actions |
| Success | `#73D9AA` | Confirmed healthy states |
| Warning | `#F0C674` | Warnings |
| Danger | `#F07878` | Critical alerts |
| Offline | `#858B94` | Disconnected devices |

Use semantic colors sparingly. The default interface should remain predominantly monochromatic.

Never rely on color alone to communicate device status.

### Typography

**Primary Font:** Geist Mono

Use monospace typography as the dominant visual identity.

- Hero: `clamp(2.5rem, 5vw, 4rem)` / 400
- Page Heading: `2.25rem` / 500
- Section Heading: `1.5rem` / 500
- Body: `1rem` / 400
- Labels: `0.75rem` / 500 / Uppercase
- Telemetry: `clamp(2rem, 4vw, 3.5rem)` / 400

Use letter spacing for uppercase labels and technical metadata.

Maintain readable line lengths and clear typographic hierarchy.

## 3. Geometry & Depth

- Border radius: `0px`
- Shadows: None
- Default border: `1px solid`
- Spacing unit: `8px`
- Maximum content width: `1440px`
- Use spacing and borders to establish hierarchy.

Avoid card-heavy interfaces.

Prefer structural panels, dividers, and asymmetric layouts over repeated identical cards.

## 4. Layout

### Application Dashboard

- Desktop: Asymmetric 12-column grid.
- Tablet: Adaptive two-column layout.
- Mobile: Single-column layout.
- Prioritize critical security information.
- Maintain consistent alignment and spacing.
- Avoid horizontal overflow.

### Visual Hierarchy

1. Current vault security state
2. Critical alerts and connection status
3. Rotary dial telemetry
4. Remote control actions
5. Security logs and historical analytics

Avoid using landing-page hero compositions inside operational dashboards.

### Landing Pages

- Large expressive monospace headlines.
- Generous negative space.
- Minimal navigation.
- Strong typographic hierarchy.
- Clear primary action.

## 5. Component Specifications

### Vault Status

- Prominent status typography.
- Display confirmed states only.
- Include last update timestamp.
- Clearly distinguish LOCKED, UNLOCKED, ALARM, LOCKOUT, and OFFLINE.

### Rotary Dial

- Custom circular visualization inspired by a mechanical combination lock.
- Display position and rotation direction.
- Animate in response to telemetry changes.
- Support reduced-motion preferences.
- Never reveal the secret combination.

### Remote Control

- Sharp rectangular buttons.
- Uppercase monospace labels.
- Require confirmation for sensitive actions.
- Show PENDING, EXECUTED, REJECTED, and FAILED command states.
- Disable commands when device state prevents safe execution.

### Security Event Log

- Prefer structured rows or a compact timeline.
- Display severity, event type, and timestamp.
- Use consistent alignment.
- Allow important events to stand out without excessive decoration.

### Charts

- Minimal chart decoration.
- Subtle grid lines.
- Monospace axis labels.
- Limited semantic colors.
- Avoid unnecessary legends and animations.

## 6. Interaction & Motion

- Standard transitions: `150–250ms`
- Entry animations: subtle fade and translate.
- Animate only `transform` and `opacity` where practical.
- No permanent decorative animations.
- Respect `prefers-reduced-motion`.

### Hover & Focus

- Prefer subtle border or background changes.
- Dim decorative elements only when readability is preserved.
- Never reduce text contrast below accessible levels.
- Use clearly visible keyboard focus indicators.

## 7. UI Copywriting

Use short, technical, and purposeful language.

Prefer:
- `SYSTEM SECURED`
- `ACCESS DENIED`
- `TAMPER DETECTED`
- `COMMAND PENDING`
- `DEVICE OFFLINE`
- `LAST SYNC`

Avoid generic marketing language and unnecessary decorative text.

## 8. Accessibility & Responsive Rules

- Maintain WCAG AA text contrast wherever applicable.
- Support keyboard navigation.
- Use semantic HTML.
- Provide clear focus indicators.
- Make controls touch-friendly.
- Do not communicate state using color alone.
- Handle loading, empty, offline, and error states.
- Prefer `min-h-[100dvh]` over fixed viewport heights.

## 9. Implementation Rules

- Implement design tokens using CSS variables.
- Use Tailwind CSS and existing shadcn/ui components.
- Customize shadcn/ui to match the design system.
- Do not introduce arbitrary visual patterns.
- Reuse shared components and tokens.
- Maintain consistency across all pages.
- Prioritize accessibility over decorative design rules.
- Keep visual decisions consistent with this document.

## 10. Design Quality Checklist

Before completing UI work, verify:

- The interface follows the established design tokens.
- Typography is consistent.
- Borders and spacing create clear hierarchy.
- No unnecessary shadows, gradients, or rounded corners exist.
- Desktop and mobile layouts work correctly.
- Security states are immediately understandable.
- Interactive elements have proper feedback.
- The result looks like a purpose-built industrial security system, not a generic dashboard.