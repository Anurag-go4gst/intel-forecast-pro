/**
 * Seeded demonstration data for the Demand Intelligence & Forecasting Platform.
 * All values are fictional and anonymised. Nothing here trains or runs a real
 * ML model — series are generated deterministically to look realistic.
 */

// ---------------------------------------------------------------- seeded RNG
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---------------------------------------------------------------- dimensions
export const businessUnits = [
  { id: "all", label: "All business units" },
  { id: "bu-pt", label: "Powertrain Systems" },
  { id: "bu-bd", label: "Body & Chassis" },
  { id: "bu-el", label: "Electrical & Electronics" },
  { id: "bu-as", label: "Aftermarket & Spares" },
];

export const customers = [
  { id: "all", label: "All customers / OEMs" },
  { id: "cus-nv", label: "Northvale Motors (OEM)" },
  { id: "cus-ka", label: "Kestrel Automotive (OEM)" },
  { id: "cus-mv", label: "Meridian Vehicles (OEM)" },
  { id: "cus-db", label: "Delta Bus Works (OEM)" },
  { id: "cus-ad", label: "Aftermarket Distributors" },
];

export const productFamilies = [
  { id: "all", label: "All product families" },
  { id: "pf-brk", label: "Braking assemblies" },
  { id: "pf-trn", label: "Transmission components" },
  { id: "pf-hrn", label: "Wiring harnesses" },
  { id: "pf-sus", label: "Suspension modules" },
  { id: "pf-flt", label: "Filtration & consumables" },
];

export const plants = [
  { id: "all", label: "All plants / locations" },
  { id: "pl-pun", label: "Plant 01 — Pune" },
  { id: "pl-che", label: "Plant 02 — Chennai" },
  { id: "pl-guj", label: "Plant 03 — Sanand" },
  { id: "dc-del", label: "DC North — Delhi NCR" },
  { id: "dc-blr", label: "DC South — Bengaluru" },
];

export const periods = [
  { id: "p-2026q3", label: "Jul – Sep 2026 (Q3)" },
  { id: "p-2026q4", label: "Oct – Dec 2026 (Q4)" },
  { id: "p-2026h2", label: "Jul – Dec 2026 (H2)" },
  { id: "p-r12", label: "Rolling 12 months" },
];

export const forecastVersions = [
  { id: "v-2026-07-wip", label: "V2026.07 — Working draft", status: "draft" as const },
  { id: "v-2026-06-pub", label: "V2026.06 — Published", status: "published" as const },
  { id: "v-2026-05-pub", label: "V2026.05 — Published", status: "published" as const },
];

export type SkuRow = {
  sku: string;
  description: string;
  family: string;
  familyId: string;
  customerId: string;
  customer: string;
  plantId: string;
  plant: string;
  buId: string;
  abc: "A" | "B" | "C";
  baseVolume: number;
  bestModel: string;
  mape: number;
  bias: number;
  stockCoverDays: number;
  onHand: number;
  leadTimeDays: number;
  volatility: "Low" | "Medium" | "High";
};

