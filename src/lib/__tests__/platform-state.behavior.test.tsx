import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { IssueResolutionPanel } from "@/components/data-issues";
import { DemoTour } from "@/components/demo-tour";
import { StageGuard } from "@/components/workflow-rail";
import { PlatformProvider, usePlatform, type UploadedFile } from "@/lib/platform-state";
import {
  computeDatasetStats,
  deriveIssues,
  parseDelimited,
  qualityScore,
  type DatasetRecord,
  type ProjectConfig,
  type StatsMapping,
} from "@/lib/app-mode";
import {
  defaultDrivers,
  defaultFilters,
  seedEvents,
  seedReviewLines,
  seedScenarios,
} from "@/lib/demo-data";
import { seedIntelEvents, seedScenarioSpecs } from "@/lib/event-domain";
import { seedApprovalQueue, seedAuditLog, seedVersions } from "@/lib/governance-domain";
import { seedTransformations } from "@/lib/forecast-domain";
import { workflowStages, type StageId } from "@/lib/workflow";

type PlatformApi = ReturnType<typeof usePlatform>;

const mapping: Required<StatsMapping> = {
  date: "period",
  sku: "sku",
  customer: "customer",
  plant: "plant",
  quantity: "qty",
  stockout: "stockout",
};

const userProject: Omit<ProjectConfig, "createdAt" | "source"> = {
  name: "August forecast cycle",
  industry: "Industrial equipment",
  grain: "SKU × Plant",
  frequency: "Monthly",
  horizon: 9,
  owner: "Anurag",
};

const monthlyRows = (): DatasetRecord[] => [
  { period: "2026-01-01", sku: "A", customer: "C1", plant: "P1", qty: "10", stockout: "no" },
  { period: "2026-02-01", sku: "A", customer: "C1", plant: "P1", qty: "12", stockout: "no" },
  { period: "2026-03-01", sku: "A", customer: "C1", plant: "P1", qty: "14", stockout: "no" },
  { period: "2026-01-01", sku: "B", customer: "C2", plant: "P2", qty: "20", stockout: "no" },
  { period: "2026-02-01", sku: "B", customer: "C2", plant: "P2", qty: "22", stockout: "no" },
  { period: "2026-03-01", sku: "B", customer: "C2", plant: "P2", qty: "24", stockout: "no" },
];

const qualityRows = (): DatasetRecord[] => [
  { period: "2026-01-01", sku: "A", customer: "C1", plant: "P1", qty: "10", stockout: "yes" },
  { period: "2026-03-01", sku: "A", customer: "C1", plant: "P1", qty: "12", stockout: "no" },
  { period: "2026-03-01", sku: "A", customer: "C1", plant: "P1", qty: "12", stockout: "no" },
  { period: "not-a-date", sku: "B", customer: "C2", plant: "P2", qty: "", stockout: "no" },
];

function persistedKeys() {
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index++) {
    const key = window.localStorage.key(index);
    if (key?.startsWith("difp:v1:")) keys.push(key);
  }
  return keys.sort();
}

function installMemoryStorage() {
  const store = new Map<string, string>();
  window.scrollTo = () => {};
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      get length() {
        return store.size;
      },
      key(index: number) {
        return Array.from(store.keys())[index] ?? null;
      },
      getItem(key: string) {
        return store.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        store.set(key, String(value));
      },
      removeItem(key: string) {
        store.delete(key);
      },
      clear() {
        store.clear();
      },
    },
  });
}

function emptyStageDone(overrides: Partial<Record<StageId, boolean>> = {}) {
  return {
    ...(Object.fromEntries(workflowStages.map((stage) => [stage.id, false])) as Record<
      StageId,
      boolean
    >),
    ...overrides,
  };
}

async function renderPlatform() {
  let api: PlatformApi | null = null;

  function Probe() {
    const platform = usePlatform();
    api = platform;
    return <div data-testid="mode">{platform.mode}</div>;
  }

  const utils = render(
    <PlatformProvider>
      <Probe />
    </PlatformProvider>,
  );

  await screen.findByTestId("mode");
  return {
    ...utils,
    get api() {
      if (!api) throw new Error("Platform API was not captured");
      return api;
    },
  };
}

