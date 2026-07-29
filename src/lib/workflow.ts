/**
 * The authoritative end-to-end forecasting workflow.
 *
 * Every screen in the platform belongs to exactly one stage of this lifecycle.
 * The workflow rail, the per-screen primary/back actions and the guided demo
 * all read from this single definition so navigation can never drift from the
 * documented process.
 *
 * Illustrative prototype only — no production data or model training.
 */

export type StageId =
  | "project"
  | "upload"
  | "resolve"
  | "dataset"
  | "validation"
  | "tournament"
  | "champion"
  | "baseline"
  | "events"
  | "scenarios"
  | "review"
  | "approve"
  | "monitor";

export type WorkflowStage = {
  id: StageId;
  step: number;
  label: string;
  short: string;
  route: string;
  search?: Record<string, string>;
  phase: "Prepare data" | "Build baseline" | "Apply judgement" | "Govern & monitor";
  purpose: string;
  /** Guided-demo narration. */
  whatYouSee: string;
  whyItMatters: string;
  decision: string;
  nextStep: string;
  primaryLabel: string;
};

export const workflowStages: WorkflowStage[] = [
  {
    id: "project",
    step: 1,
    label: "Create forecasting project",
    short: "Project",
    route: "/project",
    phase: "Prepare data",
    purpose: "Name the forecasting cycle, set granularity, horizon and time bucket.",
    whatYouSee:
      "The project definition for the July 2026 operational cycle: monthly buckets, SKU × customer × plant granularity and a 12-month horizon.",
    whyItMatters:
      "Granularity and horizon decide which models are eligible and how accuracy will later be measured. Changing them mid-cycle invalidates every comparison.",
    decision: "Confirm the forecasting granularity, bucket and horizon for this cycle.",
    nextStep: "Upload the demand history extract and map its columns.",
    primaryLabel: "Create project and continue to data upload",
  },
  {
    id: "upload",
    step: 2,
    label: "Upload and map data",
    short: "Upload & map",
    route: "/data-readiness",
    phase: "Prepare data",
    purpose: "Load the extract and state exactly which column carries each demand signal.",
    whatYouSee:
      "The uploaded ERP extract, a file preview and the column-mapping panel where each source column is bound to a platform field.",
    whyItMatters:
      "Confirmed orders, dispatch and billing are not the same as customer demand. Mapping the wrong column silently forecasts the wrong quantity.",
    decision: "Confirm which field represents customer demand, orders, dispatch, billing, backlog, lost demand, inventory and stockout status.",
    nextStep: "Work through the data-quality issues the platform detected.",
    primaryLabel: "Confirm mapping and continue to data-quality issues",
  },
  {
    id: "resolve",
    step: 3,
    label: "Resolve data-quality issues",
    short: "Resolve issues",
    route: "/data-readiness",
    phase: "Prepare data",
    purpose: "Clear blocking issues and record a decision for every important issue.",
    whatYouSee:
      "Detected issues grouped as blocking, important, warning and informational, each with its forecasting consequence and the resolution options available.",
    whyItMatters:
      "Unresolved blocking issues corrupt the history the model learns from. Nothing is corrected silently — every decision is recorded and reversible.",
    decision: "For each issue: accept the suggested correction, edit it, keep the original, mark it as an exceptional event, exclude it, or assign it for review.",
    nextStep: "Certify the dataset as forecast-ready.",
    primaryLabel: "Continue to dataset approval",
  },
  {
    id: "dataset",
    step: 4,
    label: "Approve forecast-ready dataset",
    short: "Approve dataset",
    route: "/data-readiness",
    phase: "Prepare data",
    purpose: "Certify the cleaned history so model execution can be unlocked.",
    whatYouSee:
      "The readiness score, series confidence classification and the dataset approval gate.",
    whyItMatters:
      "Model execution stays locked while blocking issues remain, so no forecast can ever be produced from uncertified history.",
    decision: "Approve the forecast-ready dataset, or send it back for further correction.",
    nextStep: "Configure how models will be validated chronologically.",
    primaryLabel: "Approve forecast-ready dataset",
  },
  {
    id: "validation",
    step: 5,
    label: "Configure chronological validation",
    short: "Validation setup",
    route: "/validation-setup",
    phase: "Build baseline",
    purpose: "Split history into training, validation and holdout periods — in time order.",
    whatYouSee:
      "A timeline showing training, validation, holdout and future periods, with the recommended automatic rolling backtest selected.",
    whyItMatters:
      "Time series must never be split randomly: a random split lets the model see the future and reports accuracy that cannot be reproduced in operation.",
    decision: "Accept the recommended rolling backtest, or configure the periods manually.",
    nextStep: "Run the model tournament on the certified dataset.",
    primaryLabel: "Confirm validation design and continue",
  },
  {
    id: "tournament",
    step: 6,
    label: "Run model tournament",
    short: "Tournament",
    route: "/model-lab",
    search: { tab: "tournament" },
    phase: "Build baseline",
    purpose: "Train and backtest every model eligible for the demand behaviour.",
    whatYouSee:
      "Eligible models being trained and backtested stage by stage, with validation and test metrics kept visually separate.",
    whyItMatters:
      "Only models suited to the detected demand behaviour compete. Intermittent series get Croston/SBA/TSB; smooth seasonal series get ETS, SARIMA and gradient boosting.",
    decision: "Run the tournament and wait for all eligible models to complete backtesting.",
    nextStep: "Compare the ranked results and confirm the champion.",
    primaryLabel: "Continue to model results",
  },
  {
    id: "champion",
    step: 7,
    label: "Compare and select champion model",
    short: "Champion",
    route: "/model-lab",
    search: { tab: "comparison" },
    phase: "Build baseline",
    purpose: "Confirm or override the recommended champion, with a recorded reason.",
    whatYouSee:
      "The ranked results table, actual-versus-predicted and multi-model charts, and the explanation of why the champion won and why each alternative did not.",
    whyItMatters:
      "The champion is chosen on a weighted score — WAPE 30, MASE 20, bias 20, stability 20, business suitability 10 — never on MAPE alone.",
    decision: "Accept the recommended champion, or override it with a recorded justification.",
    nextStep: "Review the statistical baseline the champion produces.",
    primaryLabel: "Accept champion and view baseline",
  },
  {
    id: "baseline",
    step: 8,
    label: "Accept baseline forecast",
    short: "Baseline",
    route: "/baseline",
    phase: "Build baseline",
    purpose: "Review the purely statistical forecast before any judgement is applied.",
    whatYouSee:
      "The champion model's forecast with confidence interval. No future business event has been applied yet.",
    whyItMatters:
      "The baseline is the reference point for everything that follows: every later adjustment must be explainable as a movement away from it.",
    decision: "Accept the baseline as the starting point for event review.",
    nextStep: "Qualify future business events that history cannot know about.",
    primaryLabel: "Accept baseline and continue to event review",
  },
  {
    id: "events",
    step: 9,
    label: "Select and apply applicable events",
    short: "Events",
    route: "/event-intelligence",
    phase: "Apply judgement",
    purpose: "Select applicable events, check for double counting and calculate residual impact.",
    whatYouSee:
      "The event registry, the qualification checklist, the evidence sources already reflecting the impact, and the residual adjustment actually applied.",
    whyItMatters:
      "If open orders already carry part of an event, applying the full impact double counts it. Only the residual reaches the forecast.",
    decision: "Choose which events apply, set the impact, watchlist uncertain ones, and submit selected residual adjustments for review.",
    nextStep: "Explore uncertain outcomes as scenarios, separate from the plan.",
    primaryLabel: "Apply selected event impact",
  },
  {
    id: "scenarios",
    step: 10,
    label: "Review optional what-if scenarios",
    short: "What-if",
    route: "/what-if",
    phase: "Apply judgement",
    purpose: "Optionally simulate uncertain outcomes without touching the official forecast.",
    whatYouSee:
      "Baseline, approved forecast and scenarios plotted together, with stockout, excess and service-level implications for each.",
    whyItMatters:
      "Scenarios are simulation only. They never modify the operational forecast — they can only be promoted into the approval queue as a request.",
    decision: "Decide whether a what-if scenario is needed. If not, continue directly to forecast review.",
    nextStep: "Review the complete forecast build-up before approval.",
    primaryLabel: "Skip what-if and continue to forecast review",
  },
  {
    id: "review",
    step: 11,
    label: "Review complete forecast",
    short: "Review",
    route: "/forecast-review",
    phase: "Govern & monitor",
    purpose: "See baseline, event impact, planner override and the proposed final together.",
    whatYouSee:
      "The forecast bridge and combined chart: baseline, impact already reflected, residual event adjustment, planner override and proposed operational forecast — with scenarios shown separately.",
    whyItMatters:
      "Approved operational forecast = baseline + approved residual event adjustments + approved planner override. What-if scenarios are excluded by definition.",
    decision: "Work the approval queue: approve, reject, return for clarification or edit the recommendation with a reason.",
    nextStep: "Publish the approved version as the official operational forecast.",
    primaryLabel: "Continue to approval and publication",
  },
  {
    id: "approve",
    step: 12,
    label: "Approve and publish operational forecast",
    short: "Publish",
    route: "/forecast-review",
    phase: "Govern & monitor",
    purpose: "Promote one approved version to the single official operational forecast.",
    whatYouSee:
      "Forecast versions — baseline, event-adjusted candidate, planner-reviewed and approved operational — with only one marked current.",
    whyItMatters:
      "Only an approved version can be published downstream, and publication is written immutably to the audit log.",
    decision: "Publish the approved operational forecast.",
    nextStep: "Monitor how each forecast layer performed against actual demand.",
    primaryLabel: "Publish and continue to performance monitoring",
  },
  {
    id: "monitor",
    step: 13,
    label: "Monitor actual performance",
    short: "Monitor",
    route: "/performance",
    phase: "Govern & monitor",
    purpose: "Measure whether each layer of the process improved or worsened accuracy.",
    whatYouSee:
      "Forecast value added across the historical baseline, the selected model, the event-aware forecast and the planner-approved forecast, against actual demand.",
    whyItMatters:
      "Judgement is only worth applying if it measurably beats the model. Drift alerts trigger the next retraining cycle.",
    decision: "Decide which layers to keep, and whether any model needs retraining.",
    nextStep: "The cycle restarts with the next data load.",
    primaryLabel: "Finish workflow",
  },
];

