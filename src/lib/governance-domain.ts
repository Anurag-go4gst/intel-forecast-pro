/**
 * Governance domain: approval queue, forecast versioning, forecast value add,
 * champion/challenger monitoring, assistant evidence and the global audit log.
 *
 * Illustrative prototype data only — nothing here is connected to a live
 * ERP, MRP, planning or data-science system.
 */

import { horizonMonths } from "@/lib/event-domain";

// ------------------------------------------------------------- approval queue

export const approvalStatuses = [
  "Awaiting approval",
  "Approved",
  "Rejected",
  "Returned for clarification",
] as const;
export type ApprovalStatus = (typeof approvalStatuses)[number];

export const approvalTone: Record<ApprovalStatus, "neutral" | "info" | "positive" | "warning" | "risk"> = {
  "Awaiting approval": "warning",
  Approved: "positive",
  Rejected: "risk",
  "Returned for clarification": "info",
};

export const confidenceLevels = ["High", "Medium", "Low"] as const;
export type ConfidenceLevel = (typeof confidenceLevels)[number];

export type ApprovalComment = {
  id: string;
  author: string;
  at: string;
  body: string;
};

export type EvidenceItem = {
  label: string;
  source: string;
  detail: string;
};

export type ApprovalItem = {
  id: string;
  sku: string;
  description: string;
  customer: string;
  location: string;
  family: string;
  baseline: number;
  eventAdjustment: number;
  plannerOverride: number;
  reason: string;
  evidence: EvidenceItem[];
  confidence: ConfidenceLevel;
  requestor: string;
  approver: string;
  status: ApprovalStatus;
  origin: "Planner override" | "Event routing" | "Scenario promotion" | "Model challenger";
  comments: ApprovalComment[];
  monthly: number[];
};

export function proposedFinal(item: ApprovalItem) {
  return item.baseline + item.eventAdjustment + item.plannerOverride;
}

export function changePct(item: ApprovalItem) {
  return ((proposedFinal(item) - item.baseline) / (item.baseline || 1)) * 100;
}

const monthly = (total: number, shape: number[]) =>
  shape.map((s) => Math.round((total * s) / shape.reduce((a, b) => a + b, 0)));