const skuSeeds: Array<[string, string, string, string, string, string, "A" | "B" | "C", number]> = [
  ["BRK-1180-A", "Front brake caliper assembly", "pf-brk", "cus-nv", "pl-pun", "bu-bd", "A", 18400],
  ["BRK-1204-C", "Rear brake disc, ventilated", "pf-brk", "cus-ka", "pl-pun", "bu-bd", "A", 15250],
  ["BRK-2290-B", "Brake pad set, ceramic", "pf-brk", "cus-ad", "dc-del", "bu-as", "B", 42800],
  ["TRN-3311-A", "Gear shift fork, 6-speed", "pf-trn", "cus-nv", "pl-che", "bu-pt", "A", 9600],
  ["TRN-3480-D", "Clutch release bearing", "pf-trn", "cus-mv", "pl-che", "bu-pt", "B", 21400],
  ["TRN-4120-B", "Synchroniser ring, 2nd gear", "pf-trn", "cus-ka", "pl-che", "bu-pt", "C", 7350],
  ["HRN-5102-A", "Main body wiring harness", "pf-hrn", "cus-nv", "pl-guj", "bu-el", "A", 6120],
  ["HRN-5240-C", "Door harness, LH", "pf-hrn", "cus-mv", "pl-guj", "bu-el", "B", 11800],
  ["HRN-6015-E", "Battery cable set, EV pack", "pf-hrn", "cus-ka", "pl-guj", "bu-el", "A", 4380],
  ["SUS-7001-A", "Front strut module", "pf-sus", "cus-mv", "pl-pun", "bu-bd", "A", 8250],
  ["SUS-7188-B", "Stabiliser link, rear", "pf-sus", "cus-db", "pl-pun", "bu-bd", "C", 13900],
  ["SUS-7420-C", "Coil spring, heavy duty", "pf-sus", "cus-db", "pl-che", "bu-bd", "B", 5400],
  ["FLT-8100-A", "Oil filter cartridge", "pf-flt", "cus-ad", "dc-blr", "bu-as", "A", 65400],
  ["FLT-8214-B", "Cabin air filter, activated", "pf-flt", "cus-ad", "dc-del", "bu-as", "B", 38700],
  ["FLT-8355-C", "Fuel filter assembly", "pf-flt", "cus-ad", "dc-blr", "bu-as", "C", 19200],
  ["BRK-1450-D", "Brake master cylinder", "pf-brk", "cus-db", "pl-che", "bu-bd", "B", 4750],
];

const modelNames = [
  "Gradient Boosted Trees",
  "SARIMA",
  "Prophet-style Additive",
  "LSTM Sequence",
  "Croston (Intermittent)",
  "Holt-Winters",
];

export const skus: SkuRow[] = skuSeeds.map(
  ([sku, description, familyId, customerId, plantId, buId, abc, baseVolume]) => {
    const rand = mulberry32(hashString(sku));
    const mape = Math.round((4 + rand() * 16) * 10) / 10;
    const bias = Math.round((rand() * 14 - 7) * 10) / 10;
    return {
      sku,
      description,
      familyId,
      family: productFamilies.find((f) => f.id === familyId)!.label,
      customerId,
      customer: customers.find((c) => c.id === customerId)!.label,
      plantId,
      plant: plants.find((p) => p.id === plantId)!.label,
      buId,
      abc,
      baseVolume,
      bestModel: modelNames[Math.floor(rand() * modelNames.length)],
      mape,
      bias,
      stockCoverDays: Math.round(6 + rand() * 52),
      onHand: Math.round(baseVolume * (0.15 + rand() * 0.5)),
      leadTimeDays: Math.round(12 + rand() * 45),
      volatility: mape > 14 ? "High" : mape > 9 ? "Medium" : "Low",
    };
  },
);

// ---------------------------------------------------------------- filters
export type Filters = {
  bu: string;
  customer: string;
  family: string;
  sku: string;
  plant: string;
  period: string;
  version: string;
};

export const defaultFilters: Filters = {
  bu: "all",
  customer: "all",
  family: "all",
  sku: "all",
  plant: "all",
  period: "p-2026q3",
  version: "v-2026-07-wip",
};

export function filterSkus(filters: Filters): SkuRow[] {
  return skus.filter(
    (s) =>
      (filters.bu === "all" || s.buId === filters.bu) &&
      (filters.customer === "all" || s.customerId === filters.customer) &&
      (filters.family === "all" || s.familyId === filters.family) &&
      (filters.plant === "all" || s.plantId === filters.plant) &&
      (filters.sku === "all" || s.sku === filters.sku),
  );
}

// ---------------------------------------------------------------- time series
export type SeriesPoint = {
  period: string;
  actual: number | null;
  baseline: number | null;
  adjusted: number | null;
  upper: number | null;
  lower: number | null;
};

