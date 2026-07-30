import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  Clock,
  Download,
  Layers,
  Mail,
  Ruler,
  Target,
} from "lucide-react";
import { useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiTile, Panel, PageHeading, PrototypeNote, StatusPill } from "@/components/primitives";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  accuracyTrend,
  biasByFamily,
  DEMO_SKU,
  demoCase,
  demoCaseMeta,
  demoCaseRow,
  demoCaseSeries,
  demoHorizon,
  demoTotals,
  filterSkus,
  formatNumber,
  formatSigned,
  HISTORY_MONTHS,
  riskBuckets,
  riskRows,
} from "@/lib/demo-data";
import { residualImpact } from "@/lib/event-domain";
import { championChallenger, fvaAgainst } from "@/lib/governance-domain";
import {
  accuracyByAggregation,
  accuracyByHorizon,
  accuracyKpis,
  avgIntervalWidthPct,
  buildPortfolioForecast,
} from "@/lib/forecast-output";
import { downloadCsv } from "@/lib/export";
import { modelProfileFor } from "@/lib/model-lab";
import { usePlatform } from "@/lib/platform-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Performance Monitoring — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "The published demand forecast with prediction intervals, forecast accuracy and value-add, inventory risk, and delivery to downstream systems.",
      },
      { property: "og:title", content: "Performance Monitoring — Demand Intelligence Platform" },
      {
        property: "og:description",
        content: "Forecast output, accuracy and value-add, inventory risk and downstream delivery.",
      },
    ],
  }),
  component: PerformanceMonitoring,
});

const FEATURED_TAIL = 12;
const forecastChart = demoCaseSeries.slice(HISTORY_MONTHS - FEATURED_TAIL).map((p) => ({
  period: p.period,
  actual: p.actual,
  baseline: p.baseline,
  forecast: p.adjusted,
  band: p.lower != null && p.upper != null ? [p.lower, p.upper] : null,
}));

const chartTooltipStyle = {
  borderRadius: 6,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  fontSize: 12,
};