const queueBase: Omit<ApprovalItem, "comments">[] = [
  {
    id: "aq-0",
    sku: "CLT-1048",
    description: "Clutch Friction Assembly",
    customer: "Apex Motors",
    location: "North Plant — Coimbatore",
    family: "Clutch systems",
    baseline: 141_600,
    eventAdjustment: -6_800,
    plannerOverride: -2_400,
    reason:
      "Confirmed shutdown moved from September to October. September demand restored, residual October reduction applied after the open-order check, November catch-up added. Planner trims a further 1.7% for ramp-down inefficiency on the first week back.",
    evidence: [
      { label: "Apex OEM schedule revision R-14", source: "Customer schedules", detail: "October shutdown confirmed, September running at full rate." },
      { label: "Event IE-0 double-counting check", source: "Event Intelligence", detail: "31% of the October reduction already visible in open orders; only the residual 69% is applied." },
      { label: "Open order book snapshot", source: "Open orders", detail: "October releases already 14% below the historical October rate." },
    ],
    confidence: "High",
    requestor: "R. Iyer · Demand planner",
    approver: "S. Kulkarni · Demand planning lead",
    status: "Awaiting approval",
    origin: "Event routing",
    monthly: monthly(132_400, [1.0, 1.02, 1.06, 0.62, 1.18, 1.04]),
  },
  {
    id: "aq-8",
    sku: "CLT-1052-B",
    description: "Clutch pressure plate, 240mm",
    customer: "Apex Motors",
    location: "North Plant — Coimbatore",
    family: "Clutch systems",
    baseline: 58_400,
    eventAdjustment: 4_900,
    plannerOverride: 0,
    reason: "November catch-up build raises pressure-plate pull in line with the friction assembly.",
    evidence: [
      { label: "Event IE-12 qualification", source: "Event Intelligence", detail: "Direct customer input, probability 88%." },
      { label: "Apex production plan v7", source: "Customer communication", detail: "Catch-up build scheduled 03–21 Nov 26." },
    ],
    confidence: "High",
    requestor: "Event routing engine",
    approver: "M. Bhatt · S&OP manager",
    status: "Awaiting approval",
    origin: "Event routing",
    monthly: monthly(63_300, [1, 1, 1.04, 0.7, 1.2, 1.06]),
  },
  {
    id: "aq-9",
    sku: "FLT-8214-B",
    description: "Cabin air filter, activated carbon",
    customer: "Aftermarket network",
    location: "DC North",
    family: "Filtration",
    baseline: 88_700,
    eventAdjustment: 6_600,
    plannerOverride: 0,
    reason: "Festive restocking programme confirmed by the channel team, net of prior-year pull-forward.",
    evidence: [
      { label: "Channel restocking plan FY27", source: "Commercial calendar", detail: "Distributor allocations issued 18 Jul 26." },
      { label: "Prior festive uplift", source: "Sales history", detail: "Comparable programme delivered +7.4% net." },
    ],
    confidence: "Medium",
    requestor: "N. Bose · Aftermarket planner",
    approver: "M. Bhatt · S&OP manager",
    status: "Awaiting approval",
    origin: "Event routing",
    monthly: monthly(95_300, [0.95, 0.98, 1.08, 1.12, 1.0, 0.92]),
  },
  {
    id: "aq-10",
    sku: "SUS-7001-A",
    description: "Front strut module",
    customer: "Meridian Motors",
    location: "Pune Plant 2",
    family: "Suspension",
    baseline: 31_200,
    eventAdjustment: 0,
    plannerOverride: 5_300,
    reason: "State transport tender expected to convert; promoted from the upside scenario for review.",
    evidence: [
      { label: "Scenario SS-3 promotion", source: "What-if scenarios", detail: "Promoted for review only; not an approved operational forecast." },
    ],
    confidence: "Low",
    requestor: "K. Shah · Demand planner",
    approver: "S. Kulkarni · Demand planning lead",
    status: "Returned for clarification",
    origin: "Scenario promotion",
    monthly: monthly(36_500, [0.9, 0.95, 1.1, 1.15, 1.0, 0.95]),
  },
  {
    id: "aq-11",
    sku: "HRN-5102-A",
    description: "Main body wiring harness",
    customer: "Northvale Motors",
    location: "Sanand Plant 3",
    family: "Wiring harnesses",
    baseline: 47_800,
    eventAdjustment: 9_100,
    plannerOverride: -1_600,
    reason: "EV platform ramp residual impact applied; planner trims for supplier qualification lag.",
    evidence: [
      { label: "Programme ramp curve", source: "Programme management", detail: "Volume steps up from Sep 26 over four months." },
      { label: "Supplier readiness note", source: "Supply planning", detail: "Second-source qualification completes mid-October." },
    ],
    confidence: "Medium",
    requestor: "P. Rao · Programme planner",
    approver: "M. Bhatt · S&OP manager",
    status: "Awaiting approval",
    origin: "Event routing",
    monthly: monthly(55_300, [0.92, 0.96, 1.05, 1.1, 1.12, 1.15]),
  },

  {
    id: "aq-1",
    sku: "HRN-4420-B",
    description: "Engine bay wiring harness",
    customer: "Meridian Motors",
    location: "Pune Plant 2",
    family: "Wiring harnesses",
    baseline: 184_500,
    eventAdjustment: 22_100,
    plannerOverride: 9_400,
    reason: "Confirmed OEM programme ramp plus dealer restocking after the festive dip.",
    evidence: [
      { label: "OEM release schedule R-88213", source: "Customer schedules", detail: "Weekly releases up 11.8% from Sep 26." },
      { label: "Event EV-204 qualification", source: "Event Intelligence", detail: "Confirmed document, residual impact +8.2% after double-count check." },
      { label: "Backlog snapshot", source: "Order backlog", detail: "17.4k units already on firm order for Aug–Sep." },
    ],
    confidence: "High",
    requestor: "R. Iyer · Demand planner",
    approver: "S. Kulkarni · Demand planning lead",
    status: "Awaiting approval",
    origin: "Event routing",
    monthly: monthly(216_000, [1, 1.05, 1.18, 1.2, 1.1, 1.02]),
  },
  {
    id: "aq-2",
    sku: "BRK-1180-A",
    description: "Front brake caliper assembly",
    customer: "Northline Auto",
    location: "Chennai Plant 1",
    family: "Braking assemblies",
    baseline: 96_200,
    eventAdjustment: -4_300,
    plannerOverride: -11_800,
    reason: "Planner expects a slower recovery than the statistical model after the Q2 line changeover.",
    evidence: [
      { label: "Planner note", source: "Planner judgement", detail: "No supporting document attached." },
    ],
    confidence: "Low",
    requestor: "A. Fernandes · Demand planner",
    approver: "S. Kulkarni · Demand planning lead",
    status: "Awaiting approval",
    origin: "Planner override",
    monthly: monthly(80_100, [1.1, 1.05, 0.95, 0.94, 0.98, 1.0]),
  },
  {
    id: "aq-3",
    sku: "TRN-3305-C",
    description: "Transmission shift fork",
    customer: "Vantage Commercial",
    location: "Pune Plant 2",
    family: "Transmission",
    baseline: 61_400,
    eventAdjustment: 0,
    plannerOverride: 7_900,
    reason: "Tender win expected to convert in October; commercial team requested a build-ahead.",
    evidence: [
      { label: "Tender pipeline extract", source: "Commercial CRM", detail: "Probability 55%, decision date 12 Sep 26." },
      { label: "Capacity note", source: "Supply planning", detail: "Pune Plant 2 has 6% spare capacity in Sep." },
    ],
    confidence: "Medium",
    requestor: "D. Rao · Key account planner",
    approver: "M. Bhatt · S&OP manager",
    status: "Awaiting approval",
    origin: "Scenario promotion",
    monthly: monthly(69_300, [0.9, 0.95, 1.15, 1.2, 1.0, 0.95]),
  },
  {
    id: "aq-4",
    sku: "SUS-2210-D",
    description: "Rear suspension bush kit",
    customer: "Meridian Motors",
    location: "Nashik Plant 4",
    family: "Suspension",
    baseline: 44_800,
    eventAdjustment: 3_200,
    plannerOverride: 0,
    reason: "Aftermarket promotion approved by the commercial committee.",
    evidence: [
      { label: "Promotion calendar PR-1142", source: "Commercial calendar", detail: "Two-week trade scheme in Nov 26." },
      { label: "Prior promotion uplift", source: "Sales history", detail: "Comparable scheme delivered +6.9% net of pull-forward." },
    ],
    confidence: "High",
    requestor: "Event routing engine",
    approver: "M. Bhatt · S&OP manager",
    status: "Approved",
    origin: "Event routing",
    monthly: monthly(48_000, [0.95, 0.95, 1.0, 1.02, 1.18, 0.95]),
  },
  {
    id: "aq-5",
    sku: "HRN-4102-A",
    description: "Cabin harness sub-assembly",
    customer: "Northline Auto",
    location: "Chennai Plant 1",
    family: "Wiring harnesses",
    baseline: 128_700,
    eventAdjustment: 0,
    plannerOverride: 26_500,
    reason: "Planner applied a +20.6% uplift citing a verbal customer indication.",
    evidence: [],
    confidence: "Low",
    requestor: "A. Fernandes · Demand planner",
    approver: "S. Kulkarni · Demand planning lead",
    status: "Returned for clarification",
    origin: "Planner override",
    monthly: monthly(155_200, [1, 1.1, 1.15, 1.15, 1.05, 1]),
  },
  {
    id: "aq-6",
    sku: "TRN-3390-B",
    description: "Gear selector housing",
    customer: "Vantage Commercial",
    location: "Nashik Plant 4",
    family: "Transmission",
    baseline: 38_900,
    eventAdjustment: -6_100,
    plannerOverride: 0,
    reason: "Customer shutdown confirmed for the first two weeks of December.",
    evidence: [
      { label: "Customer shutdown notice", source: "Customer communication", detail: "Signed notice dated 04 Jul 26." },
      { label: "Schedule reconciliation", source: "Customer schedules", detail: "Only 40% of the reduction already visible in releases." },
    ],
    confidence: "High",
    requestor: "Event routing engine",
    approver: "M. Bhatt · S&OP manager",
    status: "Awaiting approval",
    origin: "Event routing",
    monthly: monthly(32_800, [1.05, 1.05, 1.05, 1.0, 0.95, 0.6]),
  },
  {
    id: "aq-7",
    sku: "BRK-1240-E",
    description: "Brake disc rotor 280mm",
    customer: "Aftermarket network",
    location: "Chennai Plant 1",
    family: "Braking assemblies",
    baseline: 72_300,
    eventAdjustment: 0,
    plannerOverride: -18_100,
    reason: "Planner requested a cut based on a competitor price action rumour.",
    evidence: [
      { label: "Market rumour log", source: "Market intelligence", detail: "Single unverified trade-press mention." },
    ],
    confidence: "Low",
    requestor: "R. Iyer · Demand planner",
    approver: "S. Kulkarni · Demand planning lead",
    status: "Rejected",
    origin: "Planner override",
    monthly: monthly(54_200, [1, 0.98, 0.95, 0.92, 0.9, 0.9]),
  },
];

