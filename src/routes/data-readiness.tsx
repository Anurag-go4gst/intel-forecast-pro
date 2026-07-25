import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Gauge,
  RotateCcw,
  ShieldAlert,
  Table2,
  Undo2,
  UploadCloud,
  Wand2,
  XCircle,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { KpiTile, Panel, PageHeading, PrototypeNote, StatusPill } from "@/components/primitives";
import { dataSources, formatNumber } from "@/lib/demo-data";
import {
  buildTemplateCsv,
  confidenceSummary,
  confidenceTone,
  ingestFields,
  previewRows,
  qualityChecks,
  seriesQuality,
  sourceColumns,
  tierLabels,
  type CheckResult,
  type FieldTier,
} from "@/lib/forecast-domain";
import { usePlatform } from "@/lib/platform-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/data-readiness")({
  head: () => ({
    meta: [
      { title: "Data Readiness — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Upload demand history, map source columns, run data-quality checks and score every SKU-customer series for forecast readiness.",
      },
      { property: "og:title", content: "Data Readiness — Demand Intelligence Platform" },
      {
        property: "og:description",
        content: "Upload, column mapping, validation results and series confidence scoring.",
      },
    ],
  }),
  component: DataReadiness,
});

const resultTone: Record<CheckResult, "positive" | "warning" | "risk"> = {
  pass: "positive",
  warn: "warning",
  fail: "risk",
};

const resultIcon: Record<CheckResult, typeof CheckCircle2> = {
  pass: CheckCircle2,
  warn: ShieldAlert,
  fail: XCircle,
};

const tierOrder: FieldTier[] = ["mandatory", "recommended", "optional"];

