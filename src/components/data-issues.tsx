import { useState } from "react";
import { AlertOctagon, CheckCircle2, Info, ShieldAlert, Signal } from "lucide-react";
import { Panel, StatusPill } from "@/components/primitives";
import { sourceColumns } from "@/lib/forecast-domain";
import { usePlatform } from "@/lib/platform-state";
import {
  issueResolutions,
  severityOrder,
  severityTone,
  signalRoles,
  type IssueSeverity,
} from "@/lib/workflow";
import { cn } from "@/lib/utils";

const severityIcon: Record<IssueSeverity, typeof Info> = {
  Blocking: AlertOctagon,
  Important: ShieldAlert,
  Warning: ShieldAlert,
  Informational: Info,
};

const severityIntro: Record<IssueSeverity, string> = {
  Blocking: "Model execution stays locked until every blocking issue has a recorded decision.",
  Important: "Materially changes what the model learns. Resolve before accepting the dataset.",
  Warning: "Limits some methods or reporting. Safe to proceed with a recorded decision.",
  Informational: "No forecasting impact. Recorded for data-stewardship follow-up.",
};

/** Step 2b — semantic meaning of each demand signal, not just the column name. */
export function SignalRolePanel() {
  const { mapping, setMapping, rolesConfirmed, confirmRoles, logAudit } = usePlatform();
  const answered = signalRoles.filter((r) => mapping[r.fieldId]).length;

  return (
    <Panel
      title="Which field represents which demand signal?"
      description="Column names alone are ambiguous. Confirm the business meaning of each signal so the models learn demand rather than fulfilment, and so double-counting checks have something to verify against."
      actions={
        <div className="flex items-center gap-2">
          <StatusPill tone={rolesConfirmed ? "positive" : answered ? "info" : "neutral"}>
            {answered} / {signalRoles.length} signals identified
          </StatusPill>
          <button
            type="button"
            disabled={!mapping[signalRoles[0].fieldId]}
            onClick={() => {
              confirmRoles();
              logAudit({
                user: "You · Demand planning lead",
                action: "Data upload",
                sku: "All",
                customer: "All",
                version: "V2026.07",
                detail: `Signal roles confirmed for ${answered} of ${signalRoles.length} demand signals.`,
              });
            }}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {rolesConfirmed ? "Signals confirmed" : "Confirm signal roles"}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {signalRoles.map((role) => {
          const value = mapping[role.fieldId] ?? "";
          return (
            <div key={role.id} className="rounded-md border border-border bg-surface-muted/50 p-3">
              <div className="flex items-start gap-2">
                <Signal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <label className="block text-xs font-semibold" htmlFor={role.id}>
                    {role.question}
                  </label>
                  <select
                    id={role.id}
                    value={value}
                    onChange={(e) => setMapping(role.fieldId, e.target.value)}
                    className="control mt-2"
                  >
                    <option value="">Not supplied</option>
                    {sourceColumns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {role.consequence}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/** Step 3 and 4 — grouped issue resolution plus dataset certification. */
export function IssueResolutionPanel() {
  const {
    issueActions,
    setIssueAction,
    blockingOpen,
    stageDone,
    completeStage,
    logAudit,
    activeIssues: dataIssues,
    dataQualityScore,
  } = usePlatform();
  const [open, setOpen] = useState<string | null>(null);

  const resolved = dataIssues.filter((i) => issueActions[i.id]).length;

  if (dataIssues.length === 0) {
    return (
      <Panel
        title="Resolve data-quality issues"
        description="Data-quality issues appear once a dataset has been loaded. Nothing is pre-populated."
      >
        <p className="text-xs text-muted-foreground">
          No dataset loaded — upload a file, or start the guide, to run the data-quality gate.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Resolve data-quality issues"
      description="Every issue states its forecasting consequence. Nothing is corrected silently — each decision is recorded in the audit log."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={blockingOpen ? "risk" : "positive"}>
            {blockingOpen ? `${blockingOpen} blocking unresolved` : "No blocking issues"}
          </StatusPill>
          <StatusPill tone="neutral">
            {resolved} / {dataIssues.length} decided
          </StatusPill>
          <StatusPill tone={dataQualityScore >= 80 ? "positive" : dataQualityScore >= 50 ? "warning" : "risk"}>
            Data-quality score {dataQualityScore} / 100
          </StatusPill>
          <button
            type="button"
            disabled={blockingOpen > 0}
            onClick={() => {
              completeStage("resolve");
              completeStage("dataset");
              logAudit({
                user: "You · Demand planning lead",
                action: "Data transformation",
                sku: "All",
                customer: "All",
                version: "V2026.07",
                detail: `Forecast-ready dataset approved with ${resolved} recorded data-quality decisions.`,
              });
            }}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {stageDone.dataset ? "Dataset approved" : "Approve Forecast-Ready Dataset"}
          </button>
        </div>
      }
      bodyClassName="p-0"
    >
      {blockingOpen > 0 && (
        <p className="border-b border-border bg-risk-soft px-4 py-2 text-xs font-medium text-risk sm:px-5">
          Resolve {blockingOpen} blocking issue{blockingOpen === 1 ? "" : "s"} before approving this
          dataset.
        </p>
      )}
      <div className="divide-y divide-border">
        {severityOrder.map((severity) => {
          const group = dataIssues.filter((i) => i.severity === severity);
          if (group.length === 0) return null;
          const Icon = severityIcon[severity];
          return (
            <div key={severity} className="px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h3 className="text-sm font-semibold">{severity}</h3>
                <StatusPill tone={severityTone[severity]}>{group.length} issues</StatusPill>
                <span className="text-xs text-muted-foreground">{severityIntro[severity]}</span>
              </div>

              <div className="mt-3 space-y-2">
                {group.map((issue) => {
                  const action = issueActions[issue.id];
                  const expanded = open === issue.id;
                  return (
                    <div
                      key={issue.id}
                      className={cn(
                        "rounded-md border transition-colors",
                        action ? "border-positive/30 bg-positive-soft/40" : "border-border bg-surface",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setOpen(expanded ? null : issue.id)}
                        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{issue.title}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {issue.scope} · {issue.records} records · {issue.series} series
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          {action ? (
                            <StatusPill tone="positive">
                              <CheckCircle2 className="h-3 w-3" aria-hidden /> {action}
                            </StatusPill>
                          ) : (
                            <StatusPill tone={severityTone[issue.severity]}>Unresolved</StatusPill>
                          )}
                        </span>
                      </button>

                      {expanded && (
                        <div className="border-t border-border px-3 py-3">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div>
                              <p className="label-caps">What was detected</p>
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                {issue.detail}
                              </p>
                            </div>
                            <div>
                              <p className="label-caps">Forecasting consequence if unresolved</p>
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                {issue.consequence}
                              </p>
                            </div>
                            <div>
                              <p className="label-caps">Suggested correction</p>
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                {issue.suggestion}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {issueResolutions.map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => {
                                  setIssueAction(issue.id, option);
                                  logAudit({
                                    user: "You · Demand planning lead",
                                    action: "Data transformation",
                                    sku: "All",
                                    customer: "All",
                                    version: "V2026.07",
                                    detail: `${issue.title} (${issue.severity}) — ${option}.`,
                                  });
                                }}
                                className={cn(
                                  "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                                  action === option
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-input hover:bg-accent",
                                )}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
