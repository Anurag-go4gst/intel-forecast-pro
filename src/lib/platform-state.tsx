import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  cycleFromVersionId,
  cycleToPubId,
  cycleToWipId,
  defaultDrivers,
  defaultFilters,
  DEMO_FEATURED_EVENT_ID,
  forecastForVersion,
  forecastVersions,
  intervalScaleFor,
  nextCycle,
  seedEvents,
  seedReviewLines,
  seedScenarios,
  workingDraftForecast,
  WORKING_DRAFT_VERSION_ID,
  type DemandEvent,
  type Filters,
  type ReviewLine,
  type SavedScenario,
  type ScenarioDriver,
  type VersionForecast,
  type VersionOption,
} from "@/lib/demo-data";
import {
  seedIntelEvents,
  seedScenarioSpecs,
  type AdjustmentRequest,
  type IntelEvent,
  type ScenarioSpec,
} from "@/lib/event-domain";
import {
  seedAuditLog,
  seedVersions,
  proposedFinal,
  type ApprovalItem,
  type ApprovalStatus,
  type AuditAction,
  type AuditEntry,
  type ForecastVersionRecord,
} from "@/lib/governance-domain";
import { autoMapping, seedTransformations, type TransformationEntry } from "@/lib/forecast-domain";
import type { ModelSelection } from "@/lib/model-selection";

import {
  dataIssues,
  workflowStages,
  type DataIssue,
  type IssueResolution,
  type StageId,
} from "@/lib/workflow";
import {
  computeDatasetStats,
  deriveIssues,
  qualityScore,
  type AppMode,
  type DatasetRecord,
  type DatasetStats,
  type ProjectConfig,
  type StatsMapping,
} from "@/lib/app-mode";
import { clearPersistedState, usePersistentState } from "@/lib/persist";

export type UploadedFile = {
  name: string;
  sizeLabel: string;
  rows: number;
  uploadedAt: string;
};

export type ForecastRunState = "idle" | "running" | "complete";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: "seed-1",
    role: "assistant",
    content:
      "I can explain forecast movements, accuracy, bias and inventory risk for the current filter selection. Try asking about stockout exposure, why a forecast changed, or which model was selected for a SKU.\n\nAll answers in this prototype come from seeded demonstration data.",
  },
];

export type DatasetState = {
  fileName: string;
  sizeLabel: string;
  uploadedAt: string;
  columns: string[];
  records?: DatasetRecord[];
  preview: DatasetRecord[];
  stats: DatasetStats;
};

