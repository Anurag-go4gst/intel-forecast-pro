import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarRange,
  Layers,
  Play,
  RotateCcw,
  Save,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiTile, MetricRow, Panel, PageHeading, PrototypeNote, StatusPill } from "@/components/primitives";
import {
  buildSeries,
  historyCutoffIndex,
  customers,
  filterSkus,
  formatNumber,
  formatSigned,
  plants,
  skus,
} from "@/lib/demo-data";
import {
  behaviourForSku,
  candidateModels,
  championModelId,
  confidenceTone,
  qualityForSku,
} from "@/lib/forecast-domain";
import { usePlatform } from "@/lib/platform-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/forecast-workspace")({
  head: () => ({
    meta: [
      { title: "Forecast Workspace — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Generate a statistical and ML baseline forecast, review confidence bands, model rationale, drivers and audit history per SKU, customer and location.",
      },
      { property: "og:title", content: "Forecast Workspace — Demand Intelligence Platform" },
      {
        property: "og:description",
        content: "Baseline forecast, event-aware approved forecast, what-if overlay and forecast bridge.",
      },
    ],
  }),
  component: ForecastWorkspace,
});

const runSteps = [
  "Reading certified demand history",
  "Engineering calendar, price and event features",
  "Fitting candidate model library",
  "Selecting best model per combination",
  "Generating baseline and confidence bands",
];

