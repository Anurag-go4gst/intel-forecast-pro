/**
 * Event intelligence and scenario domain.
 *
 * Illustrative prototype data only — no live systems are queried and no model
 * is trained. Every number below is seeded demonstration data.
 */

// ------------------------------------------------------------- horizon
export const horizonMonths = ["Jul 26", "Aug 26", "Sep 26", "Oct 26", "Nov 26", "Dec 26"];

// ------------------------------------------------------------- categories
export const eventCategories = [
  "Confirmed calendar event",
  "Operational event",
  "Customer/OEM intelligence",
  "Market intelligence",
  "Commercial event",
  "Regulatory event",
  "Supply constraint",
  "Scenario-only event",
] as const;
export type EventCategory = (typeof eventCategories)[number];

export const eventStatuses = [
  "Draft",
  "Watchlist",
  "Under review",
  "Recommended",
  "Approved",
  "Rejected",
  "Expired",
] as const;
export type EventStatus = (typeof eventStatuses)[number];

export const statusTone: Record<EventStatus, "neutral" | "info" | "positive" | "warning" | "risk"> = {
  Draft: "neutral",
  Watchlist: "info",
  "Under review": "warning",
  Recommended: "info",
  Approved: "positive",
  Rejected: "risk",
  Expired: "neutral",
};

export const reliabilityLevels = ["Confirmed document", "Direct customer input", "Internal estimate", "Market rumour"] as const;
export type Reliability = (typeof reliabilityLevels)[number];

export const impactUnits = ["Percentage", "Quantity"] as const;
export type ImpactUnit = (typeof impactUnits)[number];

// ------------------------------------------------------------- impact patterns
export const impactPatterns = [
  "One-time spike",
  "Temporary dip",
  "Permanent baseline shift",
  "Gradual ramp-up",
  "Gradual phase-out",
  "Pre-build, shutdown and recovery",
  "Advance buying then dip",
  "Delayed impact",
  "Multi-period demand transfer",
] as const;
export type ImpactPattern = (typeof impactPatterns)[number];

export const patternDescription: Record<ImpactPattern, string> = {
  "One-time spike": "Single-period uplift, no lasting change to the baseline level.",
  "Temporary dip": "Short reduction followed by a return to the baseline.",
  "Permanent baseline shift": "Step change that persists for every later period.",
  "Gradual ramp-up": "Impact builds month by month as a programme scales.",
  "Gradual phase-out": "Impact decays as a product or platform is withdrawn.",
  "Pre-build, shutdown and recovery": "Build-ahead, then a shutdown trough, then catch-up.",
  "Advance buying then dip": "Buyers pull volume forward, then order below baseline.",
  "Delayed impact": "Nothing changes for the first months, then the impact starts.",
  "Multi-period demand transfer": "Volume moves between periods; the horizon total is unchanged.",
};

/** Month-by-month impact shape (as a share of the peak impact). */
export function patternCurve(pattern: ImpactPattern, peak: number, months = horizonMonths.length): number[] {
  const shape: number[] = [];
  for (let i = 0; i < months; i++) {
    const t = months === 1 ? 0 : i / (months - 1);
    switch (pattern) {
      case "One-time spike":
        shape.push(i === 1 ? 1 : 0);
        break;
      case "Temporary dip":
        shape.push(i === 1 || i === 2 ? -1 : 0);
        break;
      case "Permanent baseline shift":
        shape.push(i === 0 ? 0.5 : 1);
        break;
      case "Gradual ramp-up":
        shape.push(Number(t.toFixed(2)));
        break;
      case "Gradual phase-out":
        shape.push(Number((-t).toFixed(2)));
        break;
      case "Pre-build, shutdown and recovery":
        shape.push([0.4, 0.8, -1, -0.6, 0.6, 0.2][i % 6]);
        break;
      case "Advance buying then dip":
        shape.push([1, 0.5, -0.7, -0.4, 0, 0][i % 6]);
        break;
      case "Delayed impact":
        shape.push(i < 2 ? 0 : Number(((i - 1) / (months - 2)).toFixed(2)));
        break;
      case "Multi-period demand transfer":
        shape.push([-1, -0.5, 0.6, 0.9, 0, 0][i % 6]);
        break;
    }
  }
  return shape.map((s) => Number((s * peak).toFixed(1)));
}

