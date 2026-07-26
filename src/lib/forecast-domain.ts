/**
 * Domain definitions for data readiness, series quality scoring, candidate
 * model evaluation and demand-behaviour classification.
 *
 * Everything here is illustrative prototype data. No model is trained and no
 * customer data is processed.
 */

import { hashString, skus, type SkuRow } from "@/lib/demo-data";

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

// ------------------------------------------------------------------ fields
export type FieldTier = "mandatory" | "recommended" | "optional";

export type IngestField = {
  id: string;
  label: string;
  tier: FieldTier;
  type: "date" | "text" | "number" | "flag";
  example: string;
  purpose: string;
};

export const ingestFields: IngestField[] = [
  { id: "date", label: "Date", tier: "mandatory", type: "date", example: "2026-06-01", purpose: "Time bucket for the demand observation." },
  { id: "sku", label: "SKU / item code", tier: "mandatory", type: "text", example: "BRK-1180-A", purpose: "Forecast granularity key." },
  { id: "customer", label: "Customer / OEM", tier: "mandatory", type: "text", example: "Northvale Motors", purpose: "Demand stream owner." },
  { id: "plant", label: "Plant / location", tier: "mandatory", type: "text", example: "Plant 01 — Pune", purpose: "Supply point for the series." },
  { id: "customerDemand", label: "Customer demand", tier: "mandatory", type: "number", example: "1840", purpose: "Primary quantity that is forecast." },
  { id: "itemDescription", label: "Item description", tier: "recommended", type: "text", example: "Front brake caliper assembly", purpose: "Readability in review screens." },
  { id: "confirmedOrders", label: "Confirmed orders", tier: "recommended", type: "number", example: "1620", purpose: "Near-term firm signal for the horizon." },
  { id: "dispatchQty", label: "Dispatch quantity", tier: "recommended", type: "number", example: "1580", purpose: "Reconciles demand against fulfilment." },
  { id: "billingQty", label: "Billing quantity", tier: "recommended", type: "number", example: "1575", purpose: "Financial cross-check of demand." },
  { id: "availableInventory", label: "Available inventory", tier: "recommended", type: "number", example: "3120", purpose: "Cover and risk calculations." },
  { id: "stockoutFlag", label: "Stockout flag", tier: "recommended", type: "flag", example: "Y", purpose: "Detects censored (suppressed) demand." },
  { id: "productFamily", label: "Product family", tier: "recommended", type: "text", example: "Braking assemblies", purpose: "Grouping and hierarchical forecasting." },
  { id: "productionQty", label: "Production quantity", tier: "optional", type: "number", example: "1600", purpose: "Capacity feasibility context." },
  { id: "backlog", label: "Backlog", tier: "optional", type: "number", example: "120", purpose: "Carry-over demand identification." },
  { id: "lostDemand", label: "Lost demand", tier: "optional", type: "number", example: "45", purpose: "Uncensoring stockout periods." },
  { id: "leadTime", label: "Lead time (days)", tier: "optional", type: "number", example: "28", purpose: "Risk horizon and safety stock." },
  { id: "lifecycleStatus", label: "Lifecycle status", tier: "optional", type: "text", example: "Active", purpose: "New item / end-of-life handling." },
  { id: "promotionFlag", label: "Promotion / event flag", tier: "optional", type: "flag", example: "N", purpose: "Separates event effects from baseline." },
];

export const tierLabels: Record<FieldTier, string> = {
  mandatory: "Mandatory",
  recommended: "Recommended",
  optional: "Optional",
};

/** Column headers as they typically arrive from an ERP extract. */
export const sourceColumns = [
  "PERIOD_DT",
  "MATERIAL",
  "MATERIAL_DESC",
  "SOLD_TO_NAME",
  "PLANT_CODE",
  "DEMAND_QTY",
  "OPEN_ORDER_QTY",
  "DISPATCH_QTY",
  "BILLED_QTY",
  "PROD_QTY",
  "BACKLOG_QTY",
  "LOST_SALES_QTY",
  "STOCK_ON_HAND",
  "STOCKOUT_IND",
  "PLANNED_LT_DAYS",
  "PROD_FAMILY",
  "LIFECYCLE",
  "PROMO_IND",
];

