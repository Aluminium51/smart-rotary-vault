"use client";

import { useMockSession } from "@/hooks/mock-session";
import { getScenario } from "@/lib/mock-vault";

const dateTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "medium" });

export default function SettingsPage() {
  const { scenario } = useMockSession();
  const telemetry = getScenario(scenario);
  const details = [
    ["Device identifier", "SRV-VAULT-01"],
    ["Connection path", "STM32 / UART / ESP32-S3 / Wi-Fi"],
    ["Gateway state", `${telemetry.connection.toUpperCase()} / simulated`],
    ["STM32 firmware", "Version pending hardware integration"],
    ["ESP32-S3 firmware", "Version pending hardware integration"],
    ["Last synchronization", `${dateTime.format(new Date(telemetry.updatedAt))} ICT / mock`],
    ["Telemetry source", "Local fixture"],
  ];
  return (
    <>
      <div className="mb-8 border-b hairline pb-6">
        <p className="technical-label mb-3">03 / Inventory</p>
        <h1 className="text-3xl font-medium tracking-[-.05em] sm:text-4xl">Device information</h1>
        <p className="mt-3 text-sm text-muted">Read-only configuration / No live connection</p>
      </div>
      <section aria-labelledby="identity-title" className="panel p-5 sm:p-7">
        <div className="flex flex-wrap justify-between gap-3">
          <h2 id="identity-title" className="technical-label">Vault 01 / Device profile</h2>
          <span className="text-[.68rem] uppercase text-warning">Demonstration data</span>
        </div>
        <dl className="mt-5 grid gap-x-8 lg:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label} className="grid gap-2 border-t hairline py-4 sm:grid-cols-[180px_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[180px_minmax(0,1fr)]">
              <dt className="technical-label">{label}</dt>
              <dd className="min-w-0 break-words text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <p className="mt-5 max-w-3xl text-xs leading-6 text-muted">
        Physical security decisions remain on the STM32. Firmware versions and connectivity will be populated after device integration.
      </p>
    </>
  );
}