async function waitForMode(api: () => PlatformApi, mode: PlatformApi["mode"]) {
  await waitFor(() => expect(api().mode).toBe(mode));
}

async function createUserProject(api: PlatformApi) {
  await act(async () => {
    api.createProject(userProject);
  });
}

async function ingest(api: PlatformApi, records: DatasetRecord[], fileName = "same-name.csv") {
  await act(async () => {
    api.ingestDataset({
      fileName,
      sizeLabel: "1 KB",
      columns: Object.values(mapping),
      records,
      mapping,
    });
  });
}

function expectEmptyWorkspace(api: PlatformApi) {
  expect(api.mode).toBe("empty");
  expect(api.project).toBeNull();
  expect(api.dataset).toBeNull();
  expect(api.activeIssues).toHaveLength(0);
  expect(api.events).toHaveLength(0);
  expect(api.scenarios).toHaveLength(0);
  expect(api.reviewLines).toHaveLength(0);
  expect(api.selectedModelBySku).toEqual({});
  expect(api.modelSelections).toEqual({});
  expect(api.intelEvents).toHaveLength(0);
  expect(api.scenarioSpecs).toHaveLength(0);
  expect(api.adjustmentRequests).toHaveLength(0);
  expect(api.approvals).toHaveLength(0);
  expect(api.versions).toHaveLength(0);
  expect(api.auditLog).toHaveLength(0);
  expect(api.upload).toBeNull();
  expect(api.transformations).toHaveLength(0);
  expect(api.activeVersionId).toBe("");
}

function expectCleanDemoSeed(api: PlatformApi) {
  expect(api.mode).toBe("demo");
  expect(api.project).toMatchObject({
    name: "Apex Motors guide cycle",
    source: "demo",
  });
  expect(api.dataset).toBeNull();
  expect(api.upload).toMatchObject<Partial<UploadedFile>>({
    name: "apex-motors-demand-history.csv",
    rows: 27_000,
  });
  expect(api.events).toEqual(seedEvents);
  expect(api.scenarios).toEqual(seedScenarios);
  expect(api.reviewLines).toEqual(seedReviewLines);
  expect(api.transformations).toEqual(seedTransformations);
  expect(api.intelEvents).toEqual(seedIntelEvents);
  expect(api.scenarioSpecs).toEqual(seedScenarioSpecs);
  expect(api.adjustmentRequests).toHaveLength(0);
  expect(api.approvals).toEqual(seedApprovalQueue);
  expect(api.versions).toEqual(seedVersions);
  expect(api.auditLog).toEqual(seedAuditLog);
  expect(api.activeVersionId).toBe("v-2026-07");
  expect(api.stageDone).toEqual(emptyStageDone());
}

function renderGuardedPath(path: string) {
  const rootRoute = createRootRoute({
    component: () => (
      <PlatformProvider>
        <StageGuard>
          <Outlet />
        </StageGuard>
      </PlatformProvider>
    ),
  });
  const modelRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/model-lab",
    component: () => <div>Forecast artefact route</div>,
  });
  const dataRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/data-readiness",
    component: () => <div>Data readiness route</div>,
  });
  const projectRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/project",
    component: () => <div>Create Project route</div>,
  });
  const routeTree = rootRoute.addChildren([modelRoute, dataRoute, projectRoute]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });

  return render(<RouterProvider router={router} />);
}

