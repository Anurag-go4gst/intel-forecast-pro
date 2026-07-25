import { createFileRoute } from "@tanstack/react-router";
import { FlaskConical, RotateCcw, Save, ShieldAlert } from "lucide-react";
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
import {
  aggregateSeries,
  filterSkus,
  formatNumber,
  formatSigned,
  type ScenarioDriver,
} from "@/lib/demo-data";
import { usePlatform } from "@/lib/platform-state";

export const Route = createFileRoute("/what-if")({
  head: () => ({
    meta: [
      { title: "What-if Scenarios — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Simulate demand shifts, price changes, OEM schedule changes, lead-time and capacity constraints without altering the official forecast.",
      },
      { property: "og:title", content: "What-if Scenarios — Demand Intelligence Platform" },
      {
        property: "og:description",
        content: "Sandbox simulation of demand drivers against the official baseline forecast.",
      },
    ],
  }),
  component: WhatIfScenarios,
});

type SliderConfig = {
  key: keyof ScenarioDriver;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix: string;
  help: string;
};

const sliders: SliderConfig[] = [
  { key: "demandShiftPct", label: "Market demand shift", min: -30, max: 30, step: 1, suffix: "%", help: "Underlying market movement independent of price." },
  { key: "priceChangePct", label: "Price change", min: -15, max: 15, step: 0.5, suffix: "%", help: "Elasticity of -0.7 applied to aftermarket volume." },
  { key: "oemScheduleChangePct", label: "OEM schedule change", min: -25, max: 25, step: 1, suffix: "%", help: "Customer release quantity revision." },
  { key: "leadTimeDeltaDays", label: "Supply lead-time change", min: -15, max: 30, step: 1, suffix: " days", help: "Affects cover days and stockout exposure." },
  { key: "capacityCapPct", label: "Capacity availability", min: 60, max: 120, step: 1, suffix: "%", help: "Constrains achievable supply against demand." },
];

