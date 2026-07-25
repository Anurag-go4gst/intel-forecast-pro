import { createFileRoute } from "@tanstack/react-router";
import { CalendarRange, Layers, Play, RotateCcw, Save, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import {
  LineChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiTile, Panel, PageHeading, PrototypeNote, StatusPill } from "@/components/primitives";
import { aggregateSeries, buildSeries, filterSkus, formatNumber, formatSigned } from "@/lib/demo-data";
import { usePlatform } from "@/lib/platform-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/forecast-workspace")({
  head: () => ({
    meta: [
      { title: "Forecast Workspace — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Generate a statistical and ML baseline forecast, review confidence bands and apply planner overrides per SKU, customer and location.",
      },
      { property: "og:title", content: "Forecast Workspace — Demand Intelligence Platform" },
      {
        property: "og:description",
        content: "Baseline forecast generation and planner adjustment workspace.",
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

function ForecastWorkspace() {
  const { filters, runState, runProgress, startRun, events } = usePlatform();
  const rows = filterSkus(filters);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [level, setLevel] = useState<"sku" | "family" | "customer">("sku");

  const acceptedUplift =
    events
      .filter((e) => e.status === "Accepted")
      .reduce((sum, e) => sum + e.expectedImpactPct, 0) / 100;

  const series = useMemo(() => aggregateSeries(rows, acceptedUplift * 0.35), [rows, acceptedUplift]);

  const horizonBaseline = series.reduce((sum, p) => sum + (p.baseline ?? 0), 0);
  const horizonAdjusted = series.reduce((sum, p) => sum + (p.adjusted ?? 0), 0);
  const overrideCount = Object.keys(overrides).length;

  const grouped = useMemo(() => {
    if (level === "sku") {
      return rows.map((r) => ({
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
    rows.forEach((r) => {
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
  }, [rows, level, acceptedUplift]);

  return (
    <div className="space-y-5">
      <PageHeading
        title="Forecast Workspace"
        subtitle="Generate the baseline forecast across the selected scope, inspect confidence bands, and record planner overrides with a documented reason before review."
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Baseline volume" value={formatNumber(horizonBaseline)} unit="units" delta="Statistical + ML blend" deltaTone="info" icon={Layers} />
        <KpiTile
          label="Adjusted volume"
          value={formatNumber(horizonAdjusted)}
          unit="units"
          delta={formatSigned(((horizonAdjusted - horizonBaseline) / (horizonBaseline || 1)) * 100)}
          deltaTone={horizonAdjusted >= horizonBaseline ? "positive" : "warning"}
          icon={Sparkles}
        />
        <KpiTile label="Combinations in scope" value={formatNumber(rows.length * 82)} delta="SKU × customer × location" deltaTone="neutral" icon={CalendarRange} />
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

      <Panel
        title="Baseline versus event-adjusted forecast"
        description="Shaded band shows the statistical confidence interval. Adjusted line includes accepted business events."
      >
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" interval={1} />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                stroke="var(--color-neutral-line)"
                tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                width={44}
              />
              <Tooltip
                contentStyle={{ borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: 12 }}
                formatter={(value: number | string) => (typeof value === "number" ? formatNumber(value) : value)}
              />
              <ReferenceLine x="Jul 26" stroke="var(--color-neutral-line)" strokeDasharray="3 3" label={{ value: "Horizon start", fontSize: 10, fill: "var(--color-muted-foreground)", position: "insideTopLeft" }} />
              <Line type="monotone" dataKey="actual" stroke="var(--color-primary)" strokeWidth={2.2} dot={false} name="Actual" />
              <Line type="monotone" dataKey="baseline" stroke="var(--color-accent-blue)" strokeWidth={2} strokeDasharray="5 4" dot={false} name="Baseline" />
              <Line type="monotone" dataKey="adjusted" stroke="var(--color-positive)" strokeWidth={2.2} dot={false} name="Event-adjusted" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

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
                  <tr key={row.key} className="border-b border-border last:border-0 hover:bg-surface-muted/60">
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
                    <td className="px-4 py-2.5 text-right">
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
        Forecast generation is simulated in the browser using seeded series. Model selection labels,
        confidence bands and run timings are illustrative and no model is trained.
      </PrototypeNote>
    </div>
  );
}