function renderDemoTourHarness() {
  let api: PlatformApi | null = null;
  const rootRoute = createRootRoute({
    component: () => (
      <PlatformProvider>
        <DemoTour />
        <Probe />
        <Outlet />
      </PlatformProvider>
    ),
  });
  function Probe() {
    api = usePlatform();
    return <div data-testid="tour-mode">{api.mode}</div>;
  }
  const projectRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/project",
    component: () => <div>Project</div>,
  });
  const dataRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/data-readiness",
    component: () => (
      <div>
        Data readiness
        <IssueResolutionPanel />
      </div>
    ),
  });
  const validationRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/validation-setup",
    component: () => <div>Validation setup</div>,
  });
  const modelLabRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/model-lab",
    component: () => <div>Model lab</div>,
  });
  const baselineRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/baseline",
    component: () => <div>Baseline</div>,
  });
  const eventsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/event-intelligence",
    component: () => <div>Event intelligence</div>,
  });
  const whatIfRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/what-if",
    component: () => <div>What-if</div>,
  });
  const reviewRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/forecast-review",
    component: () => <div>Forecast review</div>,
  });
  const routeTree = rootRoute.addChildren([
    projectRoute,
    dataRoute,
    validationRoute,
    modelLabRoute,
    baselineRoute,
    eventsRoute,
    whatIfRoute,
    reviewRoute,
  ]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/project"] }),
  });

  const utils = render(<RouterProvider router={router} />);
  return {
    ...utils,
    get api() {
      if (!api) throw new Error("Platform API was not captured");
      return api;
    },
  };
}