const tabs = [
  { id: "forecast", label: "Forecast" },
  { id: "history", label: "Historical data" },
  { id: "rationale", label: "Model rationale" },
  { id: "drivers", label: "Forecast drivers" },
  { id: "audit", label: "Audit history" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const horizonOptions = [3, 6, 9, 12] as const;

const auditHistory = [
  { at: "24 Jul 2026, 11:20", actor: "System", action: "Baseline generated", detail: "Champion model XGBoost (global), 5-fold rolling backtest" },
  { at: "24 Jul 2026, 11:34", actor: "R. Iyer · Planner", action: "Event applied", detail: "EV platform ramp-up, +6.0% on Sep–Nov 26" },
  { at: "24 Jul 2026, 12:02", actor: "R. Iyer · Planner", action: "Override recorded", detail: "Oct 26 raised by 1,400 units — confirmed OEM schedule" },
  { at: "24 Jul 2026, 15:48", actor: "A. Fernandes · Lead", action: "Submitted for approval", detail: "Routed to demand review board" },
  { at: "25 Jul 2026, 09:15", actor: "Demand review board", action: "Approved", detail: "Operational forecast version FY27-M07-v2" },
];

function ForecastWorkspace() {
  const { filters, runState, runProgress, startRun, events, drivers } = usePlatform();
  const scopedRows = filterSkus(filters);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [level, setLevel] = useState<"sku" | "family" | "customer">("sku");
  const [tab, setTab] = useState<TabId>("forecast");

  const [sku, setSku] = useState<string>(scopedRows[0]?.sku ?? skus[0].sku);
  const activeSku = scopedRows.find((r) => r.sku === sku) ?? scopedRows[0] ?? skus[0];
  const [customerId, setCustomerId] = useState<string>(activeSku.customerId);
  const [plantId, setPlantId] = useState<string>(activeSku.plantId);
  const [horizon, setHorizon] = useState<number>(6);

  const acceptedUplift =
    events
      .filter((e) => e.status === "Accepted")
      .reduce((sum, e) => sum + e.expectedImpactPct, 0) / 100;

  const scenarioUplift =
    (drivers.demandShiftPct + drivers.oemScheduleChangePct - drivers.priceChangePct * 0.4) / 100;

  const fullSeries = useMemo(
    () =>
      buildSeries(`${activeSku.sku}|${customerId}|${plantId}`, activeSku.baseVolume / 1.5, acceptedUplift * 0.5),
    [activeSku.sku, activeSku.baseVolume, customerId, plantId, acceptedUplift],
  );

  const series = useMemo(
    () =>
      fullSeries
        .map((p) => ({
          ...p,
          scenario: p.baseline !== null && p.actual === null ? Math.round(p.baseline * (1 + scenarioUplift)) : null,
        }))
        .filter(
          (_, index) =>
            index >= Math.max(0, historyCutoffIndex - 23) && index <= historyCutoffIndex + horizon,
        ),
    [fullSeries, scenarioUplift, horizon],
  );

  const horizonPoints = series.filter((p) => p.actual === null && p.baseline !== null);
  const horizonBaseline = horizonPoints.reduce((sum, p) => sum + (p.baseline ?? 0), 0);
  const horizonApproved = horizonPoints.reduce((sum, p) => sum + (p.adjusted ?? p.baseline ?? 0), 0);
  const horizonScenario = horizonPoints.reduce((sum, p) => sum + (p.scenario ?? 0), 0);

  const overrideCount = Object.keys(overrides).length;

  const quality = qualityForSku(activeSku.sku);
  const behaviour = behaviourForSku(activeSku.sku);
  const champion = candidateModels.find((m) => m.id === championModelId)!;

  const eventDelta = horizonApproved - horizonBaseline;
  const overrideDelta = Math.round(horizonBaseline * 0.012);
  const scenarioDelta = horizonScenario - horizonBaseline;
  const bridge = [
    { label: "Statistical baseline", value: horizonBaseline, kind: "base" as const },
    { label: "Seasonality and calendar effects", value: Math.round(horizonBaseline * 0.018), kind: "delta" as const },
    { label: "Accepted business events", value: eventDelta, kind: "delta" as const },
    { label: "Planner overrides", value: overrideDelta, kind: "delta" as const },
    { label: "Capacity constraint", value: -Math.round(horizonBaseline * (1 - drivers.capacityCapPct / 100)), kind: "delta" as const },
    { label: "Approved forecast", value: 0, kind: "total" as const },
  ];
  const bridgeTotal =
    horizonBaseline +
    Math.round(horizonBaseline * 0.018) +
    eventDelta +
    overrideDelta -
    Math.round(horizonBaseline * (1 - drivers.capacityCapPct / 100));

  const grouped = useMemo(() => {
    if (level === "sku") {
      return scopedRows.map((r) => ({
        key: r.sku,
        primary: r.sku,
        secondary: `${r.description} · ${r.plant}`,
        customer: r.customer,
        model: r.bestModel,
        mape: r.mape,
        baseline: Math.round(r.baseVolume * (1 + acceptedUplift * 0.2)),
      }));
    }
    const map = new Map<string, { volume: number; count: number; mape: number }>();
    scopedRows.forEach((r) => {
      const key = level === "family" ? r.family : r.customer;
      const current = map.get(key) ?? { volume: 0, count: 0, mape: 0 };
      map.set(key, {
        volume: current.volume + r.baseVolume,
        count: current.count + 1,
        mape: current.mape + r.mape,
      });
    });
    return Array.from(map.entries()).map(([key, value]) => ({
      key,
      primary: key,
      secondary: `${value.count} SKU-location combinations`,
      customer: level === "family" ? "Multiple customers" : "Multiple families",
      model: "Blended selection",
      mape: Math.round((value.mape / value.count) * 10) / 10,
      baseline: Math.round(value.volume * (1 + acceptedUplift * 0.2)),
    }));
  }, [scopedRows, level, acceptedUplift]);

  const history = fullSeries.filter((p) => p.actual !== null);

  return (
    <div className="space-y-5">
      <PageHeading
        title="Forecast Workspace"
        subtitle="Select a series, generate the baseline, compare it with the approved event-aware forecast and the active what-if scenario, then record planner overrides with a documented reason."
        actions={
          <>
            <StatusPill tone={runState === "complete" ? "positive" : runState === "running" ? "warning" : "neutral"}>
              {runState === "complete"
                ? "Baseline generated"
                : runState === "running"
                  ? `Generating… ${runProgress}%`
                  : "Baseline from last cycle"}
            </StatusPill>
            <button
              type="button"
              onClick={startRun}
              disabled={runState === "running"}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              <Play className="h-3.5 w-3.5" aria-hidden /> Generate baseline forecast
            </button>
          </>
        }
      />

      <Panel title="Series selection" description="Choose the SKU, customer, plant and horizon for the detailed view.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="label-caps">SKU</span>
            <select
              value={activeSku.sku}
              onChange={(e) => setSku(e.target.value)}
              className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2 text-xs focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
            >
              {(scopedRows.length ? scopedRows : skus).map((r) => (
                <option key={r.sku} value={r.sku}>
                  {r.sku} — {r.description}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label-caps">Customer</span>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2 text-xs focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label-caps">Plant / location</span>
            <select
              value={plantId}
              onChange={(e) => setPlantId(e.target.value)}
              className="mt-1 h-8 w-full rounded-md border border-input bg-surface px-2 text-xs focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
            >
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="label-caps">Forecast horizon</span>
            <div className="mt-1 flex items-center gap-1 rounded-md border border-input p-0.5">
              {horizonOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setHorizon(option)}
                  className={cn(
                    "flex-1 rounded px-2 py-1 text-[11px] font-medium transition-colors",
                    horizon === option ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {option} mo
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Baseline volume" value={formatNumber(horizonBaseline)} unit="units" delta={`${horizon}-month horizon`} deltaTone="info" icon={Layers} />
        <KpiTile
          label="Approved forecast"
          value={formatNumber(horizonApproved)}
          unit="units"
          delta={formatSigned(((horizonApproved - horizonBaseline) / (horizonBaseline || 1)) * 100)}
          deltaTone={horizonApproved >= horizonBaseline ? "positive" : "warning"}
          icon={Sparkles}
        />
        <KpiTile
          label="What-if scenario"
          value={formatNumber(horizonScenario)}
          unit="units"
          delta={formatSigned((scenarioDelta / (horizonBaseline || 1)) * 100)}
          deltaTone={Math.abs(scenarioDelta) > horizonBaseline * 0.05 ? "warning" : "neutral"}
          icon={CalendarRange}
        />
        <KpiTile label="Planner overrides" value={String(overrideCount)} delta={overrideCount ? "Pending review" : "None recorded"} deltaTone={overrideCount ? "warning" : "neutral"} icon={Save} />
      </div>

      {runState !== "idle" && (
        <Panel title="Forecast generation run" description="Simulated execution log for the selected scope.">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-accent-blue transition-all" style={{ width: `${runProgress}%` }} />
          </div>
          <ul className="mt-3 grid grid-cols-1 gap-1.5 md:grid-cols-2">
            {runSteps.map((step, index) => {
              const threshold = ((index + 1) / runSteps.length) * 100;
              const done = runProgress >= threshold;
              return (
                <li key={step} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      done ? "bg-positive" : runProgress > threshold - 20 ? "bg-warning" : "bg-neutral-line",
                    )}
                  />
                  <span className={done ? "text-foreground" : "text-muted-foreground"}>{step}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      <div className="flex flex-wrap items-center gap-1 border-b border-border">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-xs font-medium transition-colors",
              tab === item.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "forecast" && (
        <>
          <Panel
            title={`Forecast view — ${activeSku.sku}`}
            description="Dotted lines are the statistical confidence interval. Approved line includes accepted business events; scenario line reflects the active what-if drivers."
            actions={
              <div className="hidden flex-wrap items-center gap-3 text-[11px] text-muted-foreground sm:flex">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Actual</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent-blue" /> Baseline</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-positive" /> Approved</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" /> Scenario</span>
              </div>
            }
          >
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
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
                    formatter={(value) =>
                      typeof value === "number" ? formatNumber(value) : String(value)
                    }
                  />
                  <ReferenceLine x="Jul 26" stroke="var(--color-neutral-line)" strokeDasharray="3 3" label={{ value: "Horizon start", fontSize: 10, fill: "var(--color-muted-foreground)", position: "insideTopLeft" }} />
                  <Line type="monotone" dataKey="upper" stroke="var(--color-accent-blue)" strokeWidth={1} strokeOpacity={0.5} strokeDasharray="1 3" dot={false} name="Upper confidence" />
                  <Line type="monotone" dataKey="lower" stroke="var(--color-accent-blue)" strokeWidth={1} strokeOpacity={0.5} strokeDasharray="1 3" dot={false} name="Lower confidence" />
                  <Line type="monotone" dataKey="actual" stroke="var(--color-primary)" strokeWidth={2.2} dot={false} name="Actual" />
                  <Line type="monotone" dataKey="baseline" stroke="var(--color-accent-blue)" strokeWidth={2} strokeDasharray="5 4" dot={false} name="Baseline" />
                  <Line type="monotone" dataKey="adjusted" stroke="var(--color-positive)" strokeWidth={2.2} dot={false} name="Approved (event-aware)" />
                  <Line type="monotone" dataKey="scenario" stroke="var(--color-warning)" strokeWidth={1.8} strokeDasharray="2 3" dot={false} name="What-if scenario" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="Forecast bridge"
            description={`Reconciliation from statistical baseline to approved forecast over the ${horizon}-month horizon.`}
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted text-left">
                    <th className="label-caps px-4 py-2.5">Step</th>
                    <th className="label-caps px-4 py-2.5 text-right">Units</th>
                    <th className="label-caps px-4 py-2.5 text-right">% of baseline</th>
                    <th className="label-caps px-4 py-2.5 text-right">Running total</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let running = 0;
                    return bridge.map((step) => {
                      if (step.kind === "total") running = bridgeTotal;
                      else running += step.value;
                      const shown = step.kind === "total" ? bridgeTotal : step.value;
                      return (
                        <tr
                          key={step.label}
                          className={cn(
                            "border-b border-border last:border-0",
                            step.kind !== "delta" && "bg-surface-muted font-semibold",
                          )}
                        >
                          <td className="px-4 py-2.5 text-xs">{step.label}</td>
                          <td
                            className={cn(
                              "num px-4 py-2.5 text-right text-xs",
                              step.kind === "delta" && shown > 0 && "text-positive",
                              step.kind === "delta" && shown < 0 && "text-risk",
                            )}
                          >
                            {step.kind === "delta" ? formatSigned(shown).replace("%", "") : formatNumber(shown)}
                          </td>
                          <td className="num px-4 py-2.5 text-right text-xs text-muted-foreground">
                            {((shown / (horizonBaseline || 1)) * 100).toFixed(1)}%
                          </td>
                          <td className="num px-4 py-2.5 text-right text-xs">{formatNumber(running)}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      {tab === "history" && (
        <Panel
          title="Historical demand"
          description="Cleansed demand history used for fitting, with the transformation status of each period."
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left">
                  <th className="label-caps px-4 py-2.5">Period</th>
                  <th className="label-caps px-4 py-2.5 text-right">Actual demand</th>
                  <th className="label-caps px-4 py-2.5 text-right">Fitted value</th>
                  <th className="label-caps px-4 py-2.5 text-right">Residual</th>
                  <th className="label-caps px-4 py-2.5">Data note</th>
                </tr>
              </thead>
              <tbody>
                {history.map((point, index) => {
                  const fitted = Math.round((point.actual ?? 0) * (1 + (index % 3 === 0 ? 0.03 : -0.02)));
                  const residual = (point.actual ?? 0) - fitted;
                  return (
                    <tr key={point.period} className="border-b border-border last:border-0">
                      <td className="num px-4 py-2 text-xs">{point.period}</td>
                      <td className="num px-4 py-2 text-right text-xs">{formatNumber(point.actual ?? 0)}</td>
                      <td className="num px-4 py-2 text-right text-xs text-muted-foreground">{formatNumber(fitted)}</td>
                      <td className={cn("num px-4 py-2 text-right text-xs", residual < 0 ? "text-risk" : "text-positive")}>
                        {formatNumber(residual)}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {index === 4
                          ? "Outlier capped at 3σ — one-time export order"
                          : index === 8
                            ? "Stockout-censored, uplifted to unconstrained demand"
                            : "Clean"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === "rationale" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Panel className="xl:col-span-2" title="Why this model was selected" description="Selection is based on rolling-origin backtest error and bias stability, not a single accuracy metric.">
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Demand behaviour:</span> {behaviour.name} — {behaviour.signature}
              </li>
              <li>
                <span className="font-medium text-foreground">Selected model:</span> {activeSku.bestModel}; portfolio champion is {champion.name} (WAPE {champion.wape}%, MASE {champion.mase}).
              </li>
              <li>
                <span className="font-medium text-foreground">Runner-up:</span> {behaviour.recommended} evaluated on the same folds.
              </li>
              <li>
                <span className="font-medium text-foreground">Guardrails:</span> models with bias outside ±3% or unstable fold variance are rejected even when average error is lowest.
              </li>
              <li>
                <span className="font-medium text-foreground">Data readiness:</span> series scores {quality.score} / 100 — {quality.reason}.
              </li>
            </ul>
          </Panel>
          <Panel title="Series diagnostics">
            <div className="space-y-1">
              <MetricRow label="Readiness score" value={`${quality.score} / 100`} tone={quality.score >= 80 ? "positive" : "warning"} />
              <MetricRow label="History available" value={`${quality.historyMonths} months`} />
              <MetricRow label="Completeness" value={`${quality.completeness}%`} />
              <MetricRow label="Outliers detected" value={String(quality.outliers)} tone={quality.outliers > 3 ? "warning" : "positive"} />
              <MetricRow label="Censored periods" value={String(quality.stockoutPeriods)} />
              <MetricRow label="Baseline MAPE" value={`${activeSku.mape}%`} />
              <MetricRow label="Baseline bias" value={`${formatSigned(activeSku.bias)}`} tone={Math.abs(activeSku.bias) > 3 ? "warning" : "positive"} />
            </div>
            <div className="mt-3">
              <StatusPill tone={confidenceTone[quality.confidence]}>{quality.confidence}</StatusPill>
            </div>
          </Panel>
        </div>
      )}

      {tab === "drivers" && (
        <Panel title="Forecast drivers" description="Contribution of each feature group to the current horizon forecast.">
          <ul className="divide-y divide-border">
            {[
              { label: "Base level and trend", value: 72, note: "36 months of cleansed history" },
              { label: "Seasonality and calendar", value: 11, note: "Monsoon service peak, festive shutdown" },
              { label: "OEM production schedule", value: 8, note: "Customer-shared build plan, next 4 months" },
              { label: "Accepted business events", value: 5, note: `${events.filter((e) => e.status === "Accepted").length} events applied` },
              { label: "Price and promotion", value: 3, note: "Aftermarket list price change" },
              { label: "Lead-time and supply signals", value: 1, note: "Supplier constraint indicator" },
            ].map((driver) => (
              <li key={driver.label} className="py-2.5 first:pt-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-foreground">{driver.label}</span>
                  <span className="num text-xs text-muted-foreground">{driver.value}%</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-accent-blue" style={{ width: `${driver.value}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{driver.note}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {tab === "audit" && (
        <Panel title="Audit history" description="Every change to this series in the current planning cycle." bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left">
                  <th className="label-caps px-4 py-2.5">Timestamp</th>
                  <th className="label-caps px-4 py-2.5">Actor</th>
                  <th className="label-caps px-4 py-2.5">Action</th>
                  <th className="label-caps px-4 py-2.5">Detail</th>
                </tr>
              </thead>
              <tbody>
                {auditHistory.map((row) => (
                  <tr key={row.at} className="border-b border-border last:border-0">
                    <td className="num px-4 py-2.5 text-xs text-muted-foreground">{row.at}</td>
                    <td className="px-4 py-2.5 text-xs">{row.actor}</td>
                    <td className="px-4 py-2.5 text-xs font-medium">{row.action}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <Panel
        title="Forecast grid"
        description="Enter a planner override where business knowledge differs from the statistical result."
        bodyClassName="p-0"
        actions={
          <div className="flex items-center gap-1 rounded-md border border-input p-0.5">
            {(["sku", "family", "customer"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLevel(option)}
                className={cn(
                  "rounded px-2 py-1 text-[11px] font-medium capitalize transition-colors",
                  level === option ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                )}
              >
                {option === "sku" ? "SKU" : option}
              </button>
            ))}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left">
                <th className="label-caps px-4 py-2.5">{level === "sku" ? "SKU" : "Grouping"}</th>
                <th className="label-caps px-4 py-2.5">Customer / scope</th>
                <th className="label-caps px-4 py-2.5">Selected model</th>
                <th className="label-caps px-4 py-2.5 text-right">MAPE</th>
                <th className="label-caps px-4 py-2.5 text-right">Baseline</th>
                <th className="label-caps px-4 py-2.5 text-right">Planner override</th>
                <th className="label-caps px-4 py-2.5 text-right">Variance</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((row) => {
                const override = overrides[row.key];
                const variance = override ? ((override - row.baseline) / row.baseline) * 100 : 0;
                return (
                  <tr
                    key={row.key}
                    onClick={() => level === "sku" && setSku(row.key)}
                    className={cn(
                      "border-b border-border last:border-0 hover:bg-surface-muted/60",
                      level === "sku" && "cursor-pointer",
                      level === "sku" && row.key === activeSku.sku && "bg-accent",
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <p className="num text-xs font-semibold">{row.primary}</p>
                      <p className="text-xs text-muted-foreground">{row.secondary}</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.customer}</td>
                    <td className="px-4 py-2.5 text-xs">{row.model}</td>
                    <td className="num px-4 py-2.5 text-right text-xs">
                      <span className={row.mape > 14 ? "text-risk" : row.mape > 9 ? "text-warning-foreground" : "text-positive"}>
                        {row.mape}%
                      </span>
                    </td>
                    <td className="num px-4 py-2.5 text-right text-xs">{formatNumber(row.baseline)}</td>
                    <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={override ?? ""}
                        placeholder={formatNumber(row.baseline)}
                        onChange={(event) => {
                          const value = event.target.value;
                          setOverrides((prev) => {
                            const next = { ...prev };
                            if (value === "") delete next[row.key];
                            else next[row.key] = Number(value);
                            return next;
                          });
                        }}
                        className="num h-7 w-28 rounded-md border border-input bg-surface px-2 text-right text-xs focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
                      />
                    </td>
                    <td className="num px-4 py-2.5 text-right text-xs">
                      {override ? (
                        <span className={Math.abs(variance) > 10 ? "text-risk" : variance !== 0 ? "text-warning-foreground" : ""}>
                          {formatSigned(variance)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOverrides({})}
          className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Clear overrides
        </button>
        <span className="text-xs text-muted-foreground">
          Overrides stay in the working draft until submitted through Forecast Review.
        </span>
      </div>

      <PrototypeNote>
        Illustrative prototype data. Forecast generation is simulated in the browser using seeded
        series; model selection labels, confidence bands and audit entries are demonstrative only.
      </PrototypeNote>
    </div>
  );
}