/** Auto-detected mapping applied when a file is uploaded. */
export const autoMapping: Record<string, string> = {
  date: "PERIOD_DT",
  sku: "MATERIAL",
  itemDescription: "MATERIAL_DESC",
  customer: "SOLD_TO_NAME",
  plant: "PLANT_CODE",
  customerDemand: "DEMAND_QTY",
  confirmedOrders: "OPEN_ORDER_QTY",
  dispatchQty: "DISPATCH_QTY",
  billingQty: "BILLED_QTY",
  productionQty: "PROD_QTY",
  backlog: "BACKLOG_QTY",
  lostDemand: "LOST_SALES_QTY",
  availableInventory: "STOCK_ON_HAND",
  stockoutFlag: "STOCKOUT_IND",
  leadTime: "PLANNED_LT_DAYS",
  productFamily: "PROD_FAMILY",
  lifecycleStatus: "LIFECYCLE",
  promotionFlag: "PROMO_IND",
};

export type PreviewRow = Record<string, string>;

export const previewRows: PreviewRow[] = [
  { PERIOD_DT: "2026-04-01", MATERIAL: "BRK-1180-A", MATERIAL_DESC: "Front brake caliper assembly", SOLD_TO_NAME: "Northvale Motors", PLANT_CODE: "PUN01", DEMAND_QTY: "18240", OPEN_ORDER_QTY: "17980", DISPATCH_QTY: "18100", BILLED_QTY: "18050", PROD_QTY: "18300", BACKLOG_QTY: "140", LOST_SALES_QTY: "0", STOCK_ON_HAND: "4120", STOCKOUT_IND: "N", PLANNED_LT_DAYS: "24", PROD_FAMILY: "Braking assemblies", LIFECYCLE: "Active", PROMO_IND: "N" },
  { PERIOD_DT: "2026-05-01", MATERIAL: "BRK-1180-A", MATERIAL_DESC: "Front brake caliper assembly", SOLD_TO_NAME: "Northvale Motors", PLANT_CODE: "PUN01", DEMAND_QTY: "17410", OPEN_ORDER_QTY: "17220", DISPATCH_QTY: "16980", BILLED_QTY: "16940", PROD_QTY: "17050", BACKLOG_QTY: "430", LOST_SALES_QTY: "260", STOCK_ON_HAND: "980", STOCKOUT_IND: "Y", PLANNED_LT_DAYS: "24", PROD_FAMILY: "Braking assemblies", LIFECYCLE: "Active", PROMO_IND: "N" },
  { PERIOD_DT: "2026-06-01", MATERIAL: "BRK-1180-A", MATERIAL_DESC: "Front brake caliper assembly", SOLD_TO_NAME: "Northvale Motors", PLANT_CODE: "PUN01", DEMAND_QTY: "-120", OPEN_ORDER_QTY: "18240", DISPATCH_QTY: "18110", BILLED_QTY: "18090", PROD_QTY: "18200", BACKLOG_QTY: "0", LOST_SALES_QTY: "0", STOCK_ON_HAND: "5210", STOCKOUT_IND: "N", PLANNED_LT_DAYS: "24", PROD_FAMILY: "Braking assemblies", LIFECYCLE: "Active", PROMO_IND: "N" },
  { PERIOD_DT: "2026-06-01", MATERIAL: "HRN-6015-E", MATERIAL_DESC: "Battery cable set, EV pack", SOLD_TO_NAME: "Kestrel Automotive", PLANT_CODE: "GUJ03", DEMAND_QTY: "4380", OPEN_ORDER_QTY: "4290", DISPATCH_QTY: "4310", BILLED_QTY: "4300", PROD_QTY: "4400", BACKLOG_QTY: "70", LOST_SALES_QTY: "0", STOCK_ON_HAND: "610", STOCKOUT_IND: "N", PLANNED_LT_DAYS: "38", PROD_FAMILY: "", LIFECYCLE: "New", PROMO_IND: "N" },
  { PERIOD_DT: "31/06/2026", MATERIAL: "FLT-8100-A", MATERIAL_DESC: "Oil filter cartridge", SOLD_TO_NAME: "Aftermarket Distributors", PLANT_CODE: "DCBLR", DEMAND_QTY: "65400", OPEN_ORDER_QTY: "64100", DISPATCH_QTY: "64800", BILLED_QTY: "64750", PROD_QTY: "66000", BACKLOG_QTY: "0", LOST_SALES_QTY: "0", STOCK_ON_HAND: "18400", STOCKOUT_IND: "N", PLANNED_LT_DAYS: "12", PROD_FAMILY: "Filtration & consumables", LIFECYCLE: "Active", PROMO_IND: "Y" },
  { PERIOD_DT: "2026-06-01", MATERIAL: "TRN-4120-B", MATERIAL_DESC: "Synchroniser ring, 2nd gear", SOLD_TO_NAME: "Kestrel Automotive", PLANT_CODE: "CHE02", DEMAND_QTY: "41200", OPEN_ORDER_QTY: "7400", DISPATCH_QTY: "7380", BILLED_QTY: "7360", PROD_QTY: "7500", BACKLOG_QTY: "0", LOST_SALES_QTY: "0", STOCK_ON_HAND: "9600", STOCKOUT_IND: "N", PLANNED_LT_DAYS: "31", PROD_FAMILY: "Transmission components", LIFECYCLE: "Active", PROMO_IND: "N" },
  { PERIOD_DT: "2026-06-01", MATERIAL: "TRN-4120-B", MATERIAL_DESC: "Synchroniser ring, 2nd gear", SOLD_TO_NAME: "Kestrel Automotive", PLANT_CODE: "CHE02", DEMAND_QTY: "41200", OPEN_ORDER_QTY: "7400", DISPATCH_QTY: "7380", BILLED_QTY: "7360", PROD_QTY: "7500", BACKLOG_QTY: "0", LOST_SALES_QTY: "0", STOCK_ON_HAND: "9600", STOCKOUT_IND: "N", PLANNED_LT_DAYS: "31", PROD_FAMILY: "Transmission components", LIFECYCLE: "Active", PROMO_IND: "N" },
  { PERIOD_DT: "2026-06-01", MATERIAL: "SUS-7420-C", MATERIAL_DESC: "Coil spring, heavy duty", SOLD_TO_NAME: "Delta Bus Works", PLANT_CODE: "CHE02", DEMAND_QTY: "5400", OPEN_ORDER_QTY: "5320", DISPATCH_QTY: "5350", BILLED_QTY: "5340", PROD_QTY: "5500", BACKLOG_QTY: "0", LOST_SALES_QTY: "0", STOCK_ON_HAND: "2100", STOCKOUT_IND: "N", PLANNED_LT_DAYS: "26", PROD_FAMILY: "Suspension modules", LIFECYCLE: "Active", PROMO_IND: "N" },
];