beforeEach(() => {
  installMemoryStorage();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("authoritative application behaviours", () => {
  it("starts in empty mode with no seeded workspace state", async () => {
    const harness = await renderPlatform();

    expectEmptyWorkspace(harness.api);
  });

  it("renders upload-dependent project metrics as uncalculated before upload", async () => {
    const harness = await renderPlatform();

    await createUserProject(harness.api);
    await waitForMode(() => harness.api, "user");

    expect(harness.api.project).toMatchObject({
      name: userProject.name,
      industry: userProject.industry,
      grain: userProject.grain,
      frequency: userProject.frequency,
      horizon: userProject.horizon,
      owner: userProject.owner,
      source: "user",
    });
    expect(harness.api.dataset).toBeNull();
    expect(harness.api.project?.source).not.toBe("demo");
    expect(harness.api.upload).toBeNull();
  });

  it("ingests parsed CSV and TSV rows into correct dataset statistics", async () => {
    const csv = parseDelimited(
      "period,sku,customer,plant,qty,stockout\n2026-01-01,A,C1,P1,10,no\n2026-02-01,A,C1,P1,12,no",
    );
    const tsv = parseDelimited(
      "period\tsku\tcustomer\tplant\tqty\tstockout\n2026-03-01\tB\tC2\tP2\t20\tno",
    );
    const records = [...csv.records, ...tsv.records];
    const stats = computeDatasetStats(records, mapping);

    expect(csv.records[0]).toEqual({
      period: "2026-01-01",
      sku: "A",
      customer: "C1",
      plant: "P1",
      qty: "10",
      stockout: "no",
    });
    expect(tsv.records[0].sku).toBe("B");
    expect(stats).toMatchObject({
      rows: 3,
      skus: 2,
      customers: 2,
      plants: 2,
      series: 2,
      earliest: "2026-01-01",
      latest: "2026-03-01",
      periods: 3,
      frequency: "Monthly",
    });
  });

  it("derives statistics from uploaded records, not from filename", async () => {
    const harness = await renderPlatform();
    await createUserProject(harness.api);
    await ingest(harness.api, monthlyRows(), "same-name.csv");

    const firstStats = harness.api.dataset?.stats;
    expect(firstStats).toMatchObject({ rows: 6, series: 2, periods: 3 });

    await ingest(
      harness.api,
      [
        { period: "2026-01-01", sku: "Z", customer: "C9", plant: "P9", qty: "1", stockout: "no" },
        { period: "2026-01-08", sku: "Z", customer: "C9", plant: "P9", qty: "2", stockout: "no" },
        { period: "2026-01-15", sku: "Z", customer: "C9", plant: "P9", qty: "3", stockout: "no" },
      ],
      "same-name.csv",
    );

    expect(harness.api.dataset?.fileName).toBe("same-name.csv");
    expect(harness.api.dataset?.stats).toMatchObject({
      rows: 3,
      series: 1,
      periods: 3,
      frequency: "Weekly",
    });
    expect(harness.api.dataset?.stats).not.toEqual(firstStats);
  });

  it("derives data-quality issues, blocking count, score and audit history from resolutions", async () => {
    const harness = await renderPlatform();
    await createUserProject(harness.api);
    await ingest(harness.api, qualityRows());

    expect(harness.api.activeIssues.map((issue) => issue.id)).toEqual(
      expect.arrayContaining(["u-date", "u-dupe", "u-missing", "u-stockout", "u-blank", "u-short"]),
    );
    expect(harness.api.blockingOpen).toBe(2);
    expect(harness.api.dataQualityScore).toBe(38);
    const auditBefore = harness.api.auditLog.length;

    await act(async () => {
      for (const issue of harness.api.activeIssues.filter((item) => item.severity === "Blocking")) {
        harness.api.setIssueAction(issue.id, "Accept suggested correction");
      }
    });

    await waitFor(() => expect(harness.api.blockingOpen).toBe(0));
    expect(harness.api.dataQualityScore).toBe(74);
    expect(harness.api.auditLog.length).toBe(auditBefore + 2);
    expect(harness.api.auditLog[0].detail).toContain("Resolved data-quality issue");
  });

  it("keeps dataset approval gated until blocking issues are resolved", async () => {
    const harness = await renderPlatform();
    await createUserProject(harness.api);
    await ingest(harness.api, qualityRows());

    expect(harness.api.blockingOpen).toBeGreaterThan(0);

    await act(async () => {
      for (const issue of harness.api.activeIssues.filter((item) => item.severity === "Blocking")) {
        harness.api.setIssueAction(issue.id, "Accept suggested correction");
      }
    });

    await waitFor(() => expect(harness.api.blockingOpen).toBe(0));
    await act(async () => {
      harness.api.completeStage("dataset");
    });
    expect(harness.api.stageDone.dataset).toBe(true);
  });

  it("locks user forecast artefact routes before dataset approval and tournament completion", async () => {
    window.localStorage.setItem("difp:v1:mode", JSON.stringify("user"));
    window.localStorage.setItem(
      "difp:v1:project",
      JSON.stringify({ ...userProject, createdAt: "28 Jul 2026, 10:00", source: "user" }),
    );
    window.localStorage.setItem(
      "difp:v1:stageDone",
      JSON.stringify(emptyStageDone({ project: true, upload: true, resolve: true })),
    );

    renderGuardedPath("/model-lab");

    expect(await screen.findByText("No forecast results yet")).toBeInTheDocument();
    expect(screen.queryByText("Forecast artefact route")).not.toBeInTheDocument();
  });

  it("loads guided demo seed and keeps it isolated from user mode", async () => {
    const harness = await renderPlatform();

    await act(async () => {
      harness.api.startDemo();
    });
    await waitForMode(() => harness.api, "demo");

    expectCleanDemoSeed(harness.api);

    await act(async () => {
      harness.api.exitToNewProject();
    });
    await waitForMode(() => harness.api, "empty");
    await createUserProject(harness.api);

    expect(harness.api.mode).toBe("user");
    expect(harness.api.project?.name).toBe(userProject.name);
    expect(harness.api.upload).toBeNull();
    expect(harness.api.events).toHaveLength(0);
    expect(harness.api.approvals).toHaveLength(0);
    expect(harness.api.activeVersionId).toBe("");
  });

  it("prevents DemoTour advancement until blocking issues are resolved and dataset is approved", async () => {
    const harness = renderDemoTourHarness();
    await screen.findByTestId("tour-mode");

    await act(async () => {
      harness.api.startDemo();
      harness.api.completeStage("project");
      harness.api.completeStage("upload");
    });
    await waitFor(() => expect(harness.api.mode).toBe("demo"));

    fireEvent.click(screen.getByRole("button", { name: /^Guide$/i }));

    expect(await screen.findByText(/Resolve \d+ blocking issue/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next/i })).toBeDisabled();

    await act(async () => {
      for (const issue of harness.api.activeIssues.filter((item) => item.severity === "Blocking")) {
        harness.api.setIssueAction(issue.id, "Accept suggested correction");
      }
    });
    await waitFor(() => expect(harness.api.blockingOpen).toBe(0));
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => expect(harness.api.stageDone.resolve).toBe(true));

    expect(
      await screen.findByText(/Your action is required: Approve the forecast-ready dataset/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next/i })).toBeDisabled();

    await act(async () => {
      harness.api.completeStage("dataset");
    });
    expect(await screen.findByText(/Guide · step 5 of 13/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next/i })).toBeDisabled();
  });

  it("moves the open guide from issue resolution to dataset approval when blockers are cleared", async () => {
    const harness = renderDemoTourHarness();
    await screen.findByTestId("tour-mode");

    await act(async () => {
      harness.api.startDemo();
      harness.api.completeStage("project");
      harness.api.completeStage("upload");
    });
    await waitFor(() => expect(harness.api.mode).toBe("demo"));
    fireEvent.click(screen.getByRole("button", { name: /^Guide$/i }));

    await act(async () => {
      for (const issue of harness.api.activeIssues.filter((item) => item.severity === "Blocking")) {
        harness.api.setIssueAction(issue.id, "Accept suggested correction");
      }
    });

    await waitFor(() => expect(harness.api.stageDone.resolve).toBe(true));
    expect(await screen.findByText(/Guide · step 4 of 13/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("button", { name: /Approve Forecast-Ready Dataset/i })
        .some((button) => button.textContent === "Approve Forecast-Ready Dataset"),
    ).toBe(true);
  });

  it("resets the open guide back to the clean seeded starting step", async () => {
    const harness = renderDemoTourHarness();
    await screen.findByTestId("tour-mode");

    await act(async () => {
      harness.api.startDemo();
      harness.api.completeStage("project");
      harness.api.completeStage("upload");
      harness.api.completeStage("resolve");
      harness.api.completeStage("dataset");
      harness.api.completeStage("validation");
    });
    await waitFor(() => expect(harness.api.mode).toBe("demo"));

    fireEvent.click(screen.getByRole("button", { name: /^Guide$/i }));
    expect(await screen.findByText(/Guide · step 6 of 13/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Reset guide/i }));
    const resetButtons = screen.getAllByRole("button", { name: /Reset guide/i });
    fireEvent.click(resetButtons[resetButtons.length - 1]);

    await waitFor(() => expect(harness.api.stageDone).toEqual(emptyStageDone()));
    expect(await screen.findByText(/Guide · step 1 of 13/i)).toBeInTheDocument();
    expect(harness.api.activeVersionId).toBe("v-2026-07");
  });

  it("advances the seeded guide through project and upload without leaving the rail static", async () => {
    const harness = renderDemoTourHarness();
    await screen.findByTestId("tour-mode");

    await act(async () => {
      harness.api.startDemo();
    });
    await waitFor(() => expect(harness.api.stageDone).toEqual(emptyStageDone()));

    fireEvent.click(screen.getByRole("button", { name: /^Guide$/i }));
    expect(await screen.findByText(/Guide · step 1 of 13/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => expect(harness.api.stageDone.project).toBe(true));
    expect(await screen.findByText(/Guide · step 2 of 13/i)).toBeInTheDocument();
    expect(harness.api.stageDone.upload).toBe(false);
    await waitFor(() => expect(screen.getByRole("button", { name: /Next/i })).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => expect(harness.api.stageDone.upload).toBe(true));
    expect(await screen.findByText(/Guide · step 3 of 13/i)).toBeInTheDocument();
  });

  it("allows the guide to skip optional what-if scenarios", async () => {
    const harness = renderDemoTourHarness();
    await screen.findByTestId("tour-mode");

    await act(async () => {
      harness.api.startDemo();
      harness.api.completeStage("project");
      harness.api.completeStage("upload");
      harness.api.completeStage("resolve");
      harness.api.completeStage("dataset");
      harness.api.completeStage("validation");
      harness.api.completeStage("tournament");
      harness.api.completeStage("champion");
      harness.api.completeStage("baseline");
      harness.api.completeStage("events");
    });
    await waitFor(() => expect(harness.api.mode).toBe("demo"));

    fireEvent.click(screen.getByRole("button", { name: /^Guide$/i }));
    expect(await screen.findByText(/Guide · step 10 of 13/i)).toBeInTheDocument();
    expect(screen.getByText(/Optional:/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Skip what-if/i }));

    await waitFor(() => expect(harness.api.stageDone.scenarios).toBe(true));
    expect(await screen.findByText(/Guide · step 11 of 13/i)).toBeInTheDocument();
  });

  it("blocks the guide event step until the Apex event impact is explicitly applied", async () => {
    const harness = renderDemoTourHarness();
    await screen.findByTestId("tour-mode");

    await act(async () => {
      harness.api.startDemo();
      harness.api.completeStage("project");
      harness.api.completeStage("upload");
      harness.api.completeStage("resolve");
      harness.api.completeStage("dataset");
      harness.api.completeStage("validation");
      harness.api.completeStage("tournament");
      harness.api.completeStage("champion");
      harness.api.completeStage("baseline");
    });
    await waitFor(() => expect(harness.api.mode).toBe("demo"));

    fireEvent.click(screen.getByRole("button", { name: /^Guide$/i }));
    expect(await screen.findByText(/Guide · step 9 of 13/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Select the Apex shutdown event/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Next/i })).toBeDisabled();
    expect(harness.api.adjustmentRequests).toHaveLength(0);

    await act(async () => {
      harness.api.promoteToReview({
        title: "Apex shutdown moved — selected residual impact",
        origin: "Event",
        originId: "ie-0",
        scope: "CLT-1048 · North Plant — Coimbatore",
        requestedImpactPct: -26.2,
        monthlyImpactPct: [0, 0, 56.6, -26.2, 9.7, 0],
        owner: "Customer account team · Apex",
        note: "Planner selected this event for forecast review.",
      });
      harness.api.completeStage("events");
    });

    await waitFor(() => expect(harness.api.stageDone.events).toBe(true));
    expect(await screen.findByText(/Guide · step 10 of 13/i)).toBeInTheDocument();
  });

  it("records event decisions and event-origin adjustment requests separately", async () => {
    const harness = await renderPlatform();
    await act(async () => {
      harness.api.startDemo();
      harness.api.setIntelEventStatus("ie-0", "Watchlist");
      harness.api.logAudit({
        user: "Customer account team · Apex",
        action: "Event modified",
        sku: "CLT-1048 · Clutch Friction Assembly",
        customer: "Apex Motors (OEM)",
        version: "V2026.07 — Working draft",
        detail:
          "Event decision changed to Watchlist: Apex Motors shutdown moved from September to October.",
      });
      harness.api.promoteToReview({
        title: "Apex shutdown moved — selected residual impact",
        origin: "Event",
        originId: "ie-0",
        scope: "CLT-1048 · North Plant — Coimbatore",
        requestedImpactPct: -26.2,
        monthlyImpactPct: [0, 0, 56.6, -26.2, 9.7, 0],
        owner: "Customer account team · Apex",
        note: "Planner selected this event for forecast review.",
      });
    });

    expect(harness.api.intelEvents.find((event) => event.id === "ie-0")?.status).toBe("Watchlist");
    expect(harness.api.adjustmentRequests[0]).toMatchObject({
      origin: "Event",
      originId: "ie-0",
      requestedImpactPct: -26.2,
      status: "Awaiting approval",
    });
    expect(harness.api.auditLog[0]).toMatchObject({
      action: "Event modified",
      detail: expect.stringContaining("Watchlist"),
    });
  });

  it("resets guided demo modifications and preserves clean demo state after refresh", async () => {
    let harness = await renderPlatform();
    await act(async () => {
      harness.api.startDemo();
      harness.api.addEvent({
        title: "Temporary event",
        type: "Promotion",
        scope: "A · C1 · P1",
        window: "Aug 26",
        expectedImpactPct: 10,
        status: "Proposed",
        confidence: "Low",
        owner: "Test",
        rationale: "Temporary",
      });
      harness.api.completeStage("dataset");
      harness.api.resetDemo();
    });

    await waitFor(() => expect(harness.api.mode).toBe("demo"));
    expectCleanDemoSeed(harness.api);

    harness.unmount();
    harness = await renderPlatform();
    await waitForMode(() => harness.api, "demo");
    expectCleanDemoSeed(harness.api);
  });

  it("exits to an empty workspace, clears persisted keys, and refreshes empty", async () => {
    let harness = await renderPlatform();
    await createUserProject(harness.api);
    await ingest(harness.api, monthlyRows());
    await act(async () => {
      harness.api.completeStage("dataset");
      harness.api.setActiveVersionId("user-version");
      harness.api.exitToNewProject();
    });

    await waitForMode(() => harness.api, "empty");
    expectEmptyWorkspace(harness.api);
    await waitFor(() => expect(persistedKeys()).toEqual([]));

    harness.unmount();
    harness = await renderPlatform();
    await waitForMode(() => harness.api, "empty");
    expectEmptyWorkspace(harness.api);
  });

  it("prevents stale values from surviving cross-mode transitions", async () => {
    const harness = await renderPlatform();

    await act(async () => {
      harness.api.startDemo();
      harness.api.exitToNewProject();
    });
    await createUserProject(harness.api);
    await ingest(harness.api, monthlyRows());

    expect(harness.api.mode).toBe("user");
    expect(harness.api.events).toHaveLength(0);
    expect(harness.api.approvals).toHaveLength(0);
    expect(harness.api.activeVersionId).toBe("");

    await act(async () => {
      harness.api.recordModelSelection({
        key: "A|C1|P1",
        sku: "A",
        customerId: "C1",
        plantId: "P1",
        selectedModelId: "ets",
        selectedModelName: "ETS",
        recommendedChampionId: "sarimax",
        recommendedChampionName: "SARIMAX",
        method: "Manual override",
        status: "Awaiting approval",
        reason: "Test decision",
        comment: "",
        evidence: "",
        effectiveFrom: "",
        effectiveTo: "",
        materialBreaches: [],
      });
      harness.api.setActiveVersionId("user-version");
      harness.api.completeStage("tournament");
      harness.api.startDemo();
    });

    await waitForMode(() => harness.api, "demo");
    expectCleanDemoSeed(harness.api);
    expect(harness.api.dataset).toBeNull();
    expect(harness.api.modelSelections).toEqual({});
    expect(harness.api.stageDone.tournament).toBe(false);
    expect(harness.api.stageDone.project).toBe(false);
    expect(harness.api.stageDone.upload).toBe(false);
  });
});