// ------------------------------------------------------------- double counting
export const reflectionStates = [
  "Not reflected",
  "Partially reflected",
  "Fully reflected",
  "Unclear",
  "Conflicting",
] as const;
export type ReflectionState = (typeof reflectionStates)[number];

export const reflectionTone: Record<ReflectionState, "neutral" | "info" | "positive" | "warning" | "risk"> = {
  "Not reflected": "info",
  "Partially reflected": "warning",
  "Fully reflected": "positive",
  Unclear: "warning",
  Conflicting: "risk",
};

export const evidenceSourcesChecked = [
  "Open orders",
  "OEM/customer schedules",
  "Backlog",
  "Purchase orders",
  "Recent demand",
  "Existing model features",
  "Previous adjustments",
  "Inventory movements",
  "Related SKU movement",
] as const;
export type CheckedSource = (typeof evidenceSourcesChecked)[number];

export type SourceCheck = {
  source: CheckedSource;
  signal: "No signal" | "Weak signal" | "Clear signal" | "Contradicts event";
  reflectedPct: number;
};

export type Qualification = {
  confirmed: boolean;
  relevant: boolean;
  material: boolean;
  timeBound: boolean;
  measurable: boolean;
  credibleEvidence: boolean;
};

export const qualificationLabels: { key: keyof Qualification; label: string }[] = [
  { key: "confirmed", label: "Is it confirmed?" },
  { key: "relevant", label: "Is it relevant?" },
  { key: "material", label: "Is it material?" },
  { key: "timeBound", label: "Is it time-bound?" },
  { key: "measurable", label: "Is it measurable?" },
  { key: "credibleEvidence", label: "Is credible evidence available?" },
];

export function qualificationScore(q: Qualification) {
  return Object.values(q).filter(Boolean).length;
}

// ------------------------------------------------------------- event model
export type IntelEvent = {
  id: string;
  name: string;
  category: EventCategory;
  description: string;
  customer: string;
  skuScope: string;
  plantScope: string;
  startDate: string;
  endDate: string;
  recurrence: "One-time" | "Recurring";
  evidenceSource: string;
  evidenceLink: string;
  reliability: Reliability;
  probabilityPct: number;
  expectedImpact: number;
  impactUnit: ImpactUnit;
  pattern: ImpactPattern;
  curve: number[];
  owner: string;
  status: EventStatus;
  qualification: Qualification;
  reflection: ReflectionState;
  sourceChecks: SourceCheck[];
  createdAt: string;
  modifiedAt: string;
};

const q = (
  confirmed: boolean,
  relevant: boolean,
  material: boolean,
  timeBound: boolean,
  measurable: boolean,
  credibleEvidence: boolean,
): Qualification => ({ confirmed, relevant, material, timeBound, measurable, credibleEvidence });

const checks = (entries: [CheckedSource, SourceCheck["signal"], number][]): SourceCheck[] =>
  entries.map(([source, signal, reflectedPct]) => ({ source, signal, reflectedPct }));

const baseChecks = (reflected: number, contradictory = false): SourceCheck[] =>
  checks([
    ["Open orders", reflected > 0 ? "Clear signal" : "No signal", reflected],
    ["OEM/customer schedules", reflected > 20 ? "Clear signal" : "Weak signal", Math.round(reflected * 0.9)],
    ["Backlog", "Weak signal", Math.round(reflected * 0.4)],
    ["Purchase orders", reflected > 40 ? "Clear signal" : "No signal", Math.round(reflected * 0.6)],
    ["Recent demand", contradictory ? "Contradicts event" : "Weak signal", Math.round(reflected * 0.3)],
    ["Existing model features", "No signal", 0],
    ["Previous adjustments", reflected > 60 ? "Clear signal" : "No signal", Math.round(reflected * 0.5)],
    ["Inventory movements", "Weak signal", Math.round(reflected * 0.2)],
    ["Related SKU movement", contradictory ? "Contradicts event" : "No signal", 0],
  ]);