export const stageById = Object.fromEntries(
  workflowStages.map((s) => [s.id, s]),
) as Record<StageId, WorkflowStage>;

export const workflowPhases = [
  "Prepare data",
  "Build baseline",
  "Apply judgement",
  "Govern & monitor",
] as const;

/** Screens that support the workflow but sit outside the linear sequence. */
export const supportRoutes = ["/", "/forecast-workspace", "/audit-log", "/assistant"];

/**
 * Stages whose decision requires real per-item interaction on their own
 * screen (resolving each issue, running a tournament, deciding each approval
 * queue item, ...). The generic sticky action bar is suppressed for these,
 * and the guided demo never completes them on the planner's behalf — it
 * waits for the real interaction. Every other stage is a simple
 * accept-and-continue action, safe for both the generic bar and the guide's
 * own Next button to perform directly.
 */
export const domainActionStages = new Set<StageId>([
  "upload",
  "resolve",
  "dataset",
  "tournament",
  "champion",
  "events",
  "approve",
]);

// ------------------------------------------------------- semantic signal roles
export type SignalRole = {
  id: string;
  question: string;
  fieldId: string;
  consequence: string;
};

export const signalRoles: SignalRole[] = [
  { id: "sr-demand", question: "Which field represents customer demand?", fieldId: "customerDemand", consequence: "This is the quantity the models learn and forecast. Mapping dispatch here forecasts what you shipped, not what was asked for." },
  { id: "sr-orders", question: "Which field represents confirmed orders?", fieldId: "confirmedOrders", consequence: "Used for the double-counting check — impact already visible in firm orders is deducted from event adjustments." },
  { id: "sr-dispatch", question: "Which field represents dispatch?", fieldId: "dispatchQty", consequence: "Reconciles demand against fulfilment and exposes suppressed demand in constrained months." },
  { id: "sr-billing", question: "Which field represents billing?", fieldId: "billingQty", consequence: "Financial cross-check. Large demand-to-billing gaps indicate returns or rebilling noise." },
  { id: "sr-backlog", question: "Which field represents backlog?", fieldId: "backlog", consequence: "Identifies demand carried into a later bucket so it is not counted twice." },
  { id: "sr-lost", question: "Which field represents lost demand?", fieldId: "lostDemand", consequence: "Used to uncensor stockout periods; without it the model learns an artificially low demand level." },
  { id: "sr-inventory", question: "Which field represents inventory?", fieldId: "availableInventory", consequence: "Drives cover, stockout-risk and excess-inventory exposure calculations." },
  { id: "sr-stockout", question: "Which field represents stockout status?", fieldId: "stockoutFlag", consequence: "Flags censored months so they are excluded or corrected before training." },
];