export function buildTemplateCsv() {
  const header = ingestFields.map((f) => f.label).join(",");
  const tiers = ingestFields.map((f) => tierLabels[f.tier]).join(",");
  const example = ingestFields.map((f) => f.example).join(",");
  return `${header}\n${tiers}\n${example}\n`;
}

// ------------------------------------------------------------------ checks
export type CheckResult = "pass" | "warn" | "fail";

export type QualityCheck = {
  id: string;
  name: string;
  result: CheckResult;
  affectedSeries: number;
  affectedRecords: number;
  detail: string;
  action: string;
};

export const qualityChecks: QualityCheck[] = [
  { id: "qc-missing", name: "Missing periods", result: "warn", affectedSeries: 34, affectedRecords: 212, detail: "212 month buckets absent across 34 SKU-customer series.", action: "Flag as gap; zero-fill only after planner confirmation." },
  { id: "qc-dupe", name: "Duplicate records", result: "warn", affectedSeries: 11, affectedRecords: 148, detail: "148 rows share the same date, SKU, customer and plant key.", action: "Proposed de-duplication awaiting approval." },
  { id: "qc-date", name: "Invalid dates", result: "fail", affectedSeries: 6, affectedRecords: 27, detail: "27 rows contain unparseable or impossible dates (e.g. 31/06/2026).", action: "Rows quarantined; no silent correction applied." },
  { id: "qc-neg", name: "Negative quantities", result: "warn", affectedSeries: 9, affectedRecords: 63, detail: "63 negative demand rows, mostly customer returns.", action: "Proposed reclassification to returns, pending review." },
  { id: "qc-spike", name: "Abnormal spikes", result: "warn", affectedSeries: 18, affectedRecords: 41, detail: "41 observations exceed 4× the rolling median of their series.", action: "Proposed outlier capping, requires planner acceptance." },
  { id: "qc-stockout", name: "Stockout-distorted demand", result: "warn", affectedSeries: 22, affectedRecords: 96, detail: "96 periods where stockout flag was set and demand was censored.", action: "Uncensoring proposal generated from lost-demand field." },
  { id: "qc-onetime", name: "One-time exceptional orders", result: "warn", affectedSeries: 7, affectedRecords: 12, detail: "12 single large orders identified as non-repeating buys.", action: "Proposed exclusion from baseline training window." },
  { id: "qc-history", name: "Insufficient history", result: "fail", affectedSeries: 47, affectedRecords: 0, detail: "47 series have fewer than 12 observations.", action: "Routed to new-item / analogue forecasting, not automated." },
  { id: "qc-master", name: "Missing master data", result: "fail", affectedSeries: 29, affectedRecords: 87, detail: "87 rows without product family or lifecycle status.", action: "Blocked until master data is completed in MDM." },
];