function DataReadiness() {
  const {
    upload,
    setUpload,
    mapping,
    setMapping,
    autoMap,
    clearMapping,
    validationRun,
    runValidation,
    transformations,
    setTransformationStatus,
  } = usePlatform();
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = (file: File | null) => {
    if (!file) return;
    const ok = /\.(csv|xlsx|xls)$/i.test(file.name);
    if (!ok) {
      setUploadError(`${file.name} is not a CSV or XLSX file.`);
      return;
    }
    setUploadError(null);
    setUpload({
      name: file.name,
      sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      rows: 1000 + (file.name.length * 977) % 48000,
      uploadedAt: new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
    });
    autoMap();
  };

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "demand-history-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const mandatoryMapped = ingestFields
    .filter((f) => f.tier === "mandatory")
    .every((f) => Boolean(mapping[f.id]));
  const mappedCount = ingestFields.filter((f) => Boolean(mapping[f.id])).length;

  const summary = useMemo(() => confidenceSummary(seriesQuality), []);
  const filteredSeries = useMemo(
    () =>
      confidenceFilter === "all"
        ? seriesQuality
        : seriesQuality.filter((s) => s.confidence === confidenceFilter),
    [confidenceFilter],
  );
  const avgScore = Math.round(
    seriesQuality.reduce((sum, s) => sum + s.score, 0) / seriesQuality.length,
  );
  const failedChecks = qualityChecks.filter((c) => c.result === "fail").length;
  const pendingTransformations = transformations.filter((t) => t.status === "Proposed").length;

  return (
    <div className="space-y-5">
      <PageHeading
        title="Data Readiness"
        subtitle="Load demand history, map source columns to the platform data model, run the data-quality gate and review the readiness score for every SKU-customer series before any forecast is generated."
        actions={
          <>
            <StatusPill tone={validationRun ? (failedChecks ? "warning" : "positive") : "neutral"}>
              {validationRun ? `${failedChecks} checks failing` : "Validation not run"}
            </StatusPill>
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-accent"
            >
              <Download className="h-3.5 w-3.5" aria-hidden /> Download data template
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Series analysed"
          value={formatNumber(seriesQuality.length * 82)}
          delta="SKU × customer × location"
          deltaTone="neutral"
          icon={Table2}
        />
        <KpiTile
          label="Avg readiness score"
          value={`${avgScore}`}
          unit="/ 100"
          delta={avgScore >= 80 ? "Portfolio healthy" : "Improvement needed"}
          deltaTone={avgScore >= 80 ? "positive" : "warning"}
          icon={Gauge}
        />
        <KpiTile
          label="Fields mapped"
          value={`${mappedCount}`}
          unit={`/ ${ingestFields.length}`}
          delta={mandatoryMapped ? "All mandatory mapped" : "Mandatory fields missing"}
          deltaTone={mandatoryMapped ? "positive" : "risk"}
          icon={Wand2}
        />
        <KpiTile
          label="Transformations pending"
          value={String(pendingTransformations)}
          delta="Nothing applied silently"
          deltaTone={pendingTransformations ? "warning" : "positive"}
          icon={ShieldAlert}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel
          title="Upload demand history"
          description="CSV or XLSX. Files are parsed in the browser for this prototype and never leave the session."
          className="xl:col-span-2"
        >
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              acceptFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-8 text-center transition-colors",
              dragActive ? "border-accent-blue bg-accent" : "border-border bg-surface-muted",
            )}
          >
            <UploadCloud className="h-7 w-7 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium text-foreground">
              Drag and drop your demand history file here
            </p>
            <p className="text-xs text-muted-foreground">
              Accepted formats: .csv, .xlsx, .xls · one row per period, SKU, customer and location
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden /> Browse files
              </button>
              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-surface px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
              >
                <Download className="h-3.5 w-3.5" aria-hidden /> Template
              </button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {uploadError && (
            <p className="mt-3 rounded-md border border-risk/25 bg-risk-soft px-3 py-2 text-xs text-risk">
              {uploadError}
            </p>
          )}

          {upload && (
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{upload.name}</p>
                <p className="num text-xs text-muted-foreground">
                  {formatNumber(upload.rows)} rows · {upload.sizeLabel} · {upload.uploadedAt}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusPill tone="info">Parsed</StatusPill>
                <button
                  type="button"
                  onClick={() => {
                    setUpload(null);
                    clearMapping();
                  }}
                  className="rounded-md border border-input px-2 py-1 text-[11px] font-medium hover:bg-accent"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Expected fields" description="Mandatory fields gate forecast generation.">
          <div className="space-y-4">
            {tierOrder.map((tier) => {
              const fields = ingestFields.filter((f) => f.tier === tier);
              const mapped = fields.filter((f) => Boolean(mapping[f.id])).length;
              return (
                <div key={tier}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="label-caps">{tierLabels[tier]}</span>
                    <StatusPill
                      tone={
                        tier === "mandatory"
                          ? mapped === fields.length
                            ? "positive"
                            : "risk"
                          : mapped === fields.length
                            ? "positive"
                            : "neutral"
                      }
                    >
                      {mapped} / {fields.length} mapped
                    </StatusPill>
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {fields.map((f) => (
                      <li
                        key={f.id}
                        title={f.purpose}
                        className={cn(
                          "rounded border px-2 py-0.5 text-[11px]",
                          mapping[f.id]
                            ? "border-positive/25 bg-positive-soft text-positive"
                            : "border-border bg-surface-muted text-muted-foreground",
                        )}
                      >
                        {f.label}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel
        title="File preview"
        description={
          upload
            ? `First rows of ${upload.name} as received from the source extract.`
            : "Sample extract shown until a file is uploaded."
        }
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px] text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left">
                <th className="label-caps px-3 py-2.5">#</th>
                {sourceColumns.map((col) => (
                  <th key={col} className="label-caps px-3 py-2.5 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, index) => (
                <tr key={index} className="border-b border-border last:border-0 hover:bg-surface-muted/60">
                  <td className="num px-3 py-2 text-muted-foreground">{index + 1}</td>
                  {sourceColumns.map((col) => {
                    const value = row[col] ?? "";
                    const suspect =
                      value === "" ||
                      (col === "PERIOD_DT" && value.includes("/")) ||
                      (col === "DEMAND_QTY" && Number(value) < 0);
                    return (
                      <td
                        key={col}
                        className={cn(
                          "px-3 py-2 whitespace-nowrap",
                          suspect ? "bg-risk-soft font-medium text-risk" : "text-foreground",
                        )}
                      >
                        {value === "" ? "(blank)" : value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Column mapping"
        description="Map each platform field to a column from the uploaded file. Unmapped optional fields simply disable the related feature."
        bodyClassName="p-0"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={autoMap}
              className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-[11px] font-medium hover:bg-accent"
            >
              <Wand2 className="h-3.5 w-3.5" aria-hidden /> Auto-map
            </button>
            <button
              type="button"
              onClick={clearMapping}
              className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-[11px] font-medium hover:bg-accent"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Clear
            </button>
            <button
              type="button"
              onClick={runValidation}
              disabled={!mandatoryMapped}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              Run validation
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left">
                <th className="label-caps px-4 py-2.5">Platform field</th>
                <th className="label-caps px-4 py-2.5">Tier</th>
                <th className="label-caps px-4 py-2.5">Source column</th>
                <th className="label-caps px-4 py-2.5">Used for</th>
              </tr>
            </thead>
            <tbody>
              {ingestFields.map((field) => (
                <tr key={field.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-xs font-medium text-foreground">{field.label}</td>
                  <td className="px-4 py-2">
                    <StatusPill
                      tone={
                        field.tier === "mandatory"
                          ? "risk"
                          : field.tier === "recommended"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {tierLabels[field.tier]}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={mapping[field.id] ?? ""}
                      onChange={(e) => setMapping(field.id, e.target.value)}
                      className="h-7 w-56 rounded-md border border-input bg-surface px-2 text-xs focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
                    >
                      <option value="">Not mapped</option>
                      {sourceColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{field.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Validation results"
          description={
            validationRun
              ? "Data-quality gate executed for the mapped file."
              : "Results shown from the last certified cycle. Run validation to refresh."
          }
        >
          <ul className="divide-y divide-border">
            {qualityChecks.map((check) => {
              const Icon = resultIcon[check.result];
              return (
                <li key={check.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 py-2.5 first:pt-0">
                  <Icon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      check.result === "pass"
                        ? "text-positive"
                        : check.result === "warn"
                          ? "text-warning-foreground"
                          : "text-risk",
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{check.name}</p>
                    <p className="text-xs text-muted-foreground">{check.detail}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Action:</span> {check.action}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusPill tone={resultTone[check.result]}>
                      {check.result === "pass" ? "Pass" : check.result === "warn" ? "Warning" : "Fail"}
                    </StatusPill>
                    <p className="num mt-1 text-[11px] text-muted-foreground">
                      {check.affectedSeries} series
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="Series confidence distribution" description="Simulated readiness score per SKU-customer series.">
          <div className="space-y-2">
            {(Object.keys(summary) as Array<keyof typeof summary>).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setConfidenceFilter(confidenceFilter === key ? "all" : key)}
                className={cn(
                  "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors",
                  confidenceFilter === key ? "border-ring bg-accent" : "border-border hover:bg-surface-muted",
                )}
              >
                <span className="min-w-0 truncate text-xs font-medium text-foreground">{key}</span>
                <StatusPill tone={confidenceTone[key]}>{summary[key] * 82} series</StatusPill>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Series classified as not suitable are excluded from automated generation and routed to
            manual or analogue forecasting.
          </p>
        </Panel>
      </div>

      <Panel
        title="Series readiness scores"
        description={
          confidenceFilter === "all"
            ? "All representative series in the demonstration portfolio."
            : `Filtered to: ${confidenceFilter}.`
        }
        bodyClassName="p-0"
        actions={
          confidenceFilter !== "all" ? (
            <button
              type="button"
              onClick={() => setConfidenceFilter("all")}
              className="rounded-md border border-input px-2.5 py-1.5 text-[11px] font-medium hover:bg-accent"
            >
              Clear filter
            </button>
          ) : undefined
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left">
                <th className="label-caps px-4 py-2.5">Series</th>
                <th className="label-caps px-4 py-2.5">Customer</th>
                <th className="label-caps px-4 py-2.5 text-right">History</th>
                <th className="label-caps px-4 py-2.5 text-right">Completeness</th>
                <th className="label-caps px-4 py-2.5 text-right">Outliers</th>
                <th className="label-caps px-4 py-2.5 text-right">Censored</th>
                <th className="label-caps px-4 py-2.5 text-right">Score</th>
                <th className="label-caps px-4 py-2.5">Classification</th>
                <th className="label-caps px-4 py-2.5">Reason</th>
              </tr>
            </thead>
            <tbody>
              {filteredSeries.map((row) => (
                <tr key={row.key} className="border-b border-border last:border-0 hover:bg-surface-muted/60">
                  <td className="px-4 py-2.5">
                    <p className="num text-xs font-semibold">{row.sku}</p>
                    <p className="text-xs text-muted-foreground">{row.description}</p>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.customer}</td>
                  <td className="num px-4 py-2.5 text-right text-xs">{row.historyMonths} mo</td>
                  <td className="num px-4 py-2.5 text-right text-xs">{row.completeness}%</td>
                  <td className="num px-4 py-2.5 text-right text-xs">{row.outliers}</td>
                  <td className="num px-4 py-2.5 text-right text-xs">{row.stockoutPeriods}</td>
                  <td className="num px-4 py-2.5 text-right text-xs font-semibold">{row.score}</td>
                  <td className="px-4 py-2.5">
                    <StatusPill tone={confidenceTone[row.confidence]}>{row.confidence}</StatusPill>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Transformation log"
        description="No value is changed silently. Every proposed correction is logged with its rule, reason and actor, and can be reverted."
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left">
                <th className="label-caps px-4 py-2.5">Series / period</th>
                <th className="label-caps px-4 py-2.5">Rule</th>
                <th className="label-caps px-4 py-2.5">Reason</th>
                <th className="label-caps px-4 py-2.5 text-right">Original</th>
                <th className="label-caps px-4 py-2.5 text-right">Adjusted</th>
                <th className="label-caps px-4 py-2.5">Actor</th>
                <th className="label-caps px-4 py-2.5">Timestamp</th>
                <th className="label-caps px-4 py-2.5">Status</th>
                <th className="label-caps px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {transformations.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-surface-muted/60">
                  <td className="px-4 py-2.5">
                    <p className="num text-xs font-semibold">{entry.series}</p>
                    <p className="text-xs text-muted-foreground">{entry.period}</p>
                  </td>
                  <td className="px-4 py-2.5 text-xs">{entry.rule}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{entry.reason}</td>
                  <td className="num px-4 py-2.5 text-right text-xs">{entry.originalValue}</td>
                  <td className="num px-4 py-2.5 text-right text-xs">{entry.adjustedValue}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{entry.actor}</td>
                  <td className="num px-4 py-2.5 text-xs text-muted-foreground">{entry.timestamp}</td>
                  <td className="px-4 py-2.5">
                    <StatusPill
                      tone={
                        entry.status === "Applied"
                          ? "positive"
                          : entry.status === "Proposed"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {entry.status}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {entry.status === "Applied" ? (
                      <button
                        type="button"
                        onClick={() => setTransformationStatus(entry.id, "Reverted")}
                        className="inline-flex items-center gap-1.5 rounded-md border border-input px-2 py-1 text-[11px] font-medium hover:bg-accent"
                      >
                        <Undo2 className="h-3 w-3" aria-hidden /> Undo
                      </button>
                    ) : entry.status === "Proposed" ? (
                      <button
                        type="button"
                        onClick={() => setTransformationStatus(entry.id, "Applied")}
                        className="rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        Apply
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setTransformationStatus(entry.id, "Applied")}
                        className="rounded-md border border-input px-2 py-1 text-[11px] font-medium hover:bg-accent"
                      >
                        Re-apply
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Connected source systems" description="Feeds contributing to the certified demand history." bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left">
                <th className="label-caps px-4 py-2.5">Source</th>
                <th className="label-caps px-4 py-2.5">System</th>
                <th className="label-caps px-4 py-2.5 text-right">Records</th>
                <th className="label-caps px-4 py-2.5 text-right">History</th>
                <th className="label-caps px-4 py-2.5 text-right">Completeness</th>
                <th className="label-caps px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {dataSources.map((source) => (
                <tr key={source.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <p className="text-xs font-semibold text-foreground">{source.name}</p>
                    {source.issues.length > 0 && (
                      <p className="text-xs text-muted-foreground">{source.issues[0]}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{source.system}</td>
                  <td className="num px-4 py-2.5 text-right text-xs">{formatNumber(source.records)}</td>
                  <td className="num px-4 py-2.5 text-right text-xs">{source.coverageMonths} mo</td>
                  <td className="num px-4 py-2.5 text-right text-xs">{source.completeness}%</td>
                  <td className="px-4 py-2.5">
                    <StatusPill
                      tone={
                        source.status === "ready" ? "positive" : source.status === "attention" ? "warning" : "risk"
                      }
                    >
                      {source.status === "ready" ? "Ready" : source.status === "attention" ? "Attention" : "Blocked"}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <PrototypeNote>
        Illustrative prototype data. Uploaded files are inspected only in the browser session, quality
        scores are simulated, and no ingestion job or data warehouse write is performed.
      </PrototypeNote>
    </div>
  );
}
