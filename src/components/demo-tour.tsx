import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, LogOut, PlayCircle, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { demoSteps } from "@/lib/demo-tour";
import { usePlatform } from "@/lib/platform-state";
import { DEMO_SKU, demoCaseMeta } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

type Confirm = "start" | "reset" | "exit" | null;

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
    blockingOpen,
  } = usePlatform();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const step = demoSteps[index];

  /**
   * Each step waits for the planner's own action. The guided demo never
   * completes a decision on the user's behalf.
   */
  const gate = (() => {
    if (step.id === "resolve" && blockingOpen > 0) {
      return `Resolve ${blockingOpen} blocking issue${blockingOpen === 1 ? "" : "s"} on this screen before continuing.`;
    }
    if (step.id === "dataset" && !stageDone.dataset) {
      return "Approve the forecast-ready dataset on this screen before continuing.";
    }
    return null;
  })();

  const goto = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(demoSteps.length - 1, next));
      setIndex(clamped);
      void navigate({ to: demoSteps[clamped].route, search: (demoSteps[clamped].search ?? {}) as never });
    },
    [navigate],
  );

  const beginDemo = useCallback(() => {
    startDemo();
    setFilter("customer", demoCaseMeta.customerId);
    setFilter("family", demoCaseMeta.familyId);
    setFilter("plant", demoCaseMeta.plantId);
    setFilter("sku", DEMO_SKU);
    setOpen(true);
    setIndex(0);
    setConfirm(null);
    void navigate({ to: demoSteps[0].route });
  }, [navigate, setFilter, startDemo]);

  return (
    <>
      {mode !== "demo" && (
        <button
          type="button"
          onClick={() => setConfirm("start")}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <PlayCircle className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Start guided demo</span>
        </button>
      )}

      {mode === "demo" && (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <PlayCircle className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Guided demo panel</span>
          </button>
          <button
            type="button"
            onClick={() => setConfirm("reset")}
            title="Reset Guided Demo — restore the Apex Motors demonstration to its original seeded starting point"
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden lg:inline">Reset guided demo</span>
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
          title="Start the Apex Motors guided demo?"
          body="Start the Apex Motors guided demo? This will load a fictional dataset containing 500 demand series and 54 months of history. Any project or uploaded data currently in this workspace will be cleared."
          confirmLabel="Load fictional demo dataset"
          onConfirm={beginDemo}
          onCancel={() => setConfirm(null)}
        />
      )}

      {confirm === "reset" && (
        <ConfirmDialog
          title="Reset guided demo?"
          body="This restores the complete Apex Motors demonstration to its original seeded starting point. You stay in guided demo mode."
          confirmLabel="Reset guided demo"
          onConfirm={() => {
            resetDemo();
            setIndex(0);
            setConfirm(null);
            void navigate({ to: demoSteps[0].route });
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {confirm === "exit" && (
        <ConfirmDialog
          tone="risk"
          title={mode === "demo" ? "Exit demo and start a new project?" : "Delete current project and start again?"}
          body="This clears the project configuration, uploaded file, column mappings, dataset statistics, data-quality issues and resolutions, dataset approval, validation configuration, tournament results, champion selection, baseline, events, scenarios, overrides, approvals, performance results, audit entries, completed workflow stages, guided-demo state and all stored session keys. It cannot be undone."
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
                  Guided demo · step {step.step} of {demoSteps.length}
                </p>
                <p className="truncate text-sm font-semibold">{step.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {DEMO_SKU} · {demoCaseMeta.description} · {demoCaseMeta.customer}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close guided demo"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="max-h-[38vh] overflow-y-auto px-4 py-3">
              <p className="text-sm font-medium">{step.headline}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
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
                    disabled={i > index && Boolean(gate)}
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
                  disabled={index === 0}
                  className="flex items-center gap-1 rounded-md border border-input px-2 py-1.5 text-xs disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                  Back
                </button>
                {index === demoSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground"
                  >
                    Finish
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => goto(index + 1)}
                    disabled={Boolean(gate)}
                    title={gate ?? undefined}
                    className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
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
