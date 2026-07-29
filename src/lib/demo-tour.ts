import { DEMO_SKU, demoCaseMeta } from "@/lib/demo-data";
import { workflowStages, type StageId } from "@/lib/workflow";

export type DemoStep = {
  id: StageId;
  step: number;
  title: string;
  route: string;
  search?: Record<string, string>;
  targetId?: string;
  headline: string;
  /** What the user is seeing. */
  body: string;
  /** Why this step matters. */
  why: string;
  /** What decision is required. */
  decision: string;
  /** What the next step will be. */
  next: string;
  /** The page action that completes this step. */
  primaryLabel: string;
  /** Exact user action the guide expects on the screen. */
  action: string;
  lookFor: string[];
};

/**
 * The guided walkthrough follows the authoritative 13-stage workflow using the
 * prominent demonstration case:
 * Apex Motors · CLT-1048 Clutch Friction Assembly · North Plant — Coimbatore.
 */
const headlines: Record<StageId, string> = {
  project: "One forecasting cycle, one agreed granularity",
  upload: `${DEMO_SKU} history arrives and every demand signal is identified`,
  resolve: "Nothing is corrected silently",
  dataset: "The dataset is certified before a single model runs",
  validation: "Time series are validated chronologically, never randomly",
  tournament: "Eligible models compete on the same windows",
  champion: "The champion is chosen on a weighted score, not on MAPE alone",
  baseline: "The statistical baseline repeats last year's September dip",
  events: "Select the OEM schedule event before it affects the forecast",
  scenarios: "An upside recovery sits beside — not inside — the forecast",
  review: "Baseline + residual event + planner override, reconciled",
  approve: "Only one version can be the official operational forecast",
  monitor: "Did each layer actually improve accuracy?",
};

const lookFor: Record<StageId, string[]> = {
  project: [
    "Granularity SKU × customer × plant — 500 demand series in scope",
    "Monthly buckets and a 12-month operational horizon",
    "54 months of history available: 4.5 seasonal cycles",
  ],
  upload: [
    "Drag-and-drop upload, file preview and the data template",
    "Signal roles: customer demand, confirmed orders, dispatch, billing, backlog, lost demand, inventory, stockout",
    "Mapping demand to dispatch would forecast what you shipped, not what was asked for",
  ],
  resolve: [
    "Issues grouped as Blocking, Important, Warning and Informational",
    "Each issue states its forecasting consequence if left unresolved",
    "Seven decisions available, including exclude series and mark as exceptional event",
  ],
  dataset: [
    "Approve Forecast-Ready Dataset is disabled while blocking issues remain",
    "Series confidence classification: CLT-1048 is High",
    "Every decision is written to the audit log",
  ],
  validation: [
    "Chronological split: training teaches, validation compares, holdout verifies",
    "Automatic rolling backtesting is the recommended default",
    "Advanced period configuration exists but is not mandatory",
  ],
  tournament: [
    "Only models eligible for this demand behaviour are entered",
    "Weighted score: WAPE 30, MASE 20, Bias 20, Stability 20, Suitability 10",
    "Validation metrics are shown separately from the untouched holdout",
  ],
  champion: [
    "Why this model was selected, and why each alternative was not",
    "Champion, challenger, ensemble member or rejected status per model",
    "An override is possible only with a recorded reason",
  ],
  baseline: [
    "Banner: future business events have not yet been applied",
    "Baseline dips in September 2026 — the wrong shape for this year",
    "Accept the baseline to unlock event review",
  ],
  events: [
    "Apex schedule revision R-14 moves the shutdown from September to October",
    "Six-point qualification checklist, evidence reliability and selected impact",
    "Only the selected event's residual impact is submitted for forecast review",
  ],
  scenarios: [
    "Simulation only — does not affect the official forecast",
    "Assumptions and implications for stockout, excess and service level",
    "Promote for review creates an adjustment request; it approves nothing",
  ],
  review: [
    "Forecast bridge: baseline, residual event impact, planner override, proposed final",
    "What-if scenarios are displayed separately and excluded from the total",
    "Every manual override requires a reason and evidence",
  ],
  approve: [
    "Version list: exactly one record is the current official forecast",
    "Approve, reject, return for clarification, edit recommendation, add comment",
    "Publication is recorded in the audit log",
  ],
  monitor: [
    "Forecast value added: naive → model → event-aware → planner-approved",
    "Layers that worsened accuracy are shown as negative contributions",
    "Champion/challenger board, drift alerts and simulated retraining",
  ],
};

const action: Record<StageId, string> = {
  project: "Review the seeded project scope, then click Next in the guide to continue.",
  upload: "Review the mapped upload preview, then click Next in the guide to continue.",
  resolve: "Open each Blocking issue in the data-quality list and choose a resolution until no blocking issues remain.",
  dataset: "Click the Approve Forecast-Ready Dataset button in the data-quality panel. The guide stays here until dataset approval is complete.",
  validation: "Use the sticky bottom action Confirm validation design and continue. The guide will show a loading state while step 6 opens.",
  tournament: "Click Run tournament on the Model Lab tournament tab, wait for the run to complete, then continue to model results.",
  champion: "On the comparison tab, click Accept champion and view baseline to confirm the recommended champion.",
  baseline: "Review the baseline warning and chart, then click Accept baseline and continue to event review in the sticky bottom action bar.",
  events: "Select the Apex shutdown event in the registry, adjust impact if needed, then click Apply selected impact.",
  scenarios: "If no what-if is needed, click Skip what-if in the guide. Scenarios remain simulation-only.",
  review: "Review the forecast bridge and approval queue, then use the screen action to continue to publication.",
  approve: "Publish the approved operational forecast from Forecast Review.",
  monitor: "Review forecast value added and finish the guide.",
};

const targetId: Partial<Record<StageId, string>> = {
  upload: "guide-upload",
  resolve: "guide-issues",
  dataset: "guide-dataset-approval",
  validation: "guide-validation-action",
  tournament: "guide-tournament",
  champion: "guide-champion",
  baseline: "guide-baseline-decision",
  events: "guide-event-decision",
};

export const demoSteps: DemoStep[] = workflowStages.map((stage) => ({
  id: stage.id,
  step: stage.step,
  title: stage.label,
  route: stage.route,
  search: stage.search,
  targetId: targetId[stage.id],
  headline: headlines[stage.id],
  body: stage.whatYouSee,
  why: stage.whyItMatters,
  decision: stage.decision,
  next: stage.nextStep,
  primaryLabel: stage.primaryLabel,
  action: action[stage.id],
  lookFor: lookFor[stage.id],
}));

export const demoCaseLabel = `${DEMO_SKU} · ${demoCaseMeta.description} · ${demoCaseMeta.customer}`;
