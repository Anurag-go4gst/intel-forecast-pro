import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Loader2, LogOut, PlayCircle, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { demoSteps } from "@/lib/demo-tour";
import { usePlatform } from "@/lib/platform-state";
import { DEMO_SKU, demoCaseMeta } from "@/lib/demo-data";
import { workflowStages, type StageId } from "@/lib/workflow";
import { cn } from "@/lib/utils";

type Confirm = "start" | "reset" | "exit" | null;

const autoFollowStages: StageId[] = ["resolve", "dataset", "validation", "tournament", "champion", "baseline"];

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  tone = "primary",
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  tone?: "primary" | "risk";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center px-4">
      <button type="button" aria-label="Cancel" onClick={onCancel} className="absolute inset-0 bg-foreground/40" />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-lg">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{body}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold text-primary-foreground",
              tone === "risk" ? "bg-risk hover:bg-risk/90" : "bg-primary hover:bg-primary/90",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function DemoTour() {
  const navigate = useNavigate();
  const {
    mode,
    setFilter,
    startDemo,
    resetDemo,
    exitToNewProject,
    stageDone,
    completeStage,
    blockingOpen,
    adjustmentRequests,
  } = usePlatform();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [mounted, setMounted] = useState(false);
  const [transitionLabel, setTransitionLabel] = useState("");
  useEffect(() => setMounted(true), []);

  const guideStartIndex = 0;
  const guideEventApplied = adjustmentRequests.some(
    (request) => request.origin === "Event" && request.originId === "ie-0",
  );
  const step = demoSteps[index];
  const currentIndex = useMemo(() => {
    const firstIncomplete = workflowStages.findIndex((stage) => !stageDone[stage.id]);
    return firstIncomplete === -1 ? demoSteps.length - 1 : firstIncomplete;
  }, [stageDone]);

  const canAdvanceAfterAction = useCallback((id: StageId) => {
    if (id === "project" || id === "upload") return true;
    if (id === "scenarios") return true;
    if (id === "resolve") return blockingOpen === 0;
    if (id === "events") return guideEventApplied;
    return stageDone[id];
  }, [blockingOpen, guideEventApplied, stageDone]);

  const focusStepTarget = useCallback((next: number) => {
    const targetId = demoSteps[next].targetId;
    if (!targetId) return;
    window.setTimeout(() => {
      const node = document.getElementById(targetId);
      if (!node) return;
      node.scrollIntoView({ behavior: "smooth", block: "start" });
      if (node instanceof HTMLElement) node.focus({ preventScroll: true });
    }, 120);
  }, []);

  /**
   * Each step waits for the planner's own action. The guide never
   * completes a decision on the user's behalf.
   */
  const gate = (() => {
    if (step.id === "resolve" && blockingOpen > 0) {
      return `Resolve ${blockingOpen} blocking issue${blockingOpen === 1 ? "" : "s"} in the data-quality list on this screen. Expand each Blocking issue and choose a resolution.`;
    }
    if (step.id === "dataset" && blockingOpen > 0) {
      return `Go back to Resolve data-quality issues and clear ${blockingOpen} blocking issue${blockingOpen === 1 ? "" : "s"} before dataset approval.`;
    }
    if (step.id === "dataset" && !stageDone.dataset) {
      return "Approve the forecast-ready dataset on this screen before continuing.";
    }
    if (step.id === "validation" && !stageDone.validation) {
      return "Click Confirm validation design and continue in the bottom action bar. The guide will open Model Lab after the transition finishes.";
    }
    if (step.id === "tournament" && !stageDone.tournament) {
      return "Click Run Baseline Model Tournament, then wait until training, backtesting and scoring finish. The guide will continue when results are ready.";
    }
    if (step.id === "champion" && !stageDone.champion) {
      return "Click Accept champion and view baseline in the champion comparison panel.";
    }
    if (step.id === "baseline" && !stageDone.baseline) {
      return "Click Accept baseline and continue to event review in the bottom action bar.";
    }
    if (step.id === "events" && !guideEventApplied) {
      return "Select the Apex shutdown event, adjust its impact if needed, then use Apply selected residual impact before continuing.";
    }
    if (!canAdvanceAfterAction(step.id)) {
      return `Use the primary action on this screen: ${step.primaryLabel}.`;
    }
    return null;
  })();

  const openAtCurrentStep = useCallback(() => {
    setIndex(currentIndex);
    setOpen(true);
    void navigate({
      to: demoSteps[currentIndex].route,
      search: (demoSteps[currentIndex].search ?? {}) as never,
    });
    focusStepTarget(currentIndex);
  }, [currentIndex, focusStepTarget, navigate]);

  const goto = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(demoSteps.length - 1, next));
      setTransitionLabel(`Loading step ${demoSteps[clamped].step}: ${demoSteps[clamped].title}`);
      setIndex(clamped);
      void navigate({ to: demoSteps[clamped].route, search: (demoSteps[clamped].search ?? {}) as never });
      focusStepTarget(clamped);
      window.setTimeout(() => setTransitionLabel(""), 420);
    },
    [focusStepTarget, navigate],
  );

  useEffect(() => {
    if (mode !== "demo" || !open || currentIndex <= index || !stageDone[step.id]) return;
    if (!autoFollowStages.includes(step.id)) return;
    goto(currentIndex);
  }, [autoFollowStages, currentIndex, goto, index, mode, open, stageDone, step.id]);

  const beginDemo = useCallback(() => {
    startDemo();
    setFilter("customer", demoCaseMeta.customerId);
    setFilter("family", demoCaseMeta.familyId);
    setFilter("plant", demoCaseMeta.plantId);
    setFilter("sku", DEMO_SKU);
    setOpen(true);
    setIndex(guideStartIndex);
    setConfirm(null);
    void navigate({
      to: demoSteps[guideStartIndex].route,
      search: (demoSteps[guideStartIndex].search ?? {}) as never,
    });
    focusStepTarget(guideStartIndex);
  }, [focusStepTarget, navigate, setFilter, startDemo]);

  const advance = useCallback(() => {
    if (gate || transitionLabel) return;
    if (step.id === "project" || step.id === "upload") completeStage(step.id);
    if (step.id === "resolve") completeStage("resolve");
    if (step.id === "events") completeStage("events");
    if (step.id === "scenarios") completeStage("scenarios");
    const next = Math.min(demoSteps.length - 1, index + 1);
    setTransitionLabel(`Loading step ${demoSteps[next].step}: ${demoSteps[next].title}`);
    window.setTimeout(() => goto(next), 140);
  }, [completeStage, gate, goto, index, step.id, transitionLabel]);

  return (
    <>
      {mode !== "demo" && (
        <button
          type="button"
          onClick={() => setConfirm("start")}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <PlayCircle className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Start guide</span>
        </button>
      )}

      {mode === "demo" && (
        <>
          <button
            type="button"
            onClick={openAtCurrentStep}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <PlayCircle className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Guide</span>
          </button>
          <button
            type="button"
            onClick={openAtCurrentStep}
            className="hidden shrink-0 items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent xl:flex"
          >
            Resume current step
          </button>
          <button
            type="button"
            onClick={() => setConfirm("reset")}
            title="Reset guide — restore the Apex Motors demonstration to its original seeded starting point"
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden lg:inline">Reset guide</span>
          </button>
        </>
      )}

      {mode !== "empty" && (
        <button
          type="button"
          onClick={() => setConfirm("exit")}
          title={mode === "demo" ? "Exit demo and start a new project" : "Delete current project and start again"}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden lg:inline">{mode === "demo" ? "Exit demo" : "Delete project"}</span>
        </button>
      )}

      {confirm === "start" && (
        <ConfirmDialog
          title="Start the Apex Motors guide?"
          body="Start the Apex Motors guide? This will load a fictional dataset containing 500 demand series and 54 months of history. Any project or uploaded data currently in this workspace will be cleared."
          confirmLabel="Load fictional demo dataset"
          onConfirm={beginDemo}
          onCancel={() => setConfirm(null)}
        />
      )}

      {confirm === "reset" && (
        <ConfirmDialog
          title="Reset guide?"
          body="This restores the complete Apex Motors demonstration to its original seeded starting point. You stay in guide mode."
          confirmLabel="Reset guide"
          onConfirm={() => {
            setOpen(false);
            resetDemo();
            setIndex(guideStartIndex);
            setConfirm(null);
            void navigate({
              to: demoSteps[guideStartIndex].route,
              search: (demoSteps[guideStartIndex].search ?? {}) as never,
            });
            window.setTimeout(() => {
              setIndex(guideStartIndex);
              setOpen(true);
              focusStepTarget(guideStartIndex);
            }, 120);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {confirm === "exit" && (
        <ConfirmDialog
          tone="risk"
          title={mode === "demo" ? "Exit demo and start a new project?" : "Delete current project and start again?"}
          body="This clears the project configuration, uploaded file, column mappings, dataset statistics, data-quality issues and resolutions, dataset approval, validation configuration, tournament results, champion selection, baseline, events, scenarios, overrides, approvals, performance results, audit entries, completed workflow stages, guide state and all stored session keys. It cannot be undone."
          confirmLabel={mode === "demo" ? "Exit demo" : "Delete project"}
          onConfirm={() => {
            exitToNewProject();
            setOpen(false);
            setIndex(0);
            setConfirm(null);
            void navigate({ to: "/project" });
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {open && mounted && mode === "demo" && createPortal(
        <div className="fixed inset-x-0 bottom-[5.5rem] z-30 px-3 sm:inset-x-auto sm:right-4 sm:bottom-[5.5rem] sm:w-[400px] sm:px-0">
          <div className="rounded-lg border border-border bg-surface shadow-lg">
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  Guide · step {step.step} of {demoSteps.length}
                </p>
                <p className="truncate text-sm font-semibold">{step.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {DEMO_SKU} · {demoCaseMeta.description} · {demoCaseMeta.customer}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close guide"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="max-h-[38vh] overflow-y-auto px-4 py-3">
              <p className="text-sm font-medium">{step.headline}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
              {transitionLabel && (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-primary/25 bg-accent px-2.5 py-2 text-[11px] font-medium text-primary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  {transitionLabel}
                </div>
              )}
              {gate && (
                <p className="mt-3 rounded-md border border-risk/25 bg-risk-soft px-2.5 py-2 text-[11px] font-medium text-risk">
                  Your action is required: {gate}
                </p>
              )}
              <div className="mt-3 space-y-2 rounded-md border border-border bg-surface-muted/60 p-2.5">
                <p className="text-[11px] leading-relaxed">
                  <span className="font-semibold">Why this matters: </span>
                  <span className="text-muted-foreground">{step.why}</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  <span className="font-semibold">Decision required: </span>
                  <span className="text-muted-foreground">{step.decision}</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  <span className="font-semibold">Action to take: </span>
                  <span className="text-muted-foreground">{step.action}</span>
                </p>
                {step.id === "scenarios" && (
                  <p className="text-[11px] leading-relaxed">
                    <span className="font-semibold">Optional: </span>
                    <span className="text-muted-foreground">
                      Continue without a what-if scenario when no alternate outcome needs review.
                    </span>
                  </p>
                )}
                <p className="text-[11px] leading-relaxed">
                  <span className="font-semibold">Next step: </span>
                  <span className="text-muted-foreground">{step.next}</span>
                </p>
              </div>
              <p className="mt-3 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                What to look at on this screen
              </p>
              <ul className="mt-1.5 space-y-1">
                {step.lookFor.map((item) => (
                  <li key={item} className="flex gap-2 text-xs text-foreground/90">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5">
              <div className="flex items-center gap-1">
                {demoSteps.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`Go to step ${s.step}: ${s.title}`}
                    disabled={i > currentIndex || Boolean(transitionLabel)}
                    onClick={() => goto(i)}
                    className={cn(
                      "h-1.5 w-4 rounded-full transition-colors",
                      i === index ? "bg-primary" : "bg-border hover:bg-muted-foreground/40",
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => goto(index - 1)}
                  disabled={index === 0 || Boolean(transitionLabel)}
                  className="flex items-center gap-1 rounded-md border border-input px-2 py-1.5 text-xs disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                  Back
                </button>
                {index === demoSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={Boolean(gate) || Boolean(transitionLabel)}
                    title={gate ?? undefined}
                    className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Finish
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={advance}
                    disabled={Boolean(gate) || Boolean(transitionLabel)}
                    title={gate ?? undefined}
                    className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {step.id === "scenarios" ? "Skip what-if" : "Next"}
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
