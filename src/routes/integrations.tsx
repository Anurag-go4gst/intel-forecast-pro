import { createFileRoute } from "@tanstack/react-router";
import { Boxes, Database, Mail, Plug, Send, Server, Webhook, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeading, Panel, PrototypeNote, StatusPill } from "@/components/primitives";
import { usePlatform } from "@/lib/platform-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Connections — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Deliver the published forecast to ERP, planning, data-warehouse, MCP and API destinations.",
      },
      { property: "og:title", content: "Connections — Demand Intelligence Platform" },
    ],
  }),
  component: Integrations,
});

type Connector = {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: LucideIcon;
  detail: string;
};

const connectors: Connector[] = [
  {
    id: "erp-sap",
    name: "SAP S/4HANA",
    category: "ERP",
    description: "Write the approved operational forecast to the demand-management module.",
    icon: Boxes,
    detail: "Endpoint: /API_PLANNING_DEMAND · nightly at 02:00 IST",
  },
  {
    id: "sop-kinaxis",
    name: "Kinaxis Maestro",
    category: "S&OP planning",
    description: "Publish the consensus plan into the supply-planning scenario.",
    icon: Send,
    detail: "Workbook: FY27 Consensus · owner S. Kulkarni",
  },
  {
    id: "mcp-server",
    name: "MCP server",
    category: "Model Context Protocol",
    description: "Expose the forecast as an MCP tool so assistants can query it directly.",
    icon: Server,
    detail: "vnudge.com/mcp · tool: get_demand_forecast",
  },
  {
    id: "api-webhook",
    name: "REST API webhook",
    category: "API",
    description: "POST each published version to a downstream service as JSON.",
    icon: Webhook,
    detail: "POST https://ops.internal/forecast/ingest",
  },
  {
    id: "email-digest",
    name: "Email digest",
    category: "Notification",
    description: "Send a summary and the forecast workbook to the demand-review distribution list.",
    icon: Mail,
    detail: "demand-review@velocis · on publication",
  },
  {
    id: "warehouse",
    name: "Snowflake",
    category: "Data warehouse",
    description: "Land the full series and prediction intervals for BI and reporting.",
    icon: Database,
    detail: "DB: ANALYTICS · schema: FORECAST",
  },
];

function Integrations() {
  const { logAudit, auditLog, published, versions } = usePlatform();
  const currentVersion = versions.find((v) => v.id === "v-2026-07");

  // Prototype connection state — persists only for this browser session.
  const [connected, setConnected] = useState<Record<string, boolean>>({
    "erp-sap": true,
    "mcp-server": true,
    warehouse: true,
  });
  const [lastPushed, setLastPushed] = useState<Record<string, boolean>>({});

  const deliveries = useMemo(
    () => auditLog.filter((e) => e.action === "Forecast publication").slice(0, 6),
    [auditLog],
  );

  const toggle = (c: Connector) => {
    setConnected((prev) => {
      const next = { ...prev, [c.id]: !prev[c.id] };
      return next;
    });
    logAudit({
      user: "You · Demand planning lead",
      action: "Forecast publication",
      sku: "All series",
      customer: "—",
      version: currentVersion?.label ?? "V2026.07",
      detail: `${connected[c.id] ? "Disconnected" : "Connected"} destination ${c.name} (${c.category}).`,
    });
  };

  const push = (c: Connector) => {
    setLastPushed((prev) => ({ ...prev, [c.id]: true }));
    logAudit({
      user: "You · Demand planning lead",
      action: "Forecast publication",
      sku: "All series",
      customer: "—",
      version: currentVersion?.label ?? "V2026.07",
      detail: `Pushed ${currentVersion?.label ?? "the working draft"} forecast to ${c.name} (${c.category}).`,
    });
  };

  const connectedCount = Object.values(connected).filter(Boolean).length;

  return (
    <div className="space-y-5">
      <PageHeading
        title="Connections"
        subtitle="Deliver the published operational forecast to the systems that consume it — ERP, S&OP planning, data warehouse, MCP and REST API — from one place. Connecting a destination lets you push the latest approved version to it."
        actions={
          <StatusPill tone={connectedCount > 0 ? "positive" : "neutral"}>
            {connectedCount} destination{connectedCount === 1 ? "" : "s"} connected
          </StatusPill>
        }
      />

      {!published && (
        <div className="rounded-md border border-warning/35 bg-warning-soft px-4 py-2.5 text-xs leading-relaxed text-warning-foreground">
          The current forecast is still a working draft. You can connect destinations now; pushing a
          version is enabled once it is published in Forecast Review.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {connectors.map((c) => {
          const isOn = Boolean(connected[c.id]);
          return (
            <Panel key={c.id} className="h-full">
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-md border",
                      isOn
                        ? "border-positive/25 bg-positive-soft text-positive"
                        : "border-border bg-surface-muted text-muted-foreground",
                    )}
                  >
                    <c.icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <StatusPill tone={isOn ? "positive" : "neutral"}>
                    {isOn ? "Connected" : "Not connected"}
                  </StatusPill>
                </div>
                <p className="mt-3 text-sm font-semibold">{c.name}</p>
                <p className="label-caps mt-0.5">{c.category}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {c.description}
                </p>
                <p className="mt-2 font-mono text-[11px] text-muted-foreground/80">{c.detail}</p>

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => toggle(c)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                      isOn
                        ? "border-input hover:bg-risk-soft hover:text-risk"
                        : "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
                    )}
                  >
                    <Plug className="h-3.5 w-3.5" aria-hidden />
                    {isOn ? "Disconnect" : "Connect"}
                  </button>
                  <button
                    type="button"
                    disabled={!isOn || !published}
                    onClick={() => push(c)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden />
                    Push latest forecast
                  </button>
                  {lastPushed[c.id] && isOn && (
                    <span className="text-[11px] font-medium text-positive">Pushed ✓</span>
                  )}
                </div>
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel
        title="Delivery history"
        description="Every connection change and push is written to the audit log."
        bodyClassName="p-0"
      >
        {deliveries.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            No deliveries yet — connect a destination and push a published version.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {deliveries.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs leading-relaxed">{e.detail}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {e.user} · {e.at}
                  </p>
                </div>
                <StatusPill tone="positive">{e.version}</StatusPill>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <PrototypeNote>
        Illustrative prototype. Connecting, disconnecting and pushing update local session state and
        the audit log only — no data leaves this browser. A production deployment would authenticate
        each destination and stream the published version on approval.
      </PrototypeNote>
    </div>
  );
}
