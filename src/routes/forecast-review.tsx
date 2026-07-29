import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  CheckCheck,
  CornerUpLeft,
  FileSearch,
  GitBranch,
  History,
  Loader2,
  MessageSquarePlus,
  Send,
  ShieldAlert,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { KpiTile, Panel, PageHeading, PrototypeNote, StatusPill } from "@/components/primitives";
import { formatNumber, formatSigned } from "@/lib/demo-data";
import { horizonMonths } from "@/lib/event-domain";
import {
  approvalStatuses,
  approvalTone,
  changePct,
  proposedFinal,
  versionBridge,
  type ApprovalStatus,
} from "@/lib/governance-domain";
import { usePlatform } from "@/lib/platform-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/forecast-review")({
  head: () => ({
    meta: [
      { title: "Forecast Review & Approval — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Approval queue with baseline, event adjustment, planner override and proposed final forecast, evidence review, version control and the baseline-to-final forecast bridge.",
      },
      { property: "og:title", content: "Forecast Review & Approval — Demand Intelligence Platform" },
      {
        property: "og:description",
        content: "Governed approval queue, forecast version control and the baseline-to-final bridge.",
      },
    ],
  }),
  component: ForecastReview,
});

const filterStatuses: Array<ApprovalStatus | "All"> = ["All", ...approvalStatuses];