export const seedIntelEvents: IntelEvent[] = [
  {
    id: "ie-1",
    name: "Northvale OEM new-model launch (EV platform)",
    category: "Customer/OEM intelligence",
    description:
      "New EV platform nomination for wiring harness sets. No historical demand exists for this platform, so the statistical baseline cannot see it.",
    customer: "Northvale Motors (OEM)",
    skuScope: "Wiring harnesses · HRN-3300 family",
    plantScope: "Plant 03 — Sanand",
    startDate: "2026-09-01",
    endDate: "2027-03-31",
    recurrence: "One-time",
    evidenceSource: "Signed nomination letter + customer volume plan",
    evidenceLink: "attachment://nomination-northvale-ev.pdf",
    reliability: "Confirmed document",
    probabilityPct: 92,
    expectedImpact: 22,
    impactUnit: "Percentage",
    pattern: "Gradual ramp-up",
    curve: patternCurve("Gradual ramp-up", 22),
    owner: "Programme management",
    status: "Recommended",
    qualification: q(true, true, true, true, true, true),
    reflection: "Partially reflected",
    sourceChecks: baseChecks(35),
    createdAt: "2026-07-08 10:14",
    modifiedAt: "2026-07-23 16:02",
  },
  {
    id: "ie-2",
    name: "Plant 02 Chennai planned shutdown",
    category: "Confirmed calendar event",
    description:
      "Three-week press line requalification. Build-ahead in September, trough in October, recovery in November.",
    customer: "All customers",
    skuScope: "Transmission components",
    plantScope: "Plant 02 — Chennai",
    startDate: "2026-10-05",
    endDate: "2026-10-26",
    recurrence: "Recurring",
    evidenceSource: "Approved manufacturing calendar 2026-27",
    evidenceLink: "attachment://mfg-calendar-fy27.xlsx",
    reliability: "Confirmed document",
    probabilityPct: 98,
    expectedImpact: 12,
    impactUnit: "Percentage",
    pattern: "Pre-build, shutdown and recovery",
    curve: patternCurve("Pre-build, shutdown and recovery", 12),
    owner: "Manufacturing engineering",
    status: "Approved",
    qualification: q(true, true, true, true, true, true),
    reflection: "Fully reflected",
    sourceChecks: baseChecks(100),
    createdAt: "2026-05-19 09:30",
    modifiedAt: "2026-07-20 11:45",
  },
  {
    id: "ie-3",
    name: "Shutdown moved from November to December",
    category: "Operational event",
    description:
      "Kestrel confirmed the maintenance window moves one month later. Demand transfers between periods; horizon total is unchanged.",
    customer: "Kestrel Automotive (OEM)",
    skuScope: "Braking assemblies · BRK-1180-A, BRK-1204-C",
    plantScope: "Plant 01 — Pune",
    startDate: "2026-11-01",
    endDate: "2026-12-31",
    recurrence: "One-time",
    evidenceSource: "Customer schedule revision e-mail, 18 Jul 2026",
    evidenceLink: "attachment://kestrel-schedule-rev4.eml",
    reliability: "Direct customer input",
    probabilityPct: 85,
    expectedImpact: 9,
    impactUnit: "Percentage",
    pattern: "Multi-period demand transfer",
    curve: patternCurve("Multi-period demand transfer", 9),
    owner: "Customer account team",
    status: "Under review",
    qualification: q(true, true, true, true, true, true),
    reflection: "Partially reflected",
    sourceChecks: baseChecks(45),
    createdAt: "2026-07-18 14:22",
    modifiedAt: "2026-07-24 08:05",
  },
  {
    id: "ie-4",
    name: "Kestrel customer production schedule change",
    category: "Customer/OEM intelligence",
    description: "Weekly release quantities revised down 6% for Q4 following a model-year changeover.",
    customer: "Kestrel Automotive (OEM)",
    skuScope: "Braking assemblies",
    plantScope: "Plant 01 — Pune",
    startDate: "2026-10-01",
    endDate: "2026-12-31",
    recurrence: "Recurring",
    evidenceSource: "EDI 830 release schedule",
    evidenceLink: "attachment://edi830-kestrel-w29.txt",
    reliability: "Confirmed document",
    probabilityPct: 90,
    expectedImpact: -6,
    impactUnit: "Percentage",
    pattern: "Permanent baseline shift",
    curve: patternCurve("Permanent baseline shift", -6),
    owner: "Customer account team",
    status: "Approved",
    qualification: q(true, true, true, true, true, true),
    reflection: "Fully reflected",
    sourceChecks: baseChecks(96),
    createdAt: "2026-06-30 12:00",
    modifiedAt: "2026-07-21 17:31",
  },
  {
    id: "ie-5",
    name: "Raw-material constraint — high-grade steel",
    category: "Supply constraint",
    description:
      "Mill allocation cut limits achievable output for forged components. Demand is unchanged; servable volume is not.",
    customer: "All customers",
    skuScope: "Forged suspension components",
    plantScope: "Plant 01 — Pune, Plant 02 — Chennai",
    startDate: "2026-08-15",
    endDate: "2026-11-30",
    recurrence: "One-time",
    evidenceSource: "Supplier allocation notice",
    evidenceLink: "attachment://steel-allocation-notice.pdf",
    reliability: "Confirmed document",
    probabilityPct: 75,
    expectedImpact: -8,
    impactUnit: "Percentage",
    pattern: "Temporary dip",
    curve: patternCurve("Temporary dip", -8),
    owner: "Supply planning",
    status: "Under review",
    qualification: q(true, true, true, true, true, true),
    reflection: "Not reflected",
    sourceChecks: baseChecks(0),
    createdAt: "2026-07-11 08:44",
    modifiedAt: "2026-07-22 10:12",
  },
  {
    id: "ie-6",
    name: "Allocation change across aftermarket DCs",
    category: "Operational event",
    description: "DC North allocation rebalanced towards DC South; total aftermarket demand is unchanged.",
    customer: "Aftermarket Distributors",
    skuScope: "Filtration & consumables",
    plantScope: "DC North, DC South",
    startDate: "2026-09-01",
    endDate: "2026-12-31",
    recurrence: "One-time",
    evidenceSource: "Distribution network plan v3",
    evidenceLink: "attachment://dc-allocation-v3.xlsx",
    reliability: "Internal estimate",
    probabilityPct: 70,
    expectedImpact: 5,
    impactUnit: "Percentage",
    pattern: "Multi-period demand transfer",
    curve: patternCurve("Multi-period demand transfer", 5),
    owner: "Distribution planning",
    status: "Watchlist",
    qualification: q(false, true, false, true, true, false),
    reflection: "Unclear",
    sourceChecks: baseChecks(18),
    createdAt: "2026-07-15 15:09",
    modifiedAt: "2026-07-19 09:58",
  },
  {
    id: "ie-7",
    name: "List price increase, spare-parts catalogue",
    category: "Commercial event",
    description: "4.5% list price increase from September. Expect advance buying in August and softer offtake after.",
    customer: "Aftermarket Distributors",
    skuScope: "Aftermarket & Spares catalogue",
    plantScope: "All locations",
    startDate: "2026-09-01",
    endDate: "2026-11-30",
    recurrence: "One-time",
    evidenceSource: "Pricing committee minutes, 12 Jul 2026",
    evidenceLink: "attachment://pricing-committee-jul.pdf",
    reliability: "Confirmed document",
    probabilityPct: 88,
    expectedImpact: 11,
    impactUnit: "Percentage",
    pattern: "Advance buying then dip",
    curve: patternCurve("Advance buying then dip", 11),
    owner: "Pricing",
    status: "Recommended",
    qualification: q(true, true, true, true, true, true),
    reflection: "Conflicting",
    sourceChecks: baseChecks(30, true),
    createdAt: "2026-07-12 11:20",
    modifiedAt: "2026-07-24 07:40",
  },
  {
    id: "ie-8",
    name: "New braking safety regulation",
    category: "Regulatory event",
    description: "Draft norm may mandate an upgraded pad compound. Enforcement date is not confirmed.",
    customer: "All customers",
    skuScope: "Braking assemblies",
    plantScope: "All plants",
    startDate: "2027-01-01",
    endDate: "2027-12-31",
    recurrence: "One-time",
    evidenceSource: "Draft notification, industry association circular",
    evidenceLink: "attachment://draft-norm-circular.pdf",
    reliability: "Market rumour",
    probabilityPct: 35,
    expectedImpact: 7,
    impactUnit: "Percentage",
    pattern: "Delayed impact",
    curve: patternCurve("Delayed impact", 7),
    owner: "Regulatory affairs",
    status: "Watchlist",
    qualification: q(false, true, true, false, false, false),
    reflection: "Not reflected",
    sourceChecks: baseChecks(0),
    createdAt: "2026-06-28 16:50",
    modifiedAt: "2026-07-17 13:14",
  },
  {
    id: "ie-9",
    name: "Supplier disruption — Tier-2 casting vendor",
    category: "Market intelligence",
    description: "Unverified report of a fire at a Tier-2 casting vendor. Not corroborated by any order or schedule signal.",
    customer: "All customers",
    skuScope: "Transmission housings",
    plantScope: "Plant 02 — Chennai",
    startDate: "2026-08-01",
    endDate: "2026-09-30",
    recurrence: "One-time",
    evidenceSource: "Trade press report",
    evidenceLink: "attachment://trade-press-clip.html",
    reliability: "Market rumour",
    probabilityPct: 20,
    expectedImpact: -10,
    impactUnit: "Percentage",
    pattern: "Temporary dip",
    curve: patternCurve("Temporary dip", -10),
    owner: "Supply risk",
    status: "Draft",
    qualification: q(false, true, true, true, false, false),
    reflection: "Unclear",
    sourceChecks: baseChecks(5),
    createdAt: "2026-07-21 18:02",
    modifiedAt: "2026-07-21 18:02",
  },
  {
    id: "ie-10",
    name: "Product phase-out — legacy caliper variant",
    category: "Confirmed calendar event",
    description: "BRK-1204-C legacy variant withdrawn progressively as the successor part ramps.",
    customer: "Kestrel Automotive (OEM)",
    skuScope: "BRK-1204-C",
    plantScope: "Plant 01 — Pune",
    startDate: "2026-08-01",
    endDate: "2027-01-31",
    recurrence: "One-time",
    evidenceSource: "Product lifecycle board decision",
    evidenceLink: "attachment://plm-phaseout-brk1204c.pdf",
    reliability: "Confirmed document",
    probabilityPct: 95,
    expectedImpact: -20,
    impactUnit: "Percentage",
    pattern: "Gradual phase-out",
    curve: patternCurve("Gradual phase-out", 20),
    owner: "Product management",
    status: "Approved",
    qualification: q(true, true, true, true, true, true),
    reflection: "Partially reflected",
    sourceChecks: baseChecks(55),
    createdAt: "2026-06-10 10:00",
    modifiedAt: "2026-07-18 12:26",
  },
  {
    id: "ie-11",
    name: "Scenario-only: competitor exit in North region",
    category: "Scenario-only event",
    description:
      "Hypothesis used for planning conversations only. Never routed into the official forecast in this prototype.",
    customer: "Aftermarket Distributors",
    skuScope: "Filtration & consumables",
    plantScope: "DC North",
    startDate: "2026-10-01",
    endDate: "2027-03-31",
    recurrence: "One-time",
    evidenceSource: "Sales team hypothesis",
    evidenceLink: "attachment://none",
    reliability: "Internal estimate",
    probabilityPct: 30,
    expectedImpact: 15,
    impactUnit: "Percentage",
    pattern: "Gradual ramp-up",
    curve: patternCurve("Gradual ramp-up", 15),
    owner: "Aftermarket sales",
    status: "Watchlist",
    qualification: q(false, true, true, true, false, false),
    reflection: "Not reflected",
    sourceChecks: baseChecks(0),
    createdAt: "2026-07-05 09:15",
    modifiedAt: "2026-07-16 14:47",
  },
];

