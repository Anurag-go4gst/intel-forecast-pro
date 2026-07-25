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

      <PrototypeNote>
        Accuracy, bias and risk values are seeded demonstration data. A production deployment would
        compute these from published forecast snapshots against actual dispatches and stock ledgers.
      </PrototypeNote>
    </div>
  );
}