function ForecastReview() {
  const navigate = useNavigate();
  const {
    approvals,
    setApprovalStatus,
    editRecommendation,
    addApprovalComment,
    versions,
    published,
    publish,
    completeStage,
    adjustmentRequests,
  } = usePlatform();

  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "All">("All");
  const [selectedId, setSelectedId] = useState<string>(approvals[0]?.id ?? "");
  const [comment, setComment] = useState("");
  const [editValue, setEditValue] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const queueRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(
    () => (statusFilter === "All" ? approvals : approvals.filter((a) => a.status === statusFilter)),
    [approvals, statusFilter],
  );

  const selected = approvals.find((a) => a.id === selectedId) ?? visible[0] ?? approvals[0];

  const pending = approvals.filter((a) => a.status === "Awaiting approval").length;
  const returned = approvals.filter((a) => a.status === "Returned for clarification").length;
  const approvedOverrideDelta = approvals
    .filter((a) => a.status === "Approved")
    .reduce((sum, a) => sum + a.plannerOverride, 0);
  const finalTotal = approvals
    .filter((a) => a.status !== "Rejected")
    .reduce((sum, a) => sum + proposedFinal(a), 0);
  const baselineTotal = approvals.reduce((sum, a) => sum + a.baseline, 0);

  const bridge = versionBridge(approvedOverrideDelta);
  let running = 0;
  const bridgeRows = bridge.map((step) => {
    if (step.kind === "start") {
      running = step.delta;
      return { ...step, value: running };
    }
    if (step.kind === "end") return { ...step, value: running };
    running += step.delta;
    return { ...step, value: running };
  });

  const decide = (status: ApprovalStatus, note?: string) => {
    if (!selected) return;
    setApprovalStatus(selected.id, status, note);
  };

  const publishAndContinue = () => {
    if (pending > 0 || published || publishing) return;
    setPublishing(true);
    publish();
    // Publishing implies the review stage's own work is done, even if the
    // planner never touched the separate "Continue to approval and
    // publication" bar for step 11 — otherwise step 13 stays locked forever.
    completeStage("review");
    completeStage("approve");
    window.setTimeout(() => {
      void navigate({ to: "/performance" });
      window.setTimeout(() => setPublishing(false), 250);
    }, 160);
  };

  const jumpToPending = () => {
    setStatusFilter("Awaiting approval");
    queueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const approvableNow = approvals.filter(
    (a) => a.status === "Awaiting approval" && a.confidence === "High" && a.evidence.length > 0,
  );
  const approveHighConfidence = () => {
    approvableNow.forEach((a) =>
      setApprovalStatus(a.id, "Approved", "Approved in bulk — high confidence with supporting evidence attached."),
    );
  };

  return (
    <div className="space-y-5">
      <PageHeading
        title="Forecast Review & Approval"
        subtitle="Govern every proposed change to the operational forecast. Each queue item carries its baseline, event adjustment, planner override, evidence and confidence, and cannot reach a published version without an explicit decision."
        actions={
          <>
            <StatusPill tone={published ? "positive" : "warning"}>
              {published
                ? "V2026.07 published — continue to step 13"
                : pending > 0
                  ? `${pending} item${pending === 1 ? "" : "s"} awaiting decision before publication`
                  : "V2026.07 working draft — ready to publish"}
            </StatusPill>
            <button
              type="button"
              id="guide-approve-action"
              tabIndex={-1}
              onClick={publishAndContinue}
              disabled={pending > 0 || published || publishing}
              title={
                pending > 0
                  ? `${pending} item${pending === 1 ? "" : "s"} still Awaiting approval — approve, reject or return each one before you can publish.`
                  : undefined
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                published
                  ? "bg-positive-soft text-positive"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50",
              )}
            >
              {publishing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Send className="h-3.5 w-3.5" aria-hidden />
              )}
              {publishing ? "Publishing..." : published ? "Published to ERP" : "Publish new version"}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Awaiting approval"
          value={String(pending)}
          delta={pending ? "Click to jump to these items" : "Queue cleared"}
          deltaTone={pending ? "warning" : "positive"}
          icon={BadgeCheck}
          onClick={pending ? jumpToPending : undefined}
        />
        <KpiTile label="Returned for clarification" value={String(returned)} delta="Evidence requested" deltaTone={returned ? "info" : "neutral"} icon={CornerUpLeft} />
        <KpiTile label="Proposed final volume" value={formatNumber(finalTotal)} unit="units" delta={formatSigned(((finalTotal - baselineTotal) / (baselineTotal || 1)) * 100)} deltaTone="info" icon={GitBranch} />
        <KpiTile label="Adjustment requests" value={String(adjustmentRequests.length)} delta="From events and scenarios" deltaTone="neutral" icon={History} />
      </div>

      <Panel
        title="Approval queue"
        description="Every line shows the full decomposition from statistical baseline to proposed final forecast."
        bodyClassName="p-0"
        actions={
          <div ref={queueRef} className="flex flex-wrap items-center gap-2 scroll-mt-28">
            <div className="flex flex-wrap gap-1">
              {filterStatuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    statusFilter === s ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            {approvableNow.length > 0 && (
              <button
                type="button"
                onClick={approveHighConfidence}
                title="Approves only items with High confidence and at least one evidence record attached. Low-confidence or unsupported items still need a manual decision."
                className="inline-flex items-center gap-1.5 rounded-md border border-positive/30 bg-positive-soft px-2.5 py-1 text-[11px] font-medium text-positive hover:bg-positive-soft/80"
              >
                Approve {approvableNow.length} high-confidence item{approvableNow.length === 1 ? "" : "s"}
              </button>
            )}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left">
                <th className="label-caps px-4 py-2.5">SKU · customer · location</th>
                <th className="label-caps px-4 py-2.5 text-right">Baseline</th>
                <th className="label-caps px-4 py-2.5 text-right">Event adj.</th>
                <th className="label-caps px-4 py-2.5 text-right">Override</th>
                <th className="label-caps px-4 py-2.5 text-right">Proposed final</th>
                <th className="label-caps px-4 py-2.5 text-right">Change</th>
                <th className="label-caps px-4 py-2.5">Reason</th>
                <th className="label-caps px-4 py-2.5">Evidence</th>
                <th className="label-caps px-4 py-2.5">Confidence</th>
                <th className="label-caps px-4 py-2.5">Requestor / approver</th>
                <th className="label-caps px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const pct = changePct(item);
                return (
                  <tr
                    key={item.id}
                    onClick={() => {
                      setSelectedId(item.id);
                      setEditing(false);
                    }}
                    className={cn(
                      "cursor-pointer border-b border-border align-top last:border-0 hover:bg-surface-muted/60",
                      selected?.id === item.id && "bg-accent/40",
                    )}
                  >
                    <td className="px-4 py-3">
                      <p className="num text-xs font-semibold">{item.sku}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.customer} · {item.location}
                      </p>
                    </td>
                    <td className="num px-4 py-3 text-right text-xs">{formatNumber(item.baseline)}</td>
                    <td className={cn("num px-4 py-3 text-right text-xs", item.eventAdjustment < 0 && "text-risk")}>
                      {item.eventAdjustment >= 0 ? "+" : ""}
                      {formatNumber(item.eventAdjustment)}
                    </td>
                    <td className={cn("num px-4 py-3 text-right text-xs", item.plannerOverride < 0 && "text-risk")}>
                      {item.plannerOverride >= 0 ? "+" : ""}
                      {formatNumber(item.plannerOverride)}
                    </td>
                    <td className="num px-4 py-3 text-right text-xs font-semibold">{formatNumber(proposedFinal(item))}</td>
                    <td className="num px-4 py-3 text-right text-xs">
                      <span className={Math.abs(pct) > 10 ? "text-risk" : Math.abs(pct) > 3 ? "text-warning-foreground" : "text-positive"}>
                        {formatSigned(pct)}
                      </span>
                    </td>
                    <td className="max-w-[240px] px-4 py-3 text-xs text-muted-foreground">{item.reason}</td>
                    <td className="px-4 py-3">
                      <StatusPill tone={item.evidence.length ? "info" : "risk"}>
                        {item.evidence.length ? `${item.evidence.length} item${item.evidence.length > 1 ? "s" : ""}` : "None"}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={item.confidence === "High" ? "positive" : item.confidence === "Medium" ? "warning" : "risk"}>
                        {item.confidence}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground">
                      <p>{item.requestor}</p>
                      <p>{item.approver}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={approvalTone[item.status]}>{item.status}</StatusPill>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No queue items with this status.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {selected && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Panel
            className="xl:col-span-2"
            title={`Decision — ${selected.sku} · ${selected.customer}`}
            description={`${selected.description} at ${selected.location}. Origin: ${selected.origin.toLowerCase()}.`}
          >
            <div className="space-y-4">
              {selected.confidence === "Low" && selected.evidence.length === 0 && (
                <div className="flex items-start gap-2 rounded-md border border-risk/30 bg-risk-soft px-3 py-2 text-xs text-risk">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    Insufficient evidence: this change has low confidence and no attached record. Review
                    policy requires it to be returned or rejected rather than approved.
                  </span>
                </div>
              )}

              <div>
                <p className="label-caps mb-2">
                  Final forecast bridge — model baseline + approved event adjustment + approved
                  planner override = approved operational forecast (unapproved what-if scenarios excluded)
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: "Model baseline", value: formatNumber(selected.baseline) },
                    { label: "Approved event adjustment", value: `${selected.eventAdjustment >= 0 ? "+" : ""}${formatNumber(selected.eventAdjustment)}` },
                    { label: "Approved planner override", value: `${selected.plannerOverride >= 0 ? "+" : ""}${formatNumber(selected.plannerOverride)}` },
                    {
                      label: selected.status === "Approved" ? "Approved operational forecast" : "Proposed final forecast",
                      value: formatNumber(proposedFinal(selected)),
                    },
                  ].map((cell) => (
                    <div key={cell.label} className="rounded-md border border-border bg-surface-muted px-3 py-2">
                      <p className="label-caps">{cell.label}</p>
                      <p className="num mt-1 text-sm font-semibold">{cell.value}</p>
                    </div>
                  ))}
                </div>
              </div>


              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => decide("Approved")}
                  disabled={selected.status === "Approved"}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => decide("Rejected", "Rejected during consensus review.")}
                  disabled={selected.status === "Rejected"}
                  className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-risk-soft hover:text-risk disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" aria-hidden /> Reject
                </button>
                <button
                  type="button"
                  onClick={() => decide("Returned for clarification", "Returned: please attach supporting evidence.")}
                  disabled={selected.status === "Returned for clarification"}
                  className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
                >
                  <CornerUpLeft className="h-3.5 w-3.5" aria-hidden /> Return for clarification
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing((v) => !v);
                    setEditValue(String(selected.plannerOverride));
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  Edit recommendation
                </button>
                <button
                  type="button"
                  onClick={() => setEvidenceOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  <FileSearch className="h-3.5 w-3.5" aria-hidden /> View evidence
                </button>
                <button
                  type="button"
                  onClick={() => setFullOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  View complete forecast
                </button>
              </div>

              {editing && (
                <div className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-surface-muted px-3 py-3">
                  <label className="text-xs">
                    <span className="label-caps block">Revised planner override (units)</span>
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="num mt-1 w-44 rounded-md border border-input bg-surface px-2 py-1 text-xs"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      editRecommendation(selected.id, Number(editValue) || 0);
                      setEditing(false);
                    }}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    Save recommendation
                  </button>
                  <span className="text-xs text-muted-foreground">
                    New proposed final: {formatNumber(selected.baseline + selected.eventAdjustment + (Number(editValue) || 0))} units
                  </span>
                </div>
              )}

              {evidenceOpen && (
                <div className="rounded-md border border-border">
                  <p className="label-caps border-b border-border px-3 py-2">Evidence</p>
                  {selected.evidence.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-risk">Insufficient evidence — no record attached to this request.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {selected.evidence.map((ev) => (
                        <li key={ev.label} className="px-3 py-2">
                          <p className="text-xs font-medium">{ev.label}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {ev.source} · {ev.detail}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {fullOpen && (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-muted text-left">
                        <th className="label-caps px-3 py-2">Month</th>
                        {horizonMonths.map((m) => (
                          <th key={m} className="label-caps px-3 py-2 text-right">
                            {m}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="px-3 py-2 text-xs text-muted-foreground">Proposed final</td>
                        {selected.monthly.map((v, i) => (
                          <td key={horizonMonths[i]} className="num px-3 py-2 text-right text-xs">
                            {formatNumber(v)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-xs text-muted-foreground">Baseline</td>
                        {selected.monthly.map((v, i) => (
                          <td key={horizonMonths[i]} className="num px-3 py-2 text-right text-xs text-muted-foreground">
                            {formatNumber(Math.round((v * selected.baseline) / (proposedFinal(selected) || 1)))}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <div>
                <p className="label-caps">Comments</p>
                <ul className="mt-2 space-y-2">
                  {selected.comments.length === 0 && (
                    <li className="text-xs text-muted-foreground">No comments recorded on this item.</li>
                  )}
                  {selected.comments.map((c) => (
                    <li key={c.id} className="rounded-md border border-border px-3 py-2">
                      <p className="text-xs font-medium">{c.author}</p>
                      <p className="text-xs text-muted-foreground">{c.body}</p>
                      <p className="num text-[11px] text-muted-foreground">{c.at}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex gap-2">
                  <input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment for the requestor…"
                    className="flex-1 rounded-md border border-input bg-surface px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!comment.trim()) return;
                      addApprovalComment(selected.id, comment.trim());
                      setComment("");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden /> Add comment
                  </button>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Version control" description="Only an approved version is released to downstream systems.">
            <ul className="space-y-2">
              {versions.map((v) => (
                <li key={v.id} className="rounded-md border border-border px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="num text-xs font-semibold">{v.label}</p>
                    <StatusPill tone={v.status === "Published" ? "positive" : v.status === "Working draft" ? "warning" : "neutral"}>
                      {v.status}
                    </StatusPill>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {v.cycle} · {v.createdBy} · {v.createdAt}
                  </p>
                  <p className="num mt-1 text-xs">{formatNumber(v.totalUnits)} units</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{v.note}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      <Panel
        title="Forecast bridge — V2026.06 published to V2026.07 draft"
        description="Every unit of movement between versions is attributed to a named cause."
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left">
                <th className="label-caps px-4 py-2.5">Bridge step</th>
                <th className="label-caps px-4 py-2.5 text-right">Movement</th>
                <th className="label-caps px-4 py-2.5 text-right">Running total</th>
                <th className="label-caps px-4 py-2.5">Explanation</th>
              </tr>
            </thead>
            <tbody>
              {bridgeRows.map((step) => (
                <tr key={step.label} className={cn("border-b border-border last:border-0", step.kind !== "step" && "bg-surface-muted/60 font-medium")}>
                  <td className="px-4 py-2.5 text-xs">{step.label}</td>
                  <td className={cn("num px-4 py-2.5 text-right text-xs", step.kind === "step" && (step.delta < 0 ? "text-risk" : "text-positive"))}>
                    {step.kind === "step" ? `${step.delta >= 0 ? "+" : ""}${formatNumber(step.delta)}` : "—"}
                  </td>
                  <td className="num px-4 py-2.5 text-right text-xs font-semibold">{formatNumber(step.value)}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{step.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Adjustment requests from events and scenarios" description="Scenarios never publish directly; they enter here as requests." bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left">
                <th className="label-caps px-4 py-2.5">Request</th>
                <th className="label-caps px-4 py-2.5">Origin</th>
                <th className="label-caps px-4 py-2.5">Submitted</th>
                <th className="label-caps px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {adjustmentRequests.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-xs">{r.title}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.origin}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.submittedAt}</td>
                  <td className="px-4 py-2.5">
                    <StatusPill tone={r.status === "Approved" ? "positive" : r.status === "Rejected" ? "risk" : "warning"}>
                      {r.status}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <PrototypeNote>
        Illustrative prototype data. Approval, rejection, return, edit, comment and publication actions
        update local prototype state and the audit log only — no forecast leaves this browser session.
      </PrototypeNote>
    </div>
  );
}
