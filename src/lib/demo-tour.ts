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

const targetId: Partial<Record<StageId, string>> = {
  upload: "guide-upload",
  resolve: "guide-issues",
  dataset: "guide-issues",
  tournament: "guide-tournament",
  champion: "guide-champion",
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
  lookFor: lookFor[stage.id],
}));

export const demoCaseLabel = `${DEMO_SKU} · ${demoCaseMeta.description} · ${demoCaseMeta.customer}`;
