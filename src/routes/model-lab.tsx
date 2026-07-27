import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Beaker,
  CircleCheckBig,
  Gauge,
  Layers,
  Play,
  Timer,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiTile, Panel, PageHeading, PrototypeNote, StatusPill } from "@/components/primitives";
import {
  customers,
  plants,
  skus,
  DEMO_SKU,
  demoCaseRow,
  formatNumber,
  type SkuRow,
} from "@/lib/demo-data";
import { qualityForSku } from "@/lib/forecast-domain";
import {
  accuracyByHorizon,
  backtestWindows,
  behaviourEligibility,
  categoryNote,
  comparisonSeries,
  defaultWeights,
  errorDistribution,
  errorHeatmap,
  modelCatalogue,
  modelCategories,
  modelPalette,
  portfolioMix,
  runTournament,
  stabilitySeries,
  tournamentStages,
  weightLabels,
  type ScoreWeights,
  type TournamentRow,
} from "@/lib/model-lab";
import { usePlatform } from "@/lib/platform-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/model-lab")({
  head: () => ({
    meta: [
      { title: "Model Lab — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Train, backtest, compare and select forecasting models per SKU, customer and location with a weighted champion-selection score.",
      },
      { property: "og:title", content: "Model Lab — Demand Intelligence Platform" },
      {
        property: "og:description",
        content: "Model catalogue, tournament, rolling backtests and champion selection rationale.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): ModelLabSearch => ({
    tab: (["catalogue", "tournament", "comparison", "backtests", "suitability"] as const).includes(
      search.tab as TabId,
    )
      ? (search.tab as TabId)
      : undefined,
    sku: typeof search.sku === "string" ? search.sku : undefined,
    customer: typeof search.customer === "string" ? search.customer : undefined,
    plant: typeof search.plant === "string" ? search.plant : undefined,
  }),
  component: ModelLab,
});

type TabId = "catalogue" | "tournament" | "comparison" | "backtests" | "suitability";

type ModelLabSearch = {
  tab?: TabId;
  sku?: string;
  customer?: string;
  plant?: string;
};

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "catalogue", label: "Model Catalogue" },
  { id: "tournament", label: "Model Tournament" },
  { id: "comparison", label: "Visual Comparison" },
  { id: "backtests", label: "Rolling Backtests" },
  { id: "suitability", label: "Suitability by Pattern" },
];

const statusTone = {
  Available: "positive",
  Challenger: "info",
  "Not suitable": "warning",
} as const;

const rowStatusTone = {
  Champion: "positive",
  Challenger: "info",
  Rejected: "warning",
  "Not eligible": "neutral",
} as const;

type SortKey =
  | "rank"
  | "wape"
  | "mase"
  | "smape"
  | "mape"
  | "bias"
  | "stability"
  | "confidence"
  | "execMs"
  | "weighted"
  | "name";