const monthLabels = [
  "Aug 25",
  "Sep 25",
  "Oct 25",
  "Nov 25",
  "Dec 25",
  "Jan 26",
  "Feb 26",
  "Mar 26",
  "Apr 26",
  "May 26",
  "Jun 26",
  "Jul 26",
  "Aug 26",
  "Sep 26",
  "Oct 26",
  "Nov 26",
  "Dec 26",
];

/** History ends after Jun 26; Jul 26 onwards is forecast horizon. */
export const historyCutoffIndex = 11;

export function buildSeries(seedKey: string, base: number, uplift = 0): SeriesPoint[] {
  const rand = mulberry32(hashString(seedKey));
  const trend = 0.004 + rand() * 0.01;
  const noiseScale = 0.05 + rand() * 0.07;
  return monthLabels.map((label, i) => {
    const seasonal = 1 + 0.11 * Math.sin((i / 12) * Math.PI * 2 + rand() * 0.4);
    const level = base * (1 + trend * i) * seasonal;
    const noise = 1 + (rand() - 0.5) * noiseScale;
    const isHistory = i <= historyCutoffIndex;
    const actual = isHistory ? Math.round(level * noise) : null;
    const baseline = Math.round(level * (isHistory ? 1 - noiseScale * 0.2 : 1));
    const spread = 0.06 + (i - historyCutoffIndex) * 0.012;
    return {
      period: label,
      actual,
      baseline: i >= historyCutoffIndex ? baseline : null,
      adjusted: i >= historyCutoffIndex ? Math.round(baseline * (1 + uplift)) : null,
      upper: i >= historyCutoffIndex ? Math.round(baseline * (1 + Math.max(spread, 0.06))) : null,
      lower: i >= historyCutoffIndex ? Math.round(baseline * (1 - Math.max(spread, 0.06))) : null,
    };
  });
}

export function aggregateSeries(rows: SkuRow[], uplift = 0): SeriesPoint[] {
  const total = rows.reduce((sum, r) => sum + r.baseVolume, 0) || 1;
  const key = rows.map((r) => r.sku).join("|") || "empty";
  return buildSeries(key, total / 1.6, uplift);
}

// ---------------------------------------------------------------- data readiness
export type DataSource = {
  id: string;
  name: string;
  system: string;
  records: number;
  lastLoad: string;
  coverageMonths: number;
  completeness: number;
  status: "ready" | "attention" | "blocked";
  issues: string[];
};

export const dataSources: DataSource[] = [
  {
    id: "ds-sales",
    name: "Historical sales & dispatch",
    system: "ERP · SD module extract",
    records: 4128740,
    lastLoad: "24 Jul 2026, 02:15",
    coverageMonths: 48,
    completeness: 99.2,
    status: "ready",
    issues: [],
  },
  {
    id: "ds-orders",
    name: "Customer schedules & open orders",
    system: "EDI · 830 / 862 feeds",
    records: 268410,
    lastLoad: "24 Jul 2026, 05:40",
    coverageMonths: 18,
    completeness: 96.4,
    status: "attention",
    issues: ["412 schedule lines missing requested delivery date", "2 OEM feeds delayed by 9 hours"],
  },
  {
    id: "ds-inv",
    name: "Inventory & stock ledger",
    system: "WMS · nightly snapshot",
    records: 812300,
    lastLoad: "24 Jul 2026, 01:05",
    coverageMonths: 36,
    completeness: 98.7,
    status: "ready",
    issues: [],
  },
  {
    id: "ds-master",
    name: "SKU & customer master",
    system: "MDM · governed master",
    records: 41280,
    lastLoad: "23 Jul 2026, 21:30",
    coverageMonths: 60,
    completeness: 91.8,
    status: "attention",
    issues: ["87 SKUs without product family mapping", "19 duplicate customer ship-to records"],
  },
  {
    id: "ds-promo",
    name: "Price, promotion & campaign log",
    system: "Manual upload · planner maintained",
    records: 3140,
    lastLoad: "18 Jul 2026, 16:20",
    coverageMonths: 24,
    completeness: 74.5,
    status: "blocked",
    issues: [
      "No entries loaded for Q3 2026 aftermarket campaigns",
      "Discount percentage column contains 214 non-numeric values",
    ],
  },
  {
    id: "ds-ext",
    name: "External indicators",
    system: "API · vehicle registrations, fuel index",
    records: 96500,
    lastLoad: "24 Jul 2026, 03:55",
    coverageMonths: 72,
    completeness: 100,
    status: "ready",
    issues: [],
  },
];