export const seedComments: Record<string, ApprovalComment[]> = {
  "aq-2": [
    {
      id: "cm-1",
      author: "S. Kulkarni · Demand planning lead",
      at: "22 Jul 26, 11:04",
      body: "A -16.7% cut needs a documented reason. Please attach the changeover plan before I can approve.",
    },
  ],
  "aq-5": [
    {
      id: "cm-2",
      author: "S. Kulkarni · Demand planning lead",
      at: "21 Jul 26, 16:40",
      body: "Returned: verbal indication is not sufficient evidence for a +20.6% change. Request a written schedule.",
    },
  ],
};

export const seedApprovalQueue: ApprovalItem[] = queueBase.map((item) => ({
  ...item,
  comments: seedComments[item.id] ?? [],
}));

// ------------------------------------------------------------- versioning

export type VersionStatus = "Superseded" | "Published" | "Working draft";

export type ForecastVersionRecord = {
  id: string;
  label: string;
  cycle: string;
  status: VersionStatus;
  createdBy: string;
  createdAt: string;
  totalUnits: number;
  note: string;
};

export const seedVersions: ForecastVersionRecord[] = [
  {
    id: "v-2026-05",
    label: "V2026.05",
    cycle: "May 2026 cycle",
    status: "Superseded",
    createdBy: "S. Kulkarni",
    createdAt: "28 May 26, 18:12",
    totalUnits: 612_400,
    note: "Pre-monsoon plan. Superseded by V2026.06.",
  },
  {
    id: "v-2026-06",
    label: "V2026.06",
    cycle: "June 2026 cycle",
    status: "Published",
    createdBy: "S. Kulkarni",
    createdAt: "26 Jun 26, 17:35",
    totalUnits: 638_900,
    note: "Current operational forecast consumed by ERP, MRP and the supplier portal.",
  },
  {
    id: "v-2026-07",
    label: "V2026.07",
    cycle: "July 2026 cycle",
    status: "Working draft",
    createdBy: "You · Demand planning lead",
    createdAt: "Today (prototype session)",
    totalUnits: 661_300,
    note: "Draft under consensus review. Publication is blocked until the queue is cleared.",
  },
];

