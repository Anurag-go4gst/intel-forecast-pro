import {
  CalendarPlus,
  Check,
  ClipboardCheck,
  ListChecks,
  Link2,
  Paperclip,
  Route as RouteIcon,
  ScanSearch,
  Send,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KpiTile, MetricRow, Panel, PageHeading, PrototypeNote, StatusPill } from "@/components/primitives";
import {
  eventCategories,
  eventStatuses,
  evidenceSourcesChecked,
  horizonMonths,
  impactPatterns,
  impactUnits,
  patternCurve,
  patternDescription,
  qualificationLabels,
  qualificationScore,
  reflectedShare,
  reflectionStates,
  reflectionTone,
  reliabilityLevels,
  residualImpact,
  routeEvent,
  routingRules,
  routingTone,
  statusTone,
  type EventCategory,
  type EventStatus,
  type IntelEvent,
  type ImpactPattern,
  type ReflectionState,
  type Reliability,
} from "@/lib/event-domain";
import { usePlatform } from "@/lib/platform-state";
import { cn } from "@/lib/utils";

const signalTone = {
  "No signal": "neutral",
  "Weak signal": "info",
  "Clear signal": "positive",
  "Contradicts event": "risk",
} as const;

type EventWorkspaceTab = "decision" | "evidence" | "impact" | "requests";