export const validationChecks = [
  { id: "vc1", check: "Mandatory columns present", scope: "All sources", result: "pass", detail: "38 / 38 required fields mapped" },
  { id: "vc2", check: "Date continuity in demand history", scope: "Sales & dispatch", result: "pass", detail: "No missing month buckets over 48 months" },
  { id: "vc3", check: "Negative or zero quantity outliers", scope: "Sales & dispatch", result: "warn", detail: "1,204 returns rows treated as negative demand" },
  { id: "vc4", check: "SKU referential integrity", scope: "Master data", result: "warn", detail: "87 SKUs unmapped to a product family" },
  { id: "vc5", check: "Duplicate transaction detection", scope: "Sales & dispatch", result: "pass", detail: "0.02% duplicates removed automatically" },
  { id: "vc6", check: "Unit of measure consistency", scope: "Inventory", result: "pass", detail: "All quantities normalised to EA" },
  { id: "vc7", check: "Promotion log completeness", scope: "Promotion log", result: "fail", detail: "Q3 2026 campaign rows absent — event input required" },
  { id: "vc8", check: "Intermittent demand classification", scope: "All SKUs", result: "warn", detail: "312 slow movers routed to intermittent models" },
] as const;

// ---------------------------------------------------------------- models
export type ModelRow = {
  id: string;
  name: string;
  family: string;
  mape: number;
  wape: number;
  bias: number;
  mae: number;
  trainingWindow: string;
  bestFor: string;
  runtime: string;
  skusWon: number;
};

export const models: ModelRow[] = [
  { id: "m-gbt", name: "Gradient Boosted Trees", family: "Machine learning", mape: 7.4, wape: 6.8, bias: -1.2, mae: 412, trainingWindow: "36 months", bestFor: "High-volume OEM schedules with driver data", runtime: "4m 12s", skusWon: 5 },
  { id: "m-lstm", name: "LSTM Sequence", family: "Deep learning", mape: 8.1, wape: 7.6, bias: 2.1, mae: 448, trainingWindow: "48 months", bestFor: "Long seasonal cycles, multi-SKU shared signal", runtime: "11m 38s", skusWon: 3 },
  { id: "m-sarima", name: "SARIMA", family: "Statistical", mape: 9.6, wape: 9.1, bias: -0.4, mae: 505, trainingWindow: "36 months", bestFor: "Stable seasonal demand, strong autocorrelation", runtime: "1m 24s", skusWon: 3 },
  { id: "m-prophet", name: "Prophet-style Additive", family: "Statistical", mape: 10.3, wape: 9.8, bias: 3.4, mae: 548, trainingWindow: "48 months", bestFor: "Holiday and shutdown effects", runtime: "2m 02s", skusWon: 2 },
  { id: "m-hw", name: "Holt-Winters", family: "Statistical", mape: 12.7, wape: 12.2, bias: 4.6, mae: 631, trainingWindow: "24 months", bestFor: "Short history, simple trend + season", runtime: "0m 38s", skusWon: 2 },
  { id: "m-croston", name: "Croston (Intermittent)", family: "Statistical", mape: 18.9, wape: 17.4, bias: -5.8, mae: 214, trainingWindow: "36 months", bestFor: "Slow-moving spare parts, sparse demand", runtime: "0m 51s", skusWon: 1 },
];

