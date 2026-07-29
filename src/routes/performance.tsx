import { createFileRoute } from "@tanstack/react-router";
import { Activity, AlertTriangle, Boxes, Target } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiTile, Panel, PageHeading, PrototypeNote, StatusPill } from "@/components/primitives";
import { accuracyTrend, biasByFamily, filterSkus, formatNumber, riskBuckets, riskRows } from "@/lib/demo-data";
import { championChallenger, fvaAgainst } from "@/lib/governance-domain";
import { usePlatform } from "@/lib/platform-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Performance Monitoring — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Track forecast accuracy, forecast bias, stockout risk and excess inventory risk by SKU, customer, plant and product family.",
      },
      { property: "og:title", content: "Performance Monitoring — Demand Intelligence Platform" },
      {
        property: "og:description",
        content: "Forecast accuracy, bias and inventory risk monitoring across the plan.",
      },
    ],
  }),
  component: PerformanceMonitoring,
});

function PerformanceMonitoring() {
  const { filters } = usePlatform();
  const rows = filterSkus(filters);
  const latest = accuracyTrend[accuracyTrend.length - 1];

  return (
    <div className="space-y-5">
      <PageHeading
        title="Performance Monitoring"
        subtitle="Measure how the published forecast performed against actual demand, isolate persistent bias, and quantify the inventory consequences: stockout exposure and excess-inventory risk."
        actions={<StatusPill tone="positive">Accuracy improving for 5 consecutive cycles</StatusPill>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Forecast accuracy" value={(100 - latest.mape).toFixed(1)} unit="%" delta="+0.5 pts vs Jun" deltaTone="positive" icon={Target} />
        <KpiTile label="Forecast bias" value={`${latest.bias > 0 ? "+" : ""}${latest.bias.toFixed(1)}%`} delta="Slight under-forecast" deltaTone="warning" icon={Activity} />
        <KpiTile label="Stockout risk (high)" value={String(riskBuckets[0].high)} delta="Cover below 15 days" deltaTone="risk" icon={AlertTriangle} />
        <KpiTile label="Excess risk (high)" value={String(riskBuckets[1].high)} delta="Cover above 90 days" deltaTone="warning" icon={Boxes} />
      </div>

      <Panel
        title="Business review for the next cycle"
        description="The owner view: what improved, what still needs action and which decision carries into the next forecasting cycle."
      >
        <div
          id="guide-monitor-summary"
          tabIndex={-1}
          className="grid scroll-mt-28 grid-cols-1 gap-3 outline-none lg:grid-cols-3"
        >
          <div className="rounded-md border border-positive/25 bg-positive-soft/45 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold">Keep in operation</p>
              <StatusPill tone="positive">Model + event layer</StatusPill>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Event-aware forecasting is the best current layer at 12.8% WAPE, beating the
              naive reference and the pure model baseline.
            </p>
          </div>
          <div className="rounded-md border border-warning/30 bg-warning-soft/45 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold">Tighten governance</p>
              <StatusPill tone="warning">Planner overrides</StatusPill>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Low-evidence planner changes still add error before review. Keep the approval
              gate strict and require evidence for material overrides.
            </p>
          </div>
          <div className="rounded-md border border-risk/25 bg-risk-soft/45 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold">Act before next load</p>
              <StatusPill tone="risk">Supply risk</StatusPill>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              High stockout and excess-risk combinations need owner actions before the next
              cycle: resolve supply constraints, rebalance inventory or document exceptions.
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Accuracy and bias trend" description="Rolling monthly measurement against published forecast versions.">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={accuracyTrend} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" width={40} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip contentStyle={{ borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: 12 }} formatter={(v: number | string) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="mape" name="MAPE" stroke="var(--color-primary)" strokeWidth={2.2} dot={{ r: 2.5 }} />
                <Line type="monotone" dataKey="bias" name="Bias" stroke="var(--color-warning)" strokeWidth={2} dot={{ r: 2.5 }} />
                <Line type="monotone" dataKey="forecastAttainment" name="Plan attainment" stroke="var(--color-positive)" strokeWidth={2} dot={{ r: 2.5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Risk distribution" description="Combination counts by risk severity.">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskBuckets} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" width={40} />
                <Tooltip contentStyle={{ borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="high" name="High" stackId="a" fill="var(--color-risk)" />
                <Bar dataKey="medium" name="Medium" stackId="a" fill="var(--color-warning)" />
                <Bar dataKey="low" name="Low" stackId="a" fill="var(--color-positive)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="Risk register" description="Combinations requiring a supply or planning intervention this cycle." bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left">
                <th className="label-caps px-4 py-2.5">SKU</th>
                <th className="label-caps px-4 py-2.5">Scope</th>
                <th className="label-caps px-4 py-2.5">Risk</th>
                <th className="label-caps px-4 py-2.5">Severity</th>
                <th className="label-caps px-4 py-2.5 text-right">Cover days</th>
                <th className="label-caps px-4 py-2.5 text-right">Exposure</th>
                <th className="label-caps px-4 py-2.5">Primary driver</th>
              </tr>
            </thead>
            <tbody>
              {riskRows.map((row) => (
                <tr key={`${row.sku}-${row.risk}`} className="border-b border-border last:border-0 hover:bg-surface-muted/60">
                  <td className="px-4 py-3">
                    <p className="num text-xs font-semibold">{row.sku}</p>
                    <p className="text-xs text-muted-foreground">{row.description}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{row.scope}</td>
                  <td className="px-4 py-3">
                    <StatusPill tone={row.risk === "Stockout" ? "risk" : "warning"}>{row.risk}</StatusPill>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium">{row.severity}</td>
                  <td className="num px-4 py-3 text-right text-xs">{row.coverDays}</td>
                  <td className="num px-4 py-3 text-right text-xs">₹{row.exposureValue} Cr</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{row.driver}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Bias by product family" description="Persistent bias indicates a structural planning issue.">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={biasByFamily} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="family" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" width={36} />
                <Tooltip contentStyle={{ borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: 12 }} formatter={(v: number | string) => `${v}%`} />
                <Bar dataKey="bias" name="Bias" radius={[3, 3, 0, 0]}>
                  {biasByFamily.map((entry) => (
                    <Cell key={entry.family} fill={Math.abs(entry.bias) > 5 ? "var(--color-risk)" : Math.abs(entry.bias) > 2.5 ? "var(--color-warning)" : "var(--color-positive)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="xl:col-span-2" title="Accuracy by combination" description="Weighted MAPE and inventory cover for the filtered scope." bodyClassName="p-0">
          <div className="max-h-64 overflow-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="sticky top-0 bg-surface-muted">
                <tr className="border-b border-border text-left">
                  <th className="label-caps px-4 py-2.5">SKU</th>
                  <th className="label-caps px-4 py-2.5">Class</th>
                  <th className="label-caps px-4 py-2.5 text-right">MAPE</th>
                  <th className="label-caps px-4 py-2.5 text-right">Bias</th>
                  <th className="label-caps px-4 py-2.5 text-right">Cover</th>
                  <th className="label-caps px-4 py-2.5 text-right">On hand</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.sku} className="border-b border-border last:border-0">
                    <td className="num px-4 py-2 text-xs font-semibold">{row.sku}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {row.abc} · {row.volatility} volatility
                    </td>
                    <td className={cn("num px-4 py-2 text-right text-xs", row.mape > 14 ? "text-risk" : row.mape > 9 ? "text-warning-foreground" : "text-positive")}>
                      {row.mape}%
                    </td>
                    <td className="num px-4 py-2 text-right text-xs">
                      {row.bias > 0 ? "+" : ""}
                      {row.bias}%
                    </td>
                    <td className={cn("num px-4 py-2 text-right text-xs", row.stockCoverDays < 15 ? "text-risk" : row.stockCoverDays > 60 ? "text-warning-foreground" : "")}>
                      {row.stockCoverDays}d
                    </td>
                    <td className="num px-4 py-2 text-right text-xs">{formatNumber(row.onHand)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel
          title="Forecast value add"
          description="Each layer is measured against the naïve reference. A layer that does not reduce error is not worth its cost."
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left">
                  <th className="label-caps px-4 py-2.5">Forecast layer</th>
                  <th className="label-caps px-4 py-2.5 text-right">WAPE</th>
                  <th className="label-caps px-4 py-2.5 text-right">Bias</th>
                  <th className="label-caps px-4 py-2.5 text-right">Value add</th>
                </tr>
              </thead>
              <tbody>
                {fvaAgainst("fva-naive").map((layer) => (
                  <tr key={layer.id} className="border-b border-border align-top last:border-0">
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium">{layer.layer}</p>
                      <p className="text-[11px] text-muted-foreground">{layer.description}</p>
                    </td>
                    <td className="num px-4 py-3 text-right text-xs">{layer.wape}%</td>
                    <td className="num px-4 py-3 text-right text-xs">
                      {layer.bias > 0 ? "+" : ""}
                      {layer.bias}%
                    </td>
                    <td
                      className={cn(
                        "num px-4 py-3 text-right text-xs font-semibold",
                        layer.valueAdd > 0 ? "text-positive" : layer.valueAdd < 0 ? "text-risk" : "text-muted-foreground",
                      )}
                    >
                      {layer.valueAdd > 0 ? "+" : ""}
                      {layer.valueAdd} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
            Planner overrides currently destroy 0.8 points of accuracy relative to the event-aware
            forecast; the review process recovers most of it by rejecting low-evidence changes.
          </p>
        </Panel>

        <Panel
          title="Champion versus challenger"
          description="Model changes require a majority of backtest folds, not a single headline metric."
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {championChallenger.map((row) => (
              <li key={row.segment} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold">{row.segment}</p>
                  <StatusPill
                    tone={
                      row.verdict === "Promote challenger"
                        ? "positive"
                        : row.verdict === "Hold champion"
                          ? "info"
                          : "warning"
                    }
                  >
                    {row.verdict}
                  </StatusPill>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-border bg-surface-muted px-3 py-2">
                    <p className="label-caps">Champion</p>
                    <p className="mt-0.5 text-xs font-medium">{row.champion}</p>
                    <p className="num text-[11px] text-muted-foreground">WAPE {row.championWape}%</p>
                  </div>
                  <div className="rounded-md border border-border px-3 py-2">
                    <p className="label-caps">Challenger</p>
                    <p className="mt-0.5 text-xs font-medium">{row.challenger}</p>
                    <p className="num text-[11px] text-muted-foreground">WAPE {row.challengerWape}%</p>
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {row.folds} rolling folds · {row.note}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <PrototypeNote>
        Illustrative prototype data. Accuracy, bias, value-add and risk values are seeded. A production deployment would
        compute these from published forecast snapshots against actual dispatches and stock ledgers.
      </PrototypeNote>
    </div>
  );
}
