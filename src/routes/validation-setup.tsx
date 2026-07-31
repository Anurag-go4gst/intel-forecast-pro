import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarRange, FlaskConical, ShieldCheck, Split } from "lucide-react";
import {
  KpiTile,
  MetricRow,
  PageHeading,
  Panel,
  PrototypeNote,
  StatusPill,
} from "@/components/primitives";
import { HISTORY_MONTHS, monthLabels } from "@/lib/demo-data";
import { usePlatform } from "@/lib/platform-state";
import { stageById } from "@/lib/workflow";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/validation-setup")({
  head: () => ({
    meta: [
      { title: "Chronological Validation Setup — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Step 5: configure chronological training, validation and holdout periods for rolling backtests. Time series are never split randomly.",
      },
      { property: "og:title", content: "Chronological Validation Setup" },
      {
        property: "og:description",
        content: "Training teaches, validation compares, holdout verifies — configured chronologically.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ValidationSetup,
});

const explainers = [
  {
    id: "train",
    title: "Training data",
    role: "Teaches the model",
    tone: "info" as const,
    body: "The earliest months. Each candidate model learns level, trend, seasonality and driver relationships from this window only.",
    swatch: "bg-primary/70",
  },
  {
    id: "validation",
    title: "Validation data",
    role: "Compares and tunes",
    tone: "warning" as const,
    body: "Later months the model has not seen. Used to rank candidates and tune settings. Reusing it for the final verdict would flatter the winner.",
    swatch: "bg-warning/70",
  },
  {
    id: "test",
    title: "Test / holdout data",
    role: "Independently verifies",
    tone: "positive" as const,
    body: "The most recent months, touched once. Confirms the selected champion generalises rather than fits the validation window.",
    swatch: "bg-positive/70",
  },
  {
    id: "future",
    title: "Future periods",
    role: "The forecast itself",
    tone: "neutral" as const,
    body: "The 12 months being forecast. No actuals exist yet; accuracy here is measured later in Performance Monitoring.",
    swatch: "bg-muted-foreground/40",
  },
];

function ValidationSetup() {
  const { validationMode, setValidationMode, stageDone } = usePlatform();
  const stage = stageById.validation;
  const [folds, setFolds] = useState(5);
  const [testMonths, setTestMonths] = useState(6);
  const [validationMonths, setValidationMonths] = useState(9);
  const [gap, setGap] = useState(0);

  const auto = validationMode === "auto";
  const effective = auto
    ? { folds: 5, testMonths: 6, validationMonths: 9, gap: 0 }
    : { folds, testMonths, validationMonths, gap };

  const split = useMemo(() => {
    const trainMonths = HISTORY_MONTHS - effective.validationMonths - effective.testMonths - effective.gap;
    return {
      trainMonths,
      trainFrom: monthLabels[0],
      trainTo: monthLabels[Math.max(trainMonths - 1, 0)],
      valFrom: monthLabels[trainMonths + effective.gap],
      valTo: monthLabels[trainMonths + effective.gap + effective.validationMonths - 1],
      testFrom: monthLabels[HISTORY_MONTHS - effective.testMonths],
      testTo: monthLabels[HISTORY_MONTHS - 1],
      futureFrom: monthLabels[HISTORY_MONTHS],
      futureTo: monthLabels[monthLabels.length - 1],
    };
  }, [effective]);

  const total = HISTORY_MONTHS + 12;
  const widths = {
    train: (split.trainMonths / total) * 100,
    gap: (effective.gap / total) * 100,
    val: (effective.validationMonths / total) * 100,
    test: (effective.testMonths / total) * 100,
    future: (12 / total) * 100,
  };

  // Month count and share-of-history for each window, so the explainer cards
  // carry the actual split, not just a description.
  const historyShare = (months: number) => Math.round((months / HISTORY_MONTHS) * 100);
  const windowMonths: Record<string, { months: number; share: number | null }> = {
    train: { months: split.trainMonths, share: historyShare(split.trainMonths) },
    validation: {
      months: effective.validationMonths,
      share: historyShare(effective.validationMonths),
    },
    test: { months: effective.testMonths, share: historyShare(effective.testMonths) },
    future: { months: 12, share: null },
  };

  return (
    <div className="space-y-5">
      <PageHeading
        title="Configure Chronological Validation"
        subtitle={stage.purpose}
        actions={
          <StatusPill tone={stageDone.validation ? "positive" : "info"}>
            {stageDone.validation ? "Validation configured" : "Step 5 of 13"}
          </StatusPill>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Training window" value={String(split.trainMonths)} unit="months" delta={`${split.trainFrom} – ${split.trainTo}`} deltaTone="info" icon={CalendarRange} />
        <KpiTile label="Validation window" value={String(effective.validationMonths)} unit="months" delta={`${split.valFrom} – ${split.valTo}`} deltaTone="warning" icon={Split} />
        <KpiTile label="Holdout (test)" value={String(effective.testMonths)} unit="months" delta={`${split.testFrom} – ${split.testTo}`} deltaTone="positive" icon={ShieldCheck} />
        <KpiTile label="Rolling folds" value={String(effective.folds)} delta="Origin advances one bucket" deltaTone="neutral" icon={FlaskConical} />
      </div>

      <div className="rounded-md border border-border bg-surface-muted/50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-semibold">{HISTORY_MONTHS} months of history</span>
          <span className="text-muted-foreground">
            ({monthLabels[0]} – {split.testTo}) split into
          </span>
          <span className="font-medium text-primary">{split.trainMonths} training</span>
          <span className="text-muted-foreground">+</span>
          <span className="font-medium text-warning">{effective.validationMonths} validation</span>
          {effective.gap > 0 && (
            <>
              <span className="text-muted-foreground">+</span>
              <span className="font-medium text-muted-foreground">{effective.gap} embargo</span>
            </>
          )}
          <span className="text-muted-foreground">+</span>
          <span className="font-medium text-positive">{effective.testMonths} holdout</span>
          <span className="text-muted-foreground">
            , then 12 forecast months = {total}-month timeline.
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Training teaches each model, validation ranks them, and the holdout is read once to confirm
          the champion generalises. Windows sit strictly in time order — never split randomly.
        </p>
      </div>

      <Panel
        title="Chronological split"
        description="Time series are never split randomly: every evaluation window sits strictly after the data used to train it."
      >
        <div className="flex h-9 w-full overflow-hidden rounded-md border border-border">
          <div className="flex items-center justify-center bg-primary/70 text-[10px] font-semibold text-primary-foreground" style={{ width: `${widths.train}%` }}>
            Train
          </div>
          {effective.gap > 0 && (
            <div className="bg-muted" style={{ width: `${widths.gap}%` }} title="Embargo gap" />
          )}
          <div className="flex items-center justify-center bg-warning/70 text-[10px] font-semibold text-warning-foreground" style={{ width: `${widths.val}%` }}>
            Validation
          </div>
          <div className="flex items-center justify-center bg-positive/70 text-[10px] font-semibold text-primary-foreground" style={{ width: `${widths.test}%` }}>
            Holdout
          </div>
          <div className="flex items-center justify-center bg-muted text-[10px] font-semibold text-muted-foreground" style={{ width: `${widths.future}%` }}>
            Forecast
          </div>
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
          <span>{monthLabels[0]}</span>
          <span>{split.testTo} (today)</span>
          <span>{split.futureTo}</span>
        </div>

        <p className="mt-5 mb-2 label-caps">What each window is for</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {explainers.map((e) => {
            const w = windowMonths[e.id];
            return (
              <div key={e.id} className="rounded-md border border-border bg-surface-muted/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-sm", e.swatch)} aria-hidden />
                    <p className="text-sm font-semibold">{e.title}</p>
                  </div>
                  {w && (
                    <span className="num text-xs font-semibold text-muted-foreground">
                      {w.months} mo{w.share !== null ? ` · ${w.share}%` : ""}
                    </span>
                  )}
                </div>
                <StatusPill tone={e.tone} className="mt-2">{e.role}</StatusPill>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{e.body}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Percentages are the share of the {HISTORY_MONTHS}-month history; forecast months have no
          actuals yet, so they carry no share.
        </p>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Validation strategy" description="Ordinary planners can accept the recommendation; advanced users may configure the periods.">
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setValidationMode("auto")}
              className={cn(
                "w-full rounded-md border px-3 py-2.5 text-left transition-colors",
                auto ? "border-primary bg-accent" : "border-input hover:bg-accent/60",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Automatic chronological rolling backtesting</span>
                <StatusPill tone="positive">Recommended</StatusPill>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                5 rolling folds, 9-month validation, 6-month untouched holdout. Windows are sized per
                series from its history length and seasonality.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setValidationMode("manual")}
              className={cn(
                "w-full rounded-md border px-3 py-2.5 text-left transition-colors",
                !auto ? "border-primary bg-accent" : "border-input hover:bg-accent/60",
              )}
            >
              <span className="text-sm font-medium">Advanced — configure periods manually</span>
              <p className="mt-1 text-xs text-muted-foreground">
                For forecasting specialists validating a specific hypothesis. Not required to proceed.
              </p>
            </button>
          </div>

          <div className={cn("mt-4 space-y-3", auto && "pointer-events-none opacity-45")}>
            <div>
              <label className="label-caps" htmlFor="folds">Rolling folds: {effective.folds}</label>
              <input id="folds" type="range" min={3} max={8} value={effective.folds} onChange={(e) => setFolds(Number(e.target.value))} className="mt-1.5 w-full accent-[var(--color-primary)]" />
            </div>
            <div>
              <label className="label-caps" htmlFor="valm">Validation months: {effective.validationMonths}</label>
              <input id="valm" type="range" min={3} max={18} value={effective.validationMonths} onChange={(e) => setValidationMonths(Number(e.target.value))} className="mt-1.5 w-full accent-[var(--color-primary)]" />
            </div>
            <div>
              <label className="label-caps" htmlFor="testm">Holdout months: {effective.testMonths}</label>
              <input id="testm" type="range" min={3} max={12} value={effective.testMonths} onChange={(e) => setTestMonths(Number(e.target.value))} className="mt-1.5 w-full accent-[var(--color-primary)]" />
            </div>
            <div>
              <label className="label-caps" htmlFor="gapm">Embargo gap months: {effective.gap}</label>
              <input id="gapm" type="range" min={0} max={3} value={effective.gap} onChange={(e) => setGap(Number(e.target.value))} className="mt-1.5 w-full accent-[var(--color-primary)]" />
            </div>
          </div>
        </Panel>

        <Panel title="Evaluation rules applied to every candidate" description="Fixed so the tournament ranking stays comparable across models and series.">
          <MetricRow label="Split type" value="Chronological (no random shuffling)" />
          <MetricRow label="Origin advance" value="1 month per fold" />
          <MetricRow label="Primary error metric" value="WAPE (volume-weighted)" />
          <MetricRow label="Scale-free check" value="MASE versus seasonal naïve" />
          <MetricRow label="Directional check" value="Bias (over/under-forecast)" />
          <MetricRow label="Champion rule" value="Weighted score — never MAPE alone" />
          <MetricRow label="Holdout usage" value="Read once, after selection" tone="positive" />
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {stage.whyItMatters}
          </p>
        </Panel>
      </div>

      <PrototypeNote>
        Illustrative prototype data. Splits and folds are simulated deterministically from the seeded
        history; no model is trained.
      </PrototypeNote>
    </div>
  );
}