describe("focused pure functions", () => {
  it("parses CSV and TSV fixtures deterministically", () => {
    expect(parseDelimited("a,b\n1,2").records).toEqual([{ a: "1", b: "2" }]);
    expect(parseDelimited("a\tb\n1\t2").records).toEqual([{ a: "1", b: "2" }]);
  });

  it("computes dataset stats from small known totals", () => {
    expect(computeDatasetStats(monthlyRows(), mapping)).toMatchObject({
      rows: 6,
      skus: 2,
      customers: 2,
      plants: 2,
      series: 2,
      earliest: "2026-01-01",
      latest: "2026-03-01",
      periods: 3,
      frequency: "Monthly",
    });
  });

  it("derives issues and quality score from unresolved and resolved issue sets", () => {
    const issues = deriveIssues(computeDatasetStats(qualityRows(), mapping));

    expect(issues.map((issue) => issue.id)).toEqual(
      expect.arrayContaining(["u-date", "u-dupe", "u-missing", "u-stockout", "u-blank", "u-short"]),
    );
    expect(qualityScore(issues, {})).toBe(38);
    expect(
      qualityScore(issues, { "u-date": "Accept suggested correction", "u-dupe": "Exclude record" }),
    ).toBe(74);
  });

  it("exercises resetAll targets through public reset entry points", async () => {
    const harness = await renderPlatform();

    await act(async () => {
      harness.api.startDemo();
    });
    expectCleanDemoSeed(harness.api);

    await act(async () => {
      harness.api.exitToNewProject();
    });
    await waitForMode(() => harness.api, "empty");
    expectEmptyWorkspace(harness.api);
    expect(persistedKeys()).toEqual([]);
  });
});
