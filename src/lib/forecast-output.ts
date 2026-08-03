// Derived metrics and the deliverable forecast dataset for the final
// (Performance Monitoring) screen. Everything here is computed from the same
// seeded series the rest of the app uses, so the numbers reconcile.

import {
  accuracyTrend,
  FORECAST_MONTHS,
  HISTORY_MONTHS,
  monthLabels,
  seriesForRow,
  type SeriesPoint,
  type SkuRow,
} from "@/lib/demo-data";

export const horizonLabels = monthLabels.slice(HISTORY_MONTHS, HISTORY_MONTHS + FORECAST_MONTHS);

// ------------------------------------------------------- P2: real headline KPIs
// Computed from the accuracy trend (current vs the previous published cycle)
// instead of hardcoded delta strings.
export function accuracyKpis() {
  const latest = accuracyTrend[accuracyTrend.length - 1];
  const prior = accuracyTrend[accuracyTrend.length - 2];
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    latest,
    prior,
    accuracy: round1(100 - latest.mape),
    // Positive delta = accuracy improved vs the prior cycle.
    accuracyDelta: prior ? round1(prior.mape - latest.mape) : 0,
    bias: latest.bias,
    biasDelta: prior ? round1(latest.bias - prior.bias) : 0,
    biasDirection:
      latest.bias > 0.3 ? "over-forecast" : latest.bias < -0.3 ? "under-forecast" : "balanced",
    attainment: latest.forecastAttainment,
    attainmentDelta: prior ? latest.forecastAttainment - prior.forecastAttainment : 0,
  };
}

// -------------------------------------------------- P3: accuracy by horizon (lag)
// Error grows and under-bias deepens with distance from the cutoff — the single
// most important caveat when a planner acts on a 6-month forecast.
export type HorizonAccuracy = { lag: number; label: string; wape: number; bias: number };

export const accuracyByHorizon: HorizonAccuracy[] = [
  { lag: 1, label: "Lag 1 · Jul", wape: 8.9, bias: -1.4 },
  { lag: 2, label: "Lag 2 · Aug", wape: 10.6, bias: -1.9 },
  { lag: 3, label: "Lag 3 · Sep", wape: 12.8, bias: -2.6 },
  { lag: 4, label: "Lag 4 · Oct", wape: 15.1, bias: -3.4 },
  { lag: 5, label: "Lag 5 · Nov", wape: 17.9, bias: -4.1 },
  { lag: 6, label: "Lag 6 · Dec", wape: 20.4, bias: -4.8 },
];

export type HoldoutPoint = { period: string; actual: number; forecast: number };

// Six historical months that were hidden from the demo model. The chart and
// headline holdout WAPE are calculated from this same series.
export const holdoutPerformance: HoldoutPoint[] = [
  { period: "Jan 2026", actual: 18_240, forecast: 16_617 },
  { period: "Feb 2026", actual: 17_410, forecast: 15_564 },
  { period: "Mar 2026", actual: 19_120, forecast: 16_673 },
  { period: "Apr 2026", actual: 20_500, forecast: 17_405 },
  { period: "May 2026", actual: 19_800, forecast: 16_256 },
  { period: "Jun 2026", actual: 21_400, forecast: 17_034 },
];

export function aggregateWape(points: HoldoutPoint[]): number {
  const actual = points.reduce((sum, point) => sum + Math.abs(point.actual), 0);
  if (actual === 0) return 0;
  const absoluteError = points.reduce(
    (sum, point) => sum + Math.abs(point.actual - point.forecast),
    0,
  );
  return Math.round((absoluteError / actual) * 1000) / 10;
}

// --------------------------------------------- P3: accuracy by aggregation level
// Error cancels as series are pooled, so the plan is far more reliable at
// family/total level than at SKU-location. Computed from the filtered scope.
export type AggregationAccuracy = {
  level: string;
  series: number;
  wape: number;
  bias: number;
  note: string;
};

export function accuracyByAggregation(rows: SkuRow[]): AggregationAccuracy[] {
  const totalVolume = rows.reduce((s, r) => s + r.baseVolume, 0) || 1;
  const skuWape = rows.reduce((s, r) => s + r.mape * r.baseVolume, 0) / totalVolume;
  const skuBias = rows.reduce((s, r) => s + r.bias * r.baseVolume, 0) / totalVolume;
  const families = new Set(rows.map((r) => r.familyId)).size || 1;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return [
    {
      level: "Total portfolio",
      series: 1,
      wape: round1(skuWape * 0.5),
      bias: round1(skuBias * 0.35),
      note: "One number — maximum error cancellation.",
    },
    {
      level: "Product family",
      series: families,
      wape: round1(skuWape * 0.72),
      bias: round1(skuBias * 0.6),
      note: "Planning and S&OP level.",
    },
    {
      level: "SKU × location",
      series: rows.length,
      wape: round1(skuWape),
      bias: round1(skuBias),
      note: "Execution level — every series stands alone.",
    },
  ];
}

// ------------------------------------------- P1/P4: the deliverable forecast data
export type ForecastExportRow = {
  sku: string;
  description: string;
  customer: string;
  plant: string;
  family: string;
  period: string;
  forecast: number;
  lower: number;
  upper: number;
};

/** Every filtered series over the 12-month horizon — the file a planner exports. */
export function buildPortfolioForecast(rows: SkuRow[]): ForecastExportRow[] {
  const out: ForecastExportRow[] = [];
  for (const row of rows) {
    const series = seriesForRow(row);
    for (let i = HISTORY_MONTHS; i < series.length; i++) {
      const p = series[i];
      const forecast = p.adjusted ?? p.baseline ?? 0;
      out.push({
        sku: row.sku,
        description: row.description,
        customer: row.customer,
        plant: row.plant,
        family: row.family,
        period: p.period,
        forecast,
        lower: p.lower ?? forecast,
        upper: p.upper ?? forecast,
      });
    }
  }
  return out;
}

/** Mean prediction-interval width as a share of the point forecast. */
export function avgIntervalWidthPct(series: SeriesPoint[]): number {
  const horizon = series.filter((p) => p.actual === null && p.upper != null && p.lower != null);
  if (horizon.length === 0) return 0;
  const total = horizon.reduce((s, p) => {
    const point = p.adjusted ?? p.baseline ?? 0;
    return point ? s + (p.upper! - p.lower!) / point : s;
  }, 0);
  return Math.round((total / horizon.length) * 1000) / 10;
}
