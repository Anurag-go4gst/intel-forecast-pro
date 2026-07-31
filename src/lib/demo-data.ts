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
  { id: "cus-ap", label: "Apex Motors (OEM)" },
  { id: "cus-nv", label: "Northvale Motors (OEM)" },
  { id: "cus-ka", label: "Kestrel Automotive (OEM)" },
  { id: "cus-mv", label: "Meridian Vehicles (OEM)" },
  { id: "cus-db", label: "Delta Bus Works (OEM)" },
  { id: "cus-ad", label: "Aftermarket Distributors" },
];

export const productFamilies = [
  { id: "all", label: "All product families" },
  { id: "pf-clt", label: "Clutch systems" },
  { id: "pf-brk", label: "Braking assemblies" },
  { id: "pf-trn", label: "Transmission components" },
  { id: "pf-hrn", label: "Wiring harnesses" },
  { id: "pf-sus", label: "Suspension modules" },
  { id: "pf-flt", label: "Filtration & consumables" },
];

export const plants = [
  { id: "all", label: "All plants / locations" },
  { id: "pl-nor", label: "North Plant — Coimbatore" },
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

export const demandBehaviours = [
  "Smooth",
  "Seasonal",
  "Trending",
  "Intermittent",
  "Erratic",
  "Lumpy",
  "New item",
  "End-of-life",
  "Customer-schedule-driven",
  "Event-driven",
] as const;
export type DemandBehaviour = (typeof demandBehaviours)[number];

export type DataQualityTier = "High" | "Medium" | "Low";

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
  behaviour: DemandBehaviour;
  quality: DataQualityTier;
  isDemoCase?: boolean;
};

/** The prominent guided demonstration case. */
export const DEMO_SKU = "CLT-1048";
export const demoCaseMeta = {
  sku: DEMO_SKU,
  description: "Clutch Friction Assembly",
  customerId: "cus-ap",
  customer: "Apex Motors (OEM)",
  plantId: "pl-nor",
  plant: "North Plant — Coimbatore",
  familyId: "pf-clt",
  baseVolume: 12_400,
};

const skuSeeds: Array<[string, string, string, string, string, string, "A" | "B" | "C", number]> = [
  ["CLT-1048", "Clutch Friction Assembly", "pf-clt", "cus-ap", "pl-nor", "bu-pt", "A", 12400],
  ["CLT-1052-B", "Clutch pressure plate, 240mm", "pf-clt", "cus-ap", "pl-nor", "bu-pt", "A", 9800],
  ["CLT-1090-C", "Clutch slave cylinder", "pf-clt", "cus-nv", "pl-che", "bu-pt", "B", 7600],
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

function buildRow(
  sku: string,
  description: string,
  familyId: string,
  customerId: string,
  plantId: string,
  buId: string,
  abc: "A" | "B" | "C",
  baseVolume: number,
  behaviour: DemandBehaviour,
  quality: DataQualityTier,
): SkuRow {
  const rand = mulberry32(hashString(sku));
  const qualityPenalty = quality === "Low" ? 8 : quality === "Medium" ? 3 : 0;
  const behaviourPenalty =
    behaviour === "Intermittent" || behaviour === "Lumpy"
      ? 9
      : behaviour === "Erratic" || behaviour === "New item"
        ? 7
        : behaviour === "Seasonal" || behaviour === "Event-driven"
          ? 2
          : 0;
  const mape = Math.round((4 + rand() * 8 + qualityPenalty + behaviourPenalty) * 10) / 10;
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
    stockCoverDays: Math.round(6 + rand() * 92),
    onHand: Math.round(baseVolume * (0.15 + rand() * 0.5)),
    leadTimeDays: Math.round(12 + rand() * 45),
    volatility: mape > 14 ? "High" : mape > 9 ? "Medium" : "Low",
    behaviour,
    quality,
    isDemoCase: sku === DEMO_SKU,
  };
}

