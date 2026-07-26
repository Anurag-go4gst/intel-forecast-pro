import { createFileRoute } from "@tanstack/react-router";
import { Download, FileClock, Filter, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { KpiTile, Panel, PageHeading, PrototypeNote, StatusPill } from "@/components/primitives";
import {
  auditActions,
  auditTone,
  auditUsers,
  auditVersions,
  type AuditAction,
} from "@/lib/governance-domain";
import { usePlatform } from "@/lib/platform-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/audit-log")({
  head: () => ({
    meta: [
      { title: "Audit Log — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Immutable record of data uploads, transformations, model runs, model selections, events, scenario promotions, overrides, approvals and forecast publications.",
      },
      { property: "og:title", content: "Audit Log — Demand Intelligence Platform" },
      {
        property: "og:description",
        content: "Filterable governance trail for every action that shaped the forecast.",
      },
    ],
  }),
  component: AuditLog,
});

const selectClass =
  "mt-1 w-full rounded-md border border-input bg-surface px-2 py-1.5 text-xs text-foreground";

function AuditLog() {
  const { auditLog } = usePlatform();

  const [user, setUser] = useState("All");
  const [action, setAction] = useState<AuditAction | "All">("All");
  const [version, setVersion] = useState("All");
  const [sku, setSku] = useState("");
  const [customer, setCustomer] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(
    () =>
      auditLog.filter((e) => {
        if (user !== "All" && e.user !== user) return false;
        if (action !== "All" && e.action !== action) return false;
        if (version !== "All" && e.version !== version) return false;
        if (sku && !e.sku.toLowerCase().includes(sku.toLowerCase())) return false;
        if (customer && !e.customer.toLowerCase().includes(customer.toLowerCase())) return false;
        if (from && e.date < from) return false;
        if (to && e.date > to) return false;
        return true;
      }),
    [auditLog, user, action, version, sku, customer, from, to],
  );

  const reset = () => {
    setUser("All");
    setAction("All");
    setVersion("All");
    setSku("");
    setCustomer("");
    setFrom("");
    setTo("");
  };

  const decisions = filtered.filter((e) => e.action === "Approval" || e.action === "Rejection").length;
  const publications = filtered.filter((e) => e.action === "Forecast publication").length;

  return (
    <div className="space-y-5">
      <PageHeading
        title="Audit Log"
        subtitle="A single chronological record of everything that shaped the forecast: data uploads and transformations, model runs and selections, event and scenario activity, planner overrides, approvals, rejections and publications."
        actions={
          <>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset filters
            </button>
            <StatusPill tone="neutral">
              <Download className="h-3 w-3" aria-hidden /> Export disabled in prototype
            </StatusPill>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Entries in scope" value={String(filtered.length)} delta={`${auditLog.length} total recorded`} deltaTone="neutral" icon={FileClock} />
        <KpiTile label="Approval decisions" value={String(decisions)} delta="Approvals and rejections" deltaTone="info" icon={Filter} />
        <KpiTile label="Publications" value={String(publications)} delta="Versions released" deltaTone="positive" icon={Download} />
        <KpiTile label="Distinct actors" value={String(new Set(filtered.map((e) => e.user)).size)} delta="Users and automated jobs" deltaTone="neutral" icon={FileClock} />
      </div>

      <Panel title="Filters" description="Filter by user, action, date range, SKU, customer and forecast version.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs">
            <span className="label-caps">User</span>
            <select value={user} onChange={(e) => setUser(e.target.value)} className={selectClass}>
              <option value="All">All users</option>
              {auditUsers.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="label-caps">Action</span>
            <select value={action} onChange={(e) => setAction(e.target.value as AuditAction | "All")} className={selectClass}>
              <option value="All">All actions</option>
              {auditActions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="label-caps">Forecast version</span>
            <select value={version} onChange={(e) => setVersion(e.target.value)} className={selectClass}>
              <option value="All">All versions</option>
              {auditVersions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="label-caps">SKU</span>
            <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. HRN-4420-B" className={selectClass} />
          </label>
          <label className="text-xs">
            <span className="label-caps">Customer</span>
            <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="e.g. Meridian" className={selectClass} />
          </label>
          <label className="text-xs">
            <span className="label-caps">Date from</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selectClass} />
          </label>
          <label className="text-xs">
            <span className="label-caps">Date to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selectClass} />
          </label>
        </div>
      </Panel>

      <Panel title="Audit entries" description="Newest first. Entries cannot be edited or deleted." bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left">
                <th className="label-caps px-4 py-2.5">Timestamp</th>
                <th className="label-caps px-4 py-2.5">User</th>
                <th className="label-caps px-4 py-2.5">Action</th>
                <th className="label-caps px-4 py-2.5">SKU</th>
                <th className="label-caps px-4 py-2.5">Customer</th>
                <th className="label-caps px-4 py-2.5">Version</th>
                <th className="label-caps px-4 py-2.5">Detail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-border align-top last:border-0 hover:bg-surface-muted/60">
                  <td className={cn("num px-4 py-3 text-xs whitespace-nowrap")}>{e.at}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{e.user}</td>
                  <td className="px-4 py-3">
                    <StatusPill tone={auditTone[e.action]}>{e.action}</StatusPill>
                  </td>
                  <td className="num px-4 py-3 text-xs">{e.sku}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{e.customer}</td>
                  <td className="num px-4 py-3 text-xs">{e.version}</td>
                  <td className="max-w-[420px] px-4 py-3 text-xs text-muted-foreground">{e.detail}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-foreground">
                    No audit entries match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <PrototypeNote>
        Illustrative prototype data. Entries generated during this session are held in local state only
        and are lost on refresh; a production deployment would write to an append-only store.
      </PrototypeNote>
    </div>
  );
}