export function EventIntelligence() {
  const {
    intelEvents,
    addIntelEvent,
    updateIntelEvent,
    setIntelEventStatus,
    completeStage,
    promoteToReview,
    adjustmentRequests,
    logAudit,
  } = usePlatform();
  const [categoryFilter, setCategoryFilter] = useState<"all" | EventCategory>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | EventStatus>("all");
  const [selectedId, setSelectedId] = useState(intelEvents[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<EventWorkspaceTab>("decision");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: eventCategories[0] as EventCategory,
    description: "",
    customer: "Northvale Motors (OEM)",
    skuScope: "",
    plantScope: "",
    startDate: "2026-09-01",
    endDate: "2026-12-31",
    recurrence: "One-time" as IntelEvent["recurrence"],
    evidenceSource: "",
    reliability: reliabilityLevels[2] as Reliability,
    probabilityPct: 70,
    expectedImpact: 10,
    impactUnit: impactUnits[0] as IntelEvent["impactUnit"],
    pattern: impactPatterns[3] as ImpactPattern,
    owner: "You · Demand planning",
  });

  const visible = intelEvents.filter(
    (e) =>
      (categoryFilter === "all" || e.category === categoryFilter) &&
      (statusFilter === "all" || e.status === statusFilter),
  );
  const selected = intelEvents.find((e) => e.id === selectedId) ?? visible[0] ?? intelEvents[0];

  const routing = selected ? routeEvent(selected) : null;
  const residual = selected ? residualImpact(selected) : null;
  const canRouteToAdjustment = routing?.outcome === "Governed forecast adjustment" && (residual?.applied ?? 0) !== 0;
  const alreadyRequested = selected ? adjustmentRequests.some((r) => r.originId === selected.id) : false;
  const eventAdjustmentRequests = adjustmentRequests.filter((r) => r.origin === "Event");
  const selectedRequest = selected ? adjustmentRequests.find((r) => r.originId === selected.id) : undefined;
  const applyBlockReason = (() => {
    if (!selected || !routing || !residual) return "Select an event first.";
    if (alreadyRequested) return "This selected event is already in Forecast Review.";
    if (routing.outcome !== "Governed forecast adjustment")
      return `This event is routed to ${routing.outcome}; keep it on watchlist, resolve evidence, or use scenarios.`;
    if (residual.applied === 0) return "There is no residual impact to apply after the double-counting check.";
    return "";
  })();

  const curveData = useMemo(
    () =>
      (selected?.curve ?? []).map((value, i) => ({
        month: horizonMonths[i] ?? `M${i + 1}`,
        value,
      })),
    [selected],
  );

  const counts = useMemo(() => {
    const byStatus = (s: EventStatus) => intelEvents.filter((e) => e.status === s).length;
    return {
      total: intelEvents.length,
      approved: byStatus("Approved"),
      watchlist: byStatus("Watchlist") + byStatus("Draft"),
      review: byStatus("Under review") + byStatus("Recommended"),
      doubleCount: intelEvents.filter((e) => e.reflection === "Fully reflected" || e.reflection === "Partially reflected").length,
    };
  }, [intelEvents]);

  const setCurveValue = (index: number, value: number) => {
    if (!selected) return;
    const next = [...selected.curve];
    next[index] = value;
    updateIntelEvent(selected.id, { curve: next });
  };

  const setImpact = (expectedImpact: number) => {
    if (!selected) return;
    updateIntelEvent(selected.id, {
      expectedImpact,
      curve: patternCurve(selected.pattern, expectedImpact),
    });
  };

  const setPlannerStatus = (status: EventStatus) => {
    if (!selected) return;
    setIntelEventStatus(selected.id, status);
    logAudit({
      user: selected.owner,
      action: "Event modified",
      sku: selected.skuScope,
      customer: selected.customer,
      version: "V2026.07 — Working draft",
      detail: `Event decision changed to ${status}: ${selected.name}.`,
    });
    if (status === "Watchlist" || status === "Rejected") setActiveTab("requests");
  };

  const applySelectedImpact = () => {
    if (!selected || !routing || !residual || !canRouteToAdjustment || alreadyRequested) return;
    setIntelEventStatus(selected.id, "Approved");
    promoteToReview({
      title: `${selected.name} — selected residual impact`,
      origin: "Event",
      originId: selected.id,
      scope: `${selected.skuScope} · ${selected.plantScope}`,
      requestedImpactPct: residual.applied,
      monthlyImpactPct: patternCurve(selected.pattern, residual.applied),
      owner: selected.owner,
      note: `Planner selected this event for forecast review. Residual after ${reflectedShare(selected)}% of impact was found in checked sources.`,
    });
    logAudit({
      user: selected.owner,
      action: "Forecast adjustment",
      sku: selected.skuScope,
      customer: selected.customer,
      version: "V2026.07 — Working draft",
      detail: `Selected event impact for review: ${selected.name}; residual ${residual.applied > 0 ? "+" : ""}${residual.applied}%.`,
    });
    completeStage("events");
    setActiveTab("requests");
  };

  const submitForm = () => {
    if (!form.name.trim()) return;
    addIntelEvent({
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim() || "Description to be completed before review.",
      customer: form.customer,
      skuScope: form.skuScope.trim() || "All SKUs in current filter",
      plantScope: form.plantScope.trim() || "All plants",
      startDate: form.startDate,
      endDate: form.endDate,
      recurrence: form.recurrence,
      evidenceSource: form.evidenceSource.trim() || "Evidence not yet attached",
      evidenceLink: "attachment://pending",
      reliability: form.reliability,
      probabilityPct: Number(form.probabilityPct),
      expectedImpact: Number(form.expectedImpact),
      impactUnit: form.impactUnit,
      pattern: form.pattern,
      curve: patternCurve(form.pattern, Number(form.expectedImpact)),
      owner: form.owner,
      status: "Draft",
      qualification: {
        confirmed: false,
        relevant: true,
        material: Math.abs(Number(form.expectedImpact)) >= 3,
        timeBound: true,
        measurable: true,
        credibleEvidence: form.evidenceSource.trim().length > 0,
      },
      reflection: "Unclear",
      sourceChecks: evidenceSourcesChecked.map((source) => ({ source, signal: "No signal" as const, reflectedPct: 0 })),
    });
    setShowForm(false);
    setForm({ ...form, name: "", description: "", skuScope: "", plantScope: "", evidenceSource: "" });
  };

  return (
    <div className="space-y-5">
      <PageHeading
        title="Event Intelligence"
        subtitle="Register business events that history cannot describe, qualify them against evidence, check whether their impact is already in the data, and route them to calendar inputs, governed adjustments or scenarios."
        actions={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <CalendarPlus className="h-3.5 w-3.5" aria-hidden /> {showForm ? "Close form" : "Register event"}
          </button>
        }
      />

      <PrototypeNote>Illustrative prototype data. Events, evidence links and reflected-impact signals are seeded for demonstration.</PrototypeNote>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiTile label="Events in registry" value={String(counts.total)} delta="All categories" deltaTone="info" />
        <KpiTile label="Approved" value={String(counts.approved)} delta="Planner approved" deltaTone="positive" />
        <KpiTile label="In review / recommended" value={String(counts.review)} delta="Awaiting decision" deltaTone="warning" />
        <KpiTile label="Watchlist & draft" value={String(counts.watchlist)} delta="No forecast change" deltaTone="neutral" />
        <KpiTile label="Applied to review" value={String(eventAdjustmentRequests.length)} delta="Explicitly selected" deltaTone="positive" />
      </div>

      {showForm && (
        <Panel title="Register a new event" description="New events enter the registry as Draft and must pass qualification before routing.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block md:col-span-2">
              <span className="label-caps">Event name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. OEM new-model launch — Q4 platform" className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2.5 text-xs focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none" />
            </label>
            <label className="block">
              <span className="label-caps">Category</span>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as EventCategory })} className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2 text-xs">
                {eventCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-3">
              <span className="label-caps">Description</span>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="mt-1 w-full rounded-md border border-input bg-surface px-2.5 py-1.5 text-xs" />
            </label>
            <label className="block">
              <span className="label-caps">Affected customer / OEM</span>
              <input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2.5 text-xs" />
            </label>
            <label className="block">
              <span className="label-caps">Affected SKUs / families</span>
              <input value={form.skuScope} onChange={(e) => setForm({ ...form, skuScope: e.target.value })} className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2.5 text-xs" />
            </label>
            <label className="block">
              <span className="label-caps">Affected plants / locations</span>
              <input value={form.plantScope} onChange={(e) => setForm({ ...form, plantScope: e.target.value })} className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2.5 text-xs" />
            </label>
            <label className="block">
              <span className="label-caps">Start date</span>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2.5 text-xs" />
            </label>
            <label className="block">
              <span className="label-caps">End date</span>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2.5 text-xs" />
            </label>
            <label className="block">
              <span className="label-caps">Recurrence</span>
              <select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value as IntelEvent["recurrence"] })} className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2 text-xs">
                <option value="One-time">One-time</option>
                <option value="Recurring">Recurring</option>
              </select>
            </label>
            <label className="block">
              <span className="label-caps">Evidence source</span>
              <input value={form.evidenceSource} onChange={(e) => setForm({ ...form, evidenceSource: e.target.value })} placeholder="Document, e-mail, EDI schedule…" className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2.5 text-xs" />
            </label>
            <label className="block">
              <span className="label-caps">Source reliability</span>
              <select value={form.reliability} onChange={(e) => setForm({ ...form, reliability: e.target.value as Reliability })} className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2 text-xs">
                {reliabilityLevels.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label-caps">Probability / confidence %</span>
              <input type="number" value={form.probabilityPct} onChange={(e) => setForm({ ...form, probabilityPct: Number(e.target.value) })} className="num mt-1 h-8 w-full rounded-md border border-input bg-surface px-2.5 text-xs" />
            </label>
            <label className="block">
              <span className="label-caps">Expected impact</span>
              <input type="number" value={form.expectedImpact} onChange={(e) => setForm({ ...form, expectedImpact: Number(e.target.value) })} className="num mt-1 h-8 w-full rounded-md border border-input bg-surface px-2.5 text-xs" />
            </label>
            <label className="block">
              <span className="label-caps">Impact unit</span>
              <select value={form.impactUnit} onChange={(e) => setForm({ ...form, impactUnit: e.target.value as IntelEvent["impactUnit"] })} className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2 text-xs">
                {impactUnits.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label-caps">Impact pattern</span>
              <select value={form.pattern} onChange={(e) => setForm({ ...form, pattern: e.target.value as ImpactPattern })} className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2 text-xs">
                {impactPatterns.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label-caps">Event owner</span>
              <input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2.5 text-xs" />
            </label>
            <div className="flex items-end gap-2 md:col-span-3">
              <button type="button" onClick={submitForm} disabled={!form.name.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                <Check className="h-3.5 w-3.5" aria-hidden /> Save as draft
              </button>
              <span className="text-[11px] text-muted-foreground">Evidence attachment is a placeholder in this prototype.</span>
            </div>
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <Panel
          title="Event registry"
          description="Select one event at a time. A recommended route is only a suggestion; no event enters the forecast path until you apply its selected impact."
          bodyClassName="p-0"
          actions={
            <div className="flex flex-wrap gap-2">
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)} className="h-7 rounded-md border border-input bg-surface px-1.5 text-[11px]">
                <option value="all">All categories</option>
                {eventCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="h-7 rounded-md border border-input bg-surface px-1.5 text-[11px]">
                <option value="all">All statuses</option>
                {eventStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          }
        >
          <ul className="divide-y divide-border">
            {visible.map((event) => {
              const r = routeEvent(event);
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(event.id);
                      setActiveTab("decision");
                    }}
                    className={cn(
                      "grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60",
                      event.id === selected?.id && "bg-accent",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{event.name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {event.category} · {event.customer}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <StatusPill tone={statusTone[event.status]}>{event.status}</StatusPill>
                        <StatusPill tone={reflectionTone[event.reflection]}>{event.reflection}</StatusPill>
                        <StatusPill tone={routingTone[r.outcome]}>{r.outcome}</StatusPill>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn("num text-sm font-semibold", event.expectedImpact >= 0 ? "text-positive" : "text-risk")}>
                        {event.expectedImpact > 0 ? "+" : ""}
                        {event.expectedImpact}
                        {event.impactUnit === "Percentage" ? "%" : " u"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{event.probabilityPct}% conf.</p>
                    </div>
                  </button>
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="px-4 py-6 text-center text-xs text-muted-foreground">No events match the selected filters.</li>
            )}
          </ul>
        </Panel>

        {selected && routing && residual && (
          <div className="space-y-4">
            <Panel
              title={selected.name}
              description={selected.description}
              actions={<StatusPill tone={statusTone[selected.status]}>{selected.status}</StatusPill>}
            >
              <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                <MetricRow label="Category" value={selected.category} />
                <MetricRow label="Affected customer / OEM" value={selected.customer} />
                <MetricRow label="Affected SKUs / families" value={selected.skuScope} />
                <MetricRow label="Affected plants / locations" value={selected.plantScope} />
                <MetricRow label="Start date" value={selected.startDate} />
                <MetricRow label="End date" value={selected.endDate} />
                <MetricRow label="Recurrence" value={selected.recurrence} />
                <MetricRow label="Source reliability" value={selected.reliability} />
                <MetricRow label="Probability / confidence" value={`${selected.probabilityPct}%`} />
                <MetricRow
                  label="Expected impact"
                  value={`${selected.expectedImpact > 0 ? "+" : ""}${selected.expectedImpact}${selected.impactUnit === "Percentage" ? "%" : " units"}`}
                  tone={selected.expectedImpact >= 0 ? "positive" : "risk"}
                />
                <MetricRow label="Impact unit" value={selected.impactUnit} />
                <MetricRow label="Event owner" value={selected.owner} />
                <MetricRow label="Created" value={selected.createdAt} />
                <MetricRow label="Last modified" value={selected.modifiedAt} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface-muted px-3 py-2">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                <span className="text-xs">{selected.evidenceSource}</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Link2 className="h-3 w-3" aria-hidden /> {selected.evidenceLink}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-b border-border pb-2">
                {[
                  { id: "decision" as const, label: "Decision", icon: ClipboardCheck },
                  { id: "evidence" as const, label: "Evidence", icon: ListChecks },
                  { id: "impact" as const, label: "Impact curve", icon: SlidersHorizontal },
                  { id: "requests" as const, label: "Requests", icon: Send },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                        activeTab === tab.id ? "bg-primary text-primary-foreground" : "border border-input hover:bg-accent",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {activeTab === "decision" && (
                <div id="guide-event-decision" tabIndex={-1} className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3 rounded-md border border-border bg-surface-muted p-3 md:grid-cols-3">
                    <label className="block">
                      <span className="label-caps">Planner decision</span>
                      <select
                        value={selected.status}
                        onChange={(e) => setPlannerStatus(e.target.value as EventStatus)}
                        className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2 text-xs"
                      >
                        {eventStatuses.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="label-caps">Selected impact</span>
                      <div className="mt-1 flex items-center gap-1">
                        <input
                          type="number"
                          step={selected.impactUnit === "Percentage" ? 0.5 : 1}
                          value={selected.expectedImpact}
                          onChange={(e) => setImpact(Number(e.target.value))}
                          className="num h-8 w-full rounded-md border border-input bg-surface px-2 text-right text-xs"
                        />
                        <span className="text-[11px] text-muted-foreground">{selected.impactUnit === "Percentage" ? "%" : "u"}</span>
                      </div>
                    </label>
                    <div className="block">
                      <span className="label-caps">Recommended route</span>
                      <div className="mt-1 flex h-8 items-center">
                        <StatusPill tone={routingTone[routing.outcome]}>{routing.outcome}</StatusPill>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 rounded-md border border-border p-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <div>
                      <p className="text-xs font-semibold">Apply only this selected event</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        Applying submits this event's residual impact to Forecast Review. All other registry events stay unchanged.
                      </p>
                      {selectedRequest && (
                        <p className="mt-2 text-[11px] font-medium text-positive">
                          Submitted: {selectedRequest.title} · {selectedRequest.requestedImpactPct > 0 ? "+" : ""}{selectedRequest.requestedImpactPct}%
                        </p>
                      )}
                      {applyBlockReason && !selectedRequest && (
                        <p className="mt-2 text-[11px] font-medium text-warning">{applyBlockReason}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-start gap-2 md:justify-end">
                      <button
                        type="button"
                        onClick={skipEvents}
                        className="inline-flex h-8 items-center justify-center rounded-md border border-input px-3 text-xs font-medium hover:bg-accent"
                      >
                        Skip — no event applies
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlannerStatus("Watchlist")}
                        className="inline-flex h-8 items-center justify-center rounded-md border border-input px-3 text-xs font-medium hover:bg-accent"
                      >
                        Watchlist
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlannerStatus("Rejected")}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-risk/30 px-3 text-xs font-medium text-risk hover:bg-risk-soft"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={applySelectedImpact}
                        disabled={Boolean(applyBlockReason)}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" aria-hidden />
                        {alreadyRequested ? "Applied" : "Apply selected impact"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Panel>

            {activeTab === "evidence" && <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel title="Event qualification checklist" description="All six questions should be satisfied before an event routes into the official forecast.">
                <ul className="space-y-2">
                  {qualificationLabels.map(({ key, label }) => {
                    const value = selected.qualification[key];
                    return (
                      <li key={key} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0">
                        <span className="text-xs">{label}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateIntelEvent(selected.id, {
                              qualification: { ...selected.qualification, [key]: !value },
                            })
                          }
                          className={cn(
                            "rounded-md border px-2 py-0.5 text-[11px] font-medium",
                            value ? "border-positive/30 bg-positive-soft text-positive" : "border-input text-muted-foreground",
                          )}
                        >
                          {value ? "Yes" : "No"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  Qualification score: <span className="num font-semibold text-foreground">{qualificationScore(selected.qualification)}/6</span>
                </p>
              </Panel>

              <Panel
                title="Routing decision"
                description="Derived from confirmation, recurrence, evidence reliability and the double-counting check."
              >
                <div className="flex items-center gap-2">
                  <RouteIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <StatusPill tone={routingTone[routing.outcome]}>{routing.outcome}</StatusPill>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{routing.reason}</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="py-1.5 pr-3 font-medium">Rule</th>
                        <th className="py-1.5 font-medium">Routes to</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routingRules.map((r) => (
                        <tr key={r.rule} className={cn("border-b border-border last:border-0", r.outcome === routing.outcome && "bg-accent")}>
                          <td className="py-1.5 pr-3">{r.rule}</td>
                          <td className="py-1.5">{r.outcome}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>

            <Panel
              title="Double-counting check"
              description="Is this impact already visible in demand or in the model before an adjustment is approved?"
              actions={<StatusPill tone={reflectionTone[selected.reflection]}>{selected.reflection}</StatusPill>}
            >
              <div className="flex flex-wrap gap-2">
                {reflectionStates.map((state) => (
                  <button
                    key={state}
                    type="button"
                    onClick={() => updateIntelEvent(selected.id, { reflection: state as ReflectionState })}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-[11px] font-medium",
                      selected.reflection === state ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent",
                    )}
                  >
                    {state}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-[11px] text-muted-foreground">
                        <th className="py-1.5 pr-3 font-medium">Source checked</th>
                        <th className="py-1.5 pr-3 font-medium">Signal</th>
                        <th className="py-1.5 text-right font-medium">Impact already reflected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.sourceChecks.map((c) => (
                        <tr key={c.source} className="border-b border-border last:border-0">
                          <td className="py-1.5 pr-3">{c.source}</td>
                          <td className="py-1.5 pr-3">
                            <StatusPill tone={signalTone[c.signal]}>{c.signal}</StatusPill>
                          </td>
                          <td className="num py-1.5 text-right">{c.reflectedPct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-md border border-border bg-surface-muted p-3">
                  <div className="flex items-center gap-1.5">
                    <ScanSearch className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    <span className="label-caps">Residual adjustment</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <MetricRow label="Expected event impact" value={`${residual.expected > 0 ? "+" : ""}${residual.expected}%`} />
                    <MetricRow label="Impact already reflected" value={`${residual.alreadyReflected}%`} />
                    <MetricRow
                      label="Residual adjustment"
                      value={`${residual.residual > 0 ? "+" : ""}${residual.residual}%`}
                      tone={residual.residual === 0 ? undefined : "warning"}
                    />
                    <MetricRow label="Reflected share of sources" value={`${reflectedShare(selected)}%`} />
                    <MetricRow
                      label="Adjustment applied"
                      value={`${residual.applied > 0 ? "+" : ""}${residual.applied}%`}
                      tone={residual.applied === 0 ? undefined : "positive"}
                    />
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{residual.note}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("decision")}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                  >
                    Return to decision
                  </button>
                </div>
              </div>
            </Panel>
            </>}

            {activeTab === "impact" && <Panel
              title="Impact pattern and month-by-month curve"
              description={patternDescription[selected.pattern]}
              actions={
                <select
                  value={selected.pattern}
                  onChange={(e) => {
                    const pattern = e.target.value as ImpactPattern;
                    updateIntelEvent(selected.id, { pattern, curve: patternCurve(pattern, selected.expectedImpact) });
                  }}
                  className="h-7 rounded-md border border-input bg-surface px-1.5 text-[11px]"
                >
                  {impactPatterns.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              }
            >
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={curveData} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" />
                    <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" width={40} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip contentStyle={{ borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: 12 }} formatter={(v: number | string) => `${v}%`} />
                    <ReferenceLine y={0} stroke="var(--color-neutral-line)" />
                    <Bar dataKey="value" name="Impact" radius={[2, 2, 0, 0]}>
                      {curveData.map((d, i) => (
                        <Cell key={i} fill={d.value >= 0 ? "var(--color-accent-blue)" : "var(--color-risk)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {curveData.map((d, i) => (
                  <label key={d.month} className="block">
                    <span className="label-caps">{d.month}</span>
                    <div className="mt-1 flex items-center gap-1">
                      <input
                        type="number"
                        step={0.5}
                        value={d.value}
                        onChange={(e) => setCurveValue(i, Number(e.target.value))}
                        className="num h-7 w-full rounded-md border border-input bg-surface px-2 text-right text-xs"
                      />
                      <span className="text-[11px] text-muted-foreground">%</span>
                    </div>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                The curve is editable — a flat percentage is rarely the right shape for shutdowns, ramps or advance buying.
              </p>
            </Panel>}
          </div>
        )}
      </div>

      {activeTab === "requests" && <Panel title="Forecast-adjustment requests raised from events and scenarios" description="Requests require approval in Forecast Review; nothing here changes the approved forecast on its own." bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-surface-muted text-[11px] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Request</th>
                <th className="px-4 py-2 font-medium">Origin</th>
                <th className="px-4 py-2 font-medium">Scope</th>
                <th className="px-4 py-2 text-right font-medium">Requested impact</th>
                <th className="px-4 py-2 font-medium">Owner</th>
                <th className="px-4 py-2 font-medium">Submitted</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {adjustmentRequests.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-[11px] text-muted-foreground">{r.note}</p>
                  </td>
                  <td className="px-4 py-2">{r.origin}</td>
                  <td className="px-4 py-2">{r.scope}</td>
                  <td className="num px-4 py-2 text-right">{r.requestedImpactPct > 0 ? "+" : ""}{r.requestedImpactPct}%</td>
                  <td className="px-4 py-2">{r.owner}</td>
                  <td className="px-4 py-2">{r.submittedAt}</td>
                  <td className="px-4 py-2">
                    <StatusPill tone={r.status === "Approved" ? "positive" : r.status === "Rejected" ? "risk" : "warning"}>{r.status}</StatusPill>
                  </td>
                </tr>
              ))}
              {adjustmentRequests.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No adjustment requests raised yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>}
    </div>
  );
}
