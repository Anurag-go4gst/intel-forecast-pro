import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  CircleGauge,
  PackageX,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  ComposedChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiTile, MetricRow, Panel, PageHeading, PrototypeNote, StatusPill } from "@/components/primitives";
import {
  aggregateSeries,
  biasByFamily,
  filterSkus,
  formatNumber,
  formatSigned,
  riskRows,
} from "@/lib/demo-data";
import { usePlatform } from "@/lib/platform-state";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Executive Overview — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Consolidated view of demand signal, forecast accuracy, bias, stockout risk and excess inventory exposure across business units and plants.",
      },
      { property: "og:title", content: "Executive Overview — Demand Intelligence Platform" },
      {
        property: "og:description",
        content:
          "Demand signal, forecast accuracy, bias and inventory risk for automotive and manufacturing operations.",
      },
    ],
  }),
  component: ExecutiveOverview,
});

const chartTooltipStyle = {
  contentStyle: {
    borderRadius: 6,
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    fontSize: 12,
  },
} as const;

function ExecutiveOverview() {
  const { filters, events, reviewLines, published } = usePlatform();
  const rows = filterSkus(filters);
  const series = aggregateSeries(rows);

  const horizonTotal = series
    .filter((p) => p.baseline !== null)
    .reduce((sum, p) => sum + (p.baseline ?? 0), 0);
  const weightedMape =
    rows.reduce((sum, r) => sum + r.mape * r.baseVolume, 0) /
    (rows.reduce((sum, r) => sum + r.baseVolume, 0) || 1);
  const weightedBias =
    rows.reduce((sum, r) => sum + r.bias * r.baseVolume, 0) /
    (rows.reduce((sum, r) => sum + r.baseVolume, 0) || 1);
  const stockoutCount = rows.filter((r) => r.stockCoverDays < 15).length;
  const excessCount = rows.filter((r) => r.stockCoverDays > 60).length;
  const pendingReview = reviewLines.filter((l) => l.status === "Pending").length;
  const openEvents = events.filter((e) => e.status !== "Accepted" && e.status !== "Rejected").length;

  const familyMix = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.family] = (acc[r.family] ?? 0) + r.baseVolume;
    return acc;
  }, {});
  const mixData = Object.entries(familyMix)
    .map(([family, volume]) => ({ family: family.replace(/ .*/, ""), volume }))
    .sort((a, b) => b.volume - a.volume);

  return (
    <div className="space-y-5">
      <PageHeading
        title="Executive Overview"
        subtitle="Demand signal, forecast quality and inventory exposure for the selected business unit, customer, product family, plant and forecast version."
        actions={
          <>
            <StatusPill tone={published ? "positive" : "warning"}>
              {published ? "Operational forecast published" : `${pendingReview} lines awaiting approval`}
            </StatusPill>
            <Link
              to="/forecast-workspace"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Open forecast workspace
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiTile
          label="Forecast volume (horizon)"
          value={formatNumber(horizonTotal)}
          unit="units"
          delta="+6.2% vs prior version"
          deltaTone="info"
          icon={TrendingUp}
        />
        <KpiTile
          label="Forecast accuracy"
          value={(100 - weightedMape).toFixed(1)}
          unit="%"
          delta="+2.4 pts vs Q2"
          deltaTone="positive"
          icon={Target}
        />
        <KpiTile
          label="Forecast bias"
          value={formatSigned(weightedBias)}
          delta={weightedBias > 2 ? "Over-forecast trend" : weightedBias < -2 ? "Under-forecast trend" : "Within tolerance"}
          deltaTone={Math.abs(weightedBias) > 2 ? "warning" : "positive"}
          icon={CircleGauge}
        />
        <KpiTile
          label="Stockout risk (SKUs)"
          value={String(stockoutCount)}
          delta="Cover below 15 days"
          deltaTone="risk"
          icon={PackageX}
        />
        <KpiTile
          label="Excess inventory (SKUs)"
          value={String(excessCount)}
          delta="Cover above 60 days"
          deltaTone="warning"
          icon={Boxes}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Demand history and forecast horizon"
          description="Actuals to Jun 2026, statistical baseline with confidence band thereafter."
          actions={
            <div className="hidden items-center gap-3 text-[11px] text-muted-foreground sm:flex">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" /> Actual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent-blue" /> Baseline
              </span>
            </div>
          }
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  interval={1}
                  stroke="var(--color-neutral-line)"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  stroke="var(--color-neutral-line)"
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                  width={44}
                />
                <Tooltip
                  {...chartTooltipStyle}
                  formatter={(value: number | string) =>
                    typeof value === "number" ? formatNumber(value) : value
                  }
                />
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="none"
                  fill="var(--color-accent-blue)"
                  fillOpacity={0.12}
                  name="Upper bound"
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--color-primary)"
                  strokeWidth={2.2}
                  dot={false}
                  name="Actual"
                />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke="var(--color-accent-blue)"
                  strokeWidth={2.2}
                  strokeDasharray="5 4"
                  dot={false}
                  name="Baseline forecast"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Planning cycle status" description="Current forecast cycle: July 2026 monthly run.">
          <div className="space-y-1">
            <MetricRow label="SKU-customer-location combinations" value={formatNumber(rows.length * 82)} />
            <MetricRow label="Combinations auto-approved" value="1,006" tone="positive" />
            <MetricRow label="Lines pending planner review" value={String(pendingReview)} tone="warning" />
            <MetricRow label="Open business events" value={String(openEvents)} tone="warning" />
            <MetricRow label="Data readiness score" value="93 / 100" tone="positive" />
            <MetricRow label="Value at risk (stockout)" value="₹9.7 Cr" tone="risk" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/forecast-review"
              className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Review &amp; approve
            </Link>
            <Link
              to="/data-readiness"
              className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Resolve data gaps
            </Link>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Forecast bias by product family" description="Positive values indicate over-forecast.">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={biasByFamily} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="family" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" width={36} />
                <Tooltip {...chartTooltipStyle} formatter={(v: number | string) => `${v}%`} />
                <Bar dataKey="bias" radius={[3, 3, 0, 0]}>
                  {biasByFamily.map((entry) => (
                    <Cell
                      key={entry.family}
                      fill={
                        Math.abs(entry.bias) > 5
                          ? "var(--color-risk)"
                          : Math.abs(entry.bias) > 2.5
                            ? "var(--color-warning)"
                            : "var(--color-positive)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Forecast volume mix" description="Horizon volume distribution by product family.">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mixData} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  stroke="var(--color-neutral-line)"
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="family"
                  width={92}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  stroke="var(--color-neutral-line)"
                />
                <Tooltip {...chartTooltipStyle} formatter={(v: number | string) => (typeof v === "number" ? formatNumber(v) : v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="volume" name="Forecast units" fill="var(--color-primary)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Top exposures requiring decisions" description="Highest financial exposure across stockout and excess risk.">
          <ul className="divide-y divide-border">
            {riskRows.slice(0, 5).map((row) => (
              <li key={row.sku} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 py-2.5 first:pt-0">
                <div className="min-w-0">
                  <p className="num truncate text-xs font-semibold">{row.sku}</p>
                  <p className="truncate text-xs text-muted-foreground">{row.scope}</p>
                </div>
                <StatusPill tone={row.risk === "Stockout" ? "risk" : "warning"}>
                  {row.risk} · ₹{row.exposureValue} Cr
                </StatusPill>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <PrototypeNote>
        All figures shown are seeded demonstration values held in local application state. Forecast
        generation, model selection and risk scoring are simulated for prototype purposes and no
        production ML training is performed.
      </PrototypeNote>
    </div>
  );
}