export const backtestSeries = [
  { period: "Jan 26", actual: 100, gbt: 97, sarima: 93, lstm: 104, croston: 88 },
  { period: "Feb 26", actual: 106, gbt: 103, sarima: 98, lstm: 111, croston: 91 },
  { period: "Mar 26", actual: 118, gbt: 115, sarima: 108, lstm: 124, croston: 99 },
  { period: "Apr 26", actual: 111, gbt: 113, sarima: 121, lstm: 106, croston: 96 },
  { period: "May 26", actual: 121, gbt: 119, sarima: 112, lstm: 128, croston: 103 },
  { period: "Jun 26", actual: 127, gbt: 125, sarima: 117, lstm: 135, croston: 108 },
];

// ---------------------------------------------------------------- events
export type DemandEvent = {
  id: string;
  title: string;
  type: "New programme" | "Price change" | "Promotion" | "Plant event" | "Regulatory" | "Customer change";
  scope: string;
  window: string;
  expectedImpactPct: number;
  confidence: "High" | "Medium" | "Low";
  status: "Proposed" | "Under review" | "Accepted" | "Rejected";
  owner: string;
  rationale: string;
};

export const seedEvents: DemandEvent[] = [
  {
    id: "ev-1",
    title: "Northvale Motors EV platform ramp-up",
    type: "New programme",
    scope: "Wiring harnesses · Plant 03 — Sanand",
    window: "Sep 2026 – Mar 2027",
    expectedImpactPct: 22,
    confidence: "High",
    status: "Accepted",
    owner: "Programme management",
    rationale: "Signed nomination letter for 42k annual sets; no historical demand exists for this platform.",
  },
  {
    id: "ev-2",
    title: "Aftermarket monsoon service campaign",
    type: "Promotion",
    scope: "Filtration & consumables · DC North, DC South",
    window: "Aug 2026 – Oct 2026",
    expectedImpactPct: 14,
    confidence: "Medium",
    status: "Under review",
    owner: "Aftermarket sales",
    rationale: "Distributor discount of 8% with workshop bundle; comparable 2024 campaign lifted filters 12–16%.",
  },
  {
    id: "ev-3",
    title: "Kestrel Automotive model-year changeover",
    type: "Customer change",
    scope: "Braking assemblies · Plant 01 — Pune",
    window: "Nov 2026 – Dec 2026",
    expectedImpactPct: -18,
    confidence: "High",
    status: "Accepted",
    owner: "Customer account team",
    rationale: "Old caliper variant phases out; six-week build pause confirmed in customer schedule review.",
  },
  {
    id: "ev-4",
    title: "Plant 02 Chennai line requalification",
    type: "Plant event",
    scope: "Transmission components · Plant 02 — Chennai",
    window: "Oct 2026 (3 weeks)",
    expectedImpactPct: -9,
    confidence: "Medium",
    status: "Proposed",
    owner: "Manufacturing engineering",
    rationale: "Planned shutdown for press line requalification; demand shifts to November rather than disappearing.",
  },
  {
    id: "ev-5",
    title: "Braking safety norm revision",
    type: "Regulatory",
    scope: "Braking assemblies · All plants",
    window: "Jan 2027 onwards",
    expectedImpactPct: 7,
    confidence: "Low",
    status: "Proposed",
    owner: "Regulatory affairs",
    rationale: "Draft norm expected to mandate upgraded pad compound; timing and enforcement date not confirmed.",
  },
  {
    id: "ev-6",
    title: "List price increase, spare parts catalogue",
    type: "Price change",
    scope: "Aftermarket & Spares · All locations",
    window: "Sep 2026",
    expectedImpactPct: -5,
    confidence: "Medium",
    status: "Under review",
    owner: "Pricing",
    rationale: "4.5% increase expected to pull demand forward in Aug and soften Sep–Oct offtake.",
  },
];