// ------------------------------------------------------------------ series quality
export type ConfidenceClass =
  | "High confidence"
  | "Medium confidence"
  | "Low confidence"
  | "Not suitable for automated forecasting";

export type SeriesQuality = {
  key: string;
  sku: string;
  description: string;
  customer: string;
  plant: string;
  historyMonths: number;
  completeness: number;
  outliers: number;
  stockoutPeriods: number;
  score: number;
  confidence: ConfidenceClass;
  reason: string;
};

export function classifyConfidence(score: number): ConfidenceClass {
  if (score >= 85) return "High confidence";
  if (score >= 70) return "Medium confidence";
  if (score >= 55) return "Low confidence";
  return "Not suitable for automated forecasting";
}

export const confidenceTone: Record<ConfidenceClass, "positive" | "info" | "warning" | "risk"> = {
  "High confidence": "positive",
  "Medium confidence": "info",
  "Low confidence": "warning",
  "Not suitable for automated forecasting": "risk",
};

function qualityFor(row: SkuRow): SeriesQuality {
  const r = rng(`quality-${row.sku}-${row.customerId}`);
  const historyMonths =
    row.behaviour === "New item"
      ? Math.round(4 + r() * 7)
      : row.quality === "Low"
        ? Math.round(10 + r() * 16)
        : row.quality === "Medium"
          ? Math.round(24 + r() * 22)
          : 54;
  const completeness =
    Math.round(
      (row.quality === "High" ? 97.5 + r() * 2.5 : row.quality === "Medium" ? 92 + r() * 5 : 78 + r() * 12) * 10,
    ) / 10;
  const outliers = Math.round(r() * (row.quality === "Low" ? 11 : row.quality === "Medium" ? 6 : 2));
  const stockoutPeriods = Math.round(r() * (row.quality === "Low" ? 7 : row.quality === "Medium" ? 3 : 1));
  const raw =
    completeness * 0.5 +
    Math.min(historyMonths, 36) * 1.05 +
    (9 - outliers) * 1.1 -
    stockoutPeriods * 2.4 -
    (row.volatility === "High" ? 9 : row.volatility === "Medium" ? 4 : 0);
  const score = Math.max(28, Math.min(97, Math.round(raw)));

  const confidence = classifyConfidence(score);
  const reason =
    historyMonths < 12
      ? "Insufficient history for automated seasonal estimation."
      : stockoutPeriods > 3
        ? "Demand censored by repeated stockouts; requires uncensoring review."
        : outliers > 6
          ? "High outlier density from exceptional orders."
          : completeness < 93
            ? "Missing period buckets reduce statistical reliability."
            : "Clean, continuous history suitable for automated modelling.";
  return {
    key: `${row.sku}-${row.customerId}`,
    sku: row.sku,
    description: row.description,
    customer: row.customer,
    plant: row.plant,
    historyMonths,
    completeness,
    outliers,
    stockoutPeriods,
    score,
    confidence,
    reason,
  };
}

