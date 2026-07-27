import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Beaker,
  CircleCheckBig,
  Gauge,
  Layers,
  Play,
  ShieldCheck,
  Timer,
  Trophy,
  X,
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
  ReferenceLine,
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
  assessOverride,
  backtestWindows,
  behaviourEligibility,
  categoryNote,
  comparisonSeries,
  defaultMateriality,
  defaultWeights,
  errorDistribution,
  errorHeatmap,
  formatErrorDelta,
  inventoryImplication,
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
import {
  effectivePeriods,
  overrideReasons,
  selectionStatusTone,
  type ModelSelection,
  type SelectionMethod,
} from "@/lib/model-selection";
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
  "Ensemble member": "info",
  Rejected: "warning",
  "Not eligible": "neutral",
} as const;

type SortKey =
  | "rank"
  | "validationWape"
  | "holdoutWape"
  | "mase"
  | "smape"
  | "mape"
  | "bias"
  | "stability"
  | "confidence"
  | "forecastAtHorizon"
  | "execMs"
  | "weighted"
  | "name";


function ModelLab() {
  const search = Route.useSearch();
  const {
    blockingOpen,
    completeStage,
    modelSelections,
    recordModelSelection,
    approveModelSelection,
    clearModelSelection,
  } = usePlatform();
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
  const [compareIds, setCompareIds] = useState<string[] | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [overrideId, setOverrideId] = useState<string | null>(null);

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
        baseVolume: Math.round(row.baseVolume / 1.5),
      }),
    [key, row.behaviour, row.baseVolume, quality.historyMonths, horizon, weights],
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
  const championId = result.champion?.id ?? null;

  /** Rows that can be picked for the visual comparison (max four). */
  const selectableRows = useMemo(
    () => [...result.rows.filter((r) => r.eligible), ...(result.ensemble ? [result.ensemble] : [])],
    [result],
  );

  const rowById = (id: string | null) =>
    id ? (selectableRows.find((r) => r.id === id) ?? result.rows.find((r) => r.id === id) ?? null) : null;

  const defaultCompare = useMemo(() => {
    const ordered = [...result.rows.filter((r) => r.eligible)].sort(
      (a, b) => (a.rank ?? 99) - (b.rank ?? 99),
    );
    return ordered.slice(0, 4).map((r) => r.id);
  }, [result]);

  const compareSelection = (compareIds ?? defaultCompare).filter((id) =>
    selectableRows.some((r) => r.id === id),
  );
  const visibleIds = compareSelection.filter((id) => !hidden.includes(id));
  // The ensemble is a blend; the overlay chart draws its members' champion line.
  const chartIds = visibleIds.filter((id) => id !== "ensemble");

  function toggleCompareModel(id: string) {
    const current = compareIds ?? defaultCompare;
    if (current.includes(id)) setCompareIds(current.filter((x) => x !== id));
    else if (current.length < 4) setCompareIds([...current, id]);
  }

  function compareWithChampion(id: string) {
    setCompareIds(championId && championId !== id ? [championId, id] : [id]);
    setHidden([]);
    setTab("comparison");
  }

  // ------------------------------------------------------- model selection
  const selection: ModelSelection | undefined = modelSelections[key];
  const selectedRow = rowById(selection?.selectedModelId ?? championId);
  const overrideRow = rowById(overrideId);
  const assessment =
    result.champion && overrideRow && overrideRow.id !== result.champion.id
      ? assessOverride(result.champion, overrideRow)
      : null;

  function acceptChampion() {
    if (!result.champion) return;
    recordModelSelection({
      key,
      sku: row.sku,
      customerId,
      plantId,
      recommendedChampionId: result.champion.id,
      recommendedChampionName: result.champion.name,
      selectedModelId: result.champion.id,
      selectedModelName: result.champion.name,
      method: "Champion accepted",
      reason: "System recommendation accepted without change.",
      comment: "",
      effectiveFrom: effectivePeriods[3],
      effectiveTo: "",
      evidence: "",
      status: "Active",
      materialBreaches: [],
    });
  }

  function commitSelection(input: {
    target: TournamentRow;
    method: SelectionMethod;
    reason: string;
    comment: string;
    effectiveFrom: string;
    evidence: string;
  }) {
    if (!result.champion) return;
    const check = assessOverride(result.champion, input.target);
    recordModelSelection({
      key,
      sku: row.sku,
      customerId,
      plantId,
      recommendedChampionId: result.champion.id,
      recommendedChampionName: result.champion.name,
      selectedModelId: input.target.id,
      selectedModelName: input.target.name,
      method: input.method,
      reason: input.reason,
      comment: input.comment,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: "",
      evidence: input.evidence,
      status: check.material ? "Awaiting approval" : "Active",
      materialBreaches: check.breaches,
    });
    setOverrideId(null);
  }

  const chartData = useMemo(
    () =>
      comparisonSeries({
        key,
        base: row.baseVolume / 1.5,
        modelIds: chartIds,
        championId: championId && chartIds.includes(championId) ? championId : null,
      }),
    [key, row.baseVolume, chartIds.join(","), championId],
  );

  const futureRows = chartData.filter((p) => p.upper !== undefined && p.actual === null && p.holdout === null);
  const horizonForecast = futureRows.slice(0, horizon).map((p, i) => {
    const point: Record<string, string | number | null> = { horizon: `M+${i + 1}`, period: p.period };
    chartIds.forEach((id) => (point[`m_${id}`] = (p[`m_${id}`] as number | null) ?? null));
    return point;
  });

  const btModelId = championId ?? eligibleIds[0] ?? "ets";
  const windows = useMemo(() => backtestWindows(key, row.baseVolume / 1.5, btModelId), [key, row.baseVolume, btModelId]);
  const heat = useMemo(() => errorHeatmap(key, eligibleIds.slice(0, 6)), [key, eligibleIds.join(",")]);
  const heatMonths = [...new Set(heat.map((c) => c.month))];
  const heatModels = [...new Set(heat.map((c) => c.model))];
  const compareHeat = useMemo(() => errorHeatmap(key, chartIds), [key, chartIds.join(",")]);
  const compareHeatMonths = [...new Set(compareHeat.map((c) => c.month))];
  const compareHeatModels = [...new Set(compareHeat.map((c) => c.model))];
  const stability = useMemo(() => stabilitySeries(key, eligibleIds.slice(0, 5)), [key, eligibleIds.join(",")]);
  const compareStability = useMemo(() => stabilitySeries(key, chartIds), [key, chartIds.join(",")]);
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

          <SelectionIdentityPanel
            champion={result.champion}
            selection={selection}
            selectedRow={selectedRow}
            ensemble={result.ensemble}
            onAcceptChampion={acceptChampion}
            onSelectEnsemble={() => result.ensemble && setOverrideId(result.ensemble.id)}
            onSelectChallenger={() => result.runnerUp && setOverrideId(result.runnerUp.id)}
            onApprove={() => approveModelSelection(key)}
            onClear={() => clearModelSelection(key)}
          />

          <Panel
            title="Tournament results"
            description="Sort by any metric. The Champion is the system recommendation from the weighted score — authorised users may still select another model. All differences are error differences, in percentage points and relative percent."
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1800px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted text-left">
                    <SortTh label="Model" k="name" {...{ sortKey, sortAsc, toggleSort }} />
                    <th className="label-caps px-3 py-2.5">Eligibility</th>
                    <SortTh label="Validation WAPE" k="validationWape" numeric {...{ sortKey, sortAsc, toggleSort }} />
                    <SortTh label="Holdout WAPE" k="holdoutWape" numeric {...{ sortKey, sortAsc, toggleSort }} />
                    <SortTh label="MASE" k="mase" numeric {...{ sortKey, sortAsc, toggleSort }} />
                    <SortTh label="sMAPE" k="smape" numeric {...{ sortKey, sortAsc, toggleSort }} />
                    <SortTh label="Bias" k="bias" numeric {...{ sortKey, sortAsc, toggleSort }} />
                    <SortTh label="Backtest stability" k="stability" numeric {...{ sortKey, sortAsc, toggleSort }} />
                    <SortTh label="Confidence" k="confidence" {...{ sortKey, sortAsc, toggleSort }} />
                    <SortTh label={`Forecast @ M+${horizon}`} k="forecastAtHorizon" numeric {...{ sortKey, sortAsc, toggleSort }} />
                    <th className="label-caps px-3 py-2.5">Difference from Champion</th>
                    <SortTh label="Weighted" k="weighted" numeric {...{ sortKey, sortAsc, toggleSort }} />
                    <SortTh label="Rank" k="rank" numeric {...{ sortKey, sortAsc, toggleSort }} />
                    <th className="label-caps px-3 py-2.5">Status</th>
                    <th className="label-caps px-3 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...sortedRows, ...(result.ensemble ? [result.ensemble] : [])].map((r) => (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-b border-border align-top last:border-0",
                        r.status === "Champion"
                          ? "bg-accent/60"
                          : selection?.selectedModelId === r.id
                            ? "bg-positive-soft/40"
                            : !r.eligible && "opacity-60",
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
                        {!r.eligible && <p className="mt-1 max-w-[180px]">{r.eligibilityReason}</p>}
                      </td>
                      <Num v={`${r.validationWape.toFixed(1)}%`} bold />
                      <Num v={`${r.holdoutWape.toFixed(1)}%`} />
                      <Num v={r.mase.toFixed(2)} tone={r.mase < 1 ? "positive" : "risk"} />
                      <Num v={`${r.smape.toFixed(1)}%`} />
                      <Num
                        v={`${r.bias > 0 ? "+" : ""}${r.bias.toFixed(1)}%`}
                        tone={Math.abs(r.bias) > 3 ? "risk" : Math.abs(r.bias) > 2 ? "warning" : "positive"}
                      />
                      <td className="px-3 py-2.5 text-right">
                        <span className="num text-xs">{r.stability}</span>
                        <p className="text-[11px] text-muted-foreground">{r.stabilityBand}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{r.confidence}</td>
                      <Num v={r.eligible ? formatNumber(r.forecastAtHorizon) : "—"} />
                      <td className="px-3 py-2.5 text-[11px]">
                        {r.status === "Champion" ? (
                          <span className="text-muted-foreground">Recommended Champion</span>
                        ) : r.delta ? (
                          <>
                            <p
                              className={cn(
                                "font-medium",
                                r.delta.validationPp > 0 ? "text-risk" : "text-positive",
                              )}
                            >
                              {formatErrorDelta(r.delta.validationPp, r.delta.validationRel)}
                            </p>
                            <p className="text-muted-foreground">
                              Holdout {r.delta.holdoutPp > 0 ? "+" : ""}
                              {r.delta.holdoutPp.toFixed(1)} pp · bias {r.delta.absBiasPp > 0 ? "+" : ""}
                              {r.delta.absBiasPp.toFixed(1)} pp · stability {r.delta.stabilityPoints > 0 ? "+" : ""}
                              {r.delta.stabilityPoints}
                            </p>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Not comparable</span>
                        )}
                      </td>
                      <Num v={r.weighted.toFixed(1)} bold />
                      <Num v={r.rank ? `#${r.rank}` : "—"} />
                      <td className="px-3 py-2.5">
                        <StatusPill tone={rowStatusTone[r.status]}>{r.status}</StatusPill>
                        {selection?.selectedModelId === r.id && (
                          <p className="mt-1 text-[11px] font-medium text-positive">Selected operational model</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col items-start gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailsId(r.id)}
                            className="text-[11px] font-medium text-primary hover:underline"
                          >
                            View details
                          </button>
                          {r.eligible && r.status !== "Champion" && (
                            <button
                              type="button"
                              onClick={() => compareWithChampion(r.id)}
                              className="text-[11px] font-medium text-primary hover:underline"
                            >
                              Compare with Champion
                            </button>
                          )}
                          {r.eligible &&
                            (r.status === "Champion" ? (
                              <button
                                type="button"
                                onClick={acceptChampion}
                                className="rounded-md border border-input px-2 py-1 text-[11px] font-medium hover:bg-accent"
                              >
                                Accept Champion
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setOverrideId(r.id)}
                                className="rounded-md border border-input px-2 py-1 text-[11px] font-medium hover:bg-accent"
                              >
                                Use this model
                              </button>
                            ))}
                        </div>
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
            title="Select up to four models to compare"
            description="Pick the models to overlay. Click a selected chip a second time to remove it; use the eye toggle below to temporarily hide a line."
          >
            <div className="flex flex-wrap gap-1.5">
              {selectableRows.map((model) => {
                const picked = compareSelection.includes(model.id);
                const full = compareSelection.length >= 4 && !picked;
                return (
                  <button
                    key={model.id}
                    type="button"
                    disabled={full}
                    onClick={() => toggleCompareModel(model.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      picked
                        ? "border-primary bg-accent text-foreground"
                        : "border-input text-muted-foreground hover:bg-accent",
                      full && "cursor-not-allowed opacity-40",
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: modelPalette[model.id] ?? "var(--color-muted-foreground)" }}
                    />
                    {model.name}
                    {model.id === championId && " · champion"}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
              <span className="label-caps mr-1">Visible</span>
              {compareSelection.map((id) => {
                const on = !hidden.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setHidden(on ? [...hidden, id] : hidden.filter((h) => h !== id))}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                      on ? "border-input bg-surface" : "border-dashed border-input opacity-60",
                    )}
                  >
                    {rowById(id)?.name ?? id}
                  </button>
                );
              })}
              <span className="ml-auto text-[11px] text-muted-foreground">
                {compareSelection.length} of 4 selected
              </span>
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
                  {chartIds.map((id) => (
                    <Line
                      key={id}
                      type="monotone"
                      dataKey={`m_${id}`}
                      name={rowById(id)?.name ?? id}
                      stroke={modelPalette[id] ?? "var(--color-muted-foreground)"}
                      strokeWidth={id === championId ? 2.8 : 1.6}
                      strokeOpacity={id === championId ? 1 : 0.7}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="Month-by-month error heatmap"
            description="Absolute percentage error for each compared model across the last 12 validation months. Darker means larger error."
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto p-4">
              <table className="w-full min-w-[720px] border-separate border-spacing-0.5 text-xs">
                <thead>
                  <tr>
                    <th className="label-caps px-2 py-1 text-left">Model</th>
                    {compareHeatMonths.map((m) => (
                      <th key={m} className="label-caps px-1 py-1 text-center">
                        {m.slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareHeatModels.map((m) => (
                    <tr key={m}>
                      <td className="px-2 py-1 text-[11px] font-medium whitespace-nowrap">{m}</td>
                      {compareHeatMonths.map((month) => {
                        const cell = compareHeat.find((c) => c.model === m && c.month === month);
                        const v = cell?.error ?? 0;
                        const intensity = Math.min(1, v / 30);
                        return (
                          <td
                            key={month}
                            className="num px-1 py-1 text-center text-[10px]"
                            style={{
                              background: `color-mix(in oklab, var(--color-risk) ${Math.round(intensity * 70)}%, var(--color-surface))`,
                            }}
                            title={`${m} · ${month}: ${v.toFixed(1)}% absolute error`}
                          >
                            {v.toFixed(0)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Panel
              title="Forecast by horizon"
              description={`Forecast quantity produced by each compared model for M+1 to M+${horizon}.`}
            >
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={horizonForecast} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="horizon" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" />
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
                    {chartIds.map((id) => (
                      <Line
                        key={id}
                        type="monotone"
                        dataKey={`m_${id}`}
                        name={rowById(id)?.name ?? id}
                        stroke={modelPalette[id] ?? "var(--color-muted-foreground)"}
                        strokeWidth={id === championId ? 2.6 : 1.6}
                        dot={false}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel
              title="Bias comparison"
              description="Positive bias means the model over-forecasts. The tolerance band is ±2 percentage points."
            >
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={compareSelection.map((id) => ({
                      name: (rowById(id)?.name ?? id).split(" (")[0],
                      bias: rowById(id)?.bias ?? 0,
                    }))}
                    margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" />
                    <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" width={44} unit="%" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 6,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface)",
                        fontSize: 12,
                      }}
                    />
                    <ReferenceLine y={2} stroke="var(--color-warning)" strokeDasharray="4 4" />
                    <ReferenceLine y={-2} stroke="var(--color-warning)" strokeDasharray="4 4" />
                    <ReferenceLine y={0} stroke="var(--color-neutral-line)" />
                    <Bar dataKey="bias" name="Bias %" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <Panel
            title="Backtest stability comparison"
            description="WAPE per rolling-origin window. Flatter lines mean a more stable model."
          >
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={compareStability} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="window" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" width={44} unit="%" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 6,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {chartIds.map((id) => (
                    <Line
                      key={id}
                      type="monotone"
                      dataKey={`m_${id}`}
                      name={rowById(id)?.name ?? id}
                      stroke={modelPalette[id] ?? "var(--color-muted-foreground)"}
                      strokeWidth={id === championId ? 2.6 : 1.6}
                      dot={{ r: 2 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="Forecast quantity difference and simulated inventory implications"
            description="Quantity difference versus the recommended Champion, with a simulated stockout and excess-inventory read-through. Illustrative prototype data — not an approved operational forecast."
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted text-left">
                    <th className="label-caps px-3 py-2.5">Model</th>
                    <th className="label-caps px-3 py-2.5 text-right">Forecast @ M+{horizon}</th>
                    <th className="label-caps px-3 py-2.5 text-right">Difference vs Champion</th>
                    <th className="label-caps px-3 py-2.5 text-right">Stockout risk</th>
                    <th className="label-caps px-3 py-2.5 text-right">Excess-inventory risk</th>
                    <th className="label-caps px-3 py-2.5">Simulated implication</th>
                  </tr>
                </thead>
                <tbody>
                  {compareSelection.map((id) => {
                    const r = rowById(id);
                    if (!r) return null;
                    const imp = inventoryImplication(r);
                    return (
                      <tr key={id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2.5 text-xs font-semibold">
                          {r.name}
                          {id === championId && <span className="ml-1 text-[11px] text-muted-foreground">· champion</span>}
                        </td>
                        <td className="num px-3 py-2.5 text-right text-xs">{formatNumber(r.forecastAtHorizon)}</td>
                        <td className="num px-3 py-2.5 text-right text-xs">
                          {r.delta
                            ? `${r.delta.forecastQty > 0 ? "+" : ""}${formatNumber(r.delta.forecastQty)} (${r.delta.forecastQtyPct > 0 ? "+" : ""}${r.delta.forecastQtyPct.toFixed(1)}%)`
                            : "—"}
                        </td>
                        <td className="num px-3 py-2.5 text-right text-xs">{imp.stockoutRiskPct}%</td>
                        <td className="num px-3 py-2.5 text-right text-xs">{imp.excessRiskPct}%</td>
                        <td className="px-3 py-2.5 text-[11px] text-muted-foreground">
                          Simulated service level {imp.serviceLevelPct}% · {imp.coverWeeks} weeks of cover
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

      {detailsId && (
        <ModelDetailsDialog
          model={rowById(detailsId)}
          champion={result.champion}
          horizon={horizon}
          onCompare={() => {
            compareWithChampion(detailsId);
            setDetailsId(null);
          }}
          onUse={() => {
            setOverrideId(detailsId);
            setDetailsId(null);
          }}
          onClose={() => setDetailsId(null)}
        />
      )}

      {overrideRow && result.champion && (
        <OverrideDialog
          champion={result.champion}
          target={overrideRow}
          assessment={assessment}
          horizon={horizon}
          onCancel={() => setOverrideId(null)}
          onConfirm={(input) => commitSelection({ target: overrideRow, ...input })}
        />
      )}

      <PrototypeNote>
        Illustrative prototype results — no production model training performed.
      </PrototypeNote>
    </div>
  );
}

/**
 * Shows the two identities that must never be conflated: the Champion the
 * tournament recommends, and the model actually selected for operations.
 */
function SelectionIdentityPanel({
  champion,
  selection,
  selectedRow,
  ensemble,
  onAcceptChampion,
  onSelectEnsemble,
  onSelectChallenger,
  onApprove,
  onClear,
}: {
  champion: TournamentRow | null;
  selection?: ModelSelection;
  selectedRow: TournamentRow | null;
  ensemble: TournamentRow | null;
  onAcceptChampion: () => void;
  onSelectEnsemble: () => void;
  onSelectChallenger: () => void;
  onApprove: () => void;
  onClear: () => void;
}) {
  const awaiting = selection?.status === "Awaiting approval";
  return (
    <Panel
      title="Recommended Champion and Selected Operational Model"
      description="The tournament recommends; authorised users decide. Both identities are recorded separately in the audit log."
      actions={<ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden />}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-surface-muted p-3">
          <p className="label-caps">Recommended Champion</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{champion?.name ?? "None"}</p>
          <p className="text-xs text-muted-foreground">
            {champion
              ? `Validation WAPE ${champion.validationWape.toFixed(1)}% · holdout ${champion.holdoutWape.toFixed(1)}% · bias ${champion.bias > 0 ? "+" : ""}${champion.bias.toFixed(1)}% · stability ${champion.stability} (${champion.stabilityBand})`
              : "No eligible model — manual or analogue treatment required."}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            System recommendation from the weighted selection score. Never auto-applied.
          </p>
        </div>

        <div className="rounded-md border border-border p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="label-caps">Selected Operational Model</p>
            <StatusPill tone={selection ? selectionStatusTone[selection.status] : "warning"}>
              {selection ? selection.status : "Not selected"}
            </StatusPill>
          </div>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {selection ? selection.selectedModelName : "Awaiting a decision"}
          </p>
          {selection ? (
            <>
              <p className="text-xs text-muted-foreground">
                {selection.method} · effective {selection.effectiveFrom}
                {selectedRow ? ` · validation WAPE ${selectedRow.validationWape.toFixed(1)}%` : ""}
              </p>
              <p className="mt-1 text-xs text-foreground">{selection.reason}</p>
              {selection.comment && (
                <p className="mt-1 text-[11px] text-muted-foreground">{selection.comment}</p>
              )}
              {selection.materialBreaches.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {selection.materialBreaches.map((b) => (
                    <li key={b} className="text-[11px] text-risk">
                      Material difference — {b}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Accept the Champion, select the Challenger, or use any eligible model with a recorded reason.
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAcceptChampion}
          disabled={!champion}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
        >
          Accept Champion
        </button>
        <button
          type="button"
          onClick={onSelectChallenger}
          className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          Select Challenger
        </button>
        <button
          type="button"
          onClick={onSelectEnsemble}
          disabled={!ensemble}
          className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-40"
        >
          Select Validated Ensemble
        </button>
        {awaiting && (
          <button
            type="button"
            onClick={onApprove}
            className="rounded-md bg-positive px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Approve override
          </button>
        )}
        {selection && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            Revert to recommendation
          </button>
        )}
      </div>
    </Panel>
  );
}

function DialogShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4">
      <div className="mt-10 w-full max-w-3xl rounded-lg border border-border bg-surface shadow-lg">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-accent">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-4 py-3">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}

function MetricRow({ label, champion, target, tone }: { label: string; champion: string; target: string; tone?: string }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2 text-xs">{label}</td>
      <td className="num py-2 text-right text-xs">{champion}</td>
      <td className="num py-2 text-right text-xs font-semibold">{target}</td>
      <td className={cn("py-2 pl-4 text-right text-[11px]", tone)}>{""}</td>
    </tr>
  );
}

function ModelDetailsDialog({
  model,
  champion,
  horizon,
  onCompare,
  onUse,
  onClose,
}: {
  model: TournamentRow | null;
  champion: TournamentRow | null;
  horizon: number;
  onCompare: () => void;
  onUse: () => void;
  onClose: () => void;
}) {
  if (!model) return null;
  const imp = inventoryImplication(model);
  return (
    <DialogShell
      title={model.name}
      subtitle={`${model.category} · ${categoryNote[model.category] ?? ""}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent">
            Close
          </button>
          {model.eligible && model.status !== "Champion" && (
            <>
              <button type="button" onClick={onCompare} className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent">
                Compare with Champion
              </button>
              <button type="button" onClick={onUse} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                Use this model
              </button>
            </>
          )}
        </>
      }
    >
      <div className="flex flex-wrap gap-2">
        <StatusPill tone={rowStatusTone[model.status]}>{model.status}</StatusPill>
        <StatusPill tone={model.eligible ? "positive" : "warning"}>
          {model.eligible ? "Eligible" : model.eligibilityReason}
        </StatusPill>
        <StatusPill tone="neutral">Forecast confidence {model.confidence}</StatusPill>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="label-caps py-2">Metric</th>
            <th className="label-caps py-2 text-right">Champion</th>
            <th className="label-caps py-2 text-right">This model</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <MetricRow label="Validation WAPE" champion={`${champion?.validationWape.toFixed(1) ?? "—"}%`} target={`${model.validationWape.toFixed(1)}%`} />
          <MetricRow label="Holdout WAPE" champion={`${champion?.holdoutWape.toFixed(1) ?? "—"}%`} target={`${model.holdoutWape.toFixed(1)}%`} />
          <MetricRow label="MASE" champion={champion?.mase.toFixed(2) ?? "—"} target={model.mase.toFixed(2)} />
          <MetricRow label="sMAPE" champion={`${champion?.smape.toFixed(1) ?? "—"}%`} target={`${model.smape.toFixed(1)}%`} />
          <MetricRow label="Bias" champion={`${champion?.bias.toFixed(1) ?? "—"}%`} target={`${model.bias.toFixed(1)}%`} />
          <MetricRow label="Backtest stability" champion={`${champion?.stability ?? "—"} (${champion?.stabilityBand ?? "—"})`} target={`${model.stability} (${model.stabilityBand})`} />
          <MetricRow label={`Forecast @ M+${horizon}`} champion={formatNumber(champion?.forecastAtHorizon ?? 0)} target={formatNumber(model.forecastAtHorizon)} />
          <MetricRow label="Weighted selection score" champion={champion?.weighted.toFixed(1) ?? "—"} target={model.weighted.toFixed(1)} />
        </tbody>
      </table>

      {model.delta && (
        <p className="text-xs text-foreground">
          Error difference versus Champion: {formatErrorDelta(model.delta.validationPp, model.delta.validationRel)}.
        </p>
      )}
      <p className="text-xs text-muted-foreground">{model.rationale}</p>
      <p className="text-xs text-muted-foreground">
        Simulated inventory read-through: stockout risk {imp.stockoutRiskPct}% · excess-inventory risk {imp.excessRiskPct}% ·
        service level {imp.serviceLevelPct}% · {imp.coverWeeks} weeks of cover.
      </p>
    </DialogShell>
  );
}

function OverrideDialog({
  champion,
  target,
  assessment,
  horizon,
  onCancel,
  onConfirm,
}: {
  champion: TournamentRow;
  target: TournamentRow;
  assessment: ReturnType<typeof assessOverride> | null;
  horizon: number;
  onCancel: () => void;
  onConfirm: (input: {
    method: SelectionMethod;
    reason: string;
    comment: string;
    effectiveFrom: string;
    evidence: string;
  }) => void;
}) {
  const [reason, setReason] = useState(overrideReasons[0]);
  const [comment, setComment] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(effectivePeriods[0]);
  const [evidence, setEvidence] = useState("");
  const material = assessment?.material ?? false;
  const method: SelectionMethod =
    target.id === "ensemble"
      ? "Validated ensemble selected"
      : target.status === "Challenger"
        ? "Challenger selected"
        : "Manual override";
  const canConfirm = reason.trim().length > 0 && comment.trim().length >= 10;

  return (
    <DialogShell
      title={`Use ${target.name} instead of the recommended Champion`}
      subtitle={`Recommended Champion remains ${champion.name}. Both identities are retained.`}
      onClose={onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent">
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => onConfirm({ method, reason, comment, effectiveFrom, evidence })}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
          >
            {material ? "Submit for approval" : "Confirm selection"}
          </button>
        </>
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="label-caps py-2">Comparison</th>
            <th className="label-caps py-2 text-right">Champion</th>
            <th className="label-caps py-2 text-right">Selected</th>
            <th className="label-caps py-2 text-right">Difference</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <td className="py-2 text-xs">Validation WAPE</td>
            <td className="num py-2 text-right text-xs">{champion.validationWape.toFixed(1)}%</td>
            <td className="num py-2 text-right text-xs">{target.validationWape.toFixed(1)}%</td>
            <td className={cn("py-2 text-right text-[11px]", (target.delta?.validationPp ?? 0) > 0 ? "text-risk" : "text-positive")}>
              {target.delta ? formatErrorDelta(target.delta.validationPp, target.delta.validationRel) : "—"}
            </td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-2 text-xs">Holdout WAPE</td>
            <td className="num py-2 text-right text-xs">{champion.holdoutWape.toFixed(1)}%</td>
            <td className="num py-2 text-right text-xs">{target.holdoutWape.toFixed(1)}%</td>
            <td className="py-2 text-right text-[11px]">
              {target.delta ? formatErrorDelta(target.delta.holdoutPp, target.delta.holdoutRel) : "—"}
            </td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-2 text-xs">Bias</td>
            <td className="num py-2 text-right text-xs">{champion.bias.toFixed(1)}%</td>
            <td className="num py-2 text-right text-xs">{target.bias.toFixed(1)}%</td>
            <td className="py-2 text-right text-[11px]">
              {target.delta ? `${target.delta.absBiasPp > 0 ? "+" : ""}${target.delta.absBiasPp.toFixed(1)} pp absolute bias` : "—"}
            </td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-2 text-xs">Backtest stability</td>
            <td className="num py-2 text-right text-xs">{champion.stability} ({champion.stabilityBand})</td>
            <td className="num py-2 text-right text-xs">{target.stability} ({target.stabilityBand})</td>
            <td className="py-2 text-right text-[11px]">
              {target.delta ? `${target.delta.stabilityPoints > 0 ? "+" : ""}${target.delta.stabilityPoints} points` : "—"}
            </td>
          </tr>
          <tr>
            <td className="py-2 text-xs">Forecast @ M+{horizon}</td>
            <td className="num py-2 text-right text-xs">{formatNumber(champion.forecastAtHorizon)}</td>
            <td className="num py-2 text-right text-xs">{formatNumber(target.forecastAtHorizon)}</td>
            <td className="py-2 text-right text-[11px]">
              {target.delta
                ? `${target.delta.forecastQty > 0 ? "+" : ""}${formatNumber(target.delta.forecastQty)} units (${target.delta.forecastQtyPct > 0 ? "+" : ""}${target.delta.forecastQtyPct.toFixed(1)}%)`
                : "—"}
            </td>
          </tr>
        </tbody>
      </table>

      <div
        className={cn(
          "rounded-md border p-3 text-xs",
          material ? "border-risk/40 bg-risk-soft text-risk" : "border-border bg-surface-muted text-muted-foreground",
        )}
      >
        {material ? (
          <>
            <p className="font-semibold">Materially worse than the Champion — approval required.</p>
            <ul className="mt-1 space-y-0.5">
              {assessment?.breaches.map((b) => (
                <li key={b}>· {b}</li>
              ))}
            </ul>
          </>
        ) : (
          <p>
            Within materiality thresholds (WAPE ≤ {defaultMateriality.validationPp} pp worse, absolute bias ≤{" "}
            {defaultMateriality.absBiasPp} pp higher, no High-to-Low stability downgrade). The
            selection takes effect immediately once confirmed.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="label-caps">Override reason (required)</span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-md border border-input bg-surface px-2 py-1.5 text-xs"
          >
            {overrideReasons.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="label-caps">Effective period (required)</span>
          <select
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            className="rounded-md border border-input bg-surface px-2 py-1.5 text-xs"
          >
            {effectivePeriods.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="label-caps">Comment (required, minimum 10 characters)</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Explain why this model is preferred over the recommended Champion for this series."
          className="rounded-md border border-input bg-surface px-2 py-1.5 text-xs"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="label-caps">Supporting evidence (optional)</span>
        <input
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder="Reference an event, customer schedule or backtest window."
          className="rounded-md border border-input bg-surface px-2 py-1.5 text-xs"
        />
      </label>

      <PrototypeNote>
        Selection is recorded against this series only, with the recommended Champion retained alongside it.
      </PrototypeNote>
    </DialogShell>
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