// ------------------------------------------------------------- reflection maths
export function reflectedShare(event: IntelEvent): number {
  const weighted = event.sourceChecks.reduce((sum, c) => sum + c.reflectedPct, 0) / event.sourceChecks.length;
  return Math.round(weighted);
}

export function residualImpact(event: IntelEvent): {
  expected: number;
  alreadyReflected: number;
  residual: number;
  applied: number;
  note: string;
} {
  const expected = event.expectedImpact;
  const share = reflectedShare(event) / 100;
  const alreadyReflected = Number((expected * share).toFixed(1));
  const residual = Number((expected - alreadyReflected).toFixed(1));
  switch (event.reflection) {
    case "Fully reflected":
      return { expected, alreadyReflected: expected, residual: 0, applied: 0, note: "Already in the data — explain the forecast, do not adjust it again." };
    case "Partially reflected":
      return { expected, alreadyReflected, residual, applied: residual, note: "Apply the residual only." };
    case "Not reflected":
      return { expected, alreadyReflected: 0, residual: expected, applied: expected, note: "Full expected impact can be applied." };
    default:
      return { expected, alreadyReflected, residual, applied: 0, note: "Manual review required before any adjustment is applied." };
  }
}

// ------------------------------------------------------------- routing logic
export type RoutingOutcome =
  | "Structured calendar/model input"
  | "Governed forecast adjustment"
  | "Scenario / watchlist only"
  | "No forecast change"
  | "Manual review required"
  | "Explanation only — no additional adjustment";