export type BridgeStep = {
  label: string;
  delta: number;
  kind: "start" | "step" | "end";
  explanation: string;
};

export function versionBridge(overrideDelta: number): BridgeStep[] {
  return [
    { label: "V2026.06 published", delta: 638_900, kind: "start", explanation: "Last operational forecast released to ERP." },
    { label: "Actuals re-basing", delta: 7_800, kind: "step", explanation: "June dispatches came in above plan; history re-fitted." },
    { label: "Statistical model refresh", delta: -4_200, kind: "step", explanation: "Champion re-selection reduced the seasonal peak for transmission." },
    { label: "Approved event impact", delta: 14_900, kind: "step", explanation: "Net residual impact of approved events after double-count checks." },
    { label: "Planner overrides", delta: Math.round(overrideDelta), kind: "step", explanation: "Approved planner judgement recorded in the approval queue." },
    { label: "V2026.07 draft", delta: 0, kind: "end", explanation: "Proposed operational forecast for the July cycle." },
  ];
}

// ------------------------------------------------------------- forecast value add

export type FvaLayer = {
  id: string;
  layer: string;
  wape: number;
  bias: number;
  description: string;
};

export const fvaLayers: FvaLayer[] = [
  { id: "fva-naive", layer: "Naïve (last period)", wape: 24.6, bias: 3.1, description: "Reference point. Every later layer must beat this to justify its cost." },
  { id: "fva-stat", layer: "Statistical baseline", wape: 15.2, bias: -1.4, description: "Champion model output before any human or event input." },
  { id: "fva-event", layer: "Event-aware forecast", wape: 12.8, bias: -0.9, description: "Statistical baseline plus approved event residual impact." },
  { id: "fva-planner", layer: "Planner override", wape: 13.6, bias: 2.2, description: "Planner judgement applied on top of the event-aware forecast." },
  { id: "fva-final", layer: "Approved final forecast", wape: 12.4, bias: 0.6, description: "Post-review forecast after low-evidence overrides were rejected." },
];