export const seriesQuality: SeriesQuality[] = skus.map(qualityFor);

export function qualityForSku(sku: string) {
  return seriesQuality.find((q) => q.sku === sku) ?? seriesQuality[0];
}

export function confidenceSummary(rows: SeriesQuality[]) {
  const counts: Record<ConfidenceClass, number> = {
    "High confidence": 0,
    "Medium confidence": 0,
    "Low confidence": 0,
    "Not suitable for automated forecasting": 0,
  };
  rows.forEach((r) => {
    counts[r.confidence] += 1;
  });
  return counts;
}

/** Scaled-up portfolio counts so the executive view reads like a real estate. */
export const seriesScaleFactor = 82;

// ------------------------------------------------------------------ transformations
export type TransformationEntry = {
  id: string;
  series: string;
  period: string;
  rule: string;
  reason: string;
  originalValue: string;
  adjustedValue: string;
  actor: string;
  timestamp: string;
  status: "Proposed" | "Applied" | "Reverted";
};

export const seedTransformations: TransformationEntry[] = [
  { id: "tr-1", series: "BRK-1180-A · Northvale · PUN01", period: "Jun 2026", rule: "Negative quantity reclassification", reason: "Negative demand row identified as a customer return, not demand.", originalValue: "-120", adjustedValue: "0 (return flagged)", actor: "System · validation engine", timestamp: "24 Jul 2026, 06:14", status: "Proposed" },
  { id: "tr-2", series: "BRK-1180-A · Northvale · PUN01", period: "May 2026", rule: "Stockout uncensoring", reason: "Stockout flag set with 260 units lost demand recorded.", originalValue: "17,410", adjustedValue: "17,670", actor: "System · validation engine", timestamp: "24 Jul 2026, 06:14", status: "Applied" },
  { id: "tr-3", series: "TRN-4120-B · Kestrel · CHE02", period: "Jun 2026", rule: "Outlier capping (4× median)", reason: "One-time exceptional order of 41,200 units against median 7,400.", originalValue: "41,200", adjustedValue: "9,620", actor: "R. Iyer · Demand planning", timestamp: "24 Jul 2026, 09:38", status: "Applied" },
  { id: "tr-4", series: "TRN-4120-B · Kestrel · CHE02", period: "Jun 2026", rule: "Duplicate record removal", reason: "Identical date/SKU/customer/plant key loaded twice by the extract.", originalValue: "2 records", adjustedValue: "1 record", actor: "System · validation engine", timestamp: "24 Jul 2026, 06:15", status: "Proposed" },
  { id: "tr-5", series: "FLT-8100-A · Aftermarket · DCBLR", period: "Jun 2026", rule: "Invalid date quarantine", reason: "Date 31/06/2026 does not exist; row held out of the training window.", originalValue: "31/06/2026", adjustedValue: "Quarantined", actor: "System · validation engine", timestamp: "24 Jul 2026, 06:15", status: "Applied" },
  { id: "tr-6", series: "HRN-6015-E · Kestrel · GUJ03", period: "All periods", rule: "Master data gap", reason: "Product family missing; hierarchical forecasting disabled for this series.", originalValue: "(blank)", adjustedValue: "No change applied", actor: "System · validation engine", timestamp: "24 Jul 2026, 06:16", status: "Proposed" },
];

// ------------------------------------------------------------------ models
export type CandidateModel = {
  id: string;
  name: string;
  family: string;
  wape: number;
  mase: number;
  smape: number;
  bias: number;
  stability: number;
  confidence: "High" | "Medium" | "Low";
  training: "Trained" | "Training" | "Queued" | "Failed";
  rationale: string;
  bestFor: string;
};