export const routingRules: { rule: string; outcome: RoutingOutcome }[] = [
  { rule: "Confirmed recurring event", outcome: "Structured calendar/model input" },
  { rule: "Confirmed one-time event", outcome: "Governed forecast adjustment" },
  { rule: "Uncertain event (probability or evidence below threshold)", outcome: "Scenario / watchlist only" },
  { rule: "Weak signal (rumour-grade evidence, low probability)", outcome: "No forecast change" },
  { rule: "Contradictory evidence across checked sources", outcome: "Manual review required" },
  { rule: "Impact already reflected in demand", outcome: "Explanation only — no additional adjustment" },
];

export function routeEvent(event: IntelEvent): { outcome: RoutingOutcome; reason: string } {
  const score = qualificationScore(event.qualification);
  if (event.category === "Scenario-only event")
    return { outcome: "Scenario / watchlist only", reason: "Scenario-only events never enter the official forecast." };
  if (event.reflection === "Conflicting" || event.sourceChecks.some((c) => c.signal === "Contradicts event"))
    return { outcome: "Manual review required", reason: "At least one checked source contradicts the stated event impact." };
  if (event.reflection === "Fully reflected")
    return { outcome: "Explanation only — no additional adjustment", reason: "Demand signals already carry the full expected impact." };
  if (event.reliability === "Market rumour" && event.probabilityPct < 50)
    return { outcome: "No forecast change", reason: "Weak signal: rumour-grade evidence with low probability." };
  if (!event.qualification.confirmed || event.probabilityPct < 65 || score < 5)
    return { outcome: "Scenario / watchlist only", reason: "Not yet confirmed or qualification checklist incomplete." };
  if (event.recurrence === "Recurring")
    return { outcome: "Structured calendar/model input", reason: "Confirmed recurring event — becomes a model calendar feature." };
  return { outcome: "Governed forecast adjustment", reason: "Confirmed one-time event — routes to a governed adjustment with approval." };
}

