import { createFileRoute } from "@tanstack/react-router";
import { CalendarRange, FolderPlus, Layers, Ruler } from "lucide-react";
import { useState } from "react";
import { KpiTile, MetricRow, Panel, PageHeading, PrototypeNote, StatusPill } from "@/components/primitives";
import { TOTAL_SERIES, businessUnits, formatNumber, plants } from "@/lib/demo-data";
import { usePlatform } from "@/lib/platform-state";
import { stageById } from "@/lib/workflow";
import { cn } from "@/lib/utils";

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

const granularities = [
  { id: "sku-cust-plant", label: "SKU × Customer × Plant", note: "Recommended — matches how the OEM schedules releases.", series: TOTAL_SERIES },
  { id: "sku-plant", label: "SKU × Plant", note: "Coarser: loses customer-specific event signals.", series: 214 },
  { id: "sku", label: "SKU only", note: "Aggregate planning; not suitable for customer event governance.", series: 96 },
];

const buckets = [
  { id: "monthly", label: "Monthly", note: "Recommended for a 12-month operational horizon." },
  { id: "weekly", label: "Weekly", note: "Higher noise; requires 3+ years of clean history." },
];

function OptionCard({
  selected,
  onSelect,
  title,
  note,
  right,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  note: string;
  right?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-md border px-3 py-2.5 text-left transition-colors",
        selected ? "border-primary bg-accent" : "border-input hover:bg-accent/60",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{title}</span>
        {right && <span className="num text-xs text-muted-foreground">{right}</span>}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
    </button>
  );
}

function ProjectSetup() {
  const { stageDone } = usePlatform();
  const stage = stageById.project;
  const [name, setName] = useState("July 2026 operational demand cycle");
  const [granularity, setGranularity] = useState("sku-cust-plant");
  const [bucket, setBucket] = useState("monthly");
  const [horizon, setHorizon] = useState(12);
  const [unit, setUnit] = useState(businessUnits[0]?.id ?? "");

  const selectedGranularity = granularities.find((g) => g.id === granularity)!;

  return (
    <div className="space-y-5">
      <PageHeading
        title="Create Forecasting Project"
        subtitle={stage.purpose}
        actions={
          <StatusPill tone={stageDone.project ? "positive" : "info"}>
            {stageDone.project ? "Project created" : "Step 1 of 13"}
          </StatusPill>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Demand series in scope" value={formatNumber(selectedGranularity.series)} delta={selectedGranularity.label} deltaTone="neutral" icon={Layers} />
        <KpiTile label="Time bucket" value={bucket === "monthly" ? "Monthly" : "Weekly"} delta="Chronological buckets" deltaTone="info" icon={CalendarRange} />
        <KpiTile label="Forecast horizon" value={String(horizon)} unit="months" delta="Rolling operational plan" deltaTone="neutral" icon={Ruler} />
        <KpiTile label="History available" value="54" unit="months" delta="4.5 seasonal cycles" deltaTone="positive" icon={FolderPlus} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Project definition" description="Names the cycle so every version, event and approval can be traced back to it.">
          <label className="label-caps block" htmlFor="project-name">Project name</label>
          <input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="control mt-1.5 w-full"
          />
          <label className="label-caps mt-4 block" htmlFor="project-unit">Business unit</label>
          <select
            id="project-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="control mt-1.5 w-full"
          >
            {businessUnits.map((b) => (
              <option key={b.id} value={b.id}>{b.label}</option>
            ))}
          </select>
          <label className="label-caps mt-4 block" htmlFor="project-horizon">Forecast horizon (months)</label>
          <input
            id="project-horizon"
            type="range"
            min={3}
            max={18}
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="mt-2 w-full accent-[var(--color-primary)]"
          />
          <p className="mt-1 text-xs text-muted-foreground">{horizon} months forecast from July 2026.</p>
        </Panel>

        <Panel title="Forecast granularity" description="The level at which models are trained and accuracy is measured.">
          <div className="space-y-2">
            {granularities.map((g) => (
              <OptionCard
                key={g.id}
                selected={granularity === g.id}
                onSelect={() => setGranularity(g.id)}
                title={g.label}
                note={g.note}
                right={`${formatNumber(g.series)} series`}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Time bucket and scope" description="Buckets must be uniform: models cannot mix weekly and monthly observations.">
          <div className="space-y-2">
            {buckets.map((b) => (
              <OptionCard key={b.id} selected={bucket === b.id} onSelect={() => setBucket(b.id)} title={b.label} note={b.note} />
            ))}
          </div>
          <div className="mt-4">
            <MetricRow label="Plants included" value={`${plants.length - 1} manufacturing sites`} />
            <MetricRow label="Currency / unit" value="Units (pieces)" />
            <MetricRow label="Cycle owner" value="R. Iyer · Demand planning lead" />
          </div>
        </Panel>
      </div>

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
        Illustrative prototype data. Creating a project stores the configuration in the browser session
        only — no planning cycle is provisioned in a source system.
      </PrototypeNote>
    </div>
  );
}
