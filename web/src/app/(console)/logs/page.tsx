"use client";

import { useState } from "react";
import { EventRows } from "@/components/dashboard/event-rows";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMockSession } from "@/hooks/mock-session";
import type { EventType, SecurityEvent, Severity } from "@/types/vault";

const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" });
const fullTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "medium" });
function eventDate(at: string) {
  const parts = Object.fromEntries(dateKey.formatToParts(new Date(at)).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export default function LogsPage() {
  const { visibleEvents } = useMockSession();
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [type, setType] = useState<EventType | "all">("all");
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [selected, setSelected] = useState<SecurityEvent | null>(null);
  const filtered = visibleEvents.filter((event) =>
    (severity === "all" || event.severity === severity) && (type === "all" || event.type === type)
    && (!date || eventDate(event.at) === date)
    && (!query || `${event.id} ${event.title} ${event.detail} ${event.type}`.toLowerCase().includes(query.trim().toLowerCase())));

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
          <div className="flex w-full flex-wrap gap-3 lg:w-auto">
            <div className="min-w-[170px] flex-1">
              <label htmlFor="event-search" className="technical-label mb-2 block">Search</label>
              <input id="event-search" type="search" className="field text-xs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Keyword or event ID" />
            </div>
            <div className="min-w-[150px] flex-1">
              <label htmlFor="date-filter" className="technical-label mb-2 block">Date / ICT</label>
              <input id="date-filter" type="date" className="field text-xs" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
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
      <section aria-label="Security events" className="mt-4 panel px-5 sm:px-7"><EventRows events={filtered} onSelect={setSelected} /></section>
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-lg bg-surface p-6">
          <DialogHeader><DialogTitle className="text-base uppercase">{selected?.title}</DialogTitle><DialogDescription>Demonstration event detail / Vault 01</DialogDescription></DialogHeader>
          {selected && <dl className="mt-4 divide-y divide-white/12 text-sm">
            {[["Event ID", selected.id], ["Source", selected.id.startsWith("SIM-") ? "Mock web command" : selected.type === "connection" ? "Simulated ESP32-S3 gateway" : "Simulated STM32 controller"], ["Timestamp", `${fullTime.format(new Date(selected.at))} ICT`], ["Severity", selected.severity.toUpperCase()], ["Type", selected.type.toUpperCase()], ...(selected.id.startsWith("SIM-") ? [["Related command ID", selected.id]] : []), ["Detail", selected.detail]].map(([label, value]) => <div key={label} className="grid gap-2 py-3 sm:grid-cols-[150px_1fr]"><dt className="technical-label">{label}</dt><dd className="break-words">{value}</dd></div>)}
          </dl>}
        </DialogContent>
      </Dialog>
    </>
  );
}
