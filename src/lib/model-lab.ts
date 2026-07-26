/**
 * Model Lab domain: model catalogue, eligibility by demand pattern, simulated
 * tournament scoring, rolling backtest windows and portfolio model mix.
 *
 * Illustrative prototype results — no production model training performed.
 */

import {
  hashString,
  monthLabels,
  historyCutoffIndex,
  skus,
  type DemandBehaviour,
  type SkuRow,
} from "@/lib/demo-data";
import { qualityForSku } from "@/lib/forecast-domain";

// ------------------------------------------------------------------ RNG
function rng(seed: string) {
  let a = hashString(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

// ------------------------------------------------------------------ catalogue
export type ModelCategory =
  | "Baseline"
  | "Statistical / time series"
  | "Intermittent demand"
  | "Machine learning"
  | "Advanced challenger";

export const modelCategories: ModelCategory[] = [
  "Baseline",
  "Statistical / time series",
  "Intermittent demand",
  "Machine learning",
  "Advanced challenger",
];

export const categoryNote: Record<ModelCategory, string> = {
  Baseline: "Naïve reference methods. Every other method must beat these to be selectable.",
  "Statistical / time series":
    "Classical statistical forecasting — parametric time-series models, not machine learning.",
  "Intermittent demand": "Designed for series with frequent zero-demand buckets.",
  "Machine learning": "Learned feature-based regressors trained on engineered driver features.",
  "Advanced challenger": "Deep-learning and pre-trained challengers, evaluated but gated.",
};

export type ModelStatus = "Available" | "Challenger" | "Not suitable";

export type CatalogueModel = {
  id: string;
  name: string;
  category: ModelCategory;
  patterns: DemandBehaviour[];
  minHistoryMonths: number;
  seasonality: boolean;
  exogenous: boolean;
  intermittent: boolean;
  strengths: string;
  limitations: string;
  status: ModelStatus;
  /** Base accuracy quality used by the simulated tournament (lower = better). */
  baseError: number;
  /** Business suitability score out of 100 used in the weighted score. */
  suitability: number;
  execMs: number;
};

export const modelCatalogue: CatalogueModel[] = [
  {
    id: "last-period",
    name: "Last period (naïve)",
    category: "Baseline",
    patterns: ["Smooth", "Trending", "Customer-schedule-driven"],
    minHistoryMonths: 2,
    seasonality: false,
    exogenous: false,
    intermittent: false,
    strengths: "Zero configuration, instant, transparent reference point.",
    limitations: "Carries noise forward; no seasonality or trend handling.",
    status: "Available",
    baseError: 21.5,
    suitability: 30,
    execMs: 40,
  },
  {
    id: "moving-average",
    name: "Moving average",
    category: "Baseline",
    patterns: ["Smooth", "Erratic"],
    minHistoryMonths: 6,
    seasonality: false,
    exogenous: false,
    intermittent: false,
    strengths: "Smooths random noise on stable, low-volatility series.",
    limitations: "Lags turning points; cannot follow trend or seasonality.",
    status: "Available",
    baseError: 17.8,
    suitability: 38,
    execMs: 45,
  },
  {
    id: "seasonal-naive",
    name: "Seasonal naïve",
    category: "Baseline",
    patterns: ["Seasonal", "Customer-schedule-driven"],
    minHistoryMonths: 24,
    seasonality: true,
    exogenous: false,
    intermittent: false,
    strengths: "Captures a repeating annual profile with no parameters; MASE denominator.",
    limitations: "Assumes last year repeats — wrong when a shutdown moves month.",
    status: "Available",
    baseError: 16.4,
    suitability: 42,
    execMs: 50,
  },
  {
    id: "ets",
    name: "ETS (exponential smoothing)",
    category: "Statistical / time series",
    patterns: ["Smooth", "Seasonal", "Trending"],
    minHistoryMonths: 24,
    seasonality: true,
    exogenous: false,
    intermittent: false,
    strengths: "Robust level/trend/seasonal decomposition; very stable on clean series.",
    limitations: "No external variables; cannot represent schedule or shutdown drivers.",
    status: "Available",
    baseError: 11.2,
    suitability: 68,
    execMs: 210,
  },
  {
    id: "arima",
    name: "ARIMA",
    category: "Statistical / time series",
    patterns: ["Smooth", "Trending", "Erratic"],
    minHistoryMonths: 24,
    seasonality: false,
    exogenous: false,
    intermittent: false,
    strengths: "Strong autocorrelation and short-term dynamics fit.",
    limitations: "Non-seasonal form only; sensitive to outliers and level shifts.",
    status: "Available",
    baseError: 12.1,
    suitability: 60,
    execMs: 420,
  },
  {
    id: "sarima",
    name: "SARIMA",
    category: "Statistical / time series",
    patterns: ["Seasonal", "Trending", "Smooth"],
    minHistoryMonths: 30,
    seasonality: true,
    exogenous: false,
    intermittent: false,
    strengths: "Seasonal differencing handles a repeating annual demand profile.",
    limitations: "Needs long, gap-free history; no exogenous regressors.",
    status: "Available",
    baseError: 10.2,
    suitability: 72,
    execMs: 640,
  },
  {
    id: "sarimax",
    name: "SARIMAX",
    category: "Statistical / time series",
    patterns: ["Seasonal", "Customer-schedule-driven", "Event-driven", "Trending"],
    minHistoryMonths: 30,
    seasonality: true,
    exogenous: true,
    intermittent: false,
    strengths: "Seasonal structure plus customer schedule and shutdown-calendar regressors.",
    limitations: "Regressor quality drives accuracy; requires clean driver history.",
    status: "Available",
    baseError: 8.6,
    suitability: 88,
    execMs: 910,
  },
  {
    id: "prophet",
    name: "Prophet",
    category: "Statistical / time series",
    patterns: ["Seasonal", "Event-driven", "Trending"],
    minHistoryMonths: 24,
    seasonality: true,
    exogenous: true,
    intermittent: false,
    strengths: "Explicit holiday/shutdown regressors and changepoint detection.",
    limitations: "Additive assumptions can over-smooth; bias drifts on short horizons.",
    status: "Available",
    baseError: 10.6,
    suitability: 74,
    execMs: 520,
  },
  {
    id: "croston",
    name: "Croston",
    category: "Intermittent demand",
    patterns: ["Intermittent", "Lumpy"],
    minHistoryMonths: 18,
    seasonality: false,
    exogenous: false,
    intermittent: true,
    strengths: "Separates demand size from inter-demand interval on sparse series.",
    limitations: "Known positive bias; no seasonality; flat forecast profile.",
    status: "Available",
    baseError: 15.2,
    suitability: 66,
    execMs: 90,
  },
  {
    id: "sba",
    name: "SBA (Syntetos-Boylan)",
    category: "Intermittent demand",
    patterns: ["Intermittent", "Lumpy"],
    minHistoryMonths: 18,
    seasonality: false,
    exogenous: false,
    intermittent: true,
    strengths: "Bias-corrected Croston; better MASE on slow-moving spares.",
    limitations: "Still flat; ignores seasonality and external drivers.",
    status: "Available",
    baseError: 14.1,
    suitability: 70,
    execMs: 95,
  },
  {
    id: "tsb",
    name: "TSB (Teunter-Syntetos-Babai)",
    category: "Intermittent demand",
    patterns: ["Intermittent", "Lumpy", "Erratic", "End-of-life"],
    minHistoryMonths: 18,
    seasonality: false,
    exogenous: false,
    intermittent: true,
    strengths: "Updates demand probability every period — handles obsolescence.",
    limitations: "Two smoothing parameters to tune; noisy on very short history.",
    status: "Available",
    baseError: 13.8,
    suitability: 72,
    execMs: 100,
  },
  {
    id: "linreg",
    name: "Linear / regularised regression",
    category: "Machine learning",
    patterns: ["Smooth", "Trending", "Customer-schedule-driven", "Event-driven"],
    minHistoryMonths: 24,
    seasonality: true,
    exogenous: true,
    intermittent: false,
    strengths: "Interpretable driver coefficients; ridge/lasso controls overfitting.",
    limitations: "Linear form misses interactions and saturation effects.",
    status: "Available",
    baseError: 11.0,
    suitability: 70,
    execMs: 160,
  },
  {
    id: "xgboost",
    name: "XGBoost",
    category: "Machine learning",
    patterns: ["Smooth", "Seasonal", "Trending", "Erratic", "Customer-schedule-driven", "Event-driven"],
    minHistoryMonths: 30,
    seasonality: true,
    exogenous: true,
    intermittent: false,
    strengths: "Captures non-linear driver interactions across many features.",
    limitations: "Cannot extrapolate beyond observed range; needs feature engineering.",
    status: "Available",
    baseError: 9.0,
    suitability: 82,
    execMs: 1450,
  },
  {
    id: "lightgbm",
    name: "LightGBM",
    category: "Machine learning",
    patterns: ["Smooth", "Seasonal", "Trending", "Erratic", "Customer-schedule-driven", "Event-driven"],
    minHistoryMonths: 30,
    seasonality: true,
    exogenous: true,
    intermittent: false,
    strengths: "Fast training across large SKU portfolios; strong global models.",
    limitations: "Same extrapolation limits as XGBoost; leaf-wise growth can overfit.",
    status: "Available",
    baseError: 9.3,
    suitability: 80,
    execMs: 780,
  },
  {
    id: "transformer",
    name: "Time-series transformer",
    category: "Advanced challenger",
    patterns: ["Smooth", "Seasonal", "Trending", "Customer-schedule-driven", "Event-driven"],
    minHistoryMonths: 36,
    seasonality: true,
    exogenous: true,
    intermittent: false,
    strengths: "Learns long-range dependencies across the whole portfolio.",
    limitations: "Data-hungry, slow, harder to explain to the review board.",
    status: "Challenger",
    baseError: 9.6,
    suitability: 58,
    execMs: 5400,
  },
  {
    id: "foundation",
    name: "Foundation time-series model",
    category: "Advanced challenger",
    patterns: ["Smooth", "Seasonal", "Trending", "New item", "Intermittent"],
    minHistoryMonths: 6,
    seasonality: true,
    exogenous: false,
    intermittent: true,
    strengths: "Zero-shot forecasts with very short history; useful for new items.",
    limitations: "Not yet governance-approved; must clear three stable cycles.",
    status: "Challenger",
    baseError: 10.4,
    suitability: 54,
    execMs: 3100,
  },
];

export function modelById(id: string) {
  return modelCatalogue.find((m) => m.id === id)!;
}

// ------------------------------------------------------------------ eligibility
export const behaviourEligibility: Record<DemandBehaviour, string> = {
  Smooth: "Continuous low-variability demand: baseline, statistical and ML methods all compete.",
  Seasonal: "Annual profile detected: ETS, SARIMA, SARIMAX, Prophet and seasonal naïve are eligible.",
  Trending: "Persistent drift: damped-trend ETS, ARIMA/SARIMA and ML regressors are eligible.",
  Intermittent: "Zero demand in more than 35% of buckets: Croston, SBA and TSB become eligible.",
  Erratic: "High size variability with regular occurrence: TSB, ARIMA and ML regressors.",
  Lumpy: "Sparse and highly variable: intermittent methods only, with planner review.",
  "New item": "Insufficient history: historical models are not suitable — analogue / family forecasting recommended.",
  "End-of-life": "Managed run-down: TSB and damped statistical methods with a phase-out curve.",
  "Customer-schedule-driven": "Demand explained by EDI releases: SARIMAX, XGBoost and LightGBM are eligible.",
  "Event-driven": "External business variables dominate: SARIMAX, Prophet, XGBoost and LightGBM.",
};

export type Eligibility = {
  eligible: boolean;
  reason: string;
};

export function eligibilityFor(
  model: CatalogueModel,
  behaviour: DemandBehaviour,
  historyMonths: number,
): Eligibility {
  if (behaviour === "New item" && historyMonths < 12) {
    if (model.id === "foundation") {
      return { eligible: true, reason: "Zero-shot challenger — only method able to run on <12 months." };
    }
    return { eligible: false, reason: "Not suitable — insufficient history; use analogue / family forecasting." };
  }
  if (historyMonths < model.minHistoryMonths) {
    return {
      eligible: false,
      reason: `Not suitable — needs ${model.minHistoryMonths} months, series has ${historyMonths}.`,
    };
  }
  const intermittentPattern = behaviour === "Intermittent" || behaviour === "Lumpy";
  if (intermittentPattern && !model.intermittent) {
    return { eligible: false, reason: "Not suitable — series has frequent zero buckets; intermittent methods required." };
  }
  if (!intermittentPattern && model.intermittent && model.category === "Intermittent demand") {
    return { eligible: false, reason: "Not suitable — continuous demand; intermittent methods add no value." };
  }
  if (!model.patterns.includes(behaviour)) {
    return { eligible: false, reason: `Not suitable — ${behaviour.toLowerCase()} demand is outside this method's pattern fit.` };
  }
  if (behaviour === "Seasonal" && !model.seasonality) {
    return { eligible: false, reason: "Not suitable — no seasonal component." };
  }
  return { eligible: true, reason: "Eligible — pattern fit and history requirement satisfied." };
}

// ------------------------------------------------------------------ weights
export type ScoreWeights = {
  wape: number;
  mase: number;
  bias: number;
  stability: number;
  suitability: number;
};

export const defaultWeights: ScoreWeights = {
  wape: 30,
  mase: 20,
  bias: 20,
  stability: 20,
  suitability: 10,
};

export const weightLabels: Array<{ key: keyof ScoreWeights; label: string }> = [
  { key: "wape", label: "WAPE" },
  { key: "mase", label: "MASE" },
  { key: "bias", label: "Bias" },
  { key: "stability", label: "Backtest stability" },
  { key: "suitability", label: "Business suitability" },
];

// ------------------------------------------------------------------ tournament
export type TournamentRow = {
  id: string;
  name: string;
  category: ModelCategory;
  eligible: boolean;
  eligibilityReason: string;
  wape: number;
  mase: number;
  smape: number;
  mape: number;
  bias: number;
  stability: number;
  confidence: "High" | "Medium" | "Low";
  execMs: number;
  suitability: number;
  wapeScore: number;
  maseScore: number;
  biasScore: number;
  stabilityScore: number;
  suitabilityScore: number;
  weighted: number;
  rank: number | null;
  status: "Champion" | "Challenger" | "Rejected" | "Not eligible";
  rationale: string;
};

export type TournamentResult = {
  key: string;
  behaviour: DemandBehaviour;
  historyMonths: number;
  horizon: number;
  weights: ScoreWeights;
  rows: TournamentRow[];
  champion: TournamentRow | null;
  runnerUp: TournamentRow | null;
  eligibleCount: number;
  explanation: string;
};

export const tournamentStages = [
  "Preparing data",
  "Detecting demand behaviour",
  "Creating rolling backtest windows",
  "Running eligible models",
  "Calculating performance metrics",
  "Ranking models",
  "Selecting champion model",
];

export function runTournament(options: {
  key: string;
  behaviour: DemandBehaviour;
  historyMonths: number;
  horizon: number;
  weights?: ScoreWeights;
}): TournamentResult {
  const { key, behaviour, historyMonths, horizon } = options;
  const weights = options.weights ?? defaultWeights;
  const totalWeight =
    weights.wape + weights.mase + weights.bias + weights.stability + weights.suitability || 1;

  const rows: TournamentRow[] = modelCatalogue.map((model) => {
    const r = rng(`${key}|${model.id}`);
    const elig = eligibilityFor(model, behaviour, historyMonths);
    const horizonPenalty = (horizon - 6) * 0.18;
    const wape = round1(clamp(model.baseError + (r() - 0.45) * 3.2 + horizonPenalty, 3.4, 34));
    const mase = round2(clamp(wape / 12 + (r() - 0.5) * 0.12, 0.3, 2.4));
    const smape = round1(clamp(wape * (1.08 + r() * 0.18), 3.6, 40));
    const mape = round1(clamp(wape * (1.14 + r() * 0.34), 3.8, 62));
    const bias = round1((r() - 0.5) * (model.category === "Intermittent demand" ? 11 : 7));
    const stability = Math.round(clamp(96 - wape * 1.5 - r() * 12 + model.suitability * 0.08, 38, 96));

    const wapeScore = Math.round(clamp(100 - (wape - 5) * 3.4, 0, 100));
    const maseScore = Math.round(clamp((1.6 - mase) * 78, 0, 100));
    const biasScore = Math.round(clamp(100 - Math.abs(bias) * 14, 0, 100));
    const stabilityScore = stability;
    const suitabilityScore = model.suitability;
    const weighted =
      round1(
        (wapeScore * weights.wape +
          maseScore * weights.mase +
          biasScore * weights.bias +
          stabilityScore * weights.stability +
          suitabilityScore * weights.suitability) /
          totalWeight,
      );

    const confidence: TournamentRow["confidence"] =
      weighted >= 78 ? "High" : weighted >= 62 ? "Medium" : "Low";

    return {
      id: model.id,
      name: model.name,
      category: model.category,
      eligible: elig.eligible,
      eligibilityReason: elig.reason,
      wape,
      mase,
      smape,
      mape,
      bias,
      stability,
      confidence,
      execMs: Math.round(model.execMs * (0.8 + r() * 0.5)),
      suitability: model.suitability,
      wapeScore,
      maseScore,
      biasScore,
      stabilityScore,
      suitabilityScore,
      weighted,
      rank: null,
      status: elig.eligible ? "Rejected" : "Not eligible",
      rationale: elig.reason,
    };
  });

  const ranked = rows
    .filter((row) => row.eligible)
    .sort((a, b) => b.weighted - a.weighted);

  ranked.forEach((row, index) => {
    row.rank = index + 1;
    const isGated = modelById(row.id).status === "Challenger";
    if (index === 0 && !isGated) {
      row.status = "Champion";
      row.rationale = `Highest weighted validation score (${row.weighted.toFixed(1)}) with bias ${row.bias > 0 ? "+" : ""}${row.bias.toFixed(1)}% and stability ${row.stability}.`;
    } else if (isGated) {
      row.status = "Challenger";
      row.rationale = "Governance-gated challenger — tracked in parallel, not selectable this cycle.";
    } else if (index <= 2) {
      row.status = "Challenger";
      row.rationale = `Within ${(ranked[0].weighted - row.weighted).toFixed(1)} points of the champion — retained as fallback.`;
    } else {
      row.status = "Rejected";
      row.rationale =
        Math.abs(row.bias) > 3
          ? `Rejected — bias ${row.bias > 0 ? "+" : ""}${row.bias.toFixed(1)}% outside the ±3% review tolerance.`
          : row.stability < 70
            ? `Rejected — backtest stability ${row.stability} below the 70 gate.`
            : `Rejected — weighted score ${row.weighted.toFixed(1)} behind the champion.`;
    }
  });

  const champion = ranked.find((row) => row.status === "Champion") ?? null;
  const runnerUp = ranked.find((row) => row !== champion && row.status === "Challenger") ?? null;

  const explanation = champion
    ? `${champion.name} was selected for ${key.split("|")[0]} because it produced the highest weighted validation score (${champion.weighted.toFixed(1)} of 100) across ${5} rolling backtest windows, held bias at ${champion.bias > 0 ? "+" : ""}${champion.bias.toFixed(1)}% and recorded backtest stability of ${champion.stability}.${
        modelById(champion.id).exogenous
          ? " It can also incorporate customer schedule and shutdown-calendar variables, which matters for this series."
          : ""
      }${
        runnerUp
          ? ` ${runnerUp.name} reached a comparable average error (WAPE ${runnerUp.wape.toFixed(1)}% versus ${champion.wape.toFixed(1)}%) but scored lower on ${runnerUp.stability < champion.stability ? "stability across recent validation windows" : "bias control"}, so it is retained as the challenger rather than the champion.`
          : ""
      }`
    : `No model cleared the eligibility rules for this series (${behaviour.toLowerCase()} demand, ${historyMonths} months of history). Analogue or family-level forecasting is recommended and the series is routed to manual treatment.`;

  return {
    key,
    behaviour,
    historyMonths,
    horizon,
    weights,
    rows,
    champion,
    runnerUp,
    eligibleCount: ranked.length,
    explanation,
  };
}

// ------------------------------------------------------------------ backtests
export type BacktestWindow = {
  id: string;
  trainPeriod: string;
  testPeriod: string;
  horizonMonths: number;
  actual: number;
  predicted: number;
  errorPct: number;
  biasPct: number;
  wape: number;
};

export function backtestWindows(key: string, base: number, modelId: string): BacktestWindow[] {
  const r = rng(`bt-${key}-${modelId}`);
  const folds = 5;
  const out: BacktestWindow[] = [];
  for (let f = 0; f < folds; f++) {
    const testStart = historyCutoffIndex - (folds - f) * 6 + 1;
    const trainStart = 0;
    const actual = Math.round(base * 6 * (0.92 + r() * 0.2));
    const err = (r() - 0.48) * 0.14;
    const predicted = Math.round(actual * (1 + err));
    out.push({
      id: `w${f + 1}`,
      trainPeriod: `${monthLabels[trainStart]} – ${monthLabels[Math.max(0, testStart - 1)]}`,
      testPeriod: `${monthLabels[Math.max(0, testStart)]} – ${monthLabels[Math.max(0, testStart + 5)]}`,
      horizonMonths: 6,
      actual,
      predicted,
      errorPct: round1(Math.abs(err) * 100),
      biasPct: round1(err * 100),
      wape: round1(Math.abs(err) * 100 * (1 + r() * 0.25)),
    });
  }
  return out;
}

export type HeatCell = { model: string; month: string; error: number };

export function errorHeatmap(key: string, modelIds: string[]): HeatCell[] {
  const months = monthLabels.slice(historyCutoffIndex - 11, historyCutoffIndex + 1);
  const cells: HeatCell[] = [];
  modelIds.forEach((id) => {
    const r = rng(`heat-${key}-${id}`);
    const base = modelById(id).baseError;
    months.forEach((month) => {
      cells.push({ model: modelById(id).name, month, error: round1(clamp(base + (r() - 0.45) * 9, 1.5, 38)) });
    });
  });
  return cells;
}

export function stabilitySeries(key: string, modelIds: string[]) {
  const windows = ["W1", "W2", "W3", "W4", "W5"];
  return windows.map((w, i) => {
    const point: Record<string, string | number> = { window: w };
    modelIds.forEach((id) => {
      const r = rng(`stab-${key}-${id}-${i}`);
      point[id] = round1(clamp(modelById(id).baseError + (r() - 0.45) * 4.5, 2.5, 34));
    });
    return point;
  });
}

export function errorDistribution(key: string, modelId: string) {
  const buckets = ["< 5%", "5–10%", "10–15%", "15–20%", "20–30%", "> 30%"];
  const r = rng(`dist-${key}-${modelId}`);
  const shape = [0.28, 0.3, 0.18, 0.12, 0.08, 0.04];
  return buckets.map((bucket, i) => ({
    bucket,
    periods: Math.max(0, Math.round(54 * shape[i] * (0.7 + r() * 0.6))),
  }));
}

export function accuracyByHorizon(key: string, modelId: string) {
  const r = rng(`hz-${key}-${modelId}`);
  const base = modelById(modelId).baseError;
  return [1, 2, 3, 6, 9, 12].map((h) => ({
    horizon: `M+${h}`,
    wape: round1(clamp(base * (0.7 + h * 0.055) + (r() - 0.5) * 1.6, 2.5, 40)),
  }));
}

// ------------------------------------------------------------------ portfolio
export const portfolioBuckets = [
  "ETS",
  "Prophet",
  "SARIMAX",
  "Croston-type",
  "XGBoost",
  "LightGBM",
  "Other models",
  "Manual treatment",
] as const;
export type PortfolioBucket = (typeof portfolioBuckets)[number];

function bucketFor(modelId: string | null): PortfolioBucket {
  switch (modelId) {
    case "ets":
      return "ETS";
    case "prophet":
      return "Prophet";
    case "sarimax":
      return "SARIMAX";
    case "croston":
    case "sba":
    case "tsb":
      return "Croston-type";
    case "xgboost":
      return "XGBoost";
    case "lightgbm":
      return "LightGBM";
    case null:
      return "Manual treatment";
    default:
      return "Other models";
  }
}

/** Lightweight deterministic champion pick used for portfolio-level roll-ups. */
export function championBucketFor(row: SkuRow): PortfolioBucket {
  const history = qualityForSku(row.sku).historyMonths;
  if (row.behaviour === "New item" || history < 12 || row.quality === "Low") {
    if (row.behaviour === "New item" || history < 12) return "Manual treatment";
  }
  const eligible = modelCatalogue.filter(
    (m) => eligibilityFor(m, row.behaviour, history).eligible && m.status === "Available",
  );
  if (!eligible.length) return "Manual treatment";
  const r = rng(`pick-${row.sku}-${row.customerId}`);
  const scored = eligible
    .map((m) => ({ m, score: 100 - m.baseError * 2.6 + m.suitability * 0.35 + r() * 14 }))
    .sort((a, b) => b.score - a.score);
  return bucketFor(scored[0].m.id);
}

export const portfolioMix: Array<{ bucket: PortfolioBucket; series: number; share: number }> = (() => {
  const counts = new Map<PortfolioBucket, number>();
  portfolioBuckets.forEach((b) => counts.set(b, 0));
  skus.forEach((row) => {
    const bucket = championBucketFor(row);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  });
  return portfolioBuckets.map((bucket) => ({
    bucket,
    series: counts.get(bucket) ?? 0,
    share: round1(((counts.get(bucket) ?? 0) / skus.length) * 100),
  }));
})();

// ------------------------------------------------------------------ model profile
export type ModelProfile = {
  champion: string;
  category: string;
  runnerUp: string;
  weighted: number;
  lastTraining: string;
  nextRetraining: string;
  dataQuality: string;
  confidence: string;
  version: string;
  behaviour: DemandBehaviour;
  historyMonths: number;
};

export function modelProfileFor(row: SkuRow): ModelProfile {
  const history = qualityForSku(row.sku).historyMonths;
  const result = runTournament({
    key: `${row.sku}|${row.customerId}|${row.plantId}`,
    behaviour: row.behaviour,
    historyMonths: history,
    horizon: 6,
  });
  const r = rng(`profile-${row.sku}`);
  const day = 18 + Math.floor(r() * 6);
  return {
    champion: result.champion?.name ?? "No automated model — manual treatment",
    category: result.champion ? result.champion.category : "Analogue / family forecasting",
    runnerUp: result.runnerUp?.name ?? "None eligible",
    weighted: result.champion?.weighted ?? 0,
    lastTraining: `${day} Jul 2026`,
    nextRetraining: `${String(day - 1).padStart(2, "0")} Aug 2026`,
    dataQuality: qualityForSku(row.sku).confidence,
    confidence: result.champion?.confidence ?? "Low",
    version: `m${String(2026)}.07.${String((hashString(row.sku) % 9) + 1)}`,
    behaviour: row.behaviour,
    historyMonths: history,
  };
}

// ------------------------------------------------------------------ comparison chart
export type ComparisonPoint = Record<string, number | string | null> & { period: string };

/**
 * Builds the visual comparison series: history, holdout actuals, one forecast
 * line per eligible model, the champion line and a confidence interval.
 */
export function comparisonSeries(options: {
  key: string;
  base: number;
  modelIds: string[];
  championId: string | null;
  holdoutMonths?: number;
}): ComparisonPoint[] {
  const { key, base, modelIds, championId } = options;
  const holdout = options.holdoutMonths ?? 6;
  const start = Math.max(0, historyCutoffIndex - 29);
  const holdoutStart = historyCutoffIndex - holdout + 1;
  const rands = new Map<string, () => number>();
  modelIds.forEach((id) => rands.set(id, rng(`cmp-${key}-${id}`)));
  const level = rng(`cmp-level-${key}`);

  const out: ComparisonPoint[] = [];
  for (let i = start; i < monthLabels.length; i++) {
    const seasonal = 1 + 0.14 * Math.sin(((i % 12) / 12) * Math.PI * 2);
    const trend = 1 + i * 0.0022;
    const truth = base * seasonal * trend * (0.96 + level() * 0.08);
    const isHistory = i <= historyCutoffIndex;
    const inHoldout = isHistory && i >= holdoutStart;
    const point: ComparisonPoint = {
      period: monthLabels[i],
      actual: isHistory && !inHoldout ? Math.round(truth) : null,
      holdout: inHoldout ? Math.round(truth) : null,
    };
    modelIds.forEach((id) => {
      const r = rands.get(id)!;
      const err = ((r() - 0.45) * modelById(id).baseError) / 100;
      point[`m_${id}`] = inHoldout || !isHistory ? Math.round(truth * (1 + err)) : null;
    });
    if (championId) {
      const champValue = point[`m_${championId}`];
      const spread = 0.05 + Math.max(0, i - historyCutoffIndex) * 0.011;
      point.upper = !isHistory && typeof champValue === "number" ? Math.round(champValue * (1 + spread)) : null;
      point.lower = !isHistory && typeof champValue === "number" ? Math.round(champValue * (1 - spread)) : null;
    }
    out.push(point);
  }
  return out;
}

export const modelPalette: Record<string, string> = {
  ets: "var(--color-accent-blue)",
  arima: "#7c8ea3",
  sarima: "#8b6fb0",
  sarimax: "var(--color-primary)",
  prophet: "#c07a3e",
  croston: "#4f8f7b",
  sba: "#3f7f9d",
  tsb: "#9a6b8d",
  linreg: "#7f8c5a",
  xgboost: "var(--color-positive)",
  lightgbm: "#b08a2e",
  transformer: "#5f6f8f",
  foundation: "#a2606b",
  "last-period": "#9aa4ae",
  "moving-average": "#8d99a6",
  "seasonal-naive": "#6f7d8c",
};
