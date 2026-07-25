import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  CircleAlert,
  Database,
  FileSpreadsheet,
  OctagonAlert,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { useState } from "react";
import { KpiTile, Panel, PageHeading, PrototypeNote, StatusPill } from "@/components/primitives";
import { dataSources, formatNumber, validationChecks } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/data-readiness")({
  head: () => ({
    meta: [
      { title: "Data Readiness — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Upload, validate and certify historical demand, customer schedules, inventory and master data before forecast generation.",
      },
      { property: "og:title", content: "Data Readiness — Demand Intelligence Platform" },
      {
        property: "og:description",
        content: "Validation, completeness and certification of demand planning inputs.",
      },
    ],
  }),
  component: DataReadiness,
});

const statusMeta = {
  ready: { tone: "positive" as const, label: "Certified", icon: CheckCircle2 },
  attention: { tone: "warning" as const, label: "Needs attention", icon: CircleAlert },
  blocked: { tone: "risk" as const, label: "Blocking", icon: OctagonAlert },
};

const resultMeta = {
  pass: { tone: "positive" as const, label: "Pass" },
  warn: { tone: "warning" as const, label: "Warning" },
  fail: { tone: "risk" as const, label: "Fail" },
};

function DataReadiness() {
  const [uploads, setUploads] = useState<Array<{ name: string; rows: number; status: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [certified, setCertified] = useState(false);

  const simulateUpload = (name: string, rows: number) => {
    setUploading(true);
    setTimeout(() => {
      setUploads((prev) => [{ name, rows, status: "Validated — 0 blocking errors" }, ...prev]);
      setUploading(false);
    }, 900);
  };

  const blocking = dataSources.filter((s) => s.status === "blocked").length;
  const attention = dataSources.filter((s) => s.status === "attention").length;
  const totalRecords = dataSources.reduce((sum, s) => sum + s.records, 0);

  return (
    <div className="space-y-5">
      <PageHeading
        title="Data Readiness"
        subtitle="Load historical demand and operational data, run automated validation, and certify inputs before a forecast run. A forecast cannot be published while blocking checks remain open."
        actions={
          <button
            type="button"
            onClick={() => setCertified(true)}
            disabled={certified}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              certified
                ? "bg-positive-soft text-positive"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            {certified ? "Inputs certified for July cycle" : "Certify inputs for forecast run"}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Data readiness score" value="93" unit="/ 100" delta="Ready with exceptions" deltaTone="warning" icon={Database} />
        <KpiTile label="Records ingested" value={formatNumber(totalRecords)} delta="Last load 24 Jul, 05:40" deltaTone="info" icon={RefreshCw} />
        <KpiTile label="Sources needing attention" value={String(attention)} delta="Non-blocking exceptions" deltaTone="warning" icon={CircleAlert} />
        <KpiTile label="Blocking issues" value={String(blocking)} delta="Promotion log incomplete" deltaTone="risk" icon={OctagonAlert} />
      </div>

      <Panel
        title="Upload demand and operational data"
        description="Accepted formats in this prototype: CSV, XLSX and ERP extract templates. Uploads are simulated locally."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-lg border border-dashed border-input bg-surface-muted px-5 py-8 text-center">
            <UploadCloud className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden />
            <p className="mt-3 text-sm font-medium">Drop a demand history or schedule file here</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Required columns: date, SKU, customer, plant, quantity, unit of measure
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => simulateUpload("demand_history_FY2023-26.csv", 1284320)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden />
                {uploading ? "Validating…" : "Simulate demand history upload"}
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => simulateUpload("promotion_log_Q3_2026.xlsx", 3140)}
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-surface px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
              >
                Upload promotion log
              </button>
            </div>
          </div>
          <div>
            <p className="label-caps">Upload activity</p>
            <ul className="mt-2 space-y-2">
              {uploads.length === 0 && (
                <li className="rounded-md border border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
                  No files uploaded in this session. Scheduled ERP and EDI extracts are already loaded.
                </li>
              )}
              {uploads.map((upload, index) => (
                <li key={`${upload.name}-${index}`} className="rounded-md border border-border px-3 py-2">
                  <p className="truncate text-xs font-medium">{upload.name}</p>
                  <p className="num text-[11px] text-muted-foreground">
                    {formatNumber(upload.rows)} rows · {upload.status}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>

      <Panel title="Connected data sources" description="Coverage, completeness and open exceptions per source." bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left">
                <th className="label-caps px-4 py-2.5">Source</th>
                <th className="label-caps px-4 py-2.5">Records</th>
                <th className="label-caps px-4 py-2.5">History</th>
                <th className="label-caps px-4 py-2.5">Completeness</th>
                <th className="label-caps px-4 py-2.5">Last load</th>
                <th className="label-caps px-4 py-2.5">Status</th>
                <th className="label-caps px-4 py-2.5">Open exceptions</th>
              </tr>
            </thead>
            <tbody>
              {dataSources.map((source) => {
                const meta = statusMeta[source.status];
                return (
                  <tr key={source.id} className="border-b border-border align-top last:border-0 hover:bg-surface-muted/60">
                    <td className="px-4 py-3">
                      <p className="font-medium">{source.name}</p>
                      <p className="text-xs text-muted-foreground">{source.system}</p>
                    </td>
                    <td className="num px-4 py-3 text-xs">{formatNumber(source.records)}</td>
                    <td className="num px-4 py-3 text-xs">{source.coverageMonths} mo</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              source.completeness > 95
                                ? "bg-positive"
                                : source.completeness > 85
                                  ? "bg-warning"
                                  : "bg-risk",
                            )}
                            style={{ width: `${source.completeness}%` }}
                          />
                        </div>
                        <span className="num text-xs">{source.completeness}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{source.lastLoad}</td>
                    <td className="px-4 py-3">
                      <StatusPill tone={meta.tone}>
                        <meta.icon className="h-3 w-3" aria-hidden /> {meta.label}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3">
                      {source.issues.length === 0 ? (
                        <span className="text-xs text-muted-foreground">None</span>
                      ) : (
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {source.issues.map((issue) => (
                            <li key={issue}>• {issue}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Automated validation checks" description="Executed on every load of the demand planning data set.">
        <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {validationChecks.map((check) => {
            const meta = resultMeta[check.result];
            return (
              <li
                key={check.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-md border border-border px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{check.check}</p>
                  <p className="text-xs text-muted-foreground">
                    {check.scope} · {check.detail}
                  </p>
                </div>
                <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
              </li>
            );
          })}
        </ul>
      </Panel>

      <PrototypeNote>
        Validation results, completeness percentages and upload responses are simulated. In a
        production deployment these would be produced by scheduled ingestion jobs and data quality
        rules executed against the enterprise data platform.
      </PrototypeNote>
    </div>
  );
}