// ---------------------------------------------------------------- scenarios
export type ScenarioDriver = {
  demandShiftPct: number;
  priceChangePct: number;
  oemScheduleChangePct: number;
  leadTimeDeltaDays: number;
  capacityCapPct: number;
  includeAcceptedEvents: boolean;
};

export const defaultDrivers: ScenarioDriver = {
  demandShiftPct: 0,
  priceChangePct: 0,
  oemScheduleChangePct: 0,
  leadTimeDeltaDays: 0,
  capacityCapPct: 100,
  includeAcceptedEvents: true,
};

export type SavedScenario = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  drivers: ScenarioDriver;
  note: string;
};

export const seedScenarios: SavedScenario[] = [
  {
    id: "sc-1",
    name: "OEM schedule uplift +8%",
    createdBy: "R. Iyer · Demand planning",
    createdAt: "22 Jul 2026",
    drivers: { ...defaultDrivers, oemScheduleChangePct: 8, demandShiftPct: 3 },
    note: "Tests capacity headroom if Northvale pulls Q4 volume forward.",
  },
  {
    id: "sc-2",
    name: "Aftermarket price shock",
    createdBy: "S. Menon · Pricing",
    createdAt: "21 Jul 2026",
    drivers: { ...defaultDrivers, priceChangePct: 6, demandShiftPct: -4 },
    note: "Elasticity assumption of -0.7 applied to consumables.",
  },
  {
    id: "sc-3",
    name: "Chennai capacity constrained to 85%",
    createdBy: "A. Fernandes · Supply planning",
    createdAt: "19 Jul 2026",
    drivers: { ...defaultDrivers, capacityCapPct: 85, leadTimeDeltaDays: 6 },
    note: "Quantifies stockout exposure during line requalification.",
  },
];

// ---------------------------------------------------------------- review
export type ReviewLine = {
  id: string;
  scope: string;
  planner: string;
  statistical: number;
  plannerOverride: number;
  consensus: number;
  variancePct: number;
  status: "Pending" | "Approved" | "Returned";
  comment: string;
};

export const seedReviewLines: ReviewLine[] = [
  { id: "rl-1", scope: "Braking assemblies · Northvale Motors", planner: "R. Iyer", statistical: 54200, plannerOverride: 56800, consensus: 56800, variancePct: 4.8, status: "Pending", comment: "Adds confirmed spare capacity order." },
  { id: "rl-2", scope: "Wiring harnesses · Sanand", planner: "P. Rao", statistical: 18600, plannerOverride: 22700, consensus: 22700, variancePct: 22.0, status: "Pending", comment: "EV platform ramp event applied." },
  { id: "rl-3", scope: "Filtration · Aftermarket DCs", planner: "N. Bose", statistical: 121400, plannerOverride: 132300, consensus: 132300, variancePct: 9.0, status: "Pending", comment: "Monsoon campaign, pending pricing sign-off." },
  { id: "rl-4", scope: "Transmission · Chennai", planner: "A. Fernandes", statistical: 38900, plannerOverride: 35400, consensus: 35400, variancePct: -9.0, status: "Approved", comment: "Line requalification shutdown reflected." },
  { id: "rl-5", scope: "Suspension · Delta Bus Works", planner: "K. Shah", statistical: 19300, plannerOverride: 19300, consensus: 19300, variancePct: 0, status: "Approved", comment: "Statistical forecast accepted without change." },
  { id: "rl-6", scope: "Braking assemblies · Kestrel", planner: "R. Iyer", statistical: 44100, plannerOverride: 36200, consensus: 36200, variancePct: -17.9, status: "Returned", comment: "Return: attach customer schedule evidence for the pause." },
];

