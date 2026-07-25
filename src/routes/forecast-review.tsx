import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, CheckCheck, CornerUpLeft, History, Send, Users } from "lucide-react";
import { KpiTile, Panel, PageHeading, PrototypeNote, StatusPill } from "@/components/primitives";
import { approvalTrail, formatNumber, formatSigned } from "@/lib/demo-data";
import { usePlatform } from "@/lib/platform-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/forecast-review")({
  head: () => ({
    meta: [
      { title: "Forecast Review — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Consensus review of statistical forecast versus planner overrides, with approval workflow, audit trail and publication of the operational forecast.",
      },
      { property: "og:title", content: "Forecast Review — Demand Intelligence Platform" },
      {
        property: "og:description",
        content: "Consensus approval and publication of the operational demand forecast.",
      },
    ],
  }),
  component: ForecastReview,
});

const workflowSteps = [
  { label: "Data certified", done: true },
  { label: "Baseline generated", done: true },
  { label: "Events applied", done: true },
  { label: "Planner overrides", done: true },
  { label: "Consensus approval", done: false },
  { label: "Published to ERP", done: false },
];

function ForecastReview() {
  const { reviewLines, setLineStatus, approveAll, published, publish } = usePlatform();

  const pending = reviewLines.filter((l) => l.status === "Pending").length;
  const returned = reviewLines.filter((l) => l.status === "Returned").length;
  const consensusTotal = reviewLines.reduce((sum, l) => sum + l.consensus, 0);
  const statisticalTotal = reviewLines.reduce((sum, l) => sum + l.statistical, 0);
  const overrideDelta = ((consensusTotal - statisticalTotal) / (statisticalTotal || 1)) * 100;
  const steps = workflowSteps.map((step, index) =>
    index === 4 ? { ...step, done: pending === 0 } : index === 5 ? { ...step, done: published } : step,
  );

  return (
    <div className="space-y-5">
      <PageHeading
        title="Forecast Review"
        subtitle="Compare the statistical forecast with planner judgement, resolve variances above tolerance, and publish an approved operational forecast version with a full audit trail."
        actions={
          <>
            <button
              type="button"
              onClick={approveAll}
              disabled={pending === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden /> Approve all pending
            </button>
            <button
              type="button"
              onClick={publish}
              disabled={pending > 0 || published}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                published
                  ? "bg-positive-soft text-positive"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50",
              )}
            >
              <Send className="h-3.5 w-3.5" aria-hidden />
              {published ? "V2026.07 published" : "Publish operational forecast"}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Consensus volume" value={formatNumber(consensusTotal)} unit="units" delta={formatSigned(overrideDelta)} deltaTone={Math.abs(overrideDelta) > 5 ? "warning" : "positive"} icon={Users} />
        <KpiTile label="Lines pending approval" value={String(pending)} delta={pending ? "Blocking publication" : "Cleared"} deltaTone={pending ? "warning" : "positive"} icon={BadgeCheck} />
        <KpiTile label="Lines returned to planner" value={String(returned)} delta="Evidence requested" deltaTone={returned ? "risk" : "neutral"} icon={CornerUpLeft} />
        <KpiTile label="Version status" value={published ? "Published" : "Draft"} delta={published ? "Released to ERP & MRP" : "V2026.07 working draft"} deltaTone={published ? "positive" : "warning"} icon={History} />
      </div>

      <Panel title="Approval workflow" description="Publication requires every upstream stage to be complete.">
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {steps.map((step, index) => (
            <li
              key={step.label}
              className={cn(
                "rounded-md border px-3 py-2.5",
                step.done ? "border-positive/30 bg-positive-soft" : "border-border bg-surface-muted",
              )}
            >
              <p className={cn("num text-[11px] font-semibold", step.done ? "text-positive" : "text-muted-foreground")}>
                Step {index + 1}
              </p>
              <p className={cn("mt-0.5 text-xs font-medium", step.done ? "text-positive" : "text-foreground")}>
                {step.label}
              </p>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel
        title="Consensus review lines"
        description="Variances beyond ±10% require documented evidence before approval."
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left">
                <th className="label-caps px-4 py-2.5">Scope</th>
                <th className="label-caps px-4 py-2.5">Planner</th>
                <th className="label-caps px-4 py-2.5 text-right">Statistical</th>
                <th className="label-caps px-4 py-2.5 text-right">Override</th>
                <th className="label-caps px-4 py-2.5 text-right">Variance</th>
                <th className="label-caps px-4 py-2.5">Comment</th>
                <th className="label-caps px-4 py-2.5">Status</th>
                <th className="label-caps px-4 py-2.5 text-right">Decision</th>
              </tr>
            </thead>
            <tbody>
              {reviewLines.map((line) => (
                <tr key={line.id} className="border-b border-border align-top last:border-0 hover:bg-surface-muted/60">
                  <td className="px-4 py-3 text-xs font-medium">{line.scope}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{line.planner}</td>
                  <td className="num px-4 py-3 text-right text-xs">{formatNumber(line.statistical)}</td>
                  <td className="num px-4 py-3 text-right text-xs">{formatNumber(line.plannerOverride)}</td>
                  <td className="num px-4 py-3 text-right text-xs">
                    <span
                      className={
                        Math.abs(line.variancePct) > 10
                          ? "text-risk"
                          : Math.abs(line.variancePct) > 3
                            ? "text-warning-foreground"
                            : "text-positive"
                      }
                    >
                      {formatSigned(line.variancePct)}
                    </span>
                  </td>
                  <td className="max-w-[240px] px-4 py-3 text-xs text-muted-foreground">{line.comment}</td>
                  <td className="px-4 py-3">
                    <StatusPill
                      tone={line.status === "Approved" ? "positive" : line.status === "Returned" ? "risk" : "warning"}
                    >
                      {line.status}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setLineStatus(line.id, "Approved")}
                        disabled={line.status === "Approved"}
                        className="rounded-md border border-input px-2 py-1 text-[11px] font-medium hover:bg-positive-soft hover:text-positive disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setLineStatus(line.id, "Returned")}
                        disabled={line.status === "Returned"}
                        className="rounded-md border border-input px-2 py-1 text-[11px] font-medium hover:bg-risk-soft hover:text-risk disabled:opacity-50"
                      >
                        Return
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Audit trail" description="Every change to the forecast version is recorded.">
          <ol className="relative space-y-4 border-l border-border pl-5">
            {approvalTrail.map((entry) => (
              <li key={entry.id} className="relative">
                <span className="absolute top-1.5 -left-[1.42rem] h-2 w-2 rounded-full bg-accent-blue" />
                <p className="text-xs font-medium">{entry.actor}</p>
                <p className="text-xs text-muted-foreground">{entry.action}</p>
                <p className="num text-[11px] text-muted-foreground">{entry.at}</p>
              </li>
            ))}
            {published && (
              <li className="relative">
                <span className="absolute top-1.5 -left-[1.42rem] h-2 w-2 rounded-full bg-positive" />
                <p className="text-xs font-medium">You · Demand planning lead</p>
                <p className="text-xs text-muted-foreground">
                  Published forecast version V2026.07 to ERP, MRP and supplier portal
                </p>
                <p className="num text-[11px] text-muted-foreground">Just now</p>
              </li>
            )}
          </ol>
        </Panel>

        <Panel title="Publication package" description="What downstream systems receive on publication.">
          <ul className="space-y-2 text-xs">
            {[
              "Monthly demand plan by SKU, customer and plant for the next 12 months",
              "Weekly bucketed plan for the first 13 weeks for production scheduling",
              "Supplier release schedule for long lead-time components",
              "Safety-stock and reorder-point recommendations by location",
              "Assumption log covering accepted events and planner overrides",
              "Accuracy baseline for next-cycle performance measurement",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 rounded-md border border-border px-3 py-2">
                <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-positive" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <PrototypeNote>
        Approval, return and publication actions update local prototype state only. No forecast is
        transmitted to an ERP, MRP or supplier system.
      </PrototypeNote>
    </div>
  );
}