// ------------------------------------------- generated portfolio (500 series)
const familyCatalog: Array<{ id: string; code: string; bu: string; parts: string[] }> = [
  { id: "pf-clt", code: "CLT", bu: "bu-pt", parts: ["Clutch friction disc", "Clutch cover assembly", "Clutch master cylinder", "Dual-mass flywheel", "Clutch fork lever", "Clutch damper spring set"] },
  { id: "pf-brk", code: "BRK", bu: "bu-bd", parts: ["Brake caliper, front", "Brake disc rotor 280mm", "Brake pad set, organic", "Brake booster assembly", "Wheel cylinder", "ABS sensor ring", "Handbrake cable set"] },
  { id: "pf-trn", code: "TRN", bu: "bu-pt", parts: ["Gear selector housing", "Synchroniser hub", "Transmission input shaft", "Differential side gear", "Shift rail assembly", "Transfer case bearing"] },
  { id: "pf-hrn", code: "HRN", bu: "bu-el", parts: ["Engine bay harness", "Instrument panel harness", "Tailgate harness", "Battery cable set", "Sensor pigtail loom", "Roof module harness"] },
  { id: "pf-sus", code: "SUS", bu: "bu-bd", parts: ["Rear suspension bush kit", "Front strut assembly", "Leaf spring, 5-leaf", "Anti-roll bar link", "Shock absorber, gas", "Control arm, lower"] },
  { id: "pf-flt", code: "FLT", bu: "bu-as", parts: ["Oil filter cartridge", "Air filter element", "Cabin filter, carbon", "Fuel filter assembly", "Hydraulic filter kit", "Transmission filter"] },
];

const oemCustomers = ["cus-ap", "cus-nv", "cus-ka", "cus-mv", "cus-db"];
const oemPlants = ["pl-nor", "pl-pun", "pl-che", "pl-guj"];
const dcPlants = ["dc-del", "dc-blr"];

const behaviourWeights: Array<[DemandBehaviour, number]> = [
  ["Smooth", 21],
  ["Seasonal", 18],
  ["Trending", 11],
  ["Intermittent", 14],
  ["Erratic", 9],
  ["Lumpy", 7],
  ["New item", 6],
  ["End-of-life", 4],
  ["Customer-schedule-driven", 7],
  ["Event-driven", 3],
];

function pickBehaviour(r: number): DemandBehaviour {
  const total = behaviourWeights.reduce((s, [, w]) => s + w, 0);
  let acc = 0;
  const target = r * total;
  for (const [name, weight] of behaviourWeights) {
    acc += weight;
    if (target <= acc) return name;
  }
  return "Smooth";
}

export const TOTAL_SERIES = 500;

const generatedRows: SkuRow[] = [];
for (let n = 0; generatedRows.length < TOTAL_SERIES - skuSeeds.length; n++) {
  const rand = mulberry32(hashString(`series-${n}`));
  const fam = familyCatalog[n % familyCatalog.length];
  const part = fam.parts[Math.floor(rand() * fam.parts.length)];
  const aftermarket = fam.id === "pf-flt" ? rand() < 0.8 : rand() < 0.18;
  const customerId = aftermarket ? "cus-ad" : oemCustomers[Math.floor(rand() * oemCustomers.length)];
  const plantId = aftermarket
    ? dcPlants[Math.floor(rand() * dcPlants.length)]
    : oemPlants[Math.floor(rand() * oemPlants.length)];
  const buId = aftermarket ? "bu-as" : fam.bu;
  const behaviour = pickBehaviour(rand());
  const qRoll = rand();
  const quality: DataQualityTier =
    behaviour === "New item" || behaviour === "Lumpy"
      ? qRoll < 0.5
        ? "Low"
        : "Medium"
      : qRoll < 0.56
        ? "High"
        : qRoll < 0.85
          ? "Medium"
          : "Low";
  const volumeRoll = rand();
  const baseVolume = Math.round(320 + volumeRoll * volumeRoll * 62_000);
  const abc: "A" | "B" | "C" = baseVolume > 24_000 ? "A" : baseVolume > 7_000 ? "B" : "C";
  const code = `${fam.code}-${2000 + n}-${"ABCDEFGH"[n % 8]}`;
  generatedRows.push(
    buildRow(code, `${part}, variant ${(n % 9) + 1}`, fam.id, customerId, plantId, buId, abc, baseVolume, behaviour, quality),
  );
}

const seededBehaviour: Record<string, DemandBehaviour> = {
  "CLT-1048": "Seasonal",
  "HRN-6015-E": "New item",
  "TRN-4120-B": "Lumpy",
  "FLT-8100-A": "Smooth",
  "BRK-2290-B": "Event-driven",
  "SUS-7188-B": "Intermittent",
  "BRK-1204-C": "End-of-life",
};

const seededQuality: Record<string, DataQualityTier> = {
  "CLT-1048": "High",
  "HRN-6015-E": "Low",
  "TRN-4120-B": "Low",
  "SUS-7188-B": "Medium",
  "HRN-5240-C": "Medium",
};