type PlatformContextValue = {
  // ------------------------------------------------------- operating modes
  mode: AppMode;
  project: ProjectConfig | null;
  createProject: (config: Omit<ProjectConfig, "createdAt" | "source">) => void;
  dataset: DatasetState | null;
  ingestDataset: (input: {
    fileName: string;
    sizeLabel: string;
    columns: string[];
    records: DatasetRecord[];
    mapping: StatsMapping;
  }) => void;
  recomputeStats: (mapping: StatsMapping) => void;
  /** Loads the fictional Apex Motors seeded dataset. */
  startDemo: () => void;
  /** Restores the Apex Motors demo to its original seeded starting point. */
  resetDemo: () => void;
  /** Wipes every artefact and returns to an empty Create Project screen. */
  exitToNewProject: () => void;
  activeIssues: DataIssue[];
  dataQualityScore: number;

  filters: Filters;
  setFilter: (key: keyof Filters, value: string) => void;
  resetFilters: () => void;

  events: DemandEvent[];
  addEvent: (event: Omit<DemandEvent, "id">) => void;
  setEventStatus: (id: string, status: DemandEvent["status"]) => void;

  scenarios: SavedScenario[];
  drivers: ScenarioDriver;
  setDriver: (key: keyof ScenarioDriver, value: number | boolean) => void;
  resetDrivers: () => void;
  saveScenario: (name: string, note: string) => void;
  loadScenario: (id: string) => void;

  reviewLines: ReviewLine[];
  setLineStatus: (id: string, status: ReviewLine["status"]) => void;
  approveAll: () => void;
  published: boolean;
  publish: () => void;

  runState: ForecastRunState;
  runProgress: number;
  startRun: () => void;
  selectedModelBySku: Record<string, string>;
  setSelectedModel: (sku: string, model: string) => void;

  messages: ChatMessage[];
  pushMessage: (message: ChatMessage) => void;

  upload: UploadedFile | null;
  setUpload: (file: UploadedFile | null) => void;
  mapping: Record<string, string>;
  setMapping: (fieldId: string, column: string) => void;
  autoMap: () => void;
  clearMapping: () => void;
  validationRun: boolean;
  runValidation: () => void;
  transformations: TransformationEntry[];
  setTransformationStatus: (id: string, status: TransformationEntry["status"]) => void;

  /** Operational model selection per SKU|customer|plant series key. */
  modelSelections: Record<string, ModelSelection>;
  recordModelSelection: (
    selection: Omit<ModelSelection, "version" | "decidedBy" | "decidedAt">,
  ) => void;
  approveModelSelection: (key: string) => void;
  clearModelSelection: (key: string) => void;

  intelEvents: IntelEvent[];
  addIntelEvent: (event: Omit<IntelEvent, "id" | "createdAt" | "modifiedAt">) => void;
  updateIntelEvent: (id: string, patch: Partial<IntelEvent>) => void;
  setIntelEventStatus: (id: string, status: IntelEvent["status"]) => void;

  scenarioSpecs: ScenarioSpec[];
  addScenarioSpec: (spec: Omit<ScenarioSpec, "id" | "createdAt" | "promoted">) => void;
  updateScenarioSpec: (id: string, patch: Partial<ScenarioSpec>) => void;
  cloneScenarioSpec: (id: string) => void;
  compareIds: string[];
  toggleCompare: (id: string) => void;

  approvals: ApprovalItem[];
  setApprovalStatus: (id: string, status: ApprovalStatus, note?: string) => void;
  editRecommendation: (id: string, plannerOverride: number) => void;
  addApprovalComment: (id: string, body: string) => void;

  versions: ForecastVersionRecord[];
  activeVersionId: string;
  setActiveVersionId: (id: string) => void;

  /** Header FORECAST VERSION options, extended as drafts are published. */
  forecastVersionList: VersionOption[];
  /** The id of the live, editable working draft (changes when a draft is published). */
  workingDraftVersionId: string;
  /** Frozen/seeded forecast snapshot for a header version id. */
  getVersionForecast: (versionId: string) => VersionForecast;

  auditLog: AuditEntry[];
  logAudit: (entry: Omit<AuditEntry, "id" | "at" | "date">) => void;

  adjustmentRequests: AdjustmentRequest[];
  promoteToReview: (
    request: Omit<AdjustmentRequest, "id" | "submittedAt" | "status">,
    /** The approval-queue line this action raises for a decision, if any. */
    approval?: Omit<ApprovalItem, "comments">,
  ) => void;
  setRequestStatus: (id: string, status: AdjustmentRequest["status"]) => void;

  // ------------------------------------------------ guided workflow lifecycle
  stageDone: Record<StageId, boolean>;
  completeStage: (id: StageId) => void;
  reopenStage: (id: StageId) => void;
  resetWorkflow: () => void;
  issueActions: Record<string, IssueResolution>;
  setIssueAction: (issueId: string, action: IssueResolution) => void;
  blockingOpen: number;
  rolesConfirmed: boolean;
  confirmRoles: () => void;
  validationMode: "auto" | "manual";
  setValidationMode: (mode: "auto" | "manual") => void;
  championOverrideReason: string;
  setChampionOverrideReason: (reason: string) => void;
};

