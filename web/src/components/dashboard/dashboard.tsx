"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Radio, ShieldAlert, ShieldCheck, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EventRows } from "@/components/dashboard/event-rows";
import { RotaryDial } from "@/components/dashboard/rotary-dial";
import { useMockSession } from "@/hooks/mock-session";
import { createMockCommandId, getScenario, scenarioLabels, simulateCommandResult, type Scenario } from "@/lib/mock-vault";
import type { CommandKind } from "@/types/vault";

const stateColor = { locked: "text-success", unlocked: "text-warning", alarm: "text-danger", lockout: "text-danger" } as const;
const dateTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "medium" });

export function Dashboard() {
  const { scenario, setScenario, commands, setCommands, visibleEvents } = useMockSession();
  const [confirm, setConfirm] = useState<CommandKind | null>(null);
  const [response, setResponse] = useState<"acknowledged" | "rejected" | "timeout">("acknowledged");
  const telemetry = getScenario(scenario);
  const commandPending = commands.some((command) => command.status === "pending");

  function requestCommand() {
    if (!confirm || !telemetry.commandsAvailable || commandPending) return;
    const id = createMockCommandId();
    const kind = confirm;
    const result = response;
    setConfirm(null);
    setCommands((current) => [{ id, kind, status: "pending", createdAt: new Date().toISOString() }, ...current]);
    window.setTimeout(() => {
      setCommands((current) => current.map((command) => command.id === id
        ? { ...command, status: result === "timeout" ? "failed" : simulateCommandResult(kind, result) }
        : command));
    }, 1400);
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b hairline pb-6">
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

      <div className="grid gap-4 lg:grid-cols-12">
        <section aria-labelledby="vault-status" className="panel min-w-0 p-5 sm:p-7 lg:col-span-7">
          <div className="flex items-start justify-between gap-4">
            <h2 id="vault-status" className="technical-label">Vault status / STM32 reported</h2>
            {telemetry.mode === "locked" && telemetry.connection === "online"
              ? <ShieldCheck size={20} className="text-success" aria-hidden="true" />
              : <ShieldAlert size={20} className="text-warning" aria-hidden="true" />}
          </div>
          <div className={`mt-7 break-words text-[clamp(3rem,8vw,6.5rem)] leading-none tracking-[-.08em] ${telemetry.connection === "offline" ? "text-offline" : stateColor[telemetry.mode]}`}>
            {telemetry.connection === "offline" ? "OFFLINE" : telemetry.mode.toUpperCase()}
          </div>
          <div className="mt-7 grid gap-5 border-t hairline pt-5 sm:grid-cols-2">
            <div>
              <p className="technical-label">Connection</p>
              <p className={`mt-2 flex items-center gap-2 text-sm uppercase ${telemetry.connection === "online" ? "text-success" : "text-muted"}`}>
                {telemetry.connection === "online" ? <Radio size={15} aria-hidden="true" /> : <WifiOff size={15} aria-hidden="true" />}
                {telemetry.connection}
              </p>
            </div>
            <div>
              <p className="technical-label">Last device update</p>
              <time dateTime={telemetry.updatedAt} className="mt-2 block text-sm tabular-nums">
                {dateTime.format(new Date(telemetry.updatedAt))} ICT
              </time>
            </div>
          </div>
          <p className="mt-6 border-l-2 border-warning pl-3 text-xs leading-5 text-muted">{telemetry.warning}</p>
        </section>

        <section aria-labelledby="dial-title" className="panel min-w-0 p-5 sm:p-7 lg:col-span-5">
          <div className="flex items-start justify-between">
            <h2 id="dial-title" className="technical-label">Rotary dial monitor</h2>
            <span className="technical-label">KY-040</span>
          </div>
          <RotaryDial position={telemetry.position} direction={telemetry.direction} />
        </section>

        <section aria-labelledby="security-title" className="panel p-5 sm:p-7 lg:col-span-5">
          <h2 id="security-title" className="technical-label">Security monitoring</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 border-b hairline pb-6">
            <div>
              <p className="technical-label">Failed attempts</p>
              <p className={`mt-3 text-4xl tabular-nums ${telemetry.failedAttempts > 0 ? "text-warning" : ""}`}>
                {String(telemetry.failedAttempts).padStart(2, "0")}
              </p>
            </div>
            <div>
              <p className="technical-label">Tamper sensor</p>
              <p className={`mt-4 text-sm uppercase ${telemetry.tamper ? "text-danger" : "text-success"}`}>
                {telemetry.tamper ? "Triggered" : "Normal"}
              </p>
            </div>
          </div>
          <div className="mt-5">
            <p className="technical-label">Current advisory</p>
            <p className="mt-2 text-sm leading-6">{telemetry.warning}</p>
          </div>
        </section>

        <section aria-labelledby="remote-title" className="panel p-5 sm:p-7 lg:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="remote-title" className="technical-label">Remote operations</h2>
              <p className="mt-2 text-xs text-muted">Local simulation only. Device state does not change.</p>
            </div>
            <span className="border border-white/25 px-2 py-1 text-[.65rem] uppercase text-muted">Mock channel</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
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
            {telemetry.connection === "offline" ? "Commands unavailable while device is offline."
              : telemetry.mode !== "alarm" ? "Alarm silence is available only in the alarm scenario."
                : "Commands require simulated confirmation."}
          </p>
          <div aria-live="polite" className="mt-6 border-t hairline pt-4 text-xs">
            <p className="technical-label mb-3">Session command history</p>
            {commands.length ? (
              <div className="divide-y divide-white/12">
                {commands.map((command) => (
                  <div key={command.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>{command.kind.toUpperCase()} / {command.id}</span>
                    <span className={command.status === "executed" ? "text-success" : command.status === "pending" ? "text-warning" : "text-danger"}>
                      {command.status.toUpperCase()} <span className="text-muted">/ SIMULATED</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : <span className="text-muted">NO COMMAND IN QUEUE</span>}
          </div>
        </section>

        <section aria-labelledby="events-title" className="panel p-5 sm:p-7 lg:col-span-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="events-title" className="technical-label">Recent security events</h2>
            <Link href="/logs" className="flex items-center gap-1 text-xs uppercase hover:underline">
              Full history <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4"><EventRows events={visibleEvents.slice(0, 4)} /></div>
        </section>
      </div>

      <Dialog open={confirm !== null} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <DialogContent className="max-w-md gap-5 bg-surface p-6" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-base uppercase">Confirm simulated {confirm === "lockout" ? "lockout" : "alarm silence"}</DialogTitle>
            <DialogDescription className="mt-2 leading-6">
              This creates a mock command record only. No signal is sent to a device and vault telemetry will remain unchanged.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label htmlFor="mock-response" className="technical-label mb-2 block">Simulated device response</label>
            <select id="mock-response" className="field text-xs" value={response} onChange={(event) => setResponse(event.target.value as typeof response)}>
              <option value="acknowledged">Acknowledged</option>
              <option value="rejected">Rejected</option>
              <option value="timeout">Timeout / failed</option>
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
