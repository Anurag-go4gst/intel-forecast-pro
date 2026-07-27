import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { usePlatform } from "@/lib/platform-state";
import { workflowStages, type WorkflowStage } from "@/lib/workflow";
import { cn } from "@/lib/utils";

export type StageStatus = "completed" | "current" | "pending" | "locked";

/** Index of the stage the planner should be working on right now. */
export function useCurrentStageIndex() {
  const { stageDone } = usePlatform();
  const idx = workflowStages.findIndex((s) => !stageDone[s.id]);
  return idx === -1 ? workflowStages.length - 1 : idx;
}

export function useActiveStage(): WorkflowStage | null {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { stageDone } = usePlatform();
  const matches = workflowStages.filter((s) => s.route === pathname);
  if (matches.length === 0) return null;
  return matches.find((s) => !stageDone[s.id]) ?? matches[matches.length - 1];
}

function statusFor(index: number, current: number, done: boolean): StageStatus {
  if (done) return "completed";
  if (index === current) return "current";
  if (index <= current + 1) return "pending";
  return "locked";
}

export function WorkflowRail() {
  const { stageDone } = usePlatform();
  const current = useCurrentStageIndex();
  const active = useActiveStage();

  return (
    <div className="border-b border-border bg-surface-muted/70">
      <div className="flex items-center gap-3 px-4 py-2 sm:px-6">
        <span className="label-caps hidden shrink-0 xl:inline">Forecasting workflow</span>
        <ol className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-0.5">
          {workflowStages.map((stage, index) => {
            const status = statusFor(index, current, stageDone[stage.id]);
            const isActive = active?.id === stage.id;
            const locked = status === "locked";
            const content = (
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors",
                  status === "completed" && "border-positive/30 bg-positive-soft text-positive",
                  status === "current" && "border-primary bg-primary text-primary-foreground",
                  status === "pending" && "border-border bg-surface text-muted-foreground hover:bg-accent",
                  locked && "border-dashed border-border bg-surface text-muted-foreground/60",
                  isActive && status !== "current" && "ring-1 ring-primary/40",
                )}
              >
                <span
                  className={cn(
                    "grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-semibold",
                    status === "completed" && "bg-positive text-primary-foreground",
                    status === "current" && "bg-primary-foreground/25",
                    status !== "completed" && status !== "current" && "bg-muted",
                  )}
                >
                  {status === "completed" ? (
                    <Check className="h-2.5 w-2.5" aria-hidden />
                  ) : locked ? (
                    <Lock className="h-2.5 w-2.5" aria-hidden />
                  ) : (
                    stage.step
                  )}
                </span>
                <span className="hidden sm:inline">{stage.short}</span>
              </span>
            );

            return (
              <li key={stage.id} className="flex items-center gap-1">
                {locked ? (
                  <span title={`Locked — complete step ${current + 1} first`}>{content}</span>
                ) : (
                  <Link
                    to={stage.route}
                    search={stage.search as never}
                    title={`Step ${stage.step} — ${stage.label}`}
                  >
                    {content}
                  </Link>
                )}
                {index < workflowStages.length - 1 && (
                  <ChevronRight className="h-3 w-3 shrink-0 text-border" aria-hidden />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/**
 * One clear primary next action plus a secondary Back action, derived from the
 * authoritative workflow rather than declared per screen.
 */
export function StageActions() {
  const navigate = useNavigate();
  const { completeStage, blockingOpen } = usePlatform();
  const stage = useActiveStage();
  if (!stage) return null;

  const index = workflowStages.findIndex((s) => s.id === stage.id);
  const prev = index > 0 ? workflowStages[index - 1] : null;
  const next = workflowStages[index + 1] ?? null;

  const gated = stage.id === "dataset" && blockingOpen > 0;

  const advance = () => {
    completeStage(stage.id);
    if (next) void navigate({ to: next.route, search: (next.search ?? {}) as never });
  };

  return (
    <div className="sticky bottom-0 z-20 mt-6 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-sm sm:px-6">
      <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <p className="text-xs font-semibold">
            Step {stage.step} of {workflowStages.length} · {stage.label}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {gated
              ? `${blockingOpen} blocking data issue${blockingOpen === 1 ? "" : "s"} must be resolved before model execution is unlocked.`
              : `Next: ${stage.nextStep}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {prev && (
            <Link
              to={prev.route}
              search={prev.search as never}
              className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Back
            </Link>
          )}
          <button
            type="button"
            onClick={advance}
            disabled={gated}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {stage.primaryLabel}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
