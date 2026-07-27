import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Lock } from "lucide-react";
import { Panel, StatusPill } from "@/components/primitives";
import { useCurrentStageIndex } from "@/components/workflow-rail";
import { usePlatform } from "@/lib/platform-state";
import { workflowPhases, workflowStages } from "@/lib/workflow";
import { cn } from "@/lib/utils";

/**
 * Entry point to the guided lifecycle from the Executive Overview: shows where
 * the cycle currently stands and where to resume.
 */
export function WorkflowLauncher() {
  const { stageDone } = usePlatform();
  const current = useCurrentStageIndex();
  const currentStage = workflowStages[current];
  const completed = workflowStages.filter((s) => stageDone[s.id]).length;

  return (
    <Panel
      title="Forecasting workflow"
      description="Twelve governed steps from raw extract to published operational forecast, followed by monitoring. Each stage unlocks the next."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={completed === workflowStages.length ? "positive" : "info"}>
            {completed} / {workflowStages.length} stages complete
          </StatusPill>
          <Link
            to={currentStage.route}
            search={currentStage.search as never}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {completed === 0 ? "Start the workflow" : "Continue"} — step {currentStage.step}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {workflowPhases.map((phase) => {
          const stages = workflowStages.filter((s) => s.phase === phase);
          return (
            <div key={phase} className="rounded-md border border-border bg-surface-muted/50 p-3">
              <p className="label-caps">{phase}</p>
              <ul className="mt-2 space-y-1.5">
                {stages.map((stage) => {
                  const index = workflowStages.findIndex((s) => s.id === stage.id);
                  const done = stageDone[stage.id];
                  const locked = !done && index > current + 1;
                  const isCurrent = index === current;
                  const label = (
                    <span
                      className={cn(
                        "flex items-center gap-2 text-xs",
                        done && "text-positive",
                        isCurrent && "font-semibold text-foreground",
                        locked && "text-muted-foreground/60",
                        !done && !isCurrent && !locked && "text-muted-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-semibold",
                          done && "bg-positive text-primary-foreground",
                          isCurrent && "bg-primary text-primary-foreground",
                          !done && !isCurrent && "bg-muted text-muted-foreground",
                        )}
                      >
                        {done ? <Check className="h-2.5 w-2.5" aria-hidden /> : locked ? <Lock className="h-2.5 w-2.5" aria-hidden /> : stage.step}
                      </span>
                      <span className="truncate">{stage.label}</span>
                    </span>
                  );
                  return (
                    <li key={stage.id}>
                      {locked ? (
                        <span title="Complete the earlier stages first">{label}</span>
                      ) : (
                        <Link to={stage.route} search={stage.search as never} className="block hover:underline">
                          {label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Next decision: </span>
        {currentStage.decision}
      </p>
    </Panel>
  );
}