const PlatformContext = createContext<PlatformContextValue | null>(null);

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${++idCounter}-${Date.now().toString(36)}`;

export function PlatformProvider({ children }: { children: ReactNode }) {
  // Nothing is seeded at start-up. Seeds are only installed by startDemo().
  const [mode, setMode] = usePersistentState<AppMode>("mode", "empty");
  const [project, setProject] = usePersistentState<ProjectConfig | null>("project", null);
  const [dataset, setDataset] = usePersistentState<DatasetState | null>("dataset", null);

  const [filters, setFilters] = usePersistentState<Filters>("filters", defaultFilters);
  const [events, setEvents] = usePersistentState<DemandEvent[]>("events", []);
  const [scenarios, setScenarios] = usePersistentState<SavedScenario[]>("scenarios", []);
  const [drivers, setDrivers] = usePersistentState<ScenarioDriver>("drivers", defaultDrivers);
  const [reviewLines, setReviewLines] = usePersistentState<ReviewLine[]>("reviewLines", []);
  const [published, setPublished] = usePersistentState("published", false);

  const [runState, setRunState] = useState<ForecastRunState>("idle");
  const [runProgress, setRunProgress] = useState(0);
  const [selectedModelBySku, setSelectedModelBySku] = usePersistentState<Record<string, string>>(
    "selectedModelBySku",
    {},
  );
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  const setFilter = useCallback((key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => setFilters(defaultFilters), []);

  const addEvent = useCallback((event: Omit<DemandEvent, "id">) => {
    setEvents((prev) => [{ ...event, id: nextId("ev") }, ...prev]);
  }, []);

  const setEventStatus = useCallback((id: string, status: DemandEvent["status"]) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
  }, []);

  const setDriver = useCallback((key: keyof ScenarioDriver, value: number | boolean) => {
    setDrivers((prev) => ({ ...prev, [key]: value }) as ScenarioDriver);
  }, []);

  const resetDrivers = useCallback(() => setDrivers(defaultDrivers), []);

  const saveScenario = useCallback(
    (name: string, note: string) => {
      setScenarios((prev) => [
        {
          id: nextId("sc"),
          name,
          note,
          createdBy: "You · Demand planning",
          createdAt: "Today",
          drivers,
        },
        ...prev,
      ]);
    },
    [drivers],
  );

  const loadScenario = useCallback(
    (id: string) => {
      const found = scenarios.find((s) => s.id === id);
      if (found) setDrivers(found.drivers);
    },
    [scenarios],
  );

  const setLineStatus = useCallback((id: string, status: ReviewLine["status"]) => {
    setReviewLines((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  }, []);

  const approveAll = useCallback(() => {
    setReviewLines((prev) =>
      prev.map((l) => (l.status === "Pending" ? { ...l, status: "Approved" } : l)),
    );
  }, []);

  const startRun = useCallback(() => {
    setRunState("running");
    setRunProgress(0);
    const interval = setInterval(() => {
      setRunProgress((prev) => {
        const next = prev + 8 + Math.round(Math.random() * 9);
        if (next >= 100) {
          clearInterval(interval);
          setRunState("complete");
          return 100;
        }
        return next;
      });
    }, 220);
  }, []);

  const setSelectedModel = useCallback((sku: string, model: string) => {
    setSelectedModelBySku((prev) => ({ ...prev, [sku]: model }));
  }, []);

  const pushMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const [upload, setUpload] = usePersistentState<UploadedFile | null>("upload", null);
  const [mapping, setMappingState] = usePersistentState<Record<string, string>>("mapping", {});
  const [validationRun, setValidationRun] = usePersistentState("validationRun", false);
  const [transformations, setTransformations] = usePersistentState<TransformationEntry[]>(
    "transformations",
    [],
  );

  const setMapping = useCallback((fieldId: string, column: string) => {
    setMappingState((prev) => ({ ...prev, [fieldId]: column }));
  }, []);

  const autoMap = useCallback(() => setMappingState({ ...autoMapping }), []);
  const clearMapping = useCallback(() => setMappingState({}), []);
  const runValidation = useCallback(() => setValidationRun(true), []);

  const setTransformationStatus = useCallback(
    (id: string, status: TransformationEntry["status"]) => {
      setTransformations((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    },
    [],
  );

  const [intelEvents, setIntelEvents] = usePersistentState<IntelEvent[]>("intelEvents", []);
  const [scenarioSpecs, setScenarioSpecs] = usePersistentState<ScenarioSpec[]>("scenarioSpecs", []);
  const [compareIds, setCompareIds] = usePersistentState<string[]>("compareIds", []);
  const [adjustmentRequests, setAdjustmentRequests] = usePersistentState<AdjustmentRequest[]>(
    "adjustmentRequests",
    [],
  );

  const stamp = () => "Today (prototype session)";

  const addIntelEvent = useCallback(
    (event: Omit<IntelEvent, "id" | "createdAt" | "modifiedAt">) => {
      setIntelEvents((prev) => [
        { ...event, id: nextId("ie"), createdAt: stamp(), modifiedAt: stamp() },
        ...prev,
      ]);
    },
    [],
  );

  const updateIntelEvent = useCallback((id: string, patch: Partial<IntelEvent>) => {
    setIntelEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch, modifiedAt: stamp() } : e)),
    );
  }, []);

  const setIntelEventStatus = useCallback((id: string, status: IntelEvent["status"]) => {
    setIntelEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status, modifiedAt: stamp() } : e)),
    );
  }, []);

  const addScenarioSpec = useCallback(
    (spec: Omit<ScenarioSpec, "id" | "createdAt" | "promoted">) => {
      setScenarioSpecs((prev) => [
        { ...spec, id: nextId("ss"), createdAt: "Today", promoted: false },
        ...prev,
      ]);
    },
    [],
  );

  const updateScenarioSpec = useCallback((id: string, patch: Partial<ScenarioSpec>) => {
    setScenarioSpecs((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const cloneScenarioSpec = useCallback((id: string) => {
    setScenarioSpecs((prev) => {
      const found = prev.find((s) => s.id === id);
      if (!found) return prev;
      return [
        {
          ...found,
          id: nextId("ss"),
          name: `${found.name} (copy)`,
          promoted: false,
          createdAt: "Today",
        },
        ...prev,
      ];
    });
  }, []);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const promoteToReview = useCallback(
    (
      request: Omit<AdjustmentRequest, "id" | "submittedAt" | "status">,
      approval?: Omit<ApprovalItem, "comments">,
    ) => {
      setAdjustmentRequests((prev) => [
        {
          ...request,
          id: nextId("ar"),
          submittedAt: "Today (prototype session)",
          status: "Awaiting approval",
        },
        ...prev,
      ]);
      // The same action raises a decision line in the approval queue. Dedupe by
      // id so re-opening a promoted event/scenario never doubles the queue.
      if (approval) {
        setApprovals((prev) =>
          prev.some((item) => item.id === approval.id)
            ? prev
            : [{ ...approval, comments: [] }, ...prev],
        );
      }
      if (request.origin === "Scenario") {
        setScenarioSpecs((prev) =>
          prev.map((s) => (s.id === request.originId ? { ...s, promoted: true } : s)),
        );
      }
    },
    [],
  );

  const [approvals, setApprovals] = usePersistentState<ApprovalItem[]>("approvals", []);
  const [versions, setVersions] = usePersistentState<ForecastVersionRecord[]>("versions", []);
  const [activeVersionId, setActiveVersionId] = usePersistentState("activeVersionId", "");
  const [auditLog, setAuditLog] = usePersistentState<AuditEntry[]>("auditLog", []);

  // ------------------------------------------------ version-scoped forecasts
  // The header FORECAST VERSION options and per-version snapshots are stateful
  // so that publishing can freeze the working draft into a new published option
  // and open the next cycle's draft. The working draft itself stays live.
  const [forecastVersionList, setForecastVersionList] = usePersistentState<VersionOption[]>(
    "forecastVersionList",
    forecastVersions,
  );
  const [workingDraftVersionId, setWorkingDraftVersionId] = usePersistentState(
    "workingDraftVersionId",
    WORKING_DRAFT_VERSION_ID,
  );
  const [publishedSnapshots, setPublishedSnapshots] = usePersistentState<
    Record<string, VersionForecast>
  >("publishedSnapshots", {});

  const publish = useCallback(() => {
    const approvedTotal = approvals
      .filter((a) => a.status !== "Rejected")
      .reduce((sum, a) => sum + proposedFinal(a), 0);

    // Cycle identity: the working draft being published, and the next one.
    const cycle = cycleFromVersionId(workingDraftVersionId); // e.g. "2026.07"
    const nextC = nextCycle(cycle); // e.g. "2026.08"
    const cycleLabel = `V${cycle}`;
    const nextLabel = `V${nextC}`;
    const pubId = cycleToPubId(cycle);
    const newWipId = cycleToWipId(nextC);
    const govId = `v-${cycle.replace(".", "-")}`;
    const nextGovId = `v-${nextC.replace(".", "-")}`;

    // 1. Freeze the working draft's live forecast — including its modulated
    //    prediction band — into a read-only snapshot.
    const appliedFeaturedEvent = intelEvents.find(
      (e) => e.id === DEMO_FEATURED_EVENT_ID && e.status === "Approved",
    );
    const featuredEventApplied = Boolean(appliedFeaturedEvent);
    const frozenScale = intervalScaleFor({
      eventApplied: featuredEventApplied,
      eventProbabilityPct: appliedFeaturedEvent?.probabilityPct,
      eventConfirmed: appliedFeaturedEvent?.reliability === "Confirmed document",
      promotedScenarioTypes: scenarioSpecs.filter((s) => s.promoted).map((s) => s.type),
    });
    const frozen: VersionForecast = {
      ...workingDraftForecast(featuredEventApplied, frozenScale),
      versionId: pubId,
      label: `${cycleLabel} — Published`,
      status: "published",
    };
    setPublishedSnapshots((prev) => ({ ...prev, [pubId]: frozen }));

    // 2. Roll the header version options: the working draft becomes the newly
    //    published option and a fresh working draft opens on top.
    setForecastVersionList((prev) => [
      { id: newWipId, label: `${nextLabel} — Working draft`, status: "draft" as const },
      { id: pubId, label: `${cycleLabel} — Published`, status: "published" as const },
      ...prev.filter((v) => v.id !== workingDraftVersionId),
    ]);
    setWorkingDraftVersionId(newWipId);
    setFilters((prev) => ({ ...prev, version: newWipId }));

    // 3. Roll the governance version records: publish this cycle, supersede the
    //    prior published version, and open the next working draft.
    setVersions((prev) => [
      {
        id: nextGovId,
        label: nextLabel,
        cycle: `${nextLabel} cycle`,
        status: "Working draft" as const,
        createdBy: "You · Demand planning lead",
        createdAt: "Today (prototype session)",
        totalUnits: frozen.totals.baseline,
        note: "New draft opened after publication. Starts from the statistical baseline.",
      },
      ...prev.map((v) =>
        v.id === govId
          ? { ...v, status: "Published" as const, totalUnits: approvedTotal || v.totalUnits }
          : v.status === "Published"
            ? { ...v, status: "Superseded" as const }
            : v,
      ),
    ]);
    setActiveVersionId(nextGovId);

    // 4. Reset the in-cycle decisions so the new draft starts flat, while
    //    keeping published history, versions and the audit trail.
    setIntelEvents(seedIntelEvents);
    setScenarioSpecs(seedScenarioSpecs);
    setApprovals([]);
    setAdjustmentRequests([]);
    setPublished(false);

    setAuditLog((log) => [
      {
        id: nextId("al"),
        at: "Today (prototype session)",
        date: "2026-07-26",
        user: "You · Demand planning lead",
        action: "Forecast publication" as AuditAction,
        sku: "All",
        customer: "All",
        version: cycleLabel,
        detail: `Published ${cycleLabel} (${approvedTotal.toLocaleString("en-IN")} units) to ERP, MRP and the supplier portal, and opened ${nextLabel} as the new working draft (prototype only).`,
      },
      ...log,
    ]);
  }, [approvals, intelEvents, scenarioSpecs, workingDraftVersionId]);

  /** Resolve the forecast snapshot for a header version id. The live working
   *  draft is computed by the caller; this returns frozen/seeded snapshots. */
  const getVersionForecast = useCallback(
    (versionId: string): VersionForecast =>
      publishedSnapshots[versionId] ?? forecastForVersion(versionId),
    [publishedSnapshots],
  );

  const logAudit = useCallback((entry: Omit<AuditEntry, "id" | "at" | "date">) => {
    setAuditLog((prev) => [
      { ...entry, id: nextId("al"), at: "Today (prototype session)", date: "2026-07-26" },
      ...prev,
    ]);
  }, []);

  // ------------------------------------------- operational model selection
  const [modelSelections, setModelSelections] = usePersistentState<Record<string, ModelSelection>>(
    "modelSelections",
    {},
  );

  const recordModelSelection = useCallback(
    (selection: Omit<ModelSelection, "version" | "decidedBy" | "decidedAt">) => {
      setModelSelections((prev) => {
        const previous = prev[selection.key];
        const nextVersion = previous
          ? `ms.${String(Number(previous.version.split(".")[1] ?? 1) + 1).padStart(2, "0")}`
          : "ms.01";
        return {
          ...prev,
          [selection.key]: {
            ...selection,
            version: nextVersion,
            decidedBy: "You · Demand planning lead",
            decidedAt: "Today (prototype session)",
          },
        };
      });
      const [sku, customerId] = selection.key.split("|");
      setAuditLog((log) => [
        {
          id: nextId("al"),
          at: "Today (prototype session)",
          date: "2026-07-26",
          user: "You · Demand planning lead",
          action: "Model selection" as AuditAction,
          sku,
          customer: customerId,
          version: "V2026.07",
          detail:
            `Recommended Champion ${selection.recommendedChampionName}; selected operational model ${selection.selectedModelName}. ` +
            `Selection method: ${selection.method}. Status: ${selection.status}.` +
            (selection.reason ? ` Reason: ${selection.reason}.` : "") +
            (selection.comment ? ` Comment: ${selection.comment}.` : "") +
            (selection.effectiveFrom ? ` Effective period: ${selection.effectiveFrom}.` : "") +
            (selection.evidence ? ` Evidence: ${selection.evidence}.` : "") +
            (selection.materialBreaches.length
              ? ` Materiality breaches: ${selection.materialBreaches.join(", ")}.`
              : " No materiality thresholds breached."),
        },
        ...log,
      ]);
    },
    [],
  );

  const approveModelSelection = useCallback((key: string) => {
    setModelSelections((prev) => {
      const found = prev[key];
      if (!found) return prev;
      return { ...prev, [key]: { ...found, status: "Active" } };
    });
    const [sku, customerId] = key.split("|");
    setAuditLog((log) => [
      {
        id: nextId("al"),
        at: "Today (prototype session)",
        date: "2026-07-26",
        user: "You · Forecast governance",
        action: "Approval" as AuditAction,
        sku,
        customer: customerId,
        version: "V2026.07",
        detail:
          "Authorised model override approved — the selected model becomes the operational baseline model.",
      },
      ...log,
    ]);
  }, []);

  const clearModelSelection = useCallback((key: string) => {
    setModelSelections((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const setApprovalStatus = useCallback(
    (id: string, status: ApprovalStatus, note?: string) => {
      // Look up the item before mutating so the audit entry can be appended
      // outside the setApprovals updater — updater callbacks must stay pure, or
      // React (StrictMode / concurrent) double-invokes them and duplicates the log.
      const item = approvals.find((i) => i.id === id);
      if (!item) return;
      setApprovals((prev) =>
        prev.map((i) => {
          if (i.id !== id) return i;
          const comments = note
            ? [
                ...i.comments,
                {
                  id: nextId("cm"),
                  author: "You · Demand planning lead",
                  at: "Today (prototype session)",
                  body: note,
                },
              ]
            : i.comments;
          return { ...i, status, comments };
        }),
      );
      setAuditLog((log) => [
        {
          id: nextId("al"),
          at: "Today (prototype session)",
          date: "2026-07-26",
          user: "You · Demand planning lead",
          action: (status === "Approved"
            ? "Approval"
            : status === "Rejected"
              ? "Rejection"
              : "Forecast adjustment") as AuditAction,
          sku: item.sku,
          customer: item.customer,
          version: "V2026.07",
          detail: `${status} — ${item.description} (${item.location}). Proposed final ${proposedFinal(item).toLocaleString("en-IN")} units.`,
        },
        ...log,
      ]);
    },
    [approvals],
  );

  const editRecommendation = useCallback(
    (id: string, plannerOverride: number) => {
      const item = approvals.find((i) => i.id === id);
      if (!item) return;
      setApprovals((prev) => prev.map((i) => (i.id === id ? { ...i, plannerOverride } : i)));
      setAuditLog((log) => [
        {
          id: nextId("al"),
          at: "Today (prototype session)",
          date: "2026-07-26",
          user: "You · Demand planning lead",
          action: "Forecast adjustment" as AuditAction,
          sku: item.sku,
          customer: item.customer,
          version: "V2026.07",
          detail: `Recommendation edited: planner override changed from ${item.plannerOverride.toLocaleString("en-IN")} to ${plannerOverride.toLocaleString("en-IN")} units.`,
        },
        ...log,
      ]);
    },
    [approvals],
  );

  const addApprovalComment = useCallback((id: string, body: string) => {
    setApprovals((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              comments: [
                ...item.comments,
                {
                  id: nextId("cm"),
                  author: "You · Demand planning lead",
                  at: "Today (prototype session)",
                  body,
                },
              ],
            }
          : item,
      ),
    );
  }, []);

  const setRequestStatus = useCallback(
    (id: string, status: AdjustmentRequest["status"]) => {
      const request = adjustmentRequests.find((r) => r.id === id);
      if (!request) return;
      setAdjustmentRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      setAuditLog((log) => [
        {
          id: nextId("al"),
          at: "Today (prototype session)",
          date: "2026-07-26",
          user: "You · Demand planning lead",
          action: (status === "Approved"
            ? "Approval"
            : status === "Rejected"
              ? "Rejection"
              : "Forecast adjustment") as AuditAction,
          sku: request.scope,
          customer: request.owner,
          version: "V2026.07",
          detail: `${status} — adjustment request "${request.title}" (${request.origin.toLowerCase()}, ${request.requestedImpactPct > 0 ? "+" : ""}${request.requestedImpactPct}%).`,
        },
        ...log,
      ]);
    },
    [adjustmentRequests],
  );

  // ---------------------------------------------- guided workflow lifecycle
  const emptyStages = useMemo(
    () => Object.fromEntries(workflowStages.map((s) => [s.id, false])) as Record<StageId, boolean>,
    [],
  );
  const [stageDone, setStageDone] = usePersistentState<Record<StageId, boolean>>(
    "stageDone",
    emptyStages,
  );
  const [issueActions, setIssueActions] = usePersistentState<Record<string, IssueResolution>>(
    "issueActions",
    {},
  );
  const [rolesConfirmed, setRolesConfirmed] = usePersistentState("rolesConfirmed", false);
  const [validationMode, setValidationMode] = usePersistentState<"auto" | "manual">(
    "validationMode",
    "auto",
  );
  const [championOverrideReason, setChampionOverrideReason] = usePersistentState(
    "championOverrideReason",
    "",
  );

  const completeStage = useCallback(
    (id: StageId) => {
      if (!stageDone[id]) {
        const stage = workflowStages.find((item) => item.id === id);
        setAuditLog((log) => [
          {
            id: nextId("al"),
            at: "Today (prototype session)",
            date: new Date().toISOString().slice(0, 10),
            user: "You · Demand planning",
            action: "Data transformation" as AuditAction,
            sku: "All",
            customer: "All",
            version: mode === "demo" ? "V2026.07" : "Draft",
            detail: `Workflow step completed: ${stage ? `Step ${stage.step} — ${stage.label}` : id}.`,
          },
          ...log,
        ]);
      }
      setStageDone((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
    },
    [mode, stageDone],
  );

  const reopenStage = useCallback((id: StageId) => {
    setStageDone((prev) => ({ ...prev, [id]: false }));
  }, []);

  /**
   * The single authoritative reset. Every persisted slice is cleared, then the
   * requested mode is installed. Nothing else in the app may reset state.
   */
  const resetAll = useCallback(
    (target: AppMode) => {
      clearPersistedState();
      setStageDone(emptyStages);
      setIssueActions({});
      setRolesConfirmed(false);
      setValidationMode("auto");
      setChampionOverrideReason("");
      setFilters(defaultFilters);
      setDrivers(defaultDrivers);
      setPublished(false);
      setForecastVersionList(forecastVersions);
      setWorkingDraftVersionId(WORKING_DRAFT_VERSION_ID);
      setPublishedSnapshots({});
      setSelectedModelBySku({});
      setUpload(null);
      setMappingState({});
      setValidationRun(false);
      setModelSelections({});
      setRunState("idle");
      setRunProgress(0);
      setMessages(initialMessages);
      setDataset(null);

      if (target === "demo") {
        setMode("demo");
        setProject({
          name: "Apex Motors guide cycle",
          industry: "Auto ancillary manufacturing",
          grain: "SKU × Customer × Plant",
          frequency: "Monthly",
          horizon: 12,
          owner: "R. Iyer · Demand planning lead",
          createdAt: "Guide",
          source: "demo",
        });
        setEvents(seedEvents);
        setScenarios(seedScenarios);
        setReviewLines(seedReviewLines);
        setTransformations(seedTransformations);
        setIntelEvents(seedIntelEvents);
        setScenarioSpecs(seedScenarioSpecs);
        setCompareIds(["ss-1", "ss-2"]);
        setAdjustmentRequests([]);
        // The approval queue is derived from the planner's own upstream actions
        // (events applied, scenarios promoted), so it starts empty and fills as
        // the guide progresses — never pre-seeded with unrelated lines.
        setApprovals([]);
        setVersions(seedVersions);
        setActiveVersionId("v-2026-07");
        setAuditLog(seedAuditLog);
        setStageDone(emptyStages);
        setUpload({
          name: "apex-motors-demand-history.csv",
          sizeLabel: "3.4 MB",
          rows: 27_000,
          uploadedAt: "Guide · seeded extract",
        });
        setMappingState({ ...autoMapping });
      } else {
        setMode("empty");
        setProject(null);
        setEvents([]);
        setScenarios([]);
        setReviewLines([]);
        setTransformations([]);
        setIntelEvents([]);
        setScenarioSpecs([]);
        setCompareIds([]);
        setAdjustmentRequests([]);
        setApprovals([]);
        setVersions([]);
        setActiveVersionId("");
        setAuditLog([]);
      }
    },
    [emptyStages],
  );

  const startDemo = useCallback(() => resetAll("demo"), [resetAll]);
  const resetDemo = useCallback(() => resetAll("demo"), [resetAll]);
  const exitToNewProject = useCallback(() => resetAll("empty"), [resetAll]);
  /** Backwards-compatible alias used by older call sites. */
  const resetWorkflow = useCallback(() => resetAll("empty"), [resetAll]);

  const createProject = useCallback(
    (config: Omit<ProjectConfig, "createdAt" | "source">) => {
      resetAll("empty");
      setMode("user");
      setProject({
        ...config,
        createdAt: new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
        source: "user",
      });
      setAuditLog([
        {
          id: nextId("al"),
          at: "Today (prototype session)",
          date: new Date().toISOString().slice(0, 10),
          user: config.owner || "You · Demand planning",
          action: "Data upload" as AuditAction,
          sku: "All",
          customer: "All",
          version: "Draft",
          detail: `Project "${config.name}" created — grain ${config.grain}, ${config.frequency.toLowerCase()} buckets, ${config.horizon}-period horizon.`,
        },
      ]);
      setStageDone({ ...emptyStages, project: true });
    },
    [resetAll, emptyStages],
  );

  const ingestDataset = useCallback(
    (input: {
      fileName: string;
      sizeLabel: string;
      columns: string[];
      records: DatasetRecord[];
      mapping: StatsMapping;
    }) => {
      const stats = computeDatasetStats(input.records, input.mapping);
      setDataset({
        fileName: input.fileName,
        sizeLabel: input.sizeLabel,
        uploadedAt: new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
        columns: input.columns,
        records: input.records,
        preview: input.records.slice(0, 12),
        stats,
      });
      setUpload({
        name: input.fileName,
        sizeLabel: input.sizeLabel,
        rows: stats.rows,
        uploadedAt: new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
      });
      setIssueActions({});
      setAuditLog((log) => [
        {
          id: nextId("al"),
          at: "Today (prototype session)",
          date: new Date().toISOString().slice(0, 10),
          user: "You · Demand planning",
          action: "Data upload" as AuditAction,
          sku: "All",
          customer: "All",
          version: "Draft",
          detail: `Uploaded ${input.fileName}: ${stats.rows} rows, ${stats.series} series, ${stats.periods} periods (${stats.frequency}).`,
        },
        ...log,
      ]);
    },
    [],
  );

  const recomputeStats = useCallback((mapping: StatsMapping) => {
    setDataset((prev) =>
      prev ? { ...prev, stats: computeDatasetStats(prev.records ?? prev.preview, mapping) } : prev,
    );
  }, []);

  const confirmRoles = useCallback(() => setRolesConfirmed(true), []);

  /** Issues come from the seeded demo, from the uploaded file, or nowhere. */
  const activeIssues = useMemo<DataIssue[]>(() => {
    if (mode === "demo") return dataIssues;
    if (mode === "user" && dataset) return deriveIssues(dataset.stats);
    return [];
  }, [mode, dataset]);

  const setIssueAction = useCallback(
    (issueId: string, action: IssueResolution) => {
      setIssueActions((prev) => ({ ...prev, [issueId]: action }));
      const issue = activeIssues.find((item) => item.id === issueId);
      setAuditLog((log) => [
        {
          id: nextId("al"),
          at: "Today (prototype session)",
          date: new Date().toISOString().slice(0, 10),
          user: "You · Demand planning",
          action: "Data upload" as AuditAction,
          sku: "All",
          customer: "All",
          version: mode === "demo" ? "V2026.07" : "Draft",
          detail: `Resolved data-quality issue${issue ? ` "${issue.title}"` : ""} with action: ${action}.`,
        },
        ...log,
      ]);
    },
    [activeIssues, mode],
  );

  const blockingOpen = activeIssues.filter(
    (i) => i.severity === "Blocking" && !issueActions[i.id],
  ).length;

  const dataQualityScore = useMemo(
    () => (activeIssues.length ? qualityScore(activeIssues, issueActions) : 0),
    [activeIssues, issueActions],
  );

  const value = useMemo<PlatformContextValue>(
    () => ({
      mode,
      project,
      createProject,
      dataset,
      ingestDataset,
      recomputeStats,
      startDemo,
      resetDemo,
      exitToNewProject,
      activeIssues,
      dataQualityScore,
      filters,
      setFilter,
      resetFilters,
      events,
      addEvent,
      setEventStatus,
      scenarios,
      drivers,
      setDriver,
      resetDrivers,
      saveScenario,
      loadScenario,
      reviewLines,
      setLineStatus,
      approveAll,
      published,
      publish,
      runState,
      runProgress,
      startRun,
      selectedModelBySku,
      setSelectedModel,
      messages,
      pushMessage,
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
      modelSelections,
      recordModelSelection,
      approveModelSelection,
      clearModelSelection,
      intelEvents,
      addIntelEvent,
      updateIntelEvent,
      setIntelEventStatus,
      scenarioSpecs,
      addScenarioSpec,
      updateScenarioSpec,
      cloneScenarioSpec,
      compareIds,
      toggleCompare,
      approvals,
      setApprovalStatus,
      editRecommendation,
      addApprovalComment,
      versions,
      activeVersionId,
      setActiveVersionId,
      forecastVersionList,
      workingDraftVersionId,
      getVersionForecast,
      auditLog,
      logAudit,
      adjustmentRequests,
      promoteToReview,
      setRequestStatus,
      stageDone,
      completeStage,
      reopenStage,
      resetWorkflow,
      issueActions,
      setIssueAction,
      blockingOpen,
      rolesConfirmed,
      confirmRoles,
      validationMode,
      setValidationMode,
      championOverrideReason,
      setChampionOverrideReason,
    }),
    [
      mode,
      project,
      createProject,
      dataset,
      ingestDataset,
      recomputeStats,
      startDemo,
      resetDemo,
      exitToNewProject,
      activeIssues,
      dataQualityScore,
      filters,
      setFilter,
      resetFilters,
      events,
      addEvent,
      setEventStatus,
      scenarios,
      drivers,
      setDriver,
      resetDrivers,
      saveScenario,
      loadScenario,
      reviewLines,
      setLineStatus,
      approveAll,
      published,
      publish,
      runState,
      runProgress,
      startRun,
      selectedModelBySku,
      setSelectedModel,
      messages,
      pushMessage,
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
      modelSelections,
      recordModelSelection,
      approveModelSelection,
      clearModelSelection,
      intelEvents,
      addIntelEvent,
      updateIntelEvent,
      setIntelEventStatus,
      scenarioSpecs,
      addScenarioSpec,
      updateScenarioSpec,
      cloneScenarioSpec,
      compareIds,
      toggleCompare,
      approvals,
      setApprovalStatus,
      editRecommendation,
      addApprovalComment,
      versions,
      activeVersionId,
      setActiveVersionId,
      forecastVersionList,
      workingDraftVersionId,
      getVersionForecast,
      auditLog,
      logAudit,
      adjustmentRequests,
      promoteToReview,
      setRequestStatus,
      stageDone,
      completeStage,
      reopenStage,
      resetWorkflow,
      issueActions,
      setIssueAction,
      blockingOpen,
      rolesConfirmed,
      confirmRoles,
      validationMode,
      setValidationMode,
      championOverrideReason,
      setChampionOverrideReason,
    ],
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used inside PlatformProvider");
  return ctx;
}