function ModelLab() {
  const search = Route.useSearch();
  const { blockingOpen, completeStage } = usePlatform();
  const [tab, setTab] = useState<TabId>(search.tab ?? "catalogue");
  const [customerId, setCustomerId] = useState(search.customer ?? demoCaseRow.customerId);
  const [sku, setSku] = useState(search.sku ?? DEMO_SKU);
  const [plantId, setPlantId] = useState(search.plant ?? demoCaseRow.plantId);
  const [horizon, setHorizon] = useState(12);
  const [weights, setWeights] = useState<ScoreWeights>(defaultWeights);

  const [stage, setStage] = useState(-1);
  const [hasRun, setHasRun] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);
  const [hidden, setHidden] = useState<string[]>([]);

  // Deep links from Forecast Workspace / Executive Overview carry the series.
  useEffect(() => {
    if (search.tab) setTab(search.tab);
    if (search.customer) setCustomerId(search.customer);
    if (search.sku) setSku(search.sku);
    if (search.plant) setPlantId(search.plant);
  }, [search.tab, search.customer, search.sku, search.plant]);



  const skuOptions = useMemo(() => {
    const set = new Map<string, SkuRow>();
    skus.filter((r) => r.customerId === customerId).forEach((r) => set.set(r.sku, r));
    if (!set.has(DEMO_SKU) && customerId === demoCaseRow.customerId) set.set(DEMO_SKU, demoCaseRow);
    return [...set.values()].slice(0, 120);
  }, [customerId]);

  useEffect(() => {
    if (!skuOptions.some((r) => r.sku === sku) && skuOptions[0]) setSku(skuOptions[0].sku);
  }, [skuOptions, sku]);

  const row = useMemo(
    () => skus.find((r) => r.sku === sku) ?? demoCaseRow,
    [sku],
  );
  const quality = qualityForSku(row.sku);
  const key = `${row.sku}|${customerId}|${plantId}`;

  const result = useMemo(
    () =>
      runTournament({
        key,
        behaviour: row.behaviour,
        historyMonths: quality.historyMonths,
        horizon,
        weights,
      }),
    [key, row.behaviour, quality.historyMonths, horizon, weights],
  );

  const running = stage >= 0 && stage < tournamentStages.length;

  function runNow() {
    completeStage("tournament");
    setHasRun(false);
    setStage(0);
  }

  useEffect(() => {
    if (stage < 0 || stage >= tournamentStages.length) return;
    const t = setTimeout(() => {
      if (stage === tournamentStages.length - 1) {
        setStage(-1);
        setHasRun(true);
      } else {
        setStage(stage + 1);
      }
    }, 420);
    return () => clearTimeout(t);
  }, [stage]);

  const sortedRows = useMemo(() => {
    const rows = [...result.rows];
    rows.sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      if (sortKey === "confidence") {
        const order = { High: 3, Medium: 2, Low: 1 } as const;
        return (order[a.confidence] - order[b.confidence]) * dir;
      }
      if (sortKey === "rank") {
        const av = a.rank ?? 999;
        const bv = b.rank ?? 999;
        return (av - bv) * dir;
      }
      if (sortKey === "bias") return (Math.abs(a.bias) - Math.abs(b.bias)) * dir;
      return ((a[sortKey] as number) - (b[sortKey] as number)) * dir;
    });
    return rows;
  }, [result.rows, sortKey, sortAsc]);

  const eligibleIds = result.rows.filter((r) => r.eligible).map((r) => r.id);
  const visibleIds = eligibleIds.filter((id) => !hidden.includes(id));
  const championId = result.champion?.id ?? null;

  const chartData = useMemo(
    () =>
      comparisonSeries({
        key,
        base: row.baseVolume / 1.5,
        modelIds: visibleIds,
        championId: championId && visibleIds.includes(championId) ? championId : null,
      }),
    [key, row.baseVolume, visibleIds.join(","), championId],
  );

  const btModelId = championId ?? eligibleIds[0] ?? "ets";
  const windows = useMemo(() => backtestWindows(key, row.baseVolume / 1.5, btModelId), [key, row.baseVolume, btModelId]);
  const heat = useMemo(() => errorHeatmap(key, eligibleIds.slice(0, 6)), [key, eligibleIds.join(",")]);
  const heatMonths = [...new Set(heat.map((c) => c.month))];
  const heatModels = [...new Set(heat.map((c) => c.model))];
  const stability = useMemo(() => stabilitySeries(key, eligibleIds.slice(0, 5)), [key, eligibleIds.join(",")]);
  const distribution = useMemo(() => errorDistribution(key, btModelId), [key, btModelId]);
  const horizonAcc = useMemo(() => accuracyByHorizon(key, btModelId), [key, btModelId]);

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortAsc(!sortAsc);
    else {
      setSortKey(k);
      setSortAsc(k !== "weighted" && k !== "stability" && k !== "confidence");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeading
        title="Model Lab"
        subtitle="Train, backtest, compare and select a forecasting method for every SKU, customer and location combination. Champion selection uses a weighted validation score — never MAPE alone."
        actions={
          <StatusPill tone="info">
            <Beaker className="h-3 w-3" aria-hidden /> {modelCatalogue.length} methods · 5 categories
          </StatusPill>
        }
      />

      <div className="flex flex-wrap gap-1.5 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-xs font-medium transition-colors",
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "catalogue" && <Catalogue />}

      {tab !== "catalogue" && (
        <Panel
          title="Series selection"
          description="Every result below is computed for this SKU / customer / location / horizon combination."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Field label="Customer / OEM">
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="control"
              >
                {customers
                  .filter((c) => c.id !== "all")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="SKU">
              <select value={sku} onChange={(e) => setSku(e.target.value)} className="control">
                {skuOptions.map((r) => (
                  <option key={r.sku} value={r.sku}>
                    {r.sku} — {r.description}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Plant / location">
              <select value={plantId} onChange={(e) => setPlantId(e.target.value)} className="control">
                {plants
                  .filter((p) => p.id !== "all")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Forecast horizon">
              <select
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="control"
              >
                {[3, 6, 9, 12].map((h) => (
                  <option key={h} value={h}>
                    {h} months
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex items-end">
              <button
                type="button"
                onClick={runNow}
                disabled={running || blockingOpen > 0}
                className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <Play className="h-3.5 w-3.5" aria-hidden />
                {blockingOpen > 0
                  ? "Locked — resolve data issues"
                  : running
                    ? "Running…"
                    : "Run Baseline Model Tournament"}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <StatusPill tone="info">{row.behaviour}</StatusPill>
            <StatusPill tone="neutral">{quality.historyMonths} months of history</StatusPill>
            <StatusPill tone="neutral">{quality.confidence}</StatusPill>
            <span>{behaviourEligibility[row.behaviour]}</span>
          </div>

          {(running || !hasRun) && (
            <ol className="mt-4 space-y-1.5">
              {tournamentStages.map((label, i) => (
                <li key={label} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold",
                      i < stage ? "bg-positive-soft text-positive" : i === stage ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {i < stage ? "✓" : i + 1}
                  </span>
                  <span className={i <= stage ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      )}

      {tab === "tournament" && hasRun && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label="Champion model"
              value={result.champion ? result.champion.name.split(" (")[0] : "None"}
              delta={result.champion?.category ?? "Manual treatment"}
              deltaTone="info"
              icon={Trophy}
            />
            <KpiTile
              label="Weighted score"
              value={result.champion ? result.champion.weighted.toFixed(1) : "—"}
              unit="/ 100"
              delta={result.runnerUp ? `Runner-up ${result.runnerUp.weighted.toFixed(1)}` : "No runner-up"}
              deltaTone="neutral"
              icon={Gauge}
            />
            <KpiTile
              label="Champion WAPE"
              value={result.champion ? result.champion.wape.toFixed(1) : "—"}
              unit="%"
              delta={result.champion ? `MASE ${result.champion.mase.toFixed(2)} · sMAPE ${result.champion.smape.toFixed(1)}%` : "—"}
              deltaTone="positive"
              icon={Activity}
            />
            <KpiTile
              label="Eligible models"
              value={String(result.eligibleCount)}
              unit={`/ ${modelCatalogue.length}`}
              delta={`${row.behaviour} demand rules applied`}
              deltaTone="neutral"
              icon={Layers}
            />
          </div>

          <Panel
            title="Tournament results"
            description="Sort by any metric. Champion selection uses the weighted score, not MAPE alone."
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted text-left">
                    <SortTh label="Model" k="name" {...{ sortKey, sortAsc, toggleSort }} />
                    <th className="label-caps px-3 py-2.5">Eligibility</th>
                    <SortTh label="WAPE" k="wape" numeric {...{ sortKey, sortAsc, toggleSort }} />
                    <SortTh label="MASE" k="mase" numeric {...{ sortKey, sortAsc, toggleSort }} />
                    <SortTh label="sMAPE" k="smape" numeric {...{ sortKey, sortAsc, toggleSort }} />
                    <SortTh label="MAPE" k="mape" numeric {...{ sortKey, sortAsc, toggleSort }} />
                    <SortTh label="Bias" k="bias" numeric {...{ sortKey, sortAsc, toggleSort }} />
                    <SortTh label="Stability" k="stability" numeric {...{ sortKey, sortAsc, toggleSort }} />
                    <SortTh label="Confidence" k="confidence" {...{ sortKey, sortAsc, toggleSort }} />
                    <SortTh label="Exec time" k="execMs" numeric {...{ sortKey, sortAsc, toggleSort }} />
                    <SortTh label="Weighted" k="weighted" numeric {...{ sortKey, sortAsc, toggleSort }} />
                    <SortTh label="Rank" k="rank" numeric {...{ sortKey, sortAsc, toggleSort }} />
                    <th className="label-caps px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((r) => (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-b border-border align-top last:border-0",
                        r.status === "Champion" ? "bg-accent/60" : !r.eligible && "opacity-60",
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <p className="text-xs font-semibold text-foreground">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground">{r.category}</p>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-muted-foreground">
                        <StatusPill tone={r.eligible ? "positive" : "warning"}>
                          {r.eligible ? "Eligible" : "Not eligible"}
                        </StatusPill>
                      </td>
                      <Num v={`${r.wape.toFixed(1)}%`} bold />
                      <Num v={r.mase.toFixed(2)} tone={r.mase < 1 ? "positive" : "risk"} />
                      <Num v={`${r.smape.toFixed(1)}%`} />
                      <Num v={`${r.mape.toFixed(1)}%`} />
                      <Num
                        v={`${r.bias > 0 ? "+" : ""}${r.bias.toFixed(1)}%`}
                        tone={Math.abs(r.bias) > 3 ? "risk" : Math.abs(r.bias) > 2 ? "warning" : "positive"}
                      />
                      <Num v={String(r.stability)} />
                      <td className="px-3 py-2.5 text-xs">{r.confidence}</td>
                      <Num v={`${(r.execMs / 1000).toFixed(2)}s`} />
                      <Num v={r.weighted.toFixed(1)} bold />
                      <Num v={r.rank ? `#${r.rank}` : "—"} />
                      <td className="px-3 py-2.5">
                        <StatusPill tone={rowStatusTone[r.status]}>{r.status}</StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel
              title="Weighted score configuration"
              description="Adjust the weights to see the selection change. Weights are normalised."
            >
              <div className="space-y-3">
                {weightLabels.map(({ key: k, label }) => (
                  <label key={k} className="block">
                    <span className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="num font-semibold">{weights[k]}%</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={60}
                      step={5}
                      value={weights[k]}
                      onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })}
                      className="mt-1 w-full accent-[var(--color-primary)]"
                    />
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => setWeights(defaultWeights)}
                  className="rounded-md border border-input px-2.5 py-1.5 text-[11px] font-medium hover:bg-accent"
                >
                  Reset to policy default (30/20/20/20/10)
                </button>
              </div>
            </Panel>

            <Panel
              className="xl:col-span-2"
              title="Why this model was selected"
              description="Weighted-score calculation and selection rationale."
              actions={<CircleCheckBig className="h-4 w-4 text-muted-foreground" aria-hidden />}
            >
              <p className="text-sm leading-relaxed text-foreground">{result.explanation}</p>

              {result.champion && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="label-caps py-2">Component</th>
                        <th className="label-caps py-2 text-right">Sub-score</th>
                        <th className="label-caps py-2 text-right">Weight</th>
                        <th className="label-caps py-2 text-right">Contribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["WAPE", result.champion.wapeScore, weights.wape],
                        ["MASE", result.champion.maseScore, weights.mase],
                        ["Bias", result.champion.biasScore, weights.bias],
                        ["Backtest stability", result.champion.stabilityScore, weights.stability],
                        ["Business suitability", result.champion.suitabilityScore, weights.suitability],
                      ].map(([label, score, w]) => {
                        const total =
                          weights.wape + weights.mase + weights.bias + weights.stability + weights.suitability || 1;
                        return (
                          <tr key={String(label)} className="border-b border-border last:border-0">
                            <td className="py-2 text-xs">{label}</td>
                            <td className="num py-2 text-right text-xs">{score}</td>
                            <td className="num py-2 text-right text-xs text-muted-foreground">{w}%</td>
                            <td className="num py-2 text-right text-xs font-semibold">
                              {(((score as number) * (w as number)) / total).toFixed(1)}
                            </td>
                          </tr>
                        );
                      })}
                      <tr>
                        <td className="py-2 text-xs font-semibold">Weighted validation score</td>
                        <td />
                        <td />
                        <td className="num py-2 text-right text-xs font-semibold">
                          {result.champion.weighted.toFixed(1)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 space-y-1.5">
                <p className="label-caps">Why the other models were not selected</p>
                {result.rows
                  .filter((r) => r.status !== "Champion")
                  .slice(0, 8)
                  .map((r) => (
                    <p key={r.id} className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{r.name}</span> — {r.rationale}
                    </p>
                  ))}
              </div>
            </Panel>
          </div>
        </>
      )}

      {tab === "comparison" && (
        <>
          <Panel
            title="Show or hide models"
            description="The champion is emphasised; non-selected models are visually subdued."
          >
            <div className="flex flex-wrap gap-1.5">
              {eligibleIds.map((id) => {
                const model = result.rows.find((r) => r.id === id)!;
                const on = !hidden.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setHidden(on ? [...hidden, id] : hidden.filter((h) => h !== id))}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      on ? "border-input bg-surface text-foreground" : "border-dashed border-input text-muted-foreground opacity-60",
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: modelPalette[id] ?? "var(--color-muted-foreground)" }}
                    />
                    {model.name}
                    {id === championId && " · champion"}
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel
            title={`Model forecasts — ${row.sku} · ${row.description}`}
            description="Historical actuals, holdout-period actuals, every eligible model's forecast, the champion forecast and its confidence interval."
          >
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                    stroke="var(--color-neutral-line)"
                    interval={3}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    stroke="var(--color-neutral-line)"
                    width={52}
                    tickFormatter={(v: number) => formatNumber(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 6,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="upper"
                    name="Confidence interval"
                    stroke="none"
                    fill="var(--color-primary)"
                    fillOpacity={0.1}
                    connectNulls
                  />
                  <Area type="monotone" dataKey="lower" name=" " stroke="none" fill="var(--color-surface)" fillOpacity={1} connectNulls />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Historical actual"
                    stroke="var(--color-foreground)"
                    strokeWidth={2.2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="holdout"
                    name="Holdout actual"
                    stroke="var(--color-foreground)"
                    strokeWidth={2.2}
                    strokeDasharray="3 3"
                    dot={false}
                    connectNulls
                  />
                  {visibleIds.map((id) => (
                    <Line
                      key={id}
                      type="monotone"
                      dataKey={`m_${id}`}
                      name={result.rows.find((r) => r.id === id)!.name}
                      stroke={modelPalette[id] ?? "var(--color-muted-foreground)"}
                      strokeWidth={id === championId ? 2.8 : 1.2}
                      strokeOpacity={id === championId ? 1 : 0.45}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </>
      )}

      {tab === "backtests" && (
        <>
          <Panel
            title={`Rolling-origin validation windows — ${result.champion?.name ?? "first eligible model"}`}
            description="Five time-based validation windows rather than a single train/test split."
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted text-left">
                    <th className="label-caps px-4 py-2.5">Window</th>
                    <th className="label-caps px-4 py-2.5">Training period</th>
                    <th className="label-caps px-4 py-2.5">Test period</th>
                    <th className="label-caps px-4 py-2.5 text-right">Horizon</th>
                    <th className="label-caps px-4 py-2.5 text-right">Actual</th>
                    <th className="label-caps px-4 py-2.5 text-right">Prediction</th>
                    <th className="label-caps px-4 py-2.5 text-right">Error</th>
                    <th className="label-caps px-4 py-2.5 text-right">Bias</th>
                  </tr>
                </thead>
                <tbody>
                  {windows.map((w) => (
                    <tr key={w.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 text-xs font-semibold">{w.id.toUpperCase()}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{w.trainPeriod}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{w.testPeriod}</td>
                      <td className="num px-4 py-2 text-right text-xs">{w.horizonMonths} m</td>
                      <td className="num px-4 py-2 text-right text-xs">{formatNumber(w.actual)}</td>
                      <td className="num px-4 py-2 text-right text-xs">{formatNumber(w.predicted)}</td>
                      <td className="num px-4 py-2 text-right text-xs">{w.errorPct.toFixed(1)}%</td>
                      <td
                        className={cn(
                          "num px-4 py-2 text-right text-xs",
                          Math.abs(w.biasPct) > 3 ? "text-risk" : "text-positive",
                        )}
                      >
                        {w.biasPct > 0 ? "+" : ""}
                        {w.biasPct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel
            title="Monthly error heatmap"
            description="Absolute percentage error per model across the last 12 validation months. Darker means larger error."
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto p-4">
              <table className="w-full min-w-[900px] border-separate border-spacing-0.5 text-xs">
                <thead>
                  <tr>
                    <th className="label-caps px-2 py-1 text-left">Model</th>
                    {heatMonths.map((m) => (
                      <th key={m} className="label-caps px-1 py-1 text-center">
                        {m.slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatModels.map((m) => (
                    <tr key={m}>
                      <td className="px-2 py-1 text-[11px] font-medium whitespace-nowrap">{m}</td>
                      {heatMonths.map((month) => {
                        const cell = heat.find((c) => c.model === m && c.month === month)!;
                        const intensity = Math.min(1, cell.error / 30);
                        return (
                          <td
                            key={month}
                            className="num rounded px-1 py-1 text-center text-[10px]"
                            style={{
                              background: `color-mix(in oklab, var(--color-risk) ${Math.round(intensity * 70)}%, var(--color-surface-muted))`,
                            }}
                            title={`${m} · ${month} · ${cell.error}%`}
                          >
                            {cell.error.toFixed(0)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel
              className="xl:col-span-2"
              title="Model stability across windows"
              description="WAPE per validation window. Flat lines indicate stable models."
            >
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stability} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="window" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" />
                    <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" width={40} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip contentStyle={{ borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {eligibleIds.slice(0, 5).map((id) => (
                      <Line
                        key={id}
                        type="monotone"
                        dataKey={id}
                        name={result.rows.find((r) => r.id === id)!.name}
                        stroke={modelPalette[id] ?? "var(--color-muted-foreground)"}
                        strokeWidth={id === championId ? 2.6 : 1.4}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Error distribution" description={`Validation periods by absolute error band — ${result.champion?.name ?? "selected model"}.`}>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribution} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" />
                    <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" width={30} />
                    <Tooltip contentStyle={{ borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: 12 }} />
                    <Bar dataKey="periods" name="Periods" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <Panel title="Accuracy by forecast horizon" description="Error grows with lead time — relevant when setting the planning horizon.">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={horizonAcc} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="horizon" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" width={40} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip contentStyle={{ borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: 12 }} formatter={(v: number | string) => `${v}%`} />
                  <Line type="monotone" dataKey="wape" name="WAPE" stroke="var(--color-primary)" strokeWidth={2.4} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </>
      )}

      {tab === "suitability" && (
        <>
          <Panel
            title="Demand-pattern classification and eligible methods"
            description="The simulated classification for each series determines which methods may compete in the tournament."
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted text-left">
                    <th className="label-caps px-4 py-2.5">Demand pattern</th>
                    <th className="label-caps px-4 py-2.5">Eligibility rule</th>
                    <th className="label-caps px-4 py-2.5">Eligible methods</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(behaviourEligibility) as Array<keyof typeof behaviourEligibility>).map((behaviour) => {
                    const eligible = modelCatalogue.filter(
                      (m) =>
                        runTournament({
                          key: `probe|${behaviour}`,
                          behaviour,
                          historyMonths: behaviour === "New item" ? 7 : 54,
                          horizon: 6,
                        }).rows.find((r) => r.id === m.id)?.eligible,
                    );
                    return (
                      <tr key={behaviour} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 text-xs font-semibold">{behaviour}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{behaviourEligibility[behaviour]}</td>
                        <td className="px-4 py-2.5 text-xs">
                          {eligible.length ? eligible.map((m) => m.name).join(", ") : "None — analogue / family forecasting"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel
            title="Model portfolio across all 500 series"
            description="Share of series where each method is the current champion."
            bodyClassName="p-0"
          >
            <div className="grid grid-cols-1 gap-0 xl:grid-cols-2">
              <div className="h-72 w-full p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={portfolioMix} layout="vertical" margin={{ top: 4, right: 20, bottom: 0, left: 8 }}>
                    <CartesianGrid stroke="var(--color-border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" tickFormatter={(v: number) => `${v}%`} />
                    <YAxis type="category" dataKey="bucket" width={110} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" />
                    <Tooltip contentStyle={{ borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: 12 }} formatter={(v: number | string) => `${v}%`} />
                    <Bar dataKey="share" name="Share of series" fill="var(--color-primary)" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto border-t border-border p-4 xl:border-t-0 xl:border-l">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="label-caps py-2">Method</th>
                      <th className="label-caps py-2 text-right">Series</th>
                      <th className="label-caps py-2 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolioMix.map((b) => (
                      <tr key={b.bucket} className="border-b border-border last:border-0">
                        <td className="py-2 text-xs">{b.bucket}</td>
                        <td className="num py-2 text-right text-xs">{b.series}</td>
                        <td className="num py-2 text-right text-xs font-semibold">{b.share.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Panel>
        </>
      )}

      <PrototypeNote>
        Illustrative prototype results — no production model training performed.
      </PrototypeNote>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="label-caps">{label}</span>
      {children}
    </label>
  );
}

function Num({ v, bold, tone }: { v: string; bold?: boolean; tone?: "positive" | "warning" | "risk" }) {
  return (
    <td
      className={cn(
        "num px-3 py-2.5 text-right text-xs",
        bold && "font-semibold",
        tone === "positive" && "text-positive",
        tone === "warning" && "text-warning-foreground",
        tone === "risk" && "text-risk",
      )}
    >
      {v}
    </td>
  );
}

function SortTh({
  label,
  k,
  numeric,
  sortKey,
  sortAsc,
  toggleSort,
}: {
  label: string;
  k: SortKey;
  numeric?: boolean;
  sortKey: SortKey;
  sortAsc: boolean;
  toggleSort: (k: SortKey) => void;
}) {
  return (
    <th className={cn("label-caps px-3 py-2.5", numeric && "text-right")}>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        <span className="text-[9px]">{sortKey === k ? (sortAsc ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}

function Catalogue() {
  const [category, setCategory] = useState<string>("all");
  const shown = category === "all" ? modelCatalogue : modelCatalogue.filter((m) => m.category === category);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Methods in catalogue" value={String(modelCatalogue.length)} delta="5 categories" deltaTone="info" icon={Layers} />
        <KpiTile
          label="Available for selection"
          value={String(modelCatalogue.filter((m) => m.status === "Available").length)}
          delta="Governance approved"
          deltaTone="positive"
          icon={CircleCheckBig}
        />
        <KpiTile
          label="Challenger methods"
          value={String(modelCatalogue.filter((m) => m.status === "Challenger").length)}
          delta="Tracked in parallel"
          deltaTone="info"
          icon={Trophy}
        />
        <KpiTile
          label="Support external variables"
          value={String(modelCatalogue.filter((m) => m.exogenous).length)}
          delta="Schedule / shutdown regressors"
          deltaTone="neutral"
          icon={BarChart3}
        />
      </div>

      <Panel
        title="Model catalogue"
        description="Statistical time-series methods (ETS, ARIMA, SARIMA, SARIMAX, Prophet) are not machine-learning models and are grouped separately."
        bodyClassName="p-0"
        actions={
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="control w-56">
            <option value="all">All categories</option>
            {modelCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        }
      >
        {modelCategories
          .filter((c) => shown.some((m) => m.category === c))
          .map((cat) => (
            <div key={cat}>
              <div className="border-b border-border bg-surface-muted px-4 py-2">
                <p className="text-xs font-semibold text-foreground">{cat}</p>
                <p className="text-[11px] text-muted-foreground">{categoryNote[cat]}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1280px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="label-caps px-4 py-2">Method</th>
                      <th className="label-caps px-3 py-2">Suitable demand patterns</th>
                      <th className="label-caps px-3 py-2 text-right">Min. history</th>
                      <th className="label-caps px-3 py-2 text-center">Seasonality</th>
                      <th className="label-caps px-3 py-2 text-center">External vars</th>
                      <th className="label-caps px-3 py-2 text-center">Intermittent</th>
                      <th className="label-caps px-3 py-2">Strengths</th>
                      <th className="label-caps px-3 py-2">Limitations</th>
                      <th className="label-caps px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown
                      .filter((m) => m.category === cat)
                      .map((m) => (
                        <tr key={m.id} className="border-b border-border align-top last:border-0">
                          <td className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap">{m.name}</td>
                          <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{m.patterns.join(", ")}</td>
                          <td className="num px-3 py-2.5 text-right text-xs">{m.minHistoryMonths} m</td>
                          <YesNo v={m.seasonality} />
                          <YesNo v={m.exogenous} />
                          <YesNo v={m.intermittent} />
                          <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{m.strengths}</td>
                          <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{m.limitations}</td>
                          <td className="px-3 py-2.5">
                            <StatusPill tone={statusTone[m.status]}>{m.status}</StatusPill>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
      </Panel>

      <Panel title="Execution profile" description="Simulated median training time per method on a 54-month series.">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={modelCatalogue.map((m) => ({ name: m.name.split(" (")[0], seconds: Math.round(m.execMs) / 1000 }))} margin={{ top: 6, right: 8, bottom: 60, left: 0 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" angle={-35} textAnchor="end" interval={0} height={70} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" width={40} tickFormatter={(v: number) => `${v}s`} />
              <Tooltip contentStyle={{ borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: 12 }} formatter={(v: number | string) => `${v}s`} />
              <Bar dataKey="seconds" name="Training time" fill="var(--color-accent-blue)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Timer className="h-3 w-3" aria-hidden /> Execution times are simulated for illustration only.
        </p>
      </Panel>
    </>
  );
}

function YesNo({ v }: { v: boolean }) {
  return (
    <td className="px-3 py-2.5 text-center text-xs">
      <span className={v ? "text-positive" : "text-muted-foreground"}>{v ? "Yes" : "No"}</span>
    </td>
  );
}