export const skus: SkuRow[] = [
  ...skuSeeds.map(([sku, description, familyId, customerId, plantId, buId, abc, baseVolume]) =>
    buildRow(
      sku,
      description,
      familyId,
      customerId,
      plantId,
      buId,
      abc,
      baseVolume,
      seededBehaviour[sku] ?? "Smooth",
      seededQuality[sku] ?? "High",
    ),
  ),
  ...generatedRows,
];

export const demoCaseRow = skus.find((s) => s.sku === DEMO_SKU)!;

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

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 54 months of history (Jan 2022 – Jun 2026) followed by a 12-month horizon. */
export const HISTORY_MONTHS = 54;
export const FORECAST_MONTHS = 12;

function buildMonthLabels(startYear: number, startMonth: number, count: number) {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const m = (startMonth + i) % 12;
    const y = startYear + Math.floor((startMonth + i) / 12);
    out.push(`${monthNames[m]} ${String(y).slice(2)}`);
  }
  return out;
}

export const monthLabels = buildMonthLabels(2022, 0, HISTORY_MONTHS + FORECAST_MONTHS);

/** History ends after Jun 26; Jul 26 onwards is the forecast horizon. */
export const historyCutoffIndex = HISTORY_MONTHS - 1;

/** Month index (0 = Jan) for a given position in the series. */
function monthOf(i: number) {
  return i % 12;
}

function behaviourShape(behaviour: DemandBehaviour, i: number, rand: () => number): number {
  const m = monthOf(i);
  switch (behaviour) {
    case "Seasonal":
      return 1 + 0.18 * Math.sin(((m - 2) / 12) * Math.PI * 2);
    case "Trending":
      return 1 + i * 0.006;
    case "Intermittent":
      return rand() < 0.42 ? 0 : 1.4;
    case "Lumpy":
      return rand() < 0.55 ? 0 : 1 + rand() * 2.2;
    case "Erratic":
      return 0.55 + rand() * 1.1;
    case "New item":
      return i < HISTORY_MONTHS - 10 ? 0 : Math.min(1, (i - (HISTORY_MONTHS - 11)) / 8);
    case "End-of-life":
      return Math.max(0.15, 1 - i * 0.011);
    case "Customer-schedule-driven":
      return 1 + 0.09 * Math.sin((i / 3) * Math.PI);
    case "Event-driven":
      return m === 7 || m === 8 ? 1.22 : 0.97;
    default:
      return 1;
  }
}