function WhatIfScenarios() {
  const { filters, drivers, setDriver, resetDrivers, scenarios, saveScenario, loadScenario, events } =
    usePlatform();
  const rows = filterSkus(filters);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  const acceptedUplift = drivers.includeAcceptedEvents
    ? events.filter((e) => e.status === "Accepted").reduce((sum, e) => sum + e.expectedImpactPct, 0) / 100
    : 0;

  const scenarioMultiplier =
    1 +
    drivers.demandShiftPct / 100 +
    drivers.oemScheduleChangePct / 100 +
    (-0.7 * drivers.priceChangePct) / 100 +
    acceptedUplift * 0.35;

  const baseline = useMemo(() => aggregateSeries(rows), [rows]);

  const comparison = baseline
    .filter((p) => p.baseline !== null)
    .map((p) => {
      const scenarioDemand = Math.round((p.baseline ?? 0) * scenarioMultiplier);
      const supplyCap = Math.round((p.baseline ?? 0) * (drivers.capacityCapPct / 100) * 1.05);
      return {
        period: p.period,
        official: p.baseline,
        scenario: scenarioDemand,
        constrained: Math.min(scenarioDemand, supplyCap),
      };
    });

  const officialTotal = comparison.reduce((sum, p) => sum + (p.official ?? 0), 0);
  const scenarioTotal = comparison.reduce((sum, p) => sum + p.scenario, 0);
  const constrainedTotal = comparison.reduce((sum, p) => sum + p.constrained, 0);
  const unmetDemand = scenarioTotal - constrainedTotal;
  const deltaPct = ((scenarioTotal - officialTotal) / (officialTotal || 1)) * 100;
  const coverImpact = Math.max(0, Math.round(drivers.leadTimeDeltaDays * 0.8));
  const stockoutRiskCount =
    rows.filter((r) => r.stockCoverDays - coverImpact < 15).length + (unmetDemand > 0 ? 6 : 0);

  return (
    <div className="space-y-5">
      <PageHeading
        title="What-if Scenarios"
        subtitle="Adjust drivers and see the effect on demand, supply feasibility and inventory risk. Scenarios are a sandbox: the official forecast version is never modified until a scenario is promoted through Forecast Review."
        actions={
          <StatusPill tone="info">
            <FlaskConical className="h-3 w-3" aria-hidden /> Sandbox — official forecast unchanged
          </StatusPill>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Official forecast" value={formatNumber(officialTotal)} unit="units" delta="Current published baseline" deltaTone="neutral" />
        <KpiTile label="Scenario demand" value={formatNumber(scenarioTotal)} unit="units" delta={formatSigned(deltaPct)} deltaTone={deltaPct >= 0 ? "positive" : "warning"} />
        <KpiTile label="Unmet demand at capacity" value={formatNumber(unmetDemand)} unit="units" delta={unmetDemand > 0 ? "Capacity constrained" : "Fully servable"} deltaTone={unmetDemand > 0 ? "risk" : "positive"} />
        <KpiTile label="Combinations at stockout risk" value={String(stockoutRiskCount)} delta={`Cover reduced by ${coverImpact} days`} deltaTone={stockoutRiskCount > 4 ? "risk" : "warning"} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Panel
          title="Scenario drivers"
          description="Changes apply only to this sandbox."
          actions={
            <button
              type="button"
              onClick={resetDrivers}
              className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 text-[11px] font-medium hover:bg-accent"
            >
              <RotateCcw className="h-3 w-3" aria-hidden /> Reset
            </button>
          }
        >
          <div className="space-y-4">
            {sliders.map((slider) => {
              const value = drivers[slider.key] as number;
              return (
                <div key={slider.key}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium">{slider.label}</span>
                    <span className="num text-xs font-semibold">
                      {value > 0 && slider.key !== "capacityCapPct" ? "+" : ""}
                      {value}
                      {slider.suffix}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={slider.min}
                    max={slider.max}
                    step={slider.step}
                    value={value}
                    onChange={(e) => setDriver(slider.key, Number(e.target.value))}
                    className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[var(--color-accent-blue)]"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">{slider.help}</p>
                </div>
              );
            })}

            <label className="flex items-start gap-2 rounded-md border border-border bg-surface-muted px-3 py-2">
              <input
                type="checkbox"
                checked={drivers.includeAcceptedEvents}
                onChange={(e) => setDriver("includeAcceptedEvents", e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 accent-[var(--color-primary)]"
              />
              <span className="text-xs">
                Include accepted business events
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  Programme ramps, promotions and changeovers already approved in Event Intelligence.
                </span>
              </span>
            </label>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel
            title="Scenario versus official forecast"
            description="Constrained line reflects the capacity ceiling applied to scenario demand."
          >
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparison} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    stroke="var(--color-neutral-line)"
                    tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                    width={44}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: 12 }}
                    formatter={(v: number | string) => (typeof v === "number" ? formatNumber(v) : v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="official" name="Official forecast" stroke="var(--color-primary)" strokeWidth={2.2} dot={false} />
                  <Line type="monotone" dataKey="scenario" name="Scenario demand" stroke="var(--color-accent-blue)" strokeWidth={2.2} strokeDasharray="5 4" dot={false} />
                  <Line type="monotone" dataKey="constrained" name="Servable at capacity" stroke="var(--color-warning)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Scenario outcome summary">
              <div className="space-y-1">
                <MetricRow label="Demand delta versus official" value={formatSigned(deltaPct)} tone={deltaPct >= 0 ? "positive" : "warning"} />
                <MetricRow label="Servable volume" value={formatNumber(constrainedTotal)} />
                <MetricRow label="Unmet demand" value={formatNumber(unmetDemand)} tone={unmetDemand > 0 ? "risk" : "positive"} />
                <MetricRow label="Revenue exposure at risk" value={`₹${(unmetDemand / 42000).toFixed(1)} Cr`} tone={unmetDemand > 0 ? "risk" : undefined} />
                <MetricRow label="Cover day impact" value={`-${coverImpact} days`} tone={coverImpact > 5 ? "warning" : undefined} />
                <MetricRow label="Capacity utilisation" value={`${Math.min(140, Math.round((scenarioTotal / (officialTotal || 1)) * (100 / (drivers.capacityCapPct / 100))))}%`} tone="warning" />
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Scenario name"
                  className="h-8 flex-1 rounded-md border border-input bg-surface px-2.5 text-xs focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!name.trim()}
                  onClick={() => {
                    saveScenario(name.trim(), note.trim() || "Saved from what-if sandbox.");
                    setName("");
                    setNote("");
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" aria-hidden /> Save scenario
                </button>
              </div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Assumption note (optional)"
                className="mt-2 h-8 w-full rounded-md border border-input bg-surface px-2.5 text-xs focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
              />
            </Panel>

            <Panel title="Saved scenarios" description="Load a saved scenario to restore its driver settings." bodyClassName="p-0">
              <ul className="divide-y divide-border">
                {scenarios.map((scenario) => (
                  <li key={scenario.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{scenario.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {scenario.createdBy} · {scenario.createdAt}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{scenario.note}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => loadScenario(scenario.id)}
                      className="shrink-0 rounded-md border border-input px-2.5 py-1 text-[11px] font-medium hover:bg-accent"
                    >
                      Load
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning-soft px-3 py-2.5">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" aria-hidden />
        <p className="text-xs leading-relaxed text-warning-foreground">
          Scenario results are indicative only. Promoting a scenario into the operational forecast
          requires consensus approval and a documented assumption set in Forecast Review.
        </p>
      </div>

      <PrototypeNote>
        Driver responses use simple seeded elasticity and capacity rules held in application state.
        No optimisation or simulation engine is executed.
      </PrototypeNote>
    </div>
  );
}