export const approvalTrail = [
  { id: "at-1", actor: "System", action: "Baseline forecast generated across 1,284 SKU-customer-location combinations", at: "24 Jul 2026, 06:10" },
  { id: "at-2", actor: "R. Iyer · Demand planning", action: "Planner overrides submitted for 218 combinations", at: "24 Jul 2026, 09:42" },
  { id: "at-3", actor: "A. Fernandes · Supply planning", action: "Capacity feasibility review completed for Plant 02", at: "24 Jul 2026, 11:05" },
  { id: "at-4", actor: "S. Menon · Pricing", action: "Commented on aftermarket campaign uplift assumption", at: "24 Jul 2026, 12:18" },
  { id: "at-5", actor: "Demand review board", action: "Consensus meeting scheduled for 26 Jul 2026", at: "24 Jul 2026, 14:00" },
];

// ---------------------------------------------------------------- performance
export const accuracyTrend = [
  { period: "Feb 26", mape: 13.4, bias: 4.1, forecastAttainment: 88 },
  { period: "Mar 26", mape: 12.1, bias: 3.2, forecastAttainment: 90 },
  { period: "Apr 26", mape: 11.4, bias: 2.4, forecastAttainment: 91 },
  { period: "May 26", mape: 10.2, bias: 1.6, forecastAttainment: 93 },
  { period: "Jun 26", mape: 9.4, bias: -0.8, forecastAttainment: 94 },
  { period: "Jul 26", mape: 8.9, bias: -1.4, forecastAttainment: 95 },
];

export const riskBuckets = [
  { bucket: "Stockout risk", high: 34, medium: 96, low: 1154 },
  { bucket: "Excess inventory", high: 21, medium: 132, low: 1131 },
];

export type RiskRow = {
  sku: string;
  description: string;
  scope: string;
  risk: "Stockout" | "Excess";
  severity: "High" | "Medium" | "Low";
  coverDays: number;
  exposureValue: number;
  driver: string;
};

export const riskRows: RiskRow[] = [
  { sku: "HRN-6015-E", description: "Battery cable set, EV pack", scope: "Sanand · Northvale", risk: "Stockout", severity: "High", coverDays: 7, exposureValue: 4.2, driver: "EV ramp event not yet covered by supplier capacity" },
  { sku: "BRK-1180-A", description: "Front brake caliper assembly", scope: "Pune · Northvale", risk: "Stockout", severity: "High", coverDays: 9, exposureValue: 3.6, driver: "Forecast under-bias of 6.1% over last 3 cycles" },
  { sku: "FLT-8100-A", description: "Oil filter cartridge", scope: "DC South · Aftermarket", risk: "Stockout", severity: "Medium", coverDays: 14, exposureValue: 1.9, driver: "Monsoon campaign uplift pending approval" },
  { sku: "TRN-4120-B", description: "Synchroniser ring, 2nd gear", scope: "Chennai · Kestrel", risk: "Excess", severity: "High", coverDays: 96, exposureValue: 2.8, driver: "Model-year changeover reduces consumption" },
  { sku: "SUS-7188-B", description: "Stabiliser link, rear", scope: "Pune · Delta Bus Works", risk: "Excess", severity: "Medium", coverDays: 74, exposureValue: 1.4, driver: "Over-forecast bias of 5.4% on slow mover" },
  { sku: "BRK-2290-B", description: "Brake pad set, ceramic", scope: "DC North · Aftermarket", risk: "Excess", severity: "Medium", coverDays: 68, exposureValue: 1.1, driver: "Promotion pulled demand forward in Jun 26" },
];

export const biasByFamily = [
  { family: "Braking", bias: -4.2 },
  { family: "Transmission", bias: 2.8 },
  { family: "Harnesses", bias: 6.1 },
  { family: "Suspension", bias: 1.2 },
  { family: "Filtration", bias: -2.6 },
];

// ---------------------------------------------------------------- helpers
export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

export function formatSigned(value: number, suffix = "%") {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}${suffix}`;
}