export const candidateModels: CandidateModel[] = [
  { id: "cm-snaive", name: "Seasonal naïve", family: "Baseline benchmark", wape: 17.8, mase: 1.32, smape: 19.4, bias: 2.6, stability: 61, confidence: "Low", training: "Trained", rationale: "Retained only as the accuracy floor every candidate must beat.", bestFor: "Benchmark reference" },
  { id: "cm-ma", name: "Moving average", family: "Baseline benchmark", wape: 15.9, mase: 1.18, smape: 17.1, bias: 1.4, stability: 66, confidence: "Low", training: "Trained", rationale: "Stable but lags turning points in the OEM schedule signal.", bestFor: "Flat, low-volatility series" },
  { id: "cm-ets", name: "ETS (exponential smoothing)", family: "Statistical", wape: 11.4, mase: 0.92, smape: 12.6, bias: 1.9, stability: 78, confidence: "Medium", training: "Trained", rationale: "Good on smooth seasonal series; weaker where events dominate.", bestFor: "Smooth, seasonal" },
  { id: "cm-sarima", name: "ARIMA / SARIMA", family: "Statistical", wape: 9.6, mase: 0.81, smape: 10.4, bias: -0.4, stability: 84, confidence: "High", training: "Trained", rationale: "Strong autocorrelation fit; runner-up on rolling-backtest stability.", bestFor: "Seasonal with strong lag structure" },
  { id: "cm-prophet", name: "Prophet", family: "Statistical", wape: 10.8, mase: 0.88, smape: 11.9, bias: 3.4, stability: 74, confidence: "Medium", training: "Trained", rationale: "Handles shutdowns and holidays, but bias exceeds the ±2% tolerance.", bestFor: "Calendar and holiday effects" },
  { id: "cm-croston", name: "Croston / SBA / TSB", family: "Intermittent", wape: 16.4, mase: 0.94, smape: 21.2, bias: -5.8, stability: 69, confidence: "Medium", training: "Trained", rationale: "Selected only for intermittent and lumpy series where MASE is the deciding metric.", bestFor: "Intermittent, lumpy spares" },
  { id: "cm-reg", name: "Regression (driver-based)", family: "Machine learning", wape: 10.1, mase: 0.86, smape: 11.2, bias: 0.9, stability: 80, confidence: "Medium", training: "Trained", rationale: "Interpretable driver coefficients; used where explainability outranks accuracy.", bestFor: "Price and driver sensitivity" },
  { id: "cm-xgb", name: "XGBoost", family: "Machine learning", wape: 6.8, mase: 0.64, smape: 7.6, bias: -1.2, stability: 91, confidence: "High", training: "Trained", rationale: "Best rolling-backtest stability with bias inside tolerance — selected as champion.", bestFor: "High-volume OEM schedules" },
  { id: "cm-lgbm", name: "LightGBM", family: "Machine learning", wape: 7.1, mase: 0.66, smape: 7.9, bias: -1.6, stability: 88, confidence: "High", training: "Trained", rationale: "Statistically indistinguishable from the champion; held as the fallback model.", bestFor: "Large SKU portfolios" },
  { id: "cm-tsfm", name: "Time-series foundation model", family: "Challenger", wape: 7.4, mase: 0.69, smape: 8.2, bias: 0.6, stability: 83, confidence: "Medium", training: "Training", rationale: "Zero-shot challenger under evaluation; not eligible for selection until 3 stable cycles.", bestFor: "Cold-start and sparse-history items" },
];

export const selectionPolicy = [
  "Primary ranking metric: WAPE, volume-weighted so high-value SKUs dominate the decision.",
  "Scale-free cross-check: MASE must be below 1.0, i.e. the model must beat the seasonal naïve benchmark.",
  "Symmetry check: sMAPE is reviewed so low-volume periods cannot be gamed by asymmetric errors.",
  "Bias gate: absolute bias must stay within ±2% over the backtest window.",
  "Stability gate: rolling-backtest stability must be at least 75 across all folds.",
  "MAPE alone is never used for selection — it is undefined at zero demand and penalises under-forecast asymmetrically.",
];

