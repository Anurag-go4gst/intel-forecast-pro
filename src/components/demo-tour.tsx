import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, PlayCircle, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { demoSteps } from "@/lib/demo-tour";
import { usePlatform } from "@/lib/platform-state";
import { DEMO_SKU, demoCaseMeta } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export function DemoTour() {
  const navigate = useNavigate();
  const { setFilter, completeStage, resetWorkflow, resetFilters } = usePlatform();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const goto = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(demoSteps.length - 1, next));
      setIndex(clamped);
      // Walking the demo forward completes each workflow stage it leaves behind.
      demoSteps.slice(0, clamped).forEach((s) => completeStage(s.id));
      void navigate({ to: demoSteps[clamped].route, search: (demoSteps[clamped].search ?? {}) as never });
    },
    [navigate, completeStage],
  );

  const start = useCallback(() => {
    setFilter("customer", demoCaseMeta.customerId);
    setFilter("family", demoCaseMeta.familyId);
    setFilter("plant", demoCaseMeta.plantId);
    setFilter("sku", DEMO_SKU);
    resetWorkflow();
    setOpen(true);
    setIndex(0);
    void navigate({ to: demoSteps[0].route });
  }, [navigate, setFilter, resetWorkflow]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const step = demoSteps[index];

  return (
    <>
      <button
        type="button"
        onClick={start}
        className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <PlayCircle className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">Start guided demo</span>
      </button>

      <button
        type="button"
        onClick={() => {
          resetWorkflow();
          resetFilters();
          setOpen(false);
          setIndex(0);
          void navigate({ to: "/" });
        }}
        title="Reset guided demo — restores the original seeded state"
        className="flex shrink-0 items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden lg:inline">Reset demo</span>
      </button>

      {open && mounted && createPortal(
        <div className="fixed inset-x-0 bottom-[4.75rem] z-40 px-3 sm:inset-x-auto sm:left-4 sm:bottom-[5.5rem] sm:w-[400px] sm:px-0">
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
                    onClick={() => {
                      demoSteps.forEach((s) => completeStage(s.id));
                      setOpen(false);
                    }}
                    className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground"
                  >
                    Finish
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => goto(index + 1)}
                    className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground"
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