export const routingTone: Record<RoutingOutcome, "neutral" | "info" | "positive" | "warning" | "risk"> = {
  "Structured calendar/model input": "info",
  "Governed forecast adjustment": "positive",
  "Scenario / watchlist only": "warning",
  "No forecast change": "neutral",
  "Manual review required": "risk",
  "Explanation only — no additional adjustment": "neutral",
};

// ------------------------------------------------------------- scenarios
export const scenarioTypes = [
  "Best case",
  "Base case",
  "Worst case",
  "Event delayed",
  "Event cancelled",
  "Higher ramp-up",
  "Lower ramp-up",
  "Demand shock",
  "Supply-constrained case",
  "Custom scenario",
] as const;
export type ScenarioType = (typeof scenarioTypes)[number];

export type ScenarioSpec = {
  id: string;
  name: string;
  type: ScenarioType;
  owner: string;
  notes: string;
  assumptions: string[];
  linkedEventIds: string[];
  monthlyImpactPct: number[];
  capacityCapPct: number;
  promoted: boolean;
  createdAt: string;
};

export const seedScenarioSpecs: ScenarioSpec[] = [
  {
    id: "ss-1",
    name: "Base case — approved events only",
    type: "Base case",
    owner: "R. Iyer · Demand planning",
    notes: "Reference case. Mirrors the approved event set with no additional assumptions.",
    assumptions: ["Approved events applied at residual impact", "No capacity constraint", "Price unchanged"],
    linkedEventIds: ["ie-2", "ie-4", "ie-10"],
    monthlyImpactPct: [0, 0.5, 1, -1.5, 0.5, 1],
    capacityCapPct: 100,
    promoted: false,
    createdAt: "20 Jul 2026",
  },
  {
    id: "ss-2",
    name: "EV ramp two months late",
    type: "Event delayed",
    owner: "P. Rao · Programme planning",
    notes: "Customer tooling sign-off slips, pushing the harness ramp into November.",
    assumptions: ["Northvale EV ramp shifted +2 months", "Peak impact unchanged at 22%", "No pre-build"],
    linkedEventIds: ["ie-1"],
    monthlyImpactPct: [0, 0, 2, 6, 11, 16],
    capacityCapPct: 100,
    promoted: false,
    createdAt: "22 Jul 2026",
  },
  {
    id: "ss-3",
    name: "Steel allocation worsens to 80% capacity",
    type: "Supply-constrained case",
    owner: "A. Fernandes · Supply planning",
    notes: "Quantifies unmet demand if the mill allocation is cut further.",
    assumptions: ["Capacity capped at 80%", "Lead time +12 days", "Demand unchanged"],
    linkedEventIds: ["ie-5"],
    monthlyImpactPct: [0, -2, -5, -6, -4, -2],
    capacityCapPct: 80,
    promoted: false,
    createdAt: "23 Jul 2026",
  },
];

export type AdjustmentRequest = {
  id: string;
  title: string;
  origin: "Event" | "Scenario";
  originId: string;
  scope: string;
  requestedImpactPct: number;
  monthlyImpactPct: number[];
  owner: string;
  submittedAt: string;
  status: "Awaiting approval" | "Approved" | "Rejected";
  note: string;
};

export const seedAdjustmentRequests: AdjustmentRequest[] = [
  {
    id: "ar-1",
    title: "Northvale EV ramp — residual adjustment",
    origin: "Event",
    originId: "ie-1",
    scope: "Wiring harnesses · Plant 03 — Sanand",
    requestedImpactPct: 14.3,
    monthlyImpactPct: patternCurve("Gradual ramp-up", 14.3),
    owner: "Programme management",
    submittedAt: "23 Jul 2026, 16:05",
    status: "Awaiting approval",
    note: "Residual after 35% of the impact was found in open orders and customer schedules.",
  },
];