export function isEligible(model: CandidateModel) {
  return model.training === "Trained" && model.mase < 1 && Math.abs(model.bias) <= 2 && model.stability >= 75;
}

export const championModelId = "cm-xgb";

// ------------------------------------------------------------------ behaviour
export type BehaviourClass = {
  id: string;
  name: string;
  seriesShare: number;
  seriesCount: number;
  recommended: string;
  signature: string;
};

const behaviourClassBase: Array<Omit<BehaviourClass, "seriesShare" | "seriesCount">> = [
  { id: "bc-smooth", name: "Smooth", recommended: "ETS / XGBoost", signature: "Low CV², stable inter-demand interval." },
  { id: "bc-seasonal", name: "Seasonal", recommended: "SARIMA / Prophet", signature: "Significant 12-month autocorrelation peak." },
  { id: "bc-trending", name: "Trending", recommended: "ETS with damped trend", signature: "Monotonic drift over 18+ months." },
  { id: "bc-intermittent", name: "Intermittent", recommended: "Croston / SBA", signature: "Zero demand in more than 35% of buckets." },
  { id: "bc-erratic", name: "Erratic", recommended: "TSB / regression", signature: "High CV² with regular demand occurrence." },
  { id: "bc-lumpy", name: "Lumpy", recommended: "TSB with review", signature: "Sparse occurrence and high size variability." },
  { id: "bc-new", name: "New item", recommended: "Analogue / foundation model", signature: "Fewer than 12 observations." },
  { id: "bc-eol", name: "End-of-life", recommended: "Managed run-down curve", signature: "Declining trend with phase-out date set." },
  { id: "bc-sched", name: "Customer-schedule-driven", recommended: "Regression on EDI schedule", signature: "Demand explained by 830/862 releases." },
  { id: "bc-event", name: "Event-driven", recommended: "Baseline + event uplift", signature: "Variance concentrated around campaign windows." },
];

export const behaviourClasses: BehaviourClass[] = behaviourClassBase.map((base) => {
  const seriesCount = skus.filter((s) => s.behaviour === base.name).length;
  return {
    ...base,
    seriesCount,
    seriesShare: Math.round((seriesCount / skus.length) * 1000) / 10,
  };
});


export function behaviourForSku(sku: string) {
  const row = skus.find((s) => s.sku === sku);
  return behaviourClasses.find((b) => b.name === row?.behaviour) ?? behaviourClasses[0];
}

/** Live counts of the 500 generated series by demand-behaviour class. */
export const behaviourCounts: Record<string, number> = skus.reduce<Record<string, number>>((acc, row) => {
  acc[row.behaviour] = (acc[row.behaviour] ?? 0) + 1;
  return acc;
}, {});

export const qualityTierCounts = skus.reduce(
  (acc, row) => {
    acc[row.quality] += 1;
    return acc;
  },
  { High: 0, Medium: 0, Low: 0 } as Record<"High" | "Medium" | "Low", number>,
);


export const rollingBacktest = [
  { fold: "Fold 1", xgboost: 7.2, lightgbm: 7.6, sarima: 10.1, croston: 16.9, foundation: 8.4 },
  { fold: "Fold 2", xgboost: 6.6, lightgbm: 7.0, sarima: 9.4, croston: 16.1, foundation: 7.2 },
  { fold: "Fold 3", xgboost: 6.9, lightgbm: 6.8, sarima: 9.9, croston: 15.8, foundation: 7.9 },
  { fold: "Fold 4", xgboost: 6.4, lightgbm: 7.2, sarima: 8.8, croston: 16.6, foundation: 6.8 },
  { fold: "Fold 5", xgboost: 6.9, lightgbm: 7.1, sarima: 9.7, croston: 16.4, foundation: 7.1 },
];

// ------------------------------------------------------------------ overview
export const accuracyByFamily = [
  { family: "Braking", baseline: 86.4, approved: 90.2 },
  { family: "Transmission", baseline: 88.1, approved: 91.4 },
  { family: "Harnesses", baseline: 79.6, approved: 85.8 },
  { family: "Suspension", baseline: 84.2, approved: 87.1 },
  { family: "Filtration", baseline: 90.8, approved: 92.6 },
];

