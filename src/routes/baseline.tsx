import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, LineChart as LineChartIcon, Sigma, TrendingUp } from "lucide-react";
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
import {
  KpiTile,
  MetricRow,
  PageHeading,
  Panel,
  PrototypeNote,
  StatusPill,
} from "@/components/primitives";
import {
  demoCase,
  demoCaseRow,
  demoCaseSeries,
  demoTotals,
  formatNumber,
  HISTORY_MONTHS,
} from "@/lib/demo-data";
import { modelProfileFor } from "@/lib/model-lab";
import { usePlatform } from "@/lib/platform-state";
import { stageById } from "@/lib/workflow";

export const Route = createFileRoute("/baseline")({
  head: () => ({
    meta: [
      { title: "Baseline Forecast — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Step 8: accept the statistical baseline produced by the champion model, before any future business event is applied.",
      },
      { property: "og:title", content: "Baseline Forecast — Demand Intelligence Platform" },
      {
        property: "og:description",
        content: "The historical/statistical baseline for the July 2026 cycle, prior to event adjustment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BaselineForecast,
});

const chartData = demoCaseSeries.slice(HISTORY_MONTHS - 18).map((p) => ({
  period: p.period,
  actual: p.actual,
  baseline: p.baseline,
}));

function BaselineForecast() {
  const { stageDone } = usePlatform();
  const stage = stageById.baseline;
  const profile = modelProfileFor(demoCaseRow);
  const horizonMonths = demoCaseSeries.filter((p) => p.actual === null);
  const avg = Math.round(demoTotals.baseline / horizonMonths.length);
  const september = horizonMonths.find((p) => p.period.startsWith("Sep"));

  return (
    <div className="space-y-5">
      <PageHeading
        title="Baseline Forecast"
        subtitle={stage.purpose}
        actions={
          <>
            <StatusPill tone={stageDone.baseline ? "positive" : "info"}>
              {stageDone.baseline ? "Baseline accepted" : "Step 8 of 13"}
            </StatusPill>
            <Link
              to="/model-lab"
              search={{ tab: "tournament" } as never}
              className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              View champion selection
            </Link>
          </>
        }
      />

      <div className="rounded-md border border-warning/35 bg-warning-soft px-4 py-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-warning-foreground">
              This is the historical/statistical baseline. Future business events have not yet been applied.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-warning-foreground/85">
              The baseline repeats the seasonal pattern the champion model learned from 54 months of
              history — including the September shutdown dip that Apex Motors has now moved to October.
              Event intelligence is applied in the next stage.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Baseline horizon volume" value={formatNumber(demoTotals.baseline)} unit="units" delta="12 months" deltaTone="neutral" icon={Sigma} />
        <KpiTile label="Average monthly baseline" value={formatNumber(avg)} unit="units" delta="Champion model output" deltaTone="info" icon={LineChartIcon} />
        <KpiTile label="Champion model" value={profile.champion} delta={`Weighted score ${profile.weighted.toFixed(1)}`} deltaTone="positive" icon={TrendingUp} />
        <KpiTile label="September baseline" value={september ? formatNumber(september.baseline ?? 0) : "—"} unit="units" delta="Still carries the historical dip" deltaTone="warning" icon={AlertTriangle} />
      </div>

      <Panel
        title={`Baseline versus actual history — ${demoCase.sku} · ${demoCase.customer}`}
        description="Last 18 months of actuals followed by the 12-month statistical baseline. No event adjustment, no planner override, no scenario."
      >
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} width={56} tickFormatter={(v: number) => formatNumber(v)} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--color-border)" }}
                formatter={(v) => (typeof v === "number" ? formatNumber(v) : "—")}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="actual" name="Actual demand" stroke="var(--color-foreground)" strokeWidth={2} dot={false} connectNulls={false} />
              <Line type="monotone" dataKey="baseline" name="Statistical baseline" stroke="var(--color-primary)" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="How this baseline was produced" description="Traceable back to the tournament run in Model Lab.">
          <MetricRow label="Selected model" value={profile.champion} />
          <MetricRow label="Model category" value={profile.category} />
          <MetricRow label="Demand behaviour" value={demoCaseRow.behaviour} />
          <MetricRow label="Validation WAPE" value={`Tournament rank 1 · score ${profile.weighted.toFixed(1)}`} />
          <MetricRow label="Holdout confirmation" value={profile.confidence} tone="positive" />
          <MetricRow label="Runner-up" value={profile.runnerUp} />
        </Panel>

        <Panel title="What the baseline cannot know" description="Reasons a purely statistical projection needs governed human input.">
          <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
            <li>• The confirmed OEM shutdown has moved from September to October 2026 — no history contains it.</li>
            <li>• Part of the October reduction is already visible in open orders, so a naïve adjustment would double count.</li>
            <li>• A November catch-up has been signalled by the customer but not yet ordered.</li>
            <li>• Upside recovery remains a scenario, not a plan, and must stay out of the operational forecast.</li>
          </ul>
        </Panel>

        <Panel title="Decision required" description={`Step ${stage.step} of 13`}>
          <p className="label-caps">What you are seeing</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{stage.whatYouSee}</p>
          <p className="label-caps mt-3">Why it matters</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{stage.whyItMatters}</p>
          <p className="label-caps mt-3">Decision</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{stage.decision}</p>
        </Panel>
      </div>

      <PrototypeNote>
        Illustrative prototype data. Accepting the baseline freezes it as the reference layer of the
        forecast bridge for this browser session only.
      </PrototypeNote>
    </div>
  );
}
