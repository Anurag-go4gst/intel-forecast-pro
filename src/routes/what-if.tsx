import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Copy, FlaskConical, RotateCcw, Save, Send } from "lucide-react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiTile, MetricRow, Panel, PageHeading, PrototypeNote, StatusPill } from "@/components/primitives";
import { aggregateSeries, filterSkus, formatNumber, formatSigned } from "@/lib/demo-data";
import {
  horizonMonths,
  patternCurve,
  residualImpact,
  routeEvent,
  scenarioTypes,
  type ScenarioSpec,
  type ScenarioType,
} from "@/lib/event-domain";
import { usePlatform } from "@/lib/platform-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/what-if")({
  head: () => ({
    meta: [
      { title: "What-if Scenarios — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Build best/worst case, delayed-event, ramp and supply-constrained scenarios with monthly impacts, inventory and service implications, and promote them for approval.",
      },
      { property: "og:title", content: "What-if Scenarios — Demand Intelligence Platform" },
      {
        property: "og:description",
        content: "Sandbox scenarios compared against the baseline and approved forecast. Nothing changes the official forecast automatically.",
      },
    ],
  }),
  component: WhatIfScenarios,
});

const typePresets: Record<ScenarioType, { curve: number[]; cap: number; assumptions: string[] }> = {
  "Best case": { curve: [2, 4, 6, 8, 9, 10], cap: 110, assumptions: ["Market demand +6%", "All approved events land on plan", "No capacity constraint"] },
  "Base case": { curve: [0, 0, 0, 0, 0, 0], cap: 100, assumptions: ["Approved events at residual impact only", "No further market movement"] },
  "Worst case": { curve: [-2, -5, -8, -10, -11, -12], cap: 92, assumptions: ["Market demand -8%", "Two OEM schedule cuts", "Capacity at 92%"] },
  "Event delayed": { curve: patternCurve("Delayed impact", 14), cap: 100, assumptions: ["Key event shifts two months later", "Peak impact unchanged"] },
  "Event cancelled": { curve: [0, 0, 0, 0, 0, 0], cap: 100, assumptions: ["Event removed from the plan", "Baseline restored for affected scope"] },
  "Higher ramp-up": { curve: patternCurve("Gradual ramp-up", 24), cap: 105, assumptions: ["Ramp accelerated by one month", "Peak impact raised to 24%"] },
  "Lower ramp-up": { curve: patternCurve("Gradual ramp-up", 9), cap: 100, assumptions: ["Ramp slower than nominated volume", "Peak impact reduced to 9%"] },
  "Demand shock": { curve: patternCurve("One-time spike", 26), cap: 100, assumptions: ["Single-period surge of 26%", "No lasting baseline change"] },
  "Supply-constrained case": { curve: [0, -2, -5, -6, -4, -2], cap: 82, assumptions: ["Capacity capped at 82%", "Lead time +12 days"] },
  "Custom scenario": { curve: [0, 1, 2, 3, 3, 3], cap: 100, assumptions: ["Analyst-defined assumptions"] },
};

const scenarioColors = [
  "var(--color-accent-blue)",
  "var(--color-warning)",
  "var(--color-risk)",
  "oklch(0.62 0.11 300)",
  "oklch(0.60 0.10 180)",
];

