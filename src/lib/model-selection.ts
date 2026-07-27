/**
 * Operational model selection record.
 *
 * The tournament recommends a Champion; an authorised user may still run a
 * challenger or the validated ensemble operationally. Both identities are
 * preserved — the selected model is never relabelled as the Champion.
 */

export type SelectionMethod =
  | "Champion accepted"
  | "Challenger selected"
  | "Validated ensemble selected"
  | "Manual override";

export type SelectionStatus = "Active" | "Awaiting approval";

export type ModelSelection = {
  key: string;
  sku: string;
  customerId: string;
  plantId: string;
  recommendedChampionId: string;
  recommendedChampionName: string;
  selectedModelId: string;
  selectedModelName: string;
  method: SelectionMethod;
  reason: string;
  comment: string;
  effectiveFrom: string;
  effectiveTo: string;
  evidence: string;
  status: SelectionStatus;
  materialBreaches: string[];
  version: string;
  decidedBy: string;
  decidedAt: string;
};

export const overrideReasons = [
  "Customer schedule behaviour is better represented",
  "Champion over-smooths a known shutdown pattern",
  "Challenger handles the current event calendar more reliably",
  "Business continuity — retaining the previously approved method",
  "Planner judgement on recent structural demand change",
];

export const effectivePeriods = [
  "Current cycle only (Aug 2026)",
  "Next 3 cycles (Aug – Oct 2026)",
  "Next 6 cycles (Aug 2026 – Jan 2027)",
  "Until the next scheduled retraining",
];

export const selectionStatusTone: Record<SelectionStatus, "positive" | "warning"> = {
  Active: "positive",
  "Awaiting approval": "warning",
};
