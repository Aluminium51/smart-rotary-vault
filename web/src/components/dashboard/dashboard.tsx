"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowUpRight, Radio, ShieldAlert, ShieldCheck, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EventRows } from "@/components/dashboard/event-rows";
import { useMockSession } from "@/hooks/mock-session";
import { commandStatusLabels, createMockCommandId, getRecentEvents, getScenario, scenarioLabels, simulateCommandResult, type Scenario } from "@/lib/mock-vault";
import type { CommandKind } from "@/types/vault";

const stateColor = { locked: "text-success", unlocked: "text-warning", alarm: "text-danger", lockout: "text-danger" } as const;
const commandColor = { pending: "text-warning", acknowledged: "text-warning", executed: "text-success", rejected: "text-danger", failed: "text-danger" } as const;
const dateTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "medium" });
const VaultViewer = dynamic(() => import("@/components/vault-3d/vault-viewer"), { ssr: false, loading: () => <div role="status" className="flex h-[280px] items-center justify-center text-xs text-muted">Loading 3D viewer…</div> });

export function Dashboard() {
  const { scenario, setScenario, commands, setCommands, visibleEvents } = useMockSession();
  const [confirm, setConfirm] = useState<CommandKind | null>(null);
  const [response, setResponse] = useState<"acknowledged" | "rejected" | "timeout">("acknowledged");
  const telemetry = getScenario(scenario);
  const advisory = telemetry.connection === "offline" ? "Mock telemetry is offline. Displayed state may be stale." : telemetry.warning;
  const recentEvents = getRecentEvents(visibleEvents, telemetry.tamper);
  const [latestCommand, ...olderCommands] = commands;
  const commandPending = commands.some((command) => command.status === "pending" || command.status === "acknowledged");

  function requestCommand() {
    if (!confirm || !telemetry.commandsAvailable || commandPending) return;
    const id = createMockCommandId();
    const kind = confirm;
    const result = response;
    setConfirm(null);
    setCommands((current) => [{ id, kind, status: "pending", createdAt: new Date().toISOString() }, ...current]);
    if (result === "acknowledged") window.setTimeout(() => {
      setCommands((current) => current.map((command) => command.id === id ? { ...command, status: "acknowledged" } : command));
    }, 700);
    window.setTimeout(() => {
      setCommands((current) => current.map((command) => command.id === id
        ? { ...command, status: result === "timeout" ? "failed" : simulateCommandResult(kind, result) }
        : command));
    }, 1400);
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-5 border-b hairline pb-4">
        <div>
          <p className="technical-label mb-3">01 / Operations</p>
          <h1 className="text-3xl font-medium tracking-[-.05em] sm:text-4xl">Security control center</h1>
          <p className="mt-3 text-sm text-muted">Vault 01 <span className="mx-2">/</span> Simulated telemetry</p>
        </div>
        <div className="min-w-[210px]">
          <label htmlFor="scenario" className="technical-label mb-2 block">Demonstration scenario</label>
          <select id="scenario" className="field text-xs" value={scenario} onChange={(event) => setScenario(event.target.value as Scenario)}>
            {Object.entries(scenarioLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>

      {telemetry.tamper && <div role="alert" aria-atomic="true" className="mb-4 flex items-start gap-3 border border-danger bg-surface p-4 sm:p-5">
        <ShieldAlert size={24} className="shrink-0 text-danger" aria-hidden="true" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <h2 className="text-base font-medium uppercase tracking-[.06em] text-danger">Tamper detected</h2>
            <span className="text-[.65rem] uppercase tracking-[.1em] text-muted">Simulation / Critical</span>
          </div>
          <p className="mt-2 text-xs leading-6">Simulated impact sensor triggered. Inspect the vault locally. Silencing the alarm does not acknowledge or clear this incident.</p>
        </div>
      </div>}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="min-w-0 space-y-4 lg:col-span-7">
          <section aria-labelledby="vault-status" className="panel min-w-0 p-5">
            <div className="flex items-start justify-between gap-4">
              <h2 id="vault-status" className="technical-label">Vault status / simulated</h2>
              {telemetry.mode === "locked" && telemetry.connection === "online"
                ? <ShieldCheck size={20} className="text-success" aria-hidden="true" />
                : <ShieldAlert size={20} className="text-warning" aria-hidden="true" />}
            </div>
            <div className={`mt-4 break-words text-[clamp(3rem,7vw,5.5rem)] leading-none tracking-[-.08em] ${telemetry.connection === "offline" ? "text-offline" : stateColor[telemetry.mode]}`}>
              {telemetry.connection === "offline" ? "OFFLINE" : telemetry.mode.toUpperCase()}
            </div>
            <div className="mt-4 grid gap-4 border-t hairline pt-4 sm:grid-cols-2">
              <div>
                <p className="technical-label">Mock telemetry</p>
                <p className={`mt-2 flex items-center gap-2 text-sm uppercase ${telemetry.connection === "online" ? "text-success" : "text-muted"}`}>
                  {telemetry.connection === "online" ? <Radio size={15} aria-hidden="true" /> : <WifiOff size={15} aria-hidden="true" />}
                  {telemetry.connection === "online" ? "Available" : "Offline"}
                </p>
              </div>
              <div>
                <p className="technical-label">Mock telemetry timestamp</p>
                <time dateTime={telemetry.updatedAt} className="mt-2 block text-sm tabular-nums">
                  {dateTime.format(new Date(telemetry.updatedAt))} ICT
                </time>
              </div>
            </div>
            <p className="mt-4 border-l-2 border-warning pl-3 text-xs leading-5 text-muted">{advisory}</p>
          </section>

          <section aria-labelledby="security-title" className="panel p-5">
            <h2 id="security-title" className="technical-label">Security monitoring</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 border-b hairline pb-4">
              <div>
                <p className="technical-label">Failed attempts / 3 max</p>
                <p className={`mt-3 text-4xl tabular-nums ${telemetry.failedAttempts > 0 ? "text-warning" : ""}`}>
                  {String(telemetry.failedAttempts).padStart(2, "0")}
                </p>
              </div>
              <div>
                <p className="technical-label">Tamper sensor</p>
                <p className={`mt-4 text-sm uppercase ${telemetry.tamper ? "text-danger" : "text-success"}`}>
                  {telemetry.tamper ? "TAMPER DETECTED" : "Normal"}
                </p>
              </div>
            </div>
            <div className="mt-5">
              <p className="technical-label">Current advisory</p>
              <p className="mt-2 text-sm leading-6">{advisory}</p>
            </div>
          </section>
        </div>

        <section aria-label="Simulated 3D vault and rotary dial" className="panel flex min-w-0 flex-col p-5 pb-3 lg:col-span-5">
          <VaultViewer telemetry={telemetry} />
        </section>

        <section aria-labelledby="remote-title" className="panel p-5 lg:col-span-12">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="remote-title" className="technical-label">Remote operations</h2>
              <p className="mt-2 text-xs text-muted">Local simulation only. Device state does not change.</p>
            </div>
            <span className="border border-white/25 px-2 py-1 text-[.65rem] uppercase text-muted">Mock channel</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" className="h-11 border-white/25 bg-elevated px-4 text-xs hover:bg-white/10"
              disabled={!telemetry.commandsAvailable || commandPending} onClick={() => setConfirm("lockout")}>
              Request lockout
            </Button>
            <Button variant="outline" className="h-11 border-white/25 bg-elevated px-4 text-xs hover:bg-white/10"
              disabled={!telemetry.commandsAvailable || telemetry.mode !== "alarm" || commandPending} onClick={() => setConfirm("silence")}>
              Silence alarm
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted">
            {telemetry.connection === "offline" ? "Commands unavailable while mock telemetry is offline."
              : telemetry.mode !== "alarm" ? "Alarm silence is available only in the alarm scenario."
                : "Simulated alarm silence only; it does not acknowledge or clear the tamper incident."}
          </p>
          <div aria-live="polite" aria-atomic="true" className="mt-4 border-t hairline pt-4">
            <p className="technical-label mb-3">Latest simulated command</p>
            {latestCommand ? <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="uppercase">{latestCommand.kind === "silence" ? "Alarm silence" : "Lockout"}</span>
                <strong className={commandColor[latestCommand.status]}>{commandStatusLabels[latestCommand.status]}</strong>
              </div>
              <p className="mt-2 break-all text-xs text-muted">{latestCommand.id}</p>
              <p className="mt-2 text-xs text-muted">Requested <time dateTime={latestCommand.createdAt}>{dateTime.format(new Date(latestCommand.createdAt))} ICT</time></p>
              <p className="mt-2 text-xs text-muted">No hardware action. Vault telemetry remains unchanged.</p>
            </> : <p className="text-xs text-muted">No commands this session.</p>}
          </div>
          {olderCommands.length > 0 && <details className="mt-4 border-t hairline">
            <summary className="cursor-pointer py-3 text-xs uppercase">Older session commands ({olderCommands.length})</summary>
            <div role="region" aria-label="Older simulated commands" tabIndex={0} className="max-h-48 divide-y divide-white/12 overflow-y-auto overscroll-contain">
              {olderCommands.map((command) => <div key={command.id} className="grid min-w-0 gap-2 py-3 text-xs sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <p className="uppercase">{command.kind === "silence" ? "Alarm silence" : "Lockout"}</p>
                  <p className="mt-1 break-all text-muted">{command.id}</p>
                  <p className="mt-1 text-muted">Requested <time dateTime={command.createdAt}>{dateTime.format(new Date(command.createdAt))} ICT</time></p>
                </div>
                <span className={commandColor[command.status]}>{commandStatusLabels[command.status]}</span>
              </div>)}
            </div>
          </details>}
        </section>

        <section aria-labelledby="events-title" className="panel p-5 sm:p-7 lg:col-span-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="events-title" className="technical-label">Recent security events</h2>
            <Link href="/logs" className="flex items-center gap-1 text-xs uppercase hover:underline">
              Full history <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4"><EventRows events={recentEvents} /></div>
        </section>
      </div>

      <Dialog open={confirm !== null} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <DialogContent className="max-w-md gap-5 bg-surface p-6" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-base uppercase">Confirm simulated {confirm === "lockout" ? "lockout" : "alarm silence"}</DialogTitle>
            <DialogDescription className="mt-2 leading-6">
              This creates a mock command record only. No signal is sent to a device and vault telemetry will remain unchanged.
              {confirm === "silence" && " Alarm silence does not acknowledge or clear the tamper incident; its warning and event remain visible."}
            </DialogDescription>
          </DialogHeader>
          <div>
            <label htmlFor="mock-response" className="technical-label mb-2 block">Simulated device response</label>
            <select id="mock-response" className="field text-xs" value={response} onChange={(event) => setResponse(event.target.value as typeof response)}>
              <option value="acknowledged">Simulated acknowledgment</option>
              <option value="rejected">Simulated rejection</option>
              <option value="timeout">Simulated timeout</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="h-10 border-white/25 bg-elevated px-4" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button className="h-10 px-4" onClick={requestCommand}>Run simulation</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