export function fvaAgainst(referenceId: string) {
  const ref = fvaLayers.find((l) => l.id === referenceId) ?? fvaLayers[0];
  return fvaLayers.map((l) => ({ ...l, valueAdd: Number((ref.wape - l.wape).toFixed(1)) }));
}

// ------------------------------------------------------------- champion / challenger

export type ChampionChallenger = {
  segment: string;
  champion: string;
  challenger: string;
  championWape: number;
  challengerWape: number;
  folds: number;
  verdict: "Hold champion" | "Promote challenger" | "Insufficient evidence";
  note: string;
};

export const championChallenger: ChampionChallenger[] = [
  {
    segment: "Wiring harnesses · OEM",
    champion: "XGBoost (event features)",
    challenger: "Prophet (holiday regressors)",
    championWape: 11.4,
    challengerWape: 12.9,
    folds: 6,
    verdict: "Hold champion",
    note: "Challenger did not beat the champion on any of the six rolling folds.",
  },
  {
    segment: "Braking assemblies · Aftermarket",
    champion: "SARIMA",
    challenger: "XGBoost (event features)",
    championWape: 17.8,
    challengerWape: 14.1,
    folds: 6,
    verdict: "Promote challenger",
    note: "Challenger wins 5 of 6 folds with a lower bias; promotion recorded in the audit log.",
  },
  {
    segment: "Transmission · Export",
    champion: "Croston (intermittent)",
    challenger: "Seasonal naïve",
    championWape: 31.2,
    challengerWape: 30.6,
    folds: 3,
    verdict: "Insufficient evidence",
    note: "Only three folds available and the gap is inside the noise band; no change made.",
  },
];

// ------------------------------------------------------------- assistant

export type AssistantEvidence = {
  label: string;
  source: string;
  reference: string;
};

export type AssistantIntent = {
  id: string;
  match: string[];
  question: string;
  answer: string;
  evidence: AssistantEvidence[];
};

