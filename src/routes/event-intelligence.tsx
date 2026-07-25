import { createFileRoute } from "@tanstack/react-router";
import { CalendarPlus, Check, Info, X } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KpiTile, Panel, PageHeading, PrototypeNote, StatusPill } from "@/components/primitives";
import type { DemandEvent } from "@/lib/demo-data";
import { usePlatform } from "@/lib/platform-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/event-intelligence")({
  head: () => ({
    meta: [
      { title: "Event Intelligence — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Capture future programmes, promotions, price changes, plant events and regulatory shifts that do not exist in historical demand, and evaluate their forecast impact.",
      },
      { property: "og:title", content: "Event Intelligence — Demand Intelligence Platform" },
      {
        property: "og:description",
        content: "Future business events and their evaluated impact on the demand forecast.",
      },
    ],
  }),
  component: EventIntelligence,
});

const eventTypes: DemandEvent["type"][] = [
  "New programme",
  "Price change",
  "Promotion",
  "Plant event",
  "Regulatory",
  "Customer change",
];

const statusTone: Record<DemandEvent["status"], "positive" | "warning" | "risk" | "neutral"> = {
  Accepted: "positive",
  "Under review": "warning",
  Proposed: "neutral",
  Rejected: "risk",
};

function EventIntelligence() {
  const { events, addEvent, setEventStatus } = usePlatform();
  const [form, setForm] = useState({
    title: "",
    type: eventTypes[0] as DemandEvent["type"],
    scope: "",
    window: "",
    expectedImpactPct: 10,
    confidence: "Medium" as DemandEvent["confidence"],
    rationale: "",
  });

  const accepted = events.filter((e) => e.status === "Accepted");
  const netImpact = accepted.reduce((sum, e) => sum + e.expectedImpactPct, 0);
  const chartData = events.map((e) => ({
    name: e.title.length > 22 ? `${e.title.slice(0, 22)}…` : e.title,
    impact: e.expectedImpactPct,
    status: e.status,
  }));

  const submit = () => {
    if (!form.title.trim()) return;
    addEvent({
      title: form.title.trim(),
      type: form.type,
      scope: form.scope.trim() || "All scope in current filter",
      window: form.window.trim() || "Next forecast horizon",
      expectedImpactPct: Number(form.expectedImpactPct),
      confidence: form.confidence,
      status: "Proposed",
      owner: "You · Demand planning",
      rationale: form.rationale.trim() || "Rationale to be documented before review.",
    });
    setForm({ ...form, title: "", scope: "", window: "", rationale: "" });
  };

  return (
    <div className="space-y-5">
      <PageHeading
        title="Event Intelligence"
        subtitle="Historical data cannot describe a new customer programme, a model changeover or a planned shutdown. Record those events here, evaluate their expected demand impact and control whether they enter the operational forecast."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Events captured" value={String(events.length)} delta="Current forecast horizon" deltaTone="info" />
        <KpiTile label="Accepted into forecast" value={String(accepted.length)} delta="Applied to adjusted plan" deltaTone="positive" />
        <KpiTile label="Awaiting decision" value={String(events.filter((e) => e.status !== "Accepted" && e.status !== "Rejected").length)} delta="Blocking consensus sign-off" deltaTone="warning" />
        <KpiTile label="Net accepted impact" value={`${netImpact > 0 ? "+" : ""}${netImpact}`} unit="%" delta="Before capacity constraints" deltaTone={netImpact >= 0 ? "positive" : "warning"} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Event register" description="Impact percentages are evaluated against the statistical baseline for the affected scope." bodyClassName="p-0">
          <div className="divide-y divide-border">
            {events.map((event) => (
              <article key={event.id} className="px-4 py-3.5 sm:px-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold">{event.title}</h3>
                      <StatusPill tone="info">{event.type}</StatusPill>
                      <StatusPill tone={statusTone[event.status]}>{event.status}</StatusPill>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.scope} · {event.window} · Owner: {event.owner}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">{event.rationale}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "num text-lg font-semibold",
                        event.expectedImpactPct >= 0 ? "text-positive" : "text-risk",
                      )}
                    >
                      {event.expectedImpactPct > 0 ? "+" : ""}
                      {event.expectedImpactPct}%
                    </p>
                    <p className="text-[11px] text-muted-foreground">{event.confidence} confidence</p>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEventStatus(event.id, "Accepted")}
                    disabled={event.status === "Accepted"}
                    className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-positive-soft hover:text-positive disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" aria-hidden /> Accept into forecast
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventStatus(event.id, "Under review")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-warning-soft"
                  >
                    <Info className="h-3 w-3" aria-hidden /> Send for review
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventStatus(event.id, "Rejected")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-risk-soft hover:text-risk"
                  >
                    <X className="h-3 w-3" aria-hidden /> Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Add a business event" description="Recorded against the current filter scope.">
            <div className="space-y-3">
              <label className="block">
                <span className="label-caps">Event title</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. New transmission programme award"
                  className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2.5 text-xs focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="label-caps">Event type</span>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as DemandEvent["type"] })}
                  className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2 text-xs focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
                >
                  {eventTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label-caps">Affected scope</span>
                <input
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value })}
                  placeholder="Product family · plant / customer"
                  className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2.5 text-xs focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="label-caps">Time window</span>
                <input
                  value={form.window}
                  onChange={(e) => setForm({ ...form, window: e.target.value })}
                  placeholder="e.g. Oct 2026 – Jan 2027"
                  className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2.5 text-xs focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label-caps">Impact %</span>
                  <input
                    type="number"
                    value={form.expectedImpactPct}
                    onChange={(e) => setForm({ ...form, expectedImpactPct: Number(e.target.value) })}
                    className="num mt-1 h-8 w-full rounded-md border border-input bg-surface px-2.5 text-xs focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="label-caps">Confidence</span>
                  <select
                    value={form.confidence}
                    onChange={(e) => setForm({ ...form, confidence: e.target.value as DemandEvent["confidence"] })}
                    className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2 text-xs focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
                  >
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="label-caps">Business rationale</span>
                <textarea
                  value={form.rationale}
                  onChange={(e) => setForm({ ...form, rationale: e.target.value })}
                  rows={3}
                  placeholder="Evidence: nomination letter, customer schedule, pricing approval…"
                  className="mt-1 w-full rounded-md border border-input bg-surface px-2.5 py-1.5 text-xs focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={submit}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <CalendarPlus className="h-3.5 w-3.5" aria-hidden /> Record event for evaluation
              </button>
            </div>
          </Panel>

          <Panel title="Evaluated impact by event" description="Positive uplift shown in teal, demand reduction in red.">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" tickFormatter={(v: number) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" />
                  <Tooltip contentStyle={{ borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: 12 }} formatter={(v: number | string) => `${v}%`} />
                  <Bar dataKey="impact" name="Impact" radius={[0, 3, 3, 0]}>
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.impact >= 0 ? "var(--color-positive)" : "var(--color-risk)"}
                        fillOpacity={entry.status === "Accepted" ? 1 : 0.45}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>

      <PrototypeNote>
        Event impacts are entered by users and applied as simple percentage adjustments to the seeded
        baseline. In production these would be estimated by causal models using comparable historical
        events and driver data.
      </PrototypeNote>
    </div>
  );
}