export function buildSeries(seedKey: string, base: number, uplift = 0, behaviour: DemandBehaviour = "Smooth"): SeriesPoint[] {
  if (seedKey.startsWith(DEMO_SKU)) return demoCaseSeries;
  const rand = mulberry32(hashString(seedKey));
  const trend = 0.0015 + rand() * 0.003;
  const noiseScale = 0.05 + rand() * 0.07;
  const phase = rand() * 0.4;
  return monthLabels.map((label, i) => {
    const seasonal = 1 + 0.11 * Math.sin((monthOf(i) / 12) * Math.PI * 2 + phase);
    const level = base * (1 + trend * i) * seasonal * behaviourShape(behaviour, i, rand);
    const noise = 1 + (rand() - 0.5) * noiseScale;
    const isHistory = i <= historyCutoffIndex;
    const actual = isHistory ? Math.max(0, Math.round(level * noise)) : null;
    const baseline = Math.max(0, Math.round(level * (isHistory ? 1 - noiseScale * 0.2 : 1)));
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

export function seriesForRow(row: SkuRow, uplift = 0): SeriesPoint[] {
  return buildSeries(`${row.sku}|${row.customerId}|${row.plantId}`, row.baseVolume / 1.5, uplift, row.behaviour);
}

export function aggregateSeries(rows: SkuRow[], uplift = 0): SeriesPoint[] {
  const total = rows.reduce((sum, r) => sum + r.baseVolume, 0) || 1;
  const key = rows.map((r) => r.sku).join("|") || "empty";
  if (key.startsWith(DEMO_SKU)) return demoCaseSeries;
  return buildSeries(`agg-${key.length}-${Math.round(total)}`, total / 1.6, uplift);
}

// ------------------------------------------------- prominent demonstration case
/**
 * CLT-1048 · Clutch Friction Assembly · Apex Motors · North Plant.
 *
 * History carries a deep September shutdown dip every year. For FY27 the
 * confirmed shutdown moved to October, so the statistical baseline is wrong in
 * two months at once: it keeps a September dip that will not happen and misses
 * the October trough. Open orders already carry part of the October reduction,
 * so only the residual is applied.
 */
export const demoCase = {
  sku: DEMO_SKU,
  description: "Clutch Friction Assembly",
  customer: "Apex Motors (OEM)",
  plant: "North Plant — Coimbatore",
  family: "Clutch systems",
  /** Gross October reduction stated in the confirmed OEM schedule. */
  grossOctoberImpactPct: -38,
  /** Share of that reduction already visible in open orders / EDI releases. */
  alreadyReflectedPct: -14,
  /** Residual actually applied so the reduction is not counted twice. */
  residualOctoberImpactPct: -24,
  septemberRestorePct: 82,
  novemberRecoveryPct: 14,
  scenarioName: "Upside recovery — Apex pulls November volume forward",
  scenarioNovemberPct: 9,
  scenarioDecemberPct: 6,
  plannerOverridePct: 3,
};

const demoSeasonal: Record<number, number> = {
  0: 0.96, 1: 1.0, 2: 1.06, 3: 1.04, 4: 1.02, 5: 1.0,
  6: 0.98, 7: 1.07, 8: 0.55, 9: 1.09, 10: 1.03, 11: 0.92,
};

export const demoCaseSeries: SeriesPoint[] = (() => {
  const rand = mulberry32(hashString("demo-clt-1048"));
  const base = 11_600;
  return monthLabels.map((label, i) => {
    const m = monthOf(i);
    const level = base * (1 + 0.0022 * i) * demoSeasonal[m];
    const isHistory = i <= historyCutoffIndex;
    if (isHistory) {
      const noise = 1 + (rand() - 0.5) * 0.06;
      return {
        period: label,
        actual: Math.round(level * noise),
        baseline: i === historyCutoffIndex ? Math.round(level) : null,
        adjusted: i === historyCutoffIndex ? Math.round(level) : null,
        upper: i === historyCutoffIndex ? Math.round(level) : null,
        lower: i === historyCutoffIndex ? Math.round(level) : null,
      };
    }
    // Statistical baseline repeats the historical September dip and, because the
    // open-order feature already carries part of it, softens October slightly.
    const baselineFactor = m === 9 ? 1 + demoCase.alreadyReflectedPct / 100 : 1;
    const baseline = Math.round(level * baselineFactor);
    // Event-aware forecast: restore September, apply the residual October dip,
    // add the November catch-up.
    let adjusted = baseline;
    if (m === 8) adjusted = Math.round((level / demoSeasonal[8]) * (demoCase.septemberRestorePct / 100 + 0.18));
    if (m === 9) adjusted = Math.round(baseline * (1 + demoCase.residualOctoberImpactPct / 100));
    if (m === 10) adjusted = Math.round(baseline * (1 + demoCase.novemberRecoveryPct / 100));
    const spread = 0.07 + (i - historyCutoffIndex) * 0.008;
    return {
      period: label,
      actual: null,
      baseline,
      adjusted,
      upper: Math.round(adjusted * (1 + spread)),
      lower: Math.round(adjusted * (1 - spread)),
    };
  });
})();

/** Upside recovery scenario — never part of the official forecast. */
export const demoScenarioSeries = demoCaseSeries.map((p, i) => {
  const m = monthOf(i);
  if (p.adjusted === null) return { ...p, scenario: null };
  const uplift =
    m === 10 ? demoCase.scenarioNovemberPct / 100 : m === 11 ? demoCase.scenarioDecemberPct / 100 : 0.02;
  return { ...p, scenario: Math.round(p.adjusted * (1 + uplift)) };
});

export const demoHorizon = demoCaseSeries.filter((p) => p.actual === null);

export const demoTotals = {
  baseline: demoHorizon.reduce((s, p) => s + (p.baseline ?? 0), 0),
  eventAware: demoHorizon.reduce((s, p) => s + (p.adjusted ?? 0), 0),
  scenario: demoScenarioSeries
    .filter((p) => p.actual === null)
    .reduce((s, p) => s + (p.scenario ?? 0), 0),
};

// ------------------------------------------------------- per-version snapshots
//
// Each forecast version is a saved snapshot of the featured-SKU forecast as it
// stood when that cycle was worked. The working draft (V2026.07) is where the
// Apex shutdown-move event was applied, so its event-aware forecast diverges
// from the baseline. The Apex schedule revision only arrived on 2026-07-14, so
// the earlier PUBLISHED versions (June, May) legitimately carry no event
// adjustment — their approved forecast equals the statistical baseline. Picking
// a version in the header re-scopes every dashboard to that snapshot.

export type VersionForecast = {
  versionId: string;
  label: string;
  status: "draft" | "published";
  /** Whether an event adjustment had been decided in this cycle. */
  hasEventAdjustment: boolean;
  /** Portfolio-level index of this cycle versus the working draft (1.0). Lets
   *  filter-scoped dashboards re-scale their aggregates to an earlier cycle. */
  levelFactor: number;
  horizon: SeriesPoint[];
  totals: { baseline: number; eventAware: number };
};

/** Re-scale the working-draft horizon to an earlier cycle's level, optionally
 *  flattening the event so the approved forecast equals the baseline. */
function buildVersionHorizon(factor: number, keepEvent: boolean): SeriesPoint[] {
  return demoHorizon.map((p) => {
    const baseline = Math.round((p.baseline ?? 0) * factor);
    const adjusted = keepEvent ? Math.round((p.adjusted ?? 0) * factor) : baseline;
    // Preserve each point's original interval width relative to its centre.
    const centre = p.adjusted ?? 1;
    const upperRel = (p.upper ?? centre) / centre;
    const lowerRel = (p.lower ?? centre) / centre;
    return {
      period: p.period,
      actual: null,
      baseline,
      adjusted,
      upper: Math.round(adjusted * upperRel),
      lower: Math.round(adjusted * lowerRel),
    };
  });
}

const horizonTotals = (horizon: SeriesPoint[]) => ({
  baseline: horizon.reduce((s, p) => s + (p.baseline ?? 0), 0),
  eventAware: horizon.reduce((s, p) => s + (p.adjusted ?? 0), 0),
});

export const versionForecasts: Record<string, VersionForecast> = {
  "v-2026-07-wip": {
    versionId: "v-2026-07-wip",
    label: "V2026.07 — Working draft",
    status: "draft",
    hasEventAdjustment: true,
    levelFactor: 1,
    horizon: demoHorizon,
    totals: { baseline: demoTotals.baseline, eventAware: demoTotals.eventAware },
  },
  "v-2026-06-pub": (() => {
    // Portfolio totalUnits ratio 638,900 / 661,300 ≈ 0.966.
    const levelFactor = 0.966;
    const horizon = buildVersionHorizon(levelFactor, false);
    return {
      versionId: "v-2026-06-pub",
      label: "V2026.06 — Published",
      status: "published" as const,
      hasEventAdjustment: false,
      levelFactor,
      horizon,
      totals: horizonTotals(horizon),
    };
  })(),
  "v-2026-05-pub": (() => {
    // Portfolio totalUnits ratio 612,400 / 661,300 ≈ 0.926.
    const levelFactor = 0.926;
    const horizon = buildVersionHorizon(levelFactor, false);
    return {
      versionId: "v-2026-05-pub",
      label: "V2026.05 — Published",
      status: "published" as const,
      hasEventAdjustment: false,
      levelFactor,
      horizon,
      totals: horizonTotals(horizon),
    };
  })(),
};

export const WORKING_DRAFT_VERSION_ID = "v-2026-07-wip";

/** The seeded Apex shutdown event that drives the featured-SKU event-aware line.
 *  The working-draft forecast only diverges from the baseline once it is
 *  approved in-cycle. */
export const DEMO_FEATURED_EVENT_ID = "ie-0";

/**
 * The working draft is LIVE: unlike a published snapshot, its event-aware line
 * only diverges from the statistical baseline once the driving event has been
 * approved in this cycle. A fresh plan therefore starts with the approved
 * forecast equal to the baseline and builds up as the planner applies events.
 */
export function workingDraftForecast(eventApplied: boolean): VersionForecast {
  const horizon = eventApplied ? demoHorizon : buildVersionHorizon(1, false);
  return {
    versionId: WORKING_DRAFT_VERSION_ID,
    label: "V2026.07 — Working draft",
    status: "draft",
    hasEventAdjustment: eventApplied,
    levelFactor: 1,
    horizon,
    totals: horizonTotals(horizon),
  };
}

/** Featured-SKU forecast snapshot for a selected header version (falls back to
 *  the working draft for any unknown id). */
export function forecastForVersion(versionId: string | undefined): VersionForecast {
  return versionForecasts[versionId ?? ""] ?? versionForecasts[WORKING_DRAFT_VERSION_ID];
}

// --------------------------------------------------------- version identity
// A cycle number ("2026.07") maps to three ids: the governance record
// (v-2026-07), the header working-draft option (v-2026-07-wip) and the
// published option (v-2026-07-pub). Publishing rolls a cycle forward.

export type VersionOption = { id: string; label: string; status: "draft" | "published" };

/** "v-2026-07-wip" | "v-2026-07-pub" | "v-2026-07" -> "2026.07". */
export function cycleFromVersionId(id: string): string {
  const m = id.match(/(\d{4})-(\d{2})/);
  return m ? `${m[1]}.${m[2]}` : "2026.07";
}

export const cycleToGovId = (cycle: string) => `v-${cycle.replace(".", "-")}`;
export const cycleToWipId = (cycle: string) => `${cycleToGovId(cycle)}-wip`;
export const cycleToPubId = (cycle: string) => `${cycleToGovId(cycle)}-pub`;

/** Next planning cycle after the given one, rolling the year past month 12. */
export function nextCycle(cycle: string): string {
  const m = cycle.match(/(\d{4})\.(\d{2})/);
  let year = m ? Number(m[1]) : 2026;
  let month = (m ? Number(m[2]) : 7) + 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return `${year}.${String(month).padStart(2, "0")}`;
}

export const demoDoubleCountCheck = [
  { source: "Open orders", signal: "Clear signal", reflectedPct: 14, note: "October releases already cut by 14% versus the prior schedule." },
  { source: "OEM/customer schedules", signal: "Clear signal", reflectedPct: 12, note: "Apex EDI 830 revision R-14 confirms the October shutdown window." },
  { source: "Backlog", signal: "Weak signal", reflectedPct: 3, note: "Backlog unchanged; no shutdown effect visible yet." },
  { source: "Recent demand", signal: "No signal", reflectedPct: 0, note: "History still shows the September pattern only." },
  { source: "Existing model features", signal: "Weak signal", reflectedPct: 2, note: "Calendar feature still carries the old September shutdown flag." },
  { source: "Inventory movements", signal: "No signal", reflectedPct: 0, note: "No pre-build movement recorded at North Plant." },
];


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
    id: "ev-0",
    title: "Apex Motors shutdown moved from September to October",
    type: "Customer change",
    scope: "CLT-1048 Clutch Friction Assembly · North Plant — Coimbatore",
    window: "Sep 2026 – Nov 2026",
    expectedImpactPct: -24,
    confidence: "High",
    status: "Accepted",
    owner: "Customer account team · Apex",
    rationale:
      "Confirmed OEM schedule R-14 moves the annual shutdown to October. September demand is restored, October carries the residual reduction after the open-order check, and November takes the catch-up.",
  },
  {
    id: "ev-7",
    title: "Apex Motors November catch-up build",
    type: "Customer change",
    scope: "Clutch systems · North Plant — Coimbatore",
    window: "Nov 2026",
    expectedImpactPct: 14,
    confidence: "High",
    status: "Accepted",
    owner: "Customer account team · Apex",
    rationale: "Apex confirmed a catch-up build in November to recover the October shutdown volume.",
  },
  {
    id: "ev-8",
    title: "Coimbatore North Plant second-shift addition",
    type: "Plant event",
    scope: "Clutch systems · North Plant — Coimbatore",
    window: "Aug 2026 onwards",
    expectedImpactPct: 6,
    confidence: "Medium",
    status: "Under review",
    owner: "Manufacturing engineering",
    rationale: "Additional shift raises servable volume; demand unchanged but constraint releases.",
  },
  {
    id: "ev-9",
    title: "Delta Bus Works electric bus tender award",
    type: "New programme",
    scope: "Suspension modules · Plant 01 — Pune",
    window: "Dec 2026 – Jun 2027",
    expectedImpactPct: 17,
    confidence: "Medium",
    status: "Under review",
    owner: "Programme management",
    rationale: "State transport tender for 1,200 electric buses; award decision expected in November.",
  },
  {
    id: "ev-10",
    title: "Tier-2 casting vendor capacity loss",
    type: "Plant event",
    scope: "Transmission components · Plant 02 — Chennai",
    window: "Aug 2026 – Sep 2026",
    expectedImpactPct: -11,
    confidence: "Low",
    status: "Proposed",
    owner: "Supply risk",
    rationale: "Unverified report of a fire at a casting supplier; no order or schedule signal yet.",
  },
  {
    id: "ev-11",
    title: "Festive season aftermarket restocking",
    type: "Promotion",
    scope: "Aftermarket & Spares · DC North, DC South",
    window: "Sep 2026 – Nov 2026",
    expectedImpactPct: 12,
    confidence: "High",
    status: "Accepted",
    owner: "Aftermarket sales",
    rationale: "Dealer restocking ahead of the festive period; comparable 2025 lift was 11.4%.",
  },
  {
    id: "ev-12",
    title: "Meridian Vehicles platform phase-out",
    type: "Customer change",
    scope: "Wiring harnesses · Plant 03 — Sanand",
    window: "Jan 2027 – Jun 2027",
    expectedImpactPct: -21,
    confidence: "High",
    status: "Under review",
    owner: "Product management",
    rationale: "Legacy platform withdrawn progressively as the successor harness ramps.",
  },

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
    id: "sc-0",
    name: "Apex upside recovery (CLT-1048)",
    createdBy: "R. Iyer · Demand planning",
    createdAt: "24 Jul 2026",
    drivers: { ...defaultDrivers, demandShiftPct: 6, oemScheduleChangePct: 4 },
    note: "Tests a faster November–December catch-up at Apex. Scenario only — never the official forecast.",
  },
  {
    id: "sc-4",
    name: "Worst case — shutdown extends into November",
    createdBy: "A. Fernandes · Supply planning",
    createdAt: "24 Jul 2026",
    drivers: { ...defaultDrivers, oemScheduleChangePct: -12, capacityCapPct: 92 },
    note: "Apex shutdown slips by two weeks; November recovery does not materialise.",
  },
  {
    id: "sc-5",
    name: "Demand shock — festive offtake +15%",
    createdBy: "N. Bose · Aftermarket",
    createdAt: "20 Jul 2026",
    drivers: { ...defaultDrivers, demandShiftPct: 15 },
    note: "Stress-tests DC replenishment and safety stock across the aftermarket network.",
  },

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
  { id: "rl-0", scope: "CLT-1048 Clutch Friction Assembly · Apex Motors · North Plant", planner: "R. Iyer", statistical: 141600, plannerOverride: 132400, consensus: 132400, variancePct: -6.5, status: "Pending", comment: "Shutdown moved to October: September restored, residual October dip, November catch-up." },
  { id: "rl-1", scope: "Braking assemblies · Northvale Motors", planner: "R. Iyer", statistical: 54200, plannerOverride: 56800, consensus: 56800, variancePct: 4.8, status: "Pending", comment: "Adds confirmed spare capacity order." },
  { id: "rl-2", scope: "Wiring harnesses · Sanand", planner: "P. Rao", statistical: 18600, plannerOverride: 22700, consensus: 22700, variancePct: 22.0, status: "Pending", comment: "EV platform ramp event applied." },
  { id: "rl-3", scope: "Filtration · Aftermarket DCs", planner: "N. Bose", statistical: 121400, plannerOverride: 132300, consensus: 132300, variancePct: 9.0, status: "Pending", comment: "Monsoon campaign, pending pricing sign-off." },
  { id: "rl-4", scope: "Transmission · Chennai", planner: "A. Fernandes", statistical: 38900, plannerOverride: 35400, consensus: 35400, variancePct: -9.0, status: "Approved", comment: "Line requalification shutdown reflected." },
  { id: "rl-5", scope: "Suspension · Delta Bus Works", planner: "K. Shah", statistical: 19300, plannerOverride: 19300, consensus: 19300, variancePct: 0, status: "Approved", comment: "Statistical forecast accepted without change." },
  { id: "rl-6", scope: "Braking assemblies · Kestrel", planner: "R. Iyer", statistical: 44100, plannerOverride: 36200, consensus: 36200, variancePct: -17.9, status: "Returned", comment: "Return: attach customer schedule evidence for the pause." },
  { id: "rl-7", scope: "Clutch systems · Apex Motors · North Plant (spares)", planner: "D. Rao", statistical: 26400, plannerOverride: 28900, consensus: 28900, variancePct: 9.5, status: "Pending", comment: "Service demand rises while the OEM line is down." },
  { id: "rl-8", scope: "Filtration · DC North", planner: "N. Bose", statistical: 88700, plannerOverride: 95300, consensus: 95300, variancePct: 7.4, status: "Pending", comment: "Festive restocking event, residual impact only." },
  { id: "rl-9", scope: "Suspension modules · Pune", planner: "K. Shah", statistical: 31200, plannerOverride: 36500, consensus: 36500, variancePct: 17.0, status: "Returned", comment: "Return: tender award not confirmed, keep in scenario." },
  { id: "rl-10", scope: "Wiring harnesses · Meridian Vehicles", planner: "P. Rao", statistical: 47800, plannerOverride: 41300, consensus: 41300, variancePct: -13.6, status: "Pending", comment: "Platform phase-out curve applied from January." },
  { id: "rl-11", scope: "Transmission · Kestrel Automotive", planner: "A. Fernandes", statistical: 22900, plannerOverride: 22900, consensus: 22900, variancePct: 0, status: "Approved", comment: "Baseline accepted; challenger model gap not material." },
];