export const assistantIntents: AssistantIntent[] = [
  {
    id: "ai-change",
    match: ["why", "change", "increase", "increased", "moved", "higher"],
    question: "Why did the forecast increase for wiring harnesses?",
    answer:
      "The wiring harness forecast for the July cycle is **+11.6%** above the June published version.\n\nThe movement decomposes as: statistical re-basing **+1.3%**, approved event impact **+8.2%** (OEM programme ramp EV-204), and an approved planner override **+2.1%** for dealer restocking. No other change contributed more than half a percentage point.",
    evidence: [
      { label: "Event EV-204 residual impact", source: "Event Intelligence", reference: "Confirmed document · +8.2% after double-count check" },
      { label: "Approval AQ-1", source: "Forecast Review", reference: "Planner override +9,400 units, High confidence" },
      { label: "Version bridge V2026.06 → V2026.07", source: "Forecast versions", reference: "Statistical refresh −4,200 units" },
    ],
  },
  {
    id: "ai-stockout",
    match: ["stockout", "shortage", "cover", "risk of running out"],
    question: "Which SKUs are at stockout risk this quarter?",
    answer:
      "Four combinations are flagged **high stockout risk** on the current draft: HRN-4420-B (11 days cover), BRK-1180-A (13 days), TRN-3305-C (14 days) and HRN-4102-A (14 days).\n\nThe largest financial exposure is HRN-4420-B at ₹4.2 Cr, driven by the OEM ramp landing inside the component lead time.",
    evidence: [
      { label: "Risk register", source: "Performance Monitoring", reference: "Cover days below the 15-day threshold" },
      { label: "Supplier lead times", source: "Data Readiness certified inputs", reference: "45-day lead time on harness looms" },
    ],
  },
  {
    id: "ai-model",
    match: ["model", "selected", "champion", "challenger", "algorithm"],
    question: "Which model was selected for BRK-1180-A and why?",
    answer:
      "BRK-1180-A currently runs on **SARIMA**, but the challenger **XGBoost (event features)** won 5 of 6 rolling-origin folds with WAPE 14.1% versus 17.8%.\n\nSelection is not made on MAPE alone: the policy requires a MASE below 1, bias inside ±2%, and a win on the majority of folds. The challenger meets all three, so promotion is recommended for the next cycle.",
    evidence: [
      { label: "Champion/challenger board", source: "Performance Monitoring", reference: "Braking assemblies · Aftermarket segment" },
      { label: "Rolling-origin backtest", source: "Model Comparison", reference: "6 folds, holdout horizon 3 months" },
    ],
  },
  {
    id: "ai-bias",
    match: ["bias", "over-forecast", "under-forecast", "consistently"],
    question: "Where do we have persistent forecast bias?",
    answer:
      "Two families breach the ±2% bias tolerance: wiring harnesses at **+6.1%** (persistent over-forecast, six consecutive cycles) and braking assemblies at **-4.2%** (under-forecast, four cycles).\n\nThe harness bias sits almost entirely in the planner override layer — forecast value add shows overrides making WAPE worse by 0.8 points before review corrections.",
    evidence: [
      { label: "Bias by product family", source: "Performance Monitoring", reference: "Rolling six-cycle measurement" },
      { label: "Forecast value add", source: "Performance Monitoring", reference: "Planner layer WAPE 13.6% vs event-aware 12.8%" },
    ],
  },
  {
    id: "ai-publication",
    match: ["publish", "publication", "blocking", "blocked", "approval"],
    question: "Summarise what is blocking publication.",
    answer:
      "Publication of **V2026.07** is blocked by the approval queue. Items awaiting a decision must be approved, rejected or returned before the version can be released to ERP, MRP and the supplier portal.\n\nTwo of the open items carry **Low** confidence with no attached evidence, which the review policy treats as automatically non-approvable.",
    evidence: [
      { label: "Approval queue", source: "Forecast Review", reference: "Open items with status Awaiting approval" },
      { label: "Publication policy", source: "Governance rules", reference: "Zero open items required before release" },
    ],
  },
  {
    id: "ai-scenario",
    match: ["scenario", "what if", "what happens", "simulate", "promote"],
    question: "Can I publish a scenario as the operational forecast?",
    answer:
      "**No.** A scenario is a simulation and is never an operational forecast.\n\nA scenario can only influence the plan through *Promote for review*, which raises an adjustment request into the approval queue. The request then needs evidence, a requestor, an approver and an explicit approval before any number reaches the published version.",
    evidence: [
      { label: "Scenario governance rule", source: "What-if Scenarios", reference: "Scenarios are excluded from published versions" },
      { label: "Adjustment request workflow", source: "Forecast Review", reference: "Origin: Scenario promotion" },
    ],
  },
];