function PerformanceMonitoring() {
  const { filters, modelSelections, intelEvents, approvals, versions, published, logAudit } =
    usePlatform();
  const rows = filterSkus(filters);
  const kpi = accuracyKpis();
  const aggregation = accuracyByAggregation(rows);
  const intervalPct = avgIntervalWidthPct(demoCaseSeries);
  const finalWape = fvaAgainst("fva-naive").find((l) => l.id === "fva-final");
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [exported, setExported] = useState(false);

  const championKey = `${DEMO_SKU}|${demoCaseMeta.customerId}|${demoCaseMeta.plantId}`;
  const selection = modelSelections[championKey];
  const recommendedProfile = modelProfileFor(demoCaseRow);
  const championName = selection?.selectedModelName ?? recommendedProfile.champion;
  const championIsOverride = Boolean(selection) && selection.method !== "Champion accepted";
  const championAwaitingApproval = selection?.status === "Awaiting approval";

  const approvedEvent = intelEvents.find((e) => e.status === "Approved");
  const eventResidual = approvedEvent ? residualImpact(approvedEvent) : null;

  const approvedOverrides = approvals.filter((a) => a.status === "Approved").length;
  const rejectedOverrides = approvals.filter((a) => a.status === "Rejected").length;
  const returnedOverrides = approvals.filter(
    (a) => a.status === "Returned for clarification",
  ).length;
  const pendingOverrides = approvals.filter((a) => a.status === "Awaiting approval").length;

  const currentVersion = versions.find((v) => v.id === "v-2026-07");
  const previousVersion = versions.find((v) => v.id === "v-2026-06");
  const publishedDeltaPct =
    currentVersion && previousVersion && previousVersion.totalUnits
      ? ((currentVersion.totalUnits - previousVersion.totalUnits) / previousVersion.totalUnits) *
        100
      : null;

  const publishedVolume = currentVersion?.totalUnits ?? demoTotals.eventAware;

  function handleExport() {
    const data = buildPortfolioForecast(rows);
    const headers = [
      "SKU",
      "Description",
      "Customer",
      "Plant",
      "Family",
      "Period",
      "Forecast (units)",
      "P10 lower",
      "P90 upper",
    ];
    const body = data.map((r) => [
      r.sku,
      r.description,
      r.customer,
      r.plant,
      r.family,
      r.period,
      r.forecast,
      r.lower,
      r.upper,
    ]);
    downloadCsv(`forecast-${currentVersion?.label ?? "V2026-07"}.csv`, headers, body);
    setExported(true);
    logAudit({
      user: "You · Demand planning lead",
      action: "Forecast publication",
      sku: "All series",
      customer: "—",
      version: currentVersion?.label ?? "V2026.07",
      detail: `Exported ${rows.length} series × 12 months (${data.length} rows) to Excel/CSV.`,
    });
  }

  function handleSendEmail() {
    setEmailSent(true);
    logAudit({
      user: "You · Demand planning lead",
      action: "Forecast publication",
      sku: "All series",
      customer: "—",
      version: currentVersion?.label ?? "V2026.07",
      detail: `Emailed the ${currentVersion?.label ?? "working draft"} forecast summary to the demand-review list.`,
    });
  }

  return (
    <div className="space-y-5">
      <PageHeading
        title="Forecast Output & Performance"
        subtitle="The published demand forecast the pipeline produced — with its prediction interval — plus how accurate it has been, where inventory risk sits, and how to deliver it downstream."
        actions={
          <StatusPill tone="positive">Accuracy improving for 5 consecutive cycles</StatusPill>
        }
      />

      <Tabs defaultValue="output" className="space-y-5">
        <TabsList>
          <TabsTrigger value="output">Forecast output</TabsTrigger>
          <TabsTrigger value="accuracy">Accuracy &amp; value</TabsTrigger>
          <TabsTrigger value="risk">Risk &amp; bias</TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------- FORECAST OUTPUT */}
        <TabsContent value="output" className="space-y-5">
          <Panel
            title="What happened this cycle"
            description="A record of the decisions actually made in this session, not a fixed script."
          >
            <div
              id="guide-monitor-summary"
              tabIndex={-1}
              className="grid scroll-mt-52 grid-cols-1 gap-3 outline-none lg:grid-cols-3"
            >
              <div className="rounded-md border border-border bg-surface-muted/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">What we decided</p>
                  <StatusPill tone={championAwaitingApproval ? "warning" : "positive"}>
                    {championAwaitingApproval ? "Override pending" : "Champion set"}
                  </StatusPill>
                </div>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                  <li>
                    {championIsOverride
                      ? `${championName} selected over the recommended ${selection?.recommendedChampionName ?? "system champion"}${selection?.reason ? ` — ${selection.reason}` : "."}`
                      : `${championName} kept as champion — no override.`}
                  </li>
                  <li>
                    {approvedEvent && eventResidual
                      ? `${approvedEvent.name} applied at ${eventResidual.applied > 0 ? "+" : ""}${eventResidual.applied}%${
                          eventResidual.alreadyReflected > 0
                            ? ` (${eventResidual.alreadyReflected}% of it was already in open orders, so only the rest was added)`
                            : ""
                        }.`
                      : "No business event has been applied to this forecast."}
                  </li>
                  <li>
                    {approvals.length > 0
                      ? `${approvedOverrides} of ${approvals.length} planner overrides approved, ${rejectedOverrides} rejected, ${returnedOverrides} sent back for more evidence${
                          pendingOverrides > 0
                            ? `, ${pendingOverrides} still waiting on a decision`
                            : ""
                        }.`
                      : "No planner overrides recorded yet."}
                  </li>
                </ul>
              </div>
              <div className="rounded-md border border-border bg-surface-muted/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">What it was worth</p>
                  <StatusPill tone={published ? "positive" : "warning"}>
                    {published ? "Published" : "Draft"}
                  </StatusPill>
                </div>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                  <li>
                    {published && currentVersion
                      ? `${currentVersion.label} published at ${formatNumber(currentVersion.totalUnits)} units${
                          publishedDeltaPct !== null
                            ? `, ${formatSigned(publishedDeltaPct)} vs ${previousVersion?.label}`
                            : ""
                        }.`
                      : currentVersion
                        ? `Working draft currently totals ${formatNumber(currentVersion.totalUnits)} units — not published yet.`
                        : "No forecast version recorded yet."}
                  </li>
                  <li>
                    Event-aware forecast is running at{" "}
                    {fvaAgainst("fva-naive").find((l) => l.id === "fva-event")?.wape}% WAPE, down
                    from {fvaAgainst("fva-naive")[0]?.wape}% for a naive last-period guess.
                  </li>
                  {(approvedOverrides > 0 || rejectedOverrides > 0) && (
                    <li>
                      Planner judgement this cycle: {approvedOverrides} approved override
                      {approvedOverrides === 1 ? "" : "s"} added useful correction;{" "}
                      {rejectedOverrides} rejected override{rejectedOverrides === 1 ? "" : "s"}{" "}
                      would have added error instead.
                    </li>
                  )}
                </ul>
              </div>
              <div className="rounded-md border border-border bg-surface-muted/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">What to watch next cycle</p>
                  <StatusPill tone="risk">Supply risk</StatusPill>
                </div>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                  <li>
                    {riskBuckets[0]?.high ?? 0} SKU-locations are at high stockout risk (cover below
                    15 days) and {riskBuckets[1]?.high ?? 0} at high excess risk (cover above 90
                    days) — see the Risk &amp; bias tab.
                  </li>
                  {returnedOverrides > 0 && (
                    <li>
                      {returnedOverrides} override{returnedOverrides === 1 ? "" : "s"} sent back for
                      more evidence — chase those down before they resurface next cycle.
                    </li>
                  )}
                  <li>Accuracy decays with horizon — treat Lag 4–6 as directional, not firm.</li>
                </ul>
              </div>
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label="Published forecast volume"
              value={formatNumber(publishedVolume)}
              unit="units"
              delta={
                publishedDeltaPct !== null
                  ? `${formatSigned(publishedDeltaPct)} vs ${previousVersion?.label ?? "prior"}`
                  : "12-month horizon"
              }
              deltaTone={publishedDeltaPct !== null && publishedDeltaPct < 0 ? "warning" : "info"}
              icon={Layers}
            />
            <KpiTile
              label="Forecast horizon"
              value="12"
              unit="months"
              delta="Jul 2026 – Jun 2027"
              deltaTone="neutral"
              icon={Clock}
            />
            <KpiTile
              label="Featured SKU forecast"
              value={formatNumber(demoTotals.eventAware)}
              unit="units"
              delta={`${demoCase.sku} · event-adjusted`}
              deltaTone="positive"
              icon={Target}
            />
            <KpiTile
              label="Avg prediction interval"
              value={`±${intervalPct}`}
              unit="%"
              delta="P10–P90 band width"
              deltaTone="info"
              icon={Ruler}
            />
          </div>

          <Panel
            title={`Published forecast with prediction interval — ${demoCase.sku} · ${demoCase.customer}`}
            description="Actual demand history flows into the approved operational forecast. The shaded band is the P10–P90 prediction interval; the dashed line is the pure statistical baseline before event judgement."
          >
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={forecastChart}
                  margin={{ top: 8, right: 14, bottom: 4, left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    width={56}
                    tickFormatter={(v: number) => formatNumber(v)}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value, name) => {
                      if (Array.isArray(value))
                        return [
                          `${formatNumber(Number(value[0]))} – ${formatNumber(Number(value[1]))}`,
                          name,
                        ];
                      return [typeof value === "number" ? formatNumber(value) : "—", name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    dataKey="band"
                    name="P10–P90 interval"
                    stroke="none"
                    fill="var(--color-primary)"
                    fillOpacity={0.12}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <ReferenceLine
                    x="Jul 26"
                    stroke="var(--color-neutral-line)"
                    strokeDasharray="3 3"
                    label={{
                      value: "Forecast start",
                      fontSize: 10,
                      fill: "var(--color-muted-foreground)",
                      position: "insideTopLeft",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Actual demand"
                    stroke="var(--color-foreground)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="baseline"
                    name="Statistical baseline"
                    stroke="var(--color-muted-foreground)"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    name="Approved forecast"
                    stroke="var(--color-primary)"
                    strokeWidth={2.4}
                    dot={{ r: 2 }}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="Approved operational forecast by period"
            description={`${demoCase.sku} · ${demoCase.customer} — point forecast and P10–P90 interval for each month of the horizon.`}
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted text-left">
                    <th className="label-caps px-4 py-2.5">Period</th>
                    <th className="label-caps px-4 py-2.5 text-right">Statistical baseline</th>
                    <th className="label-caps px-4 py-2.5 text-right">Approved forecast</th>
                    <th className="label-caps px-4 py-2.5 text-right">P10</th>
                    <th className="label-caps px-4 py-2.5 text-right">P90</th>
                    <th className="label-caps px-4 py-2.5 text-right">Event Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {demoHorizon.map((p) => {
                    const forecast = p.adjusted ?? 0;
                    const baseline = p.baseline ?? 0;
                    const delta = forecast - baseline;
                    return (
                      <tr
                        key={p.period}
                        className="border-b border-border last:border-0 hover:bg-surface-muted/60"
                      >
                        <td className="px-4 py-2.5 text-xs font-medium">{p.period}</td>
                        <td className="num px-4 py-2.5 text-right text-xs text-muted-foreground">
                          {formatNumber(baseline)}
                        </td>
                        <td className="num px-4 py-2.5 text-right text-xs font-semibold">
                          {formatNumber(forecast)}
                        </td>
                        <td className="num px-4 py-2.5 text-right text-xs text-muted-foreground">
                          {formatNumber(p.lower ?? forecast)}
                        </td>
                        <td className="num px-4 py-2.5 text-right text-xs text-muted-foreground">
                          {formatNumber(p.upper ?? forecast)}
                        </td>
                        <td
                          className={cn(
                            "num px-4 py-2.5 text-right text-xs font-medium",
                            delta < 0
                              ? "text-risk"
                              : delta > 0
                                ? "text-positive"
                                : "text-muted-foreground",
                          )}
                        >
                          {delta > 0 ? "+" : ""}
                          {formatNumber(delta)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel
            title="Deliver this forecast"
            description="Send the approved operational forecast to the systems and people that consume it."
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex items-center gap-1.5 rounded-md border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  Download Excel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailSent(false);
                    setEmailOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  Email summary
                </button>
                <Link
                  to="/integrations"
                  className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  Connect ERP · API · MCP
                </Link>
              </div>
              {exported && (
                <span className="text-xs font-medium text-positive">
                  Exported {rows.length} series × 12 months ✓
                </span>
              )}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Excel export contains every filtered series ({formatNumber(rows.length)} SKU-locations
              × 12 months) with the point forecast and P10/P90 interval. Connections push the
              published version to ERP, S&amp;OP planning, a data warehouse, an MCP tool or a REST
              webhook.
            </p>
          </Panel>
        </TabsContent>

        {/* --------------------------------------------------- ACCURACY & VALUE */}
        <TabsContent value="accuracy" className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label="Forecast accuracy"
              value={kpi.accuracy.toFixed(1)}
              unit="%"
              delta={`${kpi.accuracyDelta >= 0 ? "+" : ""}${kpi.accuracyDelta} pts vs ${kpi.prior.period}`}
              deltaTone={kpi.accuracyDelta >= 0 ? "positive" : "risk"}
              icon={Target}
            />
            <KpiTile
              label="Forecast bias"
              value={formatSigned(kpi.bias)}
              delta={`${kpi.biasDirection}${kpi.biasDelta !== 0 ? `, ${kpi.biasDelta > 0 ? "+" : ""}${kpi.biasDelta} vs ${kpi.prior.period}` : ""}`}
              deltaTone={Math.abs(kpi.bias) < 2 ? "positive" : "warning"}
              icon={Activity}
            />
            <KpiTile
              label="WAPE (approved final)"
              value={finalWape ? String(finalWape.wape) : "—"}
              unit="%"
              delta={finalWape ? `${formatSigned(-finalWape.valueAdd, " pts")} vs naïve` : ""}
              deltaTone="positive"
              icon={Layers}
            />
            <KpiTile
              label="Plan attainment"
              value={String(kpi.attainment)}
              unit="%"
              delta={`${kpi.attainmentDelta >= 0 ? "+" : ""}${kpi.attainmentDelta} pts vs ${kpi.prior.period}`}
              deltaTone={kpi.attainmentDelta >= 0 ? "positive" : "risk"}
              icon={ArrowUpRight}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel
              className="xl:col-span-2"
              title="Accuracy and bias trend"
              description="Rolling monthly measurement against published forecast versions. Bias below zero is under-forecast."
            >
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={accuracyTrend} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      stroke="var(--color-neutral-line)"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      stroke="var(--color-neutral-line)"
                      width={40}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(v: number | string) => `${v}%`}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="mape"
                      name="MAPE"
                      stroke="var(--color-primary)"
                      strokeWidth={2.2}
                      dot={{ r: 2.5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="bias"
                      name="Bias"
                      stroke="var(--color-warning)"
                      strokeWidth={2}
                      dot={{ r: 2.5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="forecastAttainment"
                      name="Plan attainment"
                      stroke="var(--color-positive)"
                      strokeWidth={2}
                      dot={{ r: 2.5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel
              title="Accuracy by horizon"
              description="Error grows with lead time. Lag 1 is next month; Lag 6 is six months out."
            >
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={accuracyByHorizon}
                    margin={{ top: 6, right: 8, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                      stroke="var(--color-neutral-line)"
                      interval={0}
                      angle={-12}
                      textAnchor="end"
                      height={44}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      stroke="var(--color-neutral-line)"
                      width={36}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(v: number | string) => `${v}%`}
                    />
                    <Bar dataKey="wape" name="WAPE" radius={[3, 3, 0, 0]}>
                      {accuracyByHorizon.map((h) => (
                        <Cell
                          key={h.lag}
                          fill={
                            h.wape > 15
                              ? "var(--color-risk)"
                              : h.wape > 11
                                ? "var(--color-warning)"
                                : "var(--color-primary)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Panel
              title="Accuracy by aggregation level"
              description="Errors cancel as series are pooled, so the plan is far more reliable in aggregate than at a single SKU-location."
              bodyClassName="p-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted text-left">
                      <th className="label-caps px-4 py-2.5">Level</th>
                      <th className="label-caps px-4 py-2.5 text-right">Series</th>
                      <th className="label-caps px-4 py-2.5 text-right">WAPE</th>
                      <th className="label-caps px-4 py-2.5 text-right">Bias</th>
                      <th className="label-caps px-4 py-2.5">Use for</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregation.map((a) => (
                      <tr key={a.level} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 text-xs font-semibold">{a.level}</td>
                        <td className="num px-4 py-3 text-right text-xs text-muted-foreground">
                          {formatNumber(a.series)}
                        </td>
                        <td
                          className={cn(
                            "num px-4 py-3 text-right text-xs font-semibold",
                            a.wape > 12
                              ? "text-risk"
                              : a.wape > 8
                                ? "text-warning-foreground"
                                : "text-positive",
                          )}
                        >
                          {a.wape}%
                        </td>
                        <td className="num px-4 py-3 text-right text-xs">
                          {a.bias > 0 ? "+" : ""}
                          {a.bias}%
                        </td>
                        <td className="px-4 py-3 text-[11px] text-muted-foreground">{a.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
                WAPE (weighted absolute percentage error) is used throughout instead of MAPE: for
                intermittent, low-volume auto parts MAPE explodes near zero and overstates error.
              </p>
            </Panel>

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
                            layer.valueAdd > 0
                              ? "text-positive"
                              : layer.valueAdd < 0
                                ? "text-risk"
                                : "text-muted-foreground",
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
                Planner overrides currently destroy 0.8 points of accuracy relative to the
                event-aware forecast; the review process recovers most of it by rejecting
                low-evidence changes.
              </p>
            </Panel>
          </div>

          <Panel
            title="Champion versus challenger"
            description="Model changes require a majority of backtest folds, not a single headline metric."
            bodyClassName="p-0"
          >
            <ul className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
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
                      <p className="num text-[11px] text-muted-foreground">
                        WAPE {row.championWape}%
                      </p>
                    </div>
                    <div className="rounded-md border border-border px-3 py-2">
                      <p className="label-caps">Challenger</p>
                      <p className="mt-0.5 text-xs font-medium">{row.challenger}</p>
                      <p className="num text-[11px] text-muted-foreground">
                        WAPE {row.challengerWape}%
                      </p>
                    </div>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {row.folds} rolling folds · {row.note}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>

        {/* -------------------------------------------------------- RISK & BIAS */}
        <TabsContent value="risk" className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label="Stockout risk (high)"
              value={String(riskBuckets[0].high)}
              delta="Cover below 15 days"
              deltaTone="risk"
              icon={AlertTriangle}
            />
            <KpiTile
              label="Excess risk (high)"
              value={String(riskBuckets[1].high)}
              delta="Cover above 90 days"
              deltaTone="warning"
              icon={Boxes}
            />
            <KpiTile
              label="Stockout exposure"
              value={`₹${riskRows
                .filter((r) => r.risk === "Stockout")
                .reduce((s, r) => s + r.exposureValue, 0)
                .toFixed(1)}`}
              unit="Cr"
              delta="Across the register"
              deltaTone="risk"
              icon={AlertTriangle}
            />
            <KpiTile
              label="Excess exposure"
              value={`₹${riskRows
                .filter((r) => r.risk === "Excess")
                .reduce((s, r) => s + r.exposureValue, 0)
                .toFixed(1)}`}
              unit="Cr"
              delta="Across the register"
              deltaTone="warning"
              icon={Boxes}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel title="Risk distribution" description="Combination counts by risk severity.">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskBuckets} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="bucket"
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      stroke="var(--color-neutral-line)"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      stroke="var(--color-neutral-line)"
                      width={40}
                    />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="high" name="High" stackId="a" fill="var(--color-risk)" />
                    <Bar dataKey="medium" name="Medium" stackId="a" fill="var(--color-warning)" />
                    <Bar
                      dataKey="low"
                      name="Low"
                      stackId="a"
                      fill="var(--color-positive)"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel
              className="xl:col-span-2"
              title="Bias by product family"
              description="Persistent bias indicates a structural planning issue, not noise."
            >
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={biasByFamily} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="family"
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      stroke="var(--color-neutral-line)"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      stroke="var(--color-neutral-line)"
                      width={36}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(v: number | string) => `${v}%`}
                    />
                    <ReferenceLine y={0} stroke="var(--color-neutral-line)" />
                    <Bar dataKey="bias" name="Bias" radius={[3, 3, 0, 0]}>
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
          </div>

          <Panel
            title="Risk register"
            description="Combinations requiring a supply or planning intervention this cycle."
            bodyClassName="p-0"
          >
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead className="sticky top-0 z-10 bg-surface-muted">
                  <tr className="border-b border-border text-left">
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
                    <tr
                      key={`${row.sku}-${row.risk}`}
                      className="border-b border-border last:border-0 hover:bg-surface-muted/60"
                    >
                      <td className="px-4 py-3">
                        <p className="num text-xs font-semibold">{row.sku}</p>
                        <p className="text-xs text-muted-foreground">{row.description}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{row.scope}</td>
                      <td className="px-4 py-3">
                        <StatusPill tone={row.risk === "Stockout" ? "risk" : "warning"}>
                          {row.risk}
                        </StatusPill>
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

          <Panel
            title="Accuracy by combination"
            description="Weighted MAPE and inventory cover for the filtered scope."
            bodyClassName="p-0"
          >
            <div className="max-h-72 overflow-auto">
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
                      <td
                        className={cn(
                          "num px-4 py-2 text-right text-xs",
                          row.mape > 14
                            ? "text-risk"
                            : row.mape > 9
                              ? "text-warning-foreground"
                              : "text-positive",
                        )}
                      >
                        {row.mape}%
                      </td>
                      <td className="num px-4 py-2 text-right text-xs">
                        {row.bias > 0 ? "+" : ""}
                        {row.bias}%
                      </td>
                      <td
                        className={cn(
                          "num px-4 py-2 text-right text-xs",
                          row.stockCoverDays < 15
                            ? "text-risk"
                            : row.stockCoverDays > 60
                              ? "text-warning-foreground"
                              : "",
                        )}
                      >
                        {row.stockCoverDays}d
                      </td>
                      <td className="num px-4 py-2 text-right text-xs">
                        {formatNumber(row.onHand)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>

      <PrototypeNote>
        Illustrative prototype data. Accuracy, bias, value-add and risk values are seeded. A
        production deployment would compute these from published forecast snapshots against actual
        dispatches and stock ledgers.
      </PrototypeNote>

      {/* -------------------------------------------------------- EMAIL MODAL */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Email forecast summary</DialogTitle>
            <DialogDescription>
              Send the {currentVersion?.label ?? "working draft"} summary to the demand-review list.
              Prototype only — no email actually leaves this browser.
            </DialogDescription>
          </DialogHeader>
          {emailSent ? (
            <div className="rounded-md border border-positive/25 bg-positive-soft px-4 py-6 text-center">
              <p className="text-sm font-semibold text-positive">Summary sent</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Recorded in the audit log as a forecast delivery.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block">
                <span className="label-caps">To</span>
                <input
                  defaultValue="demand-review@velocis.com"
                  className="mt-1 w-full rounded-md border border-input bg-surface px-3 py-1.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="label-caps">Subject</span>
                <input
                  defaultValue={`Demand forecast ${currentVersion?.label ?? "V2026.07"} — for review`}
                  className="mt-1 w-full rounded-md border border-input bg-surface px-3 py-1.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="label-caps">Message</span>
                <textarea
                  rows={5}
                  defaultValue={`The ${currentVersion?.label ?? "V2026.07"} operational forecast is ready for review.\n\nHorizon total: ${formatNumber(publishedVolume)} units over 12 months.\nAccuracy: ${kpi.accuracy.toFixed(1)}% (bias ${formatSigned(kpi.bias)}).\nHigh stockout-risk SKU-locations: ${riskBuckets[0].high}.\n\nThe full series with prediction intervals is attached as CSV.`}
                  className="mt-1 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
                />
              </label>
            </div>
          )}
          <DialogFooter>
            {emailSent ? (
              <DialogClose asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  Close
                </button>
              </DialogClose>
            ) : (
              <>
                <DialogClose asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    Cancel
                  </button>
                </DialogClose>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  className="inline-flex items-center gap-1.5 rounded-md border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  Send summary
                </button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
