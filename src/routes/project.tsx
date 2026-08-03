import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { CalendarRange, FolderPlus, Layers, Ruler } from "lucide-react";
import { useState } from "react";
import { KpiTile, MetricRow, Panel, PageHeading, PrototypeNote, StatusPill } from "@/components/primitives";
import { usePlatform } from "@/lib/platform-state";
import {
  emptyProjectDraft,
  frequencyOptions,
  grainOptions,
  industryOptions,
} from "@/lib/app-mode";
import { stageById } from "@/lib/workflow";

export const Route = createFileRoute("/project")({
  head: () => ({
    meta: [
      { title: "Create Forecasting Project — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Step 1 of the forecasting workflow: define the planning cycle, granularity, time bucket and forecast horizon before any data is uploaded.",
      },
      { property: "og:title", content: "Create Forecasting Project — Demand Intelligence Platform" },
      {
        property: "og:description",
        content: "Define granularity, time bucket and horizon for the demand forecasting cycle.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectSetup,
});

function ProjectSetup() {
  const navigate = useNavigate();
  const { mode, project, dataset, createProject } = usePlatform();
  const stage = stageById.project;
  const [draft, setDraft] = useState(emptyProjectDraft);

  const demo = mode === "demo";
  const stats = dataset?.stats ?? null;
  const sourceLabel = demo ? "Demo workbook import" : "User configured";

  const seriesValue = demo ? "500" : stats ? String(stats.series) : "—";
  const historyValue = demo ? "54" : stats ? String(stats.periods) : "—";
  const calcNote = demo ? "Read from demo workbook" : "Calculated after upload";

  const canCreate = draft.name.trim().length > 1 && draft.owner.trim().length > 1;

  return (
    <div className="space-y-5">
      <PageHeading
        title={project ? "Forecasting project" : "Create Forecasting Project"}
        subtitle={stage.purpose}
        actions={
          <StatusPill tone={project ? "positive" : "info"}>
            {demo ? "Guide project" : project ? "Project created" : "Step 1 of 13"}
          </StatusPill>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Demand series in scope"
          value={seriesValue}
          delta={stats || demo ? (demo ? "Read from demo workbook" : "Calculated from your upload") : calcNote}
          deltaTone="neutral"
          icon={Layers}
        />
        <KpiTile
          label="Time frequency"
          value={demo ? "Monthly" : stats ? stats.frequency : (project?.frequency ?? draft.frequency)}
          delta={stats && !demo ? "Detected from data — confirm" : `${sourceLabel} (expected)`}
          deltaTone="info"
          icon={CalendarRange}
        />
        <KpiTile
          label="Forecast horizon"
          value={String(project?.horizon ?? draft.horizon)}
          unit="periods"
          delta={sourceLabel}
          deltaTone="neutral"
          icon={Ruler}
        />
        <KpiTile
          label="History available"
          value={historyValue}
          unit={historyValue === "—" ? undefined : "periods"}
          delta={stats || demo ? (demo ? "Read from demo workbook" : "Calculated from your upload") : calcNote}
          deltaTone={stats || demo ? "positive" : "neutral"}
          icon={FolderPlus}
        />
      </div>

      {!project && (
        <Panel
          title="Project definition"
          description="Only what you know before any data exists. Demand-series count and available history are calculated from the uploaded file — never entered here."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="label-caps block" htmlFor="project-name">Project name</label>
              <input
                id="project-name"
                value={draft.name}
                placeholder="e.g. July 2026 operational demand cycle"
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                className="control mt-1.5 w-full"
              />

              <label className="label-caps mt-4 block" htmlFor="project-industry">Industry / use case</label>
              <select
                id="project-industry"
                value={draft.industry}
                onChange={(e) => setDraft((d) => ({ ...d, industry: e.target.value }))}
                className="control mt-1.5 w-full"
              >
                {industryOptions.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>

              <label className="label-caps mt-4 block" htmlFor="project-owner">Business owner</label>
              <input
                id="project-owner"
                value={draft.owner}
                placeholder="e.g. R. Iyer · Demand planning lead"
                onChange={(e) => setDraft((d) => ({ ...d, owner: e.target.value }))}
                className="control mt-1.5 w-full"
              />
            </div>

            <div>
              <label className="label-caps block" htmlFor="project-grain">Forecast grain</label>
              <select
                id="project-grain"
                value={draft.grain}
                onChange={(e) => setDraft((d) => ({ ...d, grain: e.target.value }))}
                className="control mt-1.5 w-full"
              >
                {grainOptions.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              <label className="label-caps mt-4 block" htmlFor="project-frequency">Expected time frequency</label>
              <select
                id="project-frequency"
                value={draft.frequency}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, frequency: e.target.value as typeof d.frequency }))
                }
                className="control mt-1.5 w-full"
              >
                {frequencyOptions.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Confirmed against the frequency detected in the uploaded file.
              </p>

              <label className="label-caps mt-4 block" htmlFor="project-horizon">
                Preferred forecast horizon ({draft.horizon} periods)
              </label>
              <input
                id="project-horizon"
                type="range"
                min={3}
                max={18}
                value={draft.horizon}
                onChange={(e) => setDraft((d) => ({ ...d, horizon: Number(e.target.value) }))}
                className="mt-2 w-full accent-[var(--color-primary)]"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!canCreate}
              onClick={() => {
                createProject({
                  name: draft.name.trim(),
                  industry: draft.industry,
                  grain: draft.grain,
                  frequency: draft.frequency,
                  horizon: draft.horizon,
                  owner: draft.owner.trim(),
                });
                void navigate({ to: "/data-readiness" });
              }}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create project and upload data
            </button>
            {!canCreate && (
              <span className="text-[11px] text-muted-foreground">
                Enter a project name and business owner to continue.
              </span>
            )}
          </div>
        </Panel>
      )}

      {project && (
        <Panel
          title="Project summary"
          description={demo ? "Values below come from the prepared Apex Motors demo workbook import." : "Configured values and values calculated from your uploaded file."}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <MetricRow label="Project name" value={project.name} />
              <MetricRow label="Industry / use case" value={project.industry} />
              <MetricRow label="Forecast grain" value={project.grain} />
              <MetricRow label="Business owner" value={project.owner} />
              <MetricRow label="Created" value={project.createdAt} />
            </div>
            <div>
              <MetricRow label="Forecast horizon" value={`${project.horizon} periods · ${sourceLabel}`} />
              <MetricRow
                label="Time frequency"
                value={
                  demo
                    ? "Monthly · demo workbook"
                    : stats
                      ? `${stats.frequency} · detected from data`
                      : `${project.frequency} · expected, confirm after upload`
                }
              />
              <MetricRow label="Demand series" value={demo ? "500 · demo workbook" : stats ? `${stats.series} · calculated` : "Calculated after upload"} />
              <MetricRow
                label="History available"
                value={
                  demo
                    ? "54 periods · demo workbook"
                    : stats
                      ? `${stats.periods} periods · ${stats.earliest} → ${stats.latest}`
                      : "Calculated after upload"
                }
              />
              <MetricRow label="Uploaded rows" value={demo ? "27,000 · demo workbook" : stats ? String(stats.rows) : "No file uploaded"} />
            </div>
          </div>
        </Panel>
      )}

      <Panel title="What happens next" description="Every stage below is locked until the previous one is completed.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <p className="label-caps">Why this step matters</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{stage.whyItMatters}</p>
          </div>
          <div>
            <p className="label-caps">Decision required</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{stage.decision}</p>
          </div>
          <div>
            <p className="label-caps">Next step</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{stage.nextStep}</p>
          </div>
        </div>
      </Panel>

      <PrototypeNote>
        Illustrative prototype. Project configuration is stored in this browser session only — no
        planning cycle is provisioned in a source system.
      </PrototypeNote>
    </div>
  );
}
