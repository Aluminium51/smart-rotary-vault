import type { SecurityEvent } from "@/types/vault";

const severityColor = { info: "text-success", warning: "text-warning", critical: "text-danger" } as const;

export function EventRows({ events, onSelect }: { events: SecurityEvent[]; onSelect?: (event: SecurityEvent) => void }) {
  if (events.length === 0) return <p className="border-t hairline py-10 text-sm text-muted">No events match the selected filters.</p>;
  return (
    <div className="divide-y divide-white/12">
      {events.map((event) => (
        <article key={event.id} className="grid gap-2 py-4 sm:grid-cols-[115px_minmax(0,1fr)_160px] sm:gap-4">
          <div className="technical-label tabular-nums">{new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(event.at))}</div>
          <div className="min-w-0"><div className="text-sm font-medium">{onSelect ? <button type="button" className="text-left underline-offset-4 hover:underline" onClick={() => onSelect(event)} aria-label={`View details for ${event.title}, ${event.id}`}>{event.title}</button> : event.title}</div><p className="mt-1 text-xs leading-5 text-muted">{event.detail}</p></div>
          <div className={`text-[.68rem] uppercase tracking-[.08em] sm:text-right ${severityColor[event.severity]}`}>{event.severity} / {event.type}</div>
        </article>
      ))}
    </div>
  );
}
