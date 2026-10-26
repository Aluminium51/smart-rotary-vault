# Smart Rotary & Tamper Vault

An IoT-based smart vault security system featuring rotary password authentication, tamper detection, real-time monitoring, and remote control through a web dashboard.

## Features
- **Rotary Password Authentication** – Unlock the vault using a rotary encoder.
- **Tamper Detection** – Detect suspicious vibrations and unauthorized access attempts.
- **Real-time Monitoring** – Monitor vault status and security events through a web dashboard.
- **Remote Control** – Manage vault lockout and security controls remotely.
- **Security Logs** – Track access attempts and security incidents.

## Tech Stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS
- **Cloud & Database:** Firebase Realtime Database
- **Microcontrollers:** STM32, ESP32-S3
- **Communication:** UART, Wi-Fi

## System Architecture

```text
Sensors & Actuators
        |
       STM32
        |
       UART
        |
     ESP32-S3
        |
      Wi-Fi
        |
     Firebase
        |
 Next.js Dashboard
```

## Project Structure

```text
smart-rotary-vault/
├── web/          # Next.js Dashboard
├── firmware/
│   ├── stm32/    # Sensor processing & vault control
│   └── esp32/    # Wi-Fi & cloud communication
└── README.md
```

## Getting Started

This project is currently under development.

## Project Goal

To build a secure IoT vault prototype that combines embedded systems, cloud connectivity, and real-time web monitoring.