export const assistantGuardrails = [
  "Answers are generated from seeded prototype data, never from a live system.",
  "Every quantitative claim must cite the screen and record it came from.",
  "The assistant cannot approve, reject, publish or change a forecast.",
  "A scenario is never described as an approved operational forecast.",
  "Where the required record is unavailable, the answer is “Insufficient evidence”.",
];

export const insufficientEvidence =
  "**Insufficient evidence.**\n\nI do not hold a certified record that answers this question for the current planning scope. Nothing in this prototype's seeded data covers it, and I will not infer a number that has no source.\n\nTry one of the suggested questions, or narrow the scope using the global filters.";

export function answerQuestion(question: string) {
  const q = question.toLowerCase();
  const scored = assistantIntents
    .map((intent) => ({ intent, hits: intent.match.filter((m) => q.includes(m)).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  return scored.length ? scored[0].intent : null;
}

// ------------------------------------------------------------- audit log

export const auditActions = [
  "Data upload",
  "Data transformation",
  "Model run",
  "Model selection",
  "Event created",
  "Event modified",
  "Scenario promotion",
  "Forecast adjustment",
  "Planner override",
  "Approval",
  "Rejection",
  "Forecast publication",
] as const;
export type AuditAction = (typeof auditActions)[number];

export const auditTone: Record<AuditAction, "neutral" | "info" | "positive" | "warning" | "risk"> = {
  "Data upload": "info",
  "Data transformation": "warning",
  "Model run": "neutral",
  "Model selection": "info",
  "Event created": "info",
  "Event modified": "warning",
  "Scenario promotion": "info",
  "Forecast adjustment": "warning",
  "Planner override": "warning",
  Approval: "positive",
  Rejection: "risk",
  "Forecast publication": "positive",
};

export type AuditEntry = {
  id: string;
  at: string;
  date: string;
  user: string;
  action: AuditAction;
  sku: string;
  customer: string;
  version: string;
  detail: string;
};

export const auditUsers = [
  "S. Kulkarni · Demand planning lead",
  "R. Iyer · Demand planner",
  "A. Fernandes · Demand planner",
  "D. Rao · Key account planner",
  "M. Bhatt · S&OP manager",
  "Platform · Automated job",
];

export const seedAuditLog: AuditEntry[] = [
  { id: "al-1", at: "24 Jul 26, 09:12", date: "2026-07-24", user: "R. Iyer · Demand planner", action: "Data upload", sku: "—", customer: "All", version: "V2026.07", detail: "Uploaded demand_history_jul26.xlsx (48,210 rows) for the July cycle." },
  { id: "al-2", at: "24 Jul 26, 09:26", date: "2026-07-24", user: "Platform · Automated job", action: "Data transformation", sku: "HRN-4420-B", customer: "Meridian Motors", version: "V2026.07", detail: "Outlier at Feb 26 capped from 41,900 to 28,400 units (3.2 sigma)." },
  { id: "al-3", at: "24 Jul 26, 09:27", date: "2026-07-24", user: "Platform · Automated job", action: "Data transformation", sku: "BRK-1240-E", customer: "Aftermarket network", version: "V2026.07", detail: "12 missing weeks interpolated using the seasonal profile." },
  { id: "al-4", at: "24 Jul 26, 10:02", date: "2026-07-24", user: "Platform · Automated job", action: "Model run", sku: "All", customer: "All", version: "V2026.07", detail: "Baseline run across 1,284 series; 9 candidate models per series; 11 min 42 s." },
  { id: "al-5", at: "24 Jul 26, 10:44", date: "2026-07-24", user: "S. Kulkarni · Demand planning lead", action: "Model selection", sku: "BRK-1180-A", customer: "Northline Auto", version: "V2026.07", detail: "Champion held as SARIMA pending challenger review." },
  { id: "al-6", at: "24 Jul 26, 11:15", date: "2026-07-24", user: "D. Rao · Key account planner", action: "Event created", sku: "HRN-4420-B", customer: "Meridian Motors", version: "V2026.07", detail: "EV-204 OEM programme ramp created from a confirmed release schedule." },
  { id: "al-7", at: "24 Jul 26, 14:31", date: "2026-07-24", user: "D. Rao · Key account planner", action: "Event modified", sku: "HRN-4420-B", customer: "Meridian Motors", version: "V2026.07", detail: "Residual impact reduced from +12.0% to +8.2% after the double-counting check." },
  { id: "al-8", at: "25 Jul 26, 08:55", date: "2026-07-25", user: "A. Fernandes · Demand planner", action: "Planner override", sku: "HRN-4102-A", customer: "Northline Auto", version: "V2026.07", detail: "+26,500 units applied citing a verbal customer indication; no document attached." },
  { id: "al-9", at: "25 Jul 26, 09:10", date: "2026-07-25", user: "S. Kulkarni · Demand planning lead", action: "Rejection", sku: "BRK-1240-E", customer: "Aftermarket network", version: "V2026.07", detail: "Rejected -18,100 unit override: market rumour is not admissible evidence." },
  { id: "al-10", at: "25 Jul 26, 11:48", date: "2026-07-25", user: "M. Bhatt · S&OP manager", action: "Scenario promotion", sku: "TRN-3305-C", customer: "Vantage Commercial", version: "V2026.07", detail: "Scenario “Tender win — Vantage” promoted to an adjustment request (not published)." },
  { id: "al-11", at: "25 Jul 26, 15:20", date: "2026-07-25", user: "M. Bhatt · S&OP manager", action: "Approval", sku: "SUS-2210-D", customer: "Meridian Motors", version: "V2026.07", detail: "Approved +3,200 unit promotion uplift with two evidence items attached." },
  { id: "al-12", at: "25 Jul 26, 16:05", date: "2026-07-25", user: "R. Iyer · Demand planner", action: "Forecast adjustment", sku: "TRN-3390-B", customer: "Vantage Commercial", version: "V2026.07", detail: "December volume reduced by 6,100 units for the confirmed customer shutdown." },
  { id: "al-13", at: "26 Jun 26, 17:35", date: "2026-06-26", user: "S. Kulkarni · Demand planning lead", action: "Forecast publication", sku: "All", customer: "All", version: "V2026.06", detail: "Published 638,900 units to ERP, MRP and the supplier portal." },
  { id: "al-14", at: "26 Jun 26, 16:58", date: "2026-06-26", user: "S. Kulkarni · Demand planning lead", action: "Approval", sku: "All", customer: "All", version: "V2026.06", detail: "Consensus sign-off recorded for the June cycle (18 lines)." },
  { id: "al-15", at: "28 May 26, 18:12", date: "2026-05-28", user: "S. Kulkarni · Demand planning lead", action: "Forecast publication", sku: "All", customer: "All", version: "V2026.05", detail: "Published 612,400 units; superseded by V2026.06." },
];

export const auditVersions = ["V2026.05", "V2026.06", "V2026.07"];

export { horizonMonths };
