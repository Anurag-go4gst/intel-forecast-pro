import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, PanelLeftClose, PanelLeftOpen, Radar, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { navGroups, navItems } from "@/components/app-nav";
import { DemoTour } from "@/components/demo-tour";
import { GlobalFilters } from "@/components/global-filters";
import { StatusPill } from "@/components/primitives";
import { StageActions, StageGuard, WorkflowRail } from "@/components/workflow-rail";
import { usePlatform } from "@/lib/platform-state";
import { cn } from "@/lib/utils";

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3">
      {navGroups.map((group) => (
        <div key={group} className="mb-4 last:mb-0">
          {!collapsed && (
            <p className="px-2.5 pb-1.5 text-[10px] font-semibold tracking-[0.12em] text-sidebar-foreground/50 uppercase">
              {group}
            </p>
          )}
          <ul className="space-y-0.5">
            {navItems
              .filter((item) => item.group === group)
              .map((item) => {
                const active = pathname === item.to;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_2px_0_0_0_var(--color-sidebar-primary)]"
                          : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                      {!collapsed && (
                        <span className="flex min-w-0 flex-1 items-center gap-1.5">
                          <span className="truncate">{item.label}</span>
                          {item.steps && (
                            <span className="ml-auto shrink-0 rounded bg-sidebar-accent/60 px-1 text-[9px] font-semibold text-sidebar-foreground/70">
                              {item.steps}
                            </span>
                          )}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 border-b border-sidebar-border px-3 py-3.5",
        collapsed && "justify-center px-0",
      )}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-sidebar-primary/20 text-sidebar-primary-foreground">
        <Radar className="h-4.5 w-4.5" aria-hidden />
      </span>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm leading-tight font-semibold text-sidebar-accent-foreground">
            Demand Intelligence
          </p>
          <p className="truncate text-[11px] text-sidebar-foreground/60">Forecasting Platform</p>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { filters, published, mode, project, forecastVersionList } = usePlatform();
  const version = forecastVersionList.find((v) => v.id === filters.version);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar lg:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <SidebarBrand collapsed={collapsed} />
        <NavList collapsed={collapsed} />
        <div className="border-t border-sidebar-border p-2">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" aria-hidden />
                <span>Collapse navigation</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-foreground/40"
          />
          <div className="absolute top-0 left-0 flex h-full w-64 flex-col bg-sidebar">
            <div className="flex items-center justify-between border-b border-sidebar-border pr-2">
              <div className="flex-1">
                <SidebarBrand collapsed={false} />
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1.5 text-sidebar-foreground/80 hover:bg-sidebar-accent"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <NavList collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-sm">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="shrink-0 rounded-md border border-input p-1.5 text-muted-foreground lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" aria-hidden />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  Demand Intelligence &amp; Forecasting Platform
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {mode === "demo"
                    ? "Guide · Apex Motors"
                    : mode === "user"
                      ? `${project?.name ?? "Untitled project"} · your uploaded data`
                      : "No active project"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <DemoTour />
              <StatusPill tone={published ? "positive" : version?.status === "published" ? "info" : "warning"}>
                {published ? "Forecast published" : (version?.label ?? "Working draft")}
              </StatusPill>
              <div className="hidden items-center gap-2 border-l border-border pl-3 sm:flex">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  RI
                </span>
                <div className="leading-tight">
                  <p className="text-xs font-medium">R. Iyer</p>
                  <p className="text-[10px] text-muted-foreground">Demand planning lead</p>
                </div>
              </div>
            </div>
          </div>
          {mode === "empty" && (
            <p className="border-t border-border bg-surface-muted px-4 py-1.5 text-[11px] font-medium text-muted-foreground sm:px-6">
              No active project — create a project or start the guide.
            </p>
          )}
          {mode === "user" && (
            <p className="border-t border-border bg-surface-muted px-4 py-1.5 text-[11px] font-medium text-muted-foreground sm:px-6">
              Your data — every statistic is computed from your uploaded file.
            </p>
          )}
          <GlobalFilters />
          <WorkflowRail />
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <StageGuard>{children}</StageGuard>
          <StageActions />
        </main>

        <footer className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground sm:px-6">
          Frontend prototype · forecast generation, model comparison, event evaluation and assistant
          responses are simulated from seeded demonstration data. No live model training or customer
          data is used.
        </footer>
      </div>
    </div>
  );
}