export const riskDistribution = [
  { bucket: "< 7 days cover", stockout: 18, excess: 0 },
  { bucket: "7–15 days", stockout: 34, excess: 0 },
  { bucket: "15–30 days", stockout: 12, excess: 0 },
  { bucket: "45–60 days", stockout: 0, excess: 26 },
  { bucket: "60–90 days", stockout: 0, excess: 31 },
  { bucket: "> 90 days", stockout: 0, excess: 14 },
];

export type ExceptionRow = {
  id: string;
  sku: string;
  scope: string;
  exception: string;
  metric: string;
  severity: "High" | "Medium" | "Low";
  owner: string;
};

export const forecastExceptions: ExceptionRow[] = [
  { id: "ex-1", sku: "HRN-6015-E", scope: "Sanand · Kestrel Automotive", exception: "New programme without history", metric: "Data quality 46 / 100", severity: "High", owner: "Programme management" },
  { id: "ex-2", sku: "BRK-1180-A", scope: "Pune · Northvale Motors", exception: "Persistent under-forecast bias", metric: "Bias -6.1% (3 cycles)", severity: "High", owner: "R. Iyer" },
  { id: "ex-3", sku: "TRN-4120-B", scope: "Chennai · Kestrel Automotive", exception: "One-time order distorting baseline", metric: "Outlier 5.6× median", severity: "High", owner: "A. Fernandes" },
  { id: "ex-4", sku: "FLT-8100-A", scope: "DC South · Aftermarket", exception: "Campaign uplift not yet approved", metric: "Event impact +14%", severity: "Medium", owner: "N. Bose" },
  { id: "ex-5", sku: "SUS-7188-B", scope: "Pune · Delta Bus Works", exception: "Excess cover on slow mover", metric: "74 days cover", severity: "Medium", owner: "K. Shah" },
  { id: "ex-6", sku: "HRN-5240-C", scope: "Sanand · Meridian Vehicles", exception: "Stockout-censored history", metric: "5 censored periods", severity: "Medium", owner: "P. Rao" },
  { id: "ex-7", sku: "BRK-2290-B", scope: "DC North · Aftermarket", exception: "Model challenger outperforming champion", metric: "WAPE gap 1.8 pts", severity: "Low", owner: "Data science" },
];

export type ApprovedAdjustment = {
  id: string;
  scope: string;
  change: string;
  driver: string;
  approver: string;
  at: string;
};

export const approvedAdjustments: ApprovedAdjustment[] = [
  { id: "aa-1", scope: "Wiring harnesses · Sanand", change: "+4,100 units", driver: "EV platform ramp-up event", approver: "Demand review board", at: "24 Jul 2026, 11:20" },
  { id: "aa-2", scope: "Transmission · Chennai", change: "-3,500 units", driver: "Line requalification shutdown", approver: "A. Fernandes", at: "24 Jul 2026, 10:52" },
  { id: "aa-3", scope: "Braking · Kestrel", change: "-7,900 units", driver: "Model-year changeover pause", approver: "R. Iyer", at: "23 Jul 2026, 17:40" },
  { id: "aa-4", scope: "Filtration · DC North", change: "+2,300 units", driver: "Monsoon service campaign, phase 1", approver: "N. Bose", at: "23 Jul 2026, 15:05" },
  { id: "aa-5", scope: "Suspension · Delta Bus Works", change: "No change", driver: "Statistical baseline accepted", approver: "K. Shah", at: "23 Jul 2026, 12:30" },
];

export const dataQualitySummary = [
  { label: "Records ingested this cycle", value: "5.52 m" },
  { label: "Series passing all mandatory checks", value: "1,043" },
  { label: "Series with open warnings", value: "196" },
  { label: "Series blocked by failed checks", value: "73" },
  { label: "Transformations awaiting approval", value: "3" },
  { label: "Master data gaps open", value: "29" },
];