export const approvalTrail = [
  { id: "at-1", actor: "System", action: "Baseline forecast generated across 500 SKU-customer-location combinations", at: "24 Jul 2026, 06:10" },
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
  { sku: "CLT-1048", description: "Clutch Friction Assembly", scope: "North Plant · Apex Motors", risk: "Excess", severity: "High", coverDays: 88, exposureValue: 3.9, driver: "Baseline still plans the September dip that will not happen" },
  { sku: "CLT-1052-B", description: "Clutch pressure plate, 240mm", scope: "North Plant · Apex Motors", risk: "Stockout", severity: "Medium", coverDays: 13, exposureValue: 1.7, driver: "November catch-up build not yet covered by supply" },
  { sku: "CLT-1090-C", description: "Clutch slave cylinder", scope: "Chennai · Northvale", risk: "Excess", severity: "Low", coverDays: 62, exposureValue: 0.7, driver: "Service demand softer than the statistical baseline" },
  { sku: "TRN-3311-A", description: "Gear shift fork, 6-speed", scope: "Chennai · Northvale", risk: "Stockout", severity: "Medium", coverDays: 12, exposureValue: 2.1, driver: "Casting vendor disruption under review" },
  { sku: "TRN-3480-D", description: "Clutch release bearing", scope: "Chennai · Meridian", risk: "Excess", severity: "Medium", coverDays: 71, exposureValue: 1.6, driver: "Platform phase-out not yet reflected in supply plan" },
  { sku: "HRN-5102-A", description: "Main body wiring harness", scope: "Sanand · Northvale", risk: "Stockout", severity: "Medium", coverDays: 16, exposureValue: 2.4, driver: "EV ramp residual impact approved late in the cycle" },
  { sku: "HRN-5240-C", description: "Door harness, LH", scope: "Sanand · Meridian", risk: "Excess", severity: "Low", coverDays: 58, exposureValue: 0.9, driver: "Stockout-censored history inflates the baseline" },
  { sku: "SUS-7001-A", description: "Front strut module", scope: "Pune · Meridian", risk: "Stockout", severity: "Low", coverDays: 19, exposureValue: 1.2, driver: "Tender scenario volume not in the official forecast" },
  { sku: "SUS-7420-C", description: "Coil spring, heavy duty", scope: "Chennai · Delta Bus Works", risk: "Excess", severity: "Low", coverDays: 64, exposureValue: 0.8, driver: "Slow mover with intermittent order pattern" },
  { sku: "FLT-8214-B", description: "Cabin air filter, activated", scope: "DC North · Aftermarket", risk: "Stockout", severity: "Medium", coverDays: 11, exposureValue: 1.5, driver: "Festive restocking event approved this cycle" },
  { sku: "FLT-8355-C", description: "Fuel filter assembly", scope: "DC South · Aftermarket", risk: "Excess", severity: "Low", coverDays: 79, exposureValue: 0.6, driver: "Prior campaign pulled demand forward" },
  { sku: "BRK-1450-D", description: "Brake master cylinder", scope: "Chennai · Delta Bus Works", risk: "Stockout", severity: "Low", coverDays: 18, exposureValue: 0.9, driver: "Lead time extended by 12 days" },
  { sku: "BRK-1204-C", description: "Rear brake disc, ventilated", scope: "Pune · Kestrel", risk: "Excess", severity: "High", coverDays: 104, exposureValue: 2.2, driver: "End-of-life variant with open supply commitments" },
  { sku: "TRN-3390-B", description: "Gear selector housing", scope: "Nashik · Vantage", risk: "Excess", severity: "Medium", coverDays: 69, exposureValue: 1.3, driver: "December customer shutdown reduces consumption" },

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