// ------------------------------------------------------------- data issues
export type IssueSeverity = "Blocking" | "Important" | "Warning" | "Informational";

export type IssueResolution =
  | "Accept suggested correction"
  | "Edit manually"
  | "Keep original"
  | "Mark as exceptional event"
  | "Exclude record"
  | "Exclude series"
  | "Assign for review";

export const issueResolutions: IssueResolution[] = [
  "Accept suggested correction",
  "Edit manually",
  "Keep original",
  "Mark as exceptional event",
  "Exclude record",
  "Exclude series",
  "Assign for review",
];

export type DataIssue = {
  id: string;
  severity: IssueSeverity;
  title: string;
  scope: string;
  records: number;
  series: number;
  detail: string;
  consequence: string;
  suggestion: string;
};

export const dataIssues: DataIssue[] = [
  {
    id: "di-date",
    severity: "Blocking",
    title: "Unparseable dates",
    scope: "6 series · FLT-8100-A and 5 others",
    records: 27,
    series: 6,
    detail: "27 rows contain impossible calendar dates such as 31/06/2026.",
    consequence: "Rows cannot be placed in a time bucket. The affected months would silently disappear from history and the model would learn a false demand drop.",
    suggestion: "Re-parse as 30/06/2026 using the source system calendar.",
  },
  {
    id: "di-dupe",
    severity: "Blocking",
    title: "Duplicate demand records",
    scope: "11 series · TRN-4120-B and 10 others",
    records: 148,
    series: 11,
    detail: "148 rows repeat the same date, SKU, customer and plant key with identical quantities.",
    consequence: "Duplicated months inflate demand level and trend. Every downstream accuracy metric would be measured against an overstated actual.",
    suggestion: "De-duplicate on the natural key, keeping the latest extract timestamp.",
  },
  {
    id: "di-neg",
    severity: "Blocking",
    title: "Negative demand quantities",
    scope: "9 series · BRK-1180-A and 8 others",
    records: 63,
    series: 9,
    detail: "63 rows carry negative demand, mostly credit notes posted against the original month.",
    consequence: "Negative values distort seasonality estimation and can make statistical models produce negative forecasts.",
    suggestion: "Net the credit note against the original invoice month and floor the result at zero.",
  },
  {
    id: "di-stockout",
    severity: "Important",
    title: "Stockout-censored demand",
    scope: "38 series · includes CLT-1048 · Apex Motors",
    records: 214,
    series: 38,
    detail: "214 months are flagged stockout with lost demand recorded separately.",
    consequence: "Unless demand is uncensored, the model learns the constrained shipment level and under-forecasts real demand, reinforcing the shortage.",
    suggestion: "Add recorded lost demand back to the censored months and tag them as corrected.",
  },
  {
    id: "di-missing",
    severity: "Important",
    title: "Missing periods",
    scope: "34 series across 4 plants",
    records: 212,
    series: 34,
    detail: "212 month buckets are absent between the first and last observation of the series.",
    consequence: "Gaps break seasonality detection at lag 12. Zero-filling a genuine gap teaches the model demand stopped; leaving it teaches nothing.",
    suggestion: "Zero-fill only where the customer relationship was active, otherwise shorten the series start.",
  },
  {
    id: "di-outlier",
    severity: "Important",
    title: "Extreme outliers",
    scope: "22 series · single-month spikes above 4σ",
    records: 41,
    series: 22,
    detail: "41 months exceed four standard deviations from the local level.",
    consequence: "Untreated spikes are absorbed as recurring demand, permanently lifting the baseline for every future year.",
    suggestion: "Mark as exceptional events so the level is protected but the history stays visible.",
  },
  {
    id: "di-unit",
    severity: "Warning",
    title: "Unit-of-measure inconsistency",
    scope: "7 series · pieces versus cartons",
    records: 96,
    series: 7,
    detail: "The same SKU is reported in pieces from one plant and cartons from another.",
    consequence: "Aggregation across plants produces a meaningless total and the forecast scale is wrong by the pack factor.",
    suggestion: "Convert cartons to pieces using the item master pack size of 12.",
  },
  {
    id: "di-shortkey",
    severity: "Warning",
    title: "Short history",
    scope: "48 series with fewer than 18 months",
    records: 512,
    series: 48,
    detail: "48 new-part series do not yet have two full seasonal cycles.",
    consequence: "Seasonal models cannot be validated. These series must fall back to simpler methods or to a family-level profile.",
    suggestion: "Route to the short-history model set and review manually each cycle.",
  },
  {
    id: "di-family",
    severity: "Informational",
    title: "Missing product family",
    scope: "14 series",
    records: 168,
    series: 14,
    detail: "Product family is blank for 14 SKU-customer combinations.",
    consequence: "No forecasting impact, but hierarchical reconciliation and family-level accuracy reporting will exclude these series.",
    suggestion: "Assign from the item master before the next cycle.",
  },
  {
    id: "di-lead",
    severity: "Informational",
    title: "Lead time not supplied",
    scope: "23 series",
    records: 276,
    series: 23,
    detail: "Planned lead time is empty for 23 series.",
    consequence: "Forecast accuracy is unaffected; stockout-risk horizons will use the plant default of 30 days.",
    suggestion: "Populate from the purchasing master.",
  },
];

export const severityOrder: IssueSeverity[] = ["Blocking", "Important", "Warning", "Informational"];

export const severityTone: Record<IssueSeverity, "risk" | "warning" | "info" | "neutral"> = {
  Blocking: "risk",
  Important: "warning",
  Warning: "info",
  Informational: "neutral",
};
