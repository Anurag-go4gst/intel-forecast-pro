import { DEMO_SKU, demoCaseMeta } from "@/lib/demo-data";

export type DemoStep = {
  id: string;
  step: number;
  title: string;
  route: string;
  headline: string;
  body: string;
  lookFor: string[];
};

/**
 * The guided walkthrough of the prominent demonstration case:
 * Apex Motors · CLT-1048 Clutch Friction Assembly · North Plant — Coimbatore.
 */
export const demoSteps: DemoStep[] = [
  {
    id: "ds-1",
    step: 1,
    title: "Data readiness",
    route: "/data-readiness",
    headline: `${DEMO_SKU} history is certified before any model runs`,
    body: `54 months of monthly history for ${demoCaseMeta.customer} at ${demoCaseMeta.plant} pass completeness, outlier and stockout-censoring checks. The series is classified High confidence, so it is eligible for automated forecasting.`,
    lookFor: [
      "Validation results panel — no blocking errors on the clutch series",
      "Series confidence classification: High",
      "Transformation log records every adjusted value and can be undone",
    ],
  },
  {
    id: "ds-2",
    step: 2,
    title: "Baseline forecast",
    route: "/forecast-workspace",
    headline: "The statistical baseline repeats last year's September dip",
    body: "The selected model learned a recurring September shutdown from history. It therefore plans a deep September trough and a normal October — which is exactly the wrong shape for this year.",
    lookFor: [
      "Baseline line dips sharply in September 2026",
      "Model rationale tab: seasonality detected at lag 12",
      "No event adjustment is applied yet",
    ],
  },
  {
    id: "ds-3",
    step: 3,
    title: "Event detection",
    route: "/event-intelligence",
    headline: "A confirmed OEM schedule moves the shutdown to October",
    body: "Apex schedule revision R-14 confirms the annual shutdown moves from September to October. The event passes all six qualification checks, so the event-aware forecast restores September, applies an October dip and adds a November recovery.",
    lookFor: [
      "Event: Apex Motors shutdown moved from September to October",
      "Qualification checklist fully satisfied, reliability: confirmed document",
      "Impact curve: September +82%, October -38%, November +14%",
    ],
  },
  {
    id: "ds-4",
    step: 4,
    title: "Double-counting check",
    route: "/event-intelligence",
    headline: "Open orders already carry part of the October reduction",
    body: "Before applying the event, the platform verifies open orders, customer schedules, backlog and recent demand. 31% of the October reduction is already visible in the order book, so only the residual impact is applied to the forecast.",
    lookFor: [
      "Reflection status: partially reflected",
      "Source verification grid — open orders and OEM schedules show a clear signal",
      "Residual impact is smaller than the raw expected impact",
    ],
  },
  {
    id: "ds-5",
    step: 5,
    title: "What-if comparison",
    route: "/what-if",
    headline: "An upside recovery scenario sits beside — not inside — the forecast",
    body: "The Apex upside recovery scenario models a faster November catch-up. It is displayed against the baseline and the approved forecast for comparison only and never becomes the official plan unless it is promoted and approved.",
    lookFor: [
      "Scenario: Apex upside recovery (CLT-1048)",
      "Assumptions and implications for stockout, excess and service level",
      "Promote for review creates an adjustment request — it does not approve anything",
    ],
  },
  {
    id: "ds-6",
    step: 6,
    title: "Approval",
    route: "/forecast-review",
    headline: "The planner decision is captured with a reason and evidence",
    body: `The ${DEMO_SKU} request shows the baseline, the residual event adjustment and the planner override side by side. Every manual override requires a reason, and the evidence trail links back to the OEM schedule and the double-counting check.`,
    lookFor: [
      "Queue row: CLT-1048 · Apex Motors · North Plant",
      "Reason required before approve, reject or return for clarification",
      "Evidence panel cites schedule R-14 and the residual impact calculation",
    ],
  },
  {
    id: "ds-7",
    step: 7,
    title: "Final operational forecast",
    route: "/forecast-review",
    headline: "Model baseline + event adjustment + planner override = approved forecast",
    body: "The bridge shows exactly how the approved operational forecast was built. Only one version is marked as the current official forecast, and unapproved what-if scenarios are excluded from it.",
    lookFor: [
      "Forecast bridge totals reconcile to the approved operational forecast",
      "Version list: only one record is the current official forecast",
      "Scenario volume is absent from the approved figures",
    ],
  },
  {
    id: "ds-8",
    step: 8,
    title: "Performance monitoring",
    route: "/performance",
    headline: "Did each layer actually improve accuracy?",
    body: "Forecast value added compares the naive baseline, the selected model, the event-aware forecast and the planner-approved forecast against actuals, showing whether each layer improved or worsened performance. Drift alerts and the champion/challenger board close the loop.",
    lookFor: [
      "Forecast value added by layer, including any negative contribution",
      "Event-adjustment performance and planner-override effectiveness",
      "Champion/challenger board and simulated retraining alerts",
    ],
  },
];