function WhatIfScenarios() {
  const navigate = useNavigate();
  const {
    completeStage,
    filters,
    scenarioSpecs,
    addScenarioSpec,
    updateScenarioSpec,
    cloneScenarioSpec,
    compareIds,
    toggleCompare,
    promoteToReview,
    adjustmentRequests,
    intelEvents,
  } = usePlatform();

  const rows = filterSkus(filters);
  const [selectedId, setSelectedId] = useState(scenarioSpecs[0]?.id ?? "");
  const selected = scenarioSpecs.find((s) => s.id === selectedId) ?? scenarioSpecs[0];
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<ScenarioType>("Worst case");

  const base = useMemo(() => aggregateSeries(rows), [rows]);
  const horizon = base.filter((p) => p.baseline !== null).slice(0, horizonMonths.length);

  // Approved event impact per month → the approved (official) forecast.
  const approvedCurve = useMemo(() => {
    const total = new Array(horizonMonths.length).fill(0);
    intelEvents
      .filter((e) => e.status === "Approved" && routeEvent(e).outcome !== "Explanation only — no additional adjustment")
      .forEach((e) => {
        const applied = residualImpact(e).applied;
        const curve = patternCurve(e.pattern, applied);
        curve.forEach((v, i) => {
          if (i < total.length) total[i] += v;
        });
      });
    return total.map((v) => Number(v.toFixed(1)));
  }, [intelEvents]);

  const compared = scenarioSpecs.filter((s) => compareIds.includes(s.id));

  const chartData = horizon.map((p, i) => {
    const baseline = p.baseline ?? 0;
    const approved = Math.round(baseline * (1 + (approvedCurve[i] ?? 0) / 100));
    const row: Record<string, string | number> = {
      period: horizonMonths[i] ?? p.period,
      baseline,
      approved,
    };
    compared.forEach((s) => {
      row[s.id] = Math.round(approved * (1 + (s.monthlyImpactPct[i] ?? 0) / 100));
    });
    return row;
  });

  const approvedTotal = chartData.reduce((sum, r) => sum + Number(r.approved), 0);
  const baselineTotal = chartData.reduce((sum, r) => sum + Number(r.baseline), 0);

  const implications = (spec: ScenarioSpec) => {
    const total = chartData.reduce((sum, r, i) => sum + Number(r[spec.id] ?? Number(r.approved) * (1 + (spec.monthlyImpactPct[i] ?? 0) / 100)), 0);
    const servable = chartData.reduce(
      (sum, r, i) =>
        sum +
        Math.min(
          Number(r[spec.id] ?? Number(r.approved) * (1 + (spec.monthlyImpactPct[i] ?? 0) / 100)),
          Number(r.approved) * (spec.capacityCapPct / 100) * 1.05,
        ),
      0,
    );
    const deltaPct = ((total - approvedTotal) / (approvedTotal || 1)) * 100;
    const stockoutUnits = Math.max(0, Math.round(total - servable));
    const excessUnits = Math.max(0, Math.round(approvedTotal - total));
    const serviceLevel = Math.max(84, Math.min(99.2, 97.5 - stockoutUnits / (approvedTotal || 1) * 220));
    return {
      total: Math.round(total),
      deltaPct,
      stockoutUnits,
      excessUnits,
      serviceLevel,
      skusAtRisk: stockoutUnits > 0 ? Math.max(1, Math.round(rows.length * 0.18)) : 0,
      skusExcess: excessUnits > 0 ? Math.max(1, Math.round(rows.length * 0.12)) : 0,
    };
  };

  const selectedImplications = selected ? implications(selected) : null;
  const alreadyPromoted = selected ? adjustmentRequests.some((r) => r.originId === selected.id) : false;

  const setMonth = (index: number, value: number) => {
    if (!selected) return;
    const next = [...selected.monthlyImpactPct];
    next[index] = value;
    updateScenarioSpec(selected.id, { monthlyImpactPct: next });
  };

  const createScenario = () => {
    if (!newName.trim()) return;
    const preset = typePresets[newType];
    addScenarioSpec({
      name: newName.trim(),
      type: newType,
      owner: "You · Demand planning",
      notes: `${newType} created in the what-if sandbox. Not part of the official forecast.`,
      assumptions: preset.assumptions,
      linkedEventIds: [],
      monthlyImpactPct: [...preset.curve].slice(0, horizonMonths.length),
      capacityCapPct: preset.cap,
    });
    setNewName("");
  };

  return (
    <div className="space-y-5">
      <PageHeading
        title="What-if Scenarios"
        subtitle="Scenarios are a sandbox held separately from the official forecast. Compare them against the baseline and the approved event-aware forecast, then promote a scenario to raise a forecast-adjustment request for approval."
        actions={
          <StatusPill tone="info">
            <FlaskConical className="h-3 w-3" aria-hidden /> Sandbox — official forecast never changes automatically
          </StatusPill>
        }
      />

      <PrototypeNote>Illustrative prototype data. Scenario impacts, capacity ceilings and service-level effects are simulated locally.</PrototypeNote>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Statistical baseline" value={formatNumber(baselineTotal)} unit="units" delta="Before events" deltaTone="neutral" />
        <KpiTile label="Approved forecast" value={formatNumber(approvedTotal)} unit="units" delta={formatSigned(((approvedTotal - baselineTotal) / (baselineTotal || 1)) * 100)} deltaTone="positive" />
        <KpiTile label="Scenarios saved" value={String(scenarioSpecs.length)} delta={`${compared.length} on chart`} deltaTone="info" />
        <KpiTile
          label="Selected scenario delta"
          value={selectedImplications ? formatSigned(selectedImplications.deltaPct) : "—"}
          delta={selected ? selected.type : "No scenario"}
          deltaTone={(selectedImplications?.deltaPct ?? 0) >= 0 ? "positive" : "warning"}
        />
      </div>

      <div
        id="guide-scenario-decision"
        tabIndex={-1}
        className="grid scroll-mt-28 grid-cols-1 gap-4 outline-none xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]"
      >
        <div className="space-y-4">
          <Panel title="Create a scenario" description="Pick a scenario type to start from a preset monthly impact curve.">
            <div className="space-y-3">
              <label className="block">
                <span className="label-caps">Scenario name</span>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Worst case — Q4 OEM cuts" className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2.5 text-xs" />
              </label>
              <label className="block">
                <span className="label-caps">Scenario type</span>
                <select value={newType} onChange={(e) => setNewType(e.target.value as ScenarioType)} className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2 text-xs">
                  {scenarioTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Preset assumptions: {typePresets[newType].assumptions.join("; ")}.
              </p>
              <button type="button" onClick={createScenario} disabled={!newName.trim()} className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                <Save className="h-3.5 w-3.5" aria-hidden /> Save scenario
              </button>
            </div>
          </Panel>

          <Panel title="Scenario library" description="Tick a scenario to compare it on the chart." bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {scenarioSpecs.map((spec, index) => (
                <li key={spec.id} className={cn("px-4 py-3", spec.id === selected?.id && "bg-accent")}>
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
                    <input
                      type="checkbox"
                      checked={compareIds.includes(spec.id)}
                      onChange={() => toggleCompare(spec.id)}
                      aria-label={`Compare ${spec.name}`}
                      className="mt-1 h-3.5 w-3.5"
                      style={{ accentColor: scenarioColors[index % scenarioColors.length] }}
                    />
                    <button type="button" onClick={() => setSelectedId(spec.id)} className="min-w-0 text-left">
                      <p className="truncate text-sm font-medium">{spec.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {spec.type} · {spec.owner} · {spec.createdAt}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {spec.promoted && <StatusPill tone="warning">Promoted for review</StatusPill>}
                        <StatusPill tone="neutral">Capacity {spec.capacityCapPct}%</StatusPill>
                      </div>
                    </button>
                    <button type="button" onClick={() => cloneScenarioSpec(spec.id)} className="shrink-0 rounded-md border border-input px-2 py-1 text-[11px] hover:bg-accent" title="Clone scenario">
                      <Copy className="h-3 w-3" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Baseline, approved forecast and selected scenarios" description="Scenario lines are derived from the approved forecast and the scenario's monthly impact curve.">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} width={44} />
                  <Tooltip contentStyle={{ borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: 12 }} formatter={(v: number | string) => (typeof v === "number" ? formatNumber(v) : v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="baseline" name="Statistical baseline" stroke="var(--color-neutral-line)" strokeWidth={1.8} strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="approved" name="Approved forecast" stroke="var(--color-primary)" strokeWidth={2.4} dot={false} />
                  {compared.map((spec, i) => (
                    <Line
                      key={spec.id}
                      type="monotone"
                      dataKey={spec.id}
                      name={spec.name}
                      stroke={scenarioColors[scenarioSpecs.findIndex((s) => s.id === spec.id) % scenarioColors.length]}
                      strokeWidth={2}
                      strokeDasharray={i % 2 === 0 ? "6 3" : "2 3"}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {selected && selectedImplications && (
            <>
              <Panel
                title={`Scenario detail — ${selected.name}`}
                description="Assumptions and monthly impact are editable. Editing a scenario never changes the approved forecast."
                actions={<StatusPill tone="info">{selected.type}</StatusPill>}
              >
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <span className="label-caps">Scenario assumptions</span>
                    <ul className="mt-1.5 space-y-1">
                      {selected.assumptions.map((a) => (
                        <li key={a} className="rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-xs">{a}</li>
                      ))}
                    </ul>
                    <label className="mt-3 block">
                      <span className="label-caps">Notes</span>
                      <textarea
                        value={selected.notes}
                        onChange={(e) => updateScenarioSpec(selected.id, { notes: e.target.value })}
                        rows={3}
                        className="mt-1 w-full rounded-md border border-input bg-surface px-2.5 py-1.5 text-xs"
                      />
                    </label>
                    <label className="mt-2 block">
                      <span className="label-caps">Owner</span>
                      <input
                        value={selected.owner}
                        onChange={(e) => updateScenarioSpec(selected.id, { owner: e.target.value })}
                        className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2.5 text-xs"
                      />
                    </label>
                  </div>

                  <div>
                    <span className="label-caps">Monthly impact versus approved forecast</span>
                    <div className="mt-1.5 grid grid-cols-3 gap-2">
                      {horizonMonths.map((month, i) => (
                        <label key={month} className="block">
                          <span className="text-[11px] text-muted-foreground">{month}</span>
                          <div className="mt-0.5 flex items-center gap-1">
                            <input
                              type="number"
                              step={0.5}
                              value={selected.monthlyImpactPct[i] ?? 0}
                              onChange={(e) => setMonth(i, Number(e.target.value))}
                              className="num h-7 w-full rounded-md border border-input bg-surface px-2 text-right text-xs"
                            />
                            <span className="text-[11px] text-muted-foreground">%</span>
                          </div>
                        </label>
                      ))}
                    </div>
                    <label className="mt-3 block">
                      <span className="label-caps">Capacity availability</span>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="range"
                          min={60}
                          max={120}
                          value={selected.capacityCapPct}
                          onChange={(e) => updateScenarioSpec(selected.id, { capacityCapPct: Number(e.target.value) })}
                          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[var(--color-accent-blue)]"
                        />
                        <span className="num text-xs font-semibold">{selected.capacityCapPct}%</span>
                      </div>
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => cloneScenarioSpec(selected.id)} className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-[11px] font-medium hover:bg-accent">
                        <Copy className="h-3 w-3" aria-hidden /> Clone
                      </button>
                      <button
                        type="button"
                        onClick={() => updateScenarioSpec(selected.id, { monthlyImpactPct: [...typePresets[selected.type].curve], capacityCapPct: typePresets[selected.type].cap })}
                        className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-[11px] font-medium hover:bg-accent"
                      >
                        <RotateCcw className="h-3 w-3" aria-hidden /> Reset to preset
                      </button>
                      <button
                        type="button"
                        disabled={alreadyPromoted}
                        onClick={() =>
                          promoteToReview({
                            title: `${selected.name} — scenario promoted for review`,
                            origin: "Scenario",
                            originId: selected.id,
                            scope: "Current filter scope",
                            requestedImpactPct: Number(
                              (selected.monthlyImpactPct.reduce((a, b) => a + b, 0) / selected.monthlyImpactPct.length).toFixed(1),
                            ),
                            monthlyImpactPct: selected.monthlyImpactPct,
                            owner: selected.owner,
                            note: `${selected.type}. ${selected.notes}`,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        <Send className="h-3 w-3" aria-hidden /> {alreadyPromoted ? "Promoted for review" : "Promote for review"}
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      Promotion creates a forecast-adjustment request that requires approval. The approved forecast is unchanged until then.
                    </p>
                  </div>
                </div>
              </Panel>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Panel title="Scenario implications" description="Compared with the approved forecast over the six-month horizon.">
                  <div className="space-y-1">
                    <MetricRow label="Scenario demand" value={`${formatNumber(selectedImplications.total)} units`} />
                    <MetricRow label="Delta versus approved forecast" value={formatSigned(selectedImplications.deltaPct)} tone={selectedImplications.deltaPct >= 0 ? "positive" : "warning"} />
                    <MetricRow label="Stockout implication (unmet demand)" value={`${formatNumber(selectedImplications.stockoutUnits)} units`} tone={selectedImplications.stockoutUnits > 0 ? "risk" : "positive"} />
                    <MetricRow label="SKU-locations at stockout risk" value={String(selectedImplications.skusAtRisk)} tone={selectedImplications.skusAtRisk > 0 ? "risk" : undefined} />
                    <MetricRow label="Excess-inventory implication" value={`${formatNumber(selectedImplications.excessUnits)} units`} tone={selectedImplications.excessUnits > 0 ? "warning" : "positive"} />
                    <MetricRow label="SKU-locations at excess risk" value={String(selectedImplications.skusExcess)} tone={selectedImplications.skusExcess > 0 ? "warning" : undefined} />
                    <MetricRow label="Service-level implication" value={`${selectedImplications.serviceLevel.toFixed(1)}%`} tone={selectedImplications.serviceLevel < 95 ? "warning" : "positive"} />
                  </div>
                </Panel>

                <Panel title="Scenario comparison" description="All scenarios ticked in the library." bodyClassName="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-xs">
                      <thead className="bg-surface-muted text-[11px] text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2 font-medium">Scenario</th>
                          <th className="px-4 py-2 font-medium">Type</th>
                          <th className="px-4 py-2 text-right font-medium">Delta</th>
                          <th className="px-4 py-2 text-right font-medium">Unmet</th>
                          <th className="px-4 py-2 text-right font-medium">Service</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compared.map((spec) => {
                          const imp = implications(spec);
                          return (
                            <tr key={spec.id} className="border-b border-border last:border-0">
                              <td className="px-4 py-2">{spec.name}</td>
                              <td className="px-4 py-2">{spec.type}</td>
                              <td className={cn("num px-4 py-2 text-right", imp.deltaPct >= 0 ? "text-positive" : "text-risk")}>{formatSigned(imp.deltaPct)}</td>
                              <td className="num px-4 py-2 text-right">{formatNumber(imp.stockoutUnits)}</td>
                              <td className="num px-4 py-2 text-right">{imp.serviceLevel.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                        {compared.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Tick scenarios in the library to compare them.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </div>
            </>
          )}
        </div>
      </div>

      <Panel title="Promoted scenarios and event adjustments awaiting approval" description="Promotion raises a request only; the approved forecast changes after sign-off in Forecast Review." bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-surface-muted text-[11px] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Request</th>
                <th className="px-4 py-2 font-medium">Origin</th>
                <th className="px-4 py-2 text-right font-medium">Average impact</th>
                <th className="px-4 py-2 font-medium">Owner</th>
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
                  <td className="num px-4 py-2 text-right">{r.requestedImpactPct > 0 ? "+" : ""}{r.requestedImpactPct}%</td>
                  <td className="px-4 py-2">{r.owner}</td>
                  <td className="px-4 py-2">
                    <StatusPill tone={r.status === "Approved" ? "positive" : r.status === "Rejected" ? "risk" : "warning"}>{r.status}</StatusPill>
                  </td>
                </tr>
              ))}
              {adjustmentRequests.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No requests raised yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
