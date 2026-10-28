"use client";

import { useState } from "react";
import { EventRows } from "@/components/dashboard/event-rows";
import { useMockSession } from "@/hooks/mock-session";
import type { EventType, Severity } from "@/types/vault";

export default function LogsPage() {
  const { visibleEvents } = useMockSession();
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [type, setType] = useState<EventType | "all">("all");
  const filtered = visibleEvents.filter((event) =>
    (severity === "all" || event.severity === severity) && (type === "all" || event.type === type));

  return (
    <>
      <div className="mb-8 border-b hairline pb-6">
        <p className="technical-label mb-3">02 / Audit</p>
        <h1 className="text-3xl font-medium tracking-[-.05em] sm:text-4xl">Security event history</h1>
        <p className="mt-3 text-sm text-muted">Recorded demonstration events / Vault 01</p>
      </div>
      <section aria-labelledby="filter-title" className="panel p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="filter-title" className="technical-label">Event filters</h2>
            <p aria-live="polite" className="mt-2 text-xs text-muted">{filtered.length} of {visibleEvents.length} events shown</p>
          </div>
          <div className="flex w-full flex-wrap gap-3 sm:w-auto">
            <div className="min-w-[150px] flex-1">
              <label htmlFor="severity-filter" className="technical-label mb-2 block">Severity</label>
              <select id="severity-filter" value={severity} onChange={(event) => setSeverity(event.target.value as Severity | "all")} className="field text-xs">
                <option value="all">All severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="min-w-[170px] flex-1">
              <label htmlFor="type-filter" className="technical-label mb-2 block">Event type</label>
              <select id="type-filter" value={type} onChange={(event) => setType(event.target.value as EventType | "all")} className="field text-xs">
                <option value="all">All types</option>
                <option value="access">Access</option>
                <option value="authentication">Authentication</option>
                <option value="tamper">Tamper</option>
                <option value="connection">Connection</option>
                <option value="command">Command</option>
              </select>
            </div>
          </div>
        </div>
      </section>
      <section aria-label="Security events" className="mt-4 panel px-5 sm:px-7"><EventRows events={filtered} /></section>
    </>
  );
}
