import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  defaultDrivers,
  defaultFilters,
  seedEvents,
  seedReviewLines,
  seedScenarios,
  type DemandEvent,
  type Filters,
  type ReviewLine,
  type SavedScenario,
  type ScenarioDriver,
} from "@/lib/demo-data";
import {
  seedAdjustmentRequests,
  seedIntelEvents,
  seedScenarioSpecs,
  type AdjustmentRequest,
  type IntelEvent,
  type ScenarioSpec,
} from "@/lib/event-domain";
import {
  seedApprovalQueue,
  seedAuditLog,
  seedVersions,
  proposedFinal,
  type ApprovalItem,
  type ApprovalStatus,
  type AuditAction,
  type AuditEntry,
  type ForecastVersionRecord,
} from "@/lib/governance-domain";
import {
  autoMapping,
  seedTransformations,
  type TransformationEntry,
} from "@/lib/forecast-domain";
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

export type DatasetState = {
  fileName: string;
  sizeLabel: string;
  uploadedAt: string;
  columns: string[];
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
  recordModelSelection: (selection: Omit<ModelSelection, "version" | "decidedBy" | "decidedAt">) => void;
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

  auditLog: AuditEntry[];
  logAudit: (entry: Omit<AuditEntry, "id" | "at" | "date">) => void;

  adjustmentRequests: AdjustmentRequest[];
  promoteToReview: (request: Omit<AdjustmentRequest, "id" | "submittedAt" | "status">) => void;
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
  const [selectedModelBySku, setSelectedModelBySku] = usePersistentState<Record<string, string>>("selectedModelBySku", {});
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "seed-1",
      role: "assistant",
      content:
        "I can explain forecast movements, accuracy, bias and inventory risk for the current filter selection. Try asking about stockout exposure, why a forecast changed, or which model was selected for a SKU.\n\nAll answers in this prototype come from seeded demonstration data.",
    },
  ]);

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
    setReviewLines((prev) => prev.map((l) => (l.status === "Pending" ? { ...l, status: "Approved" } : l)));
  }, []);

  const publish = useCallback(() => {
    setPublished(true);
    setVersions((prev) =>
      prev.map((v) =>
        v.id === "v-2026-07"
          ? { ...v, status: "Published" as const }
          : v.status === "Published"
            ? { ...v, status: "Superseded" as const }
            : v,
      ),
    );
    setAuditLog((log) => [
      {
        id: nextId("al"),
        at: "Today (prototype session)",
        date: "2026-07-26",
        user: "You · Demand planning lead",
        action: "Forecast publication" as AuditAction,
        sku: "All",
        customer: "All",
        version: "V2026.07",
        detail: "Published the July operational forecast to ERP, MRP and the supplier portal (prototype only).",
      },
      ...log,
    ]);
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
  const [transformations, setTransformations] =
    usePersistentState<TransformationEntry[]>("transformations", []);

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
  const [adjustmentRequests, setAdjustmentRequests] =
    usePersistentState<AdjustmentRequest[]>("adjustmentRequests", []);

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

  const setIntelEventStatus = useCallback(
    (id: string, status: IntelEvent["status"]) => {
      setIntelEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status, modifiedAt: stamp() } : e)),
      );
    },
    [],
  );

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
        { ...found, id: nextId("ss"), name: `${found.name} (copy)`, promoted: false, createdAt: "Today" },
        ...prev,
      ];
    });
  }, []);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const promoteToReview = useCallback(
    (request: Omit<AdjustmentRequest, "id" | "submittedAt" | "status">) => {
      setAdjustmentRequests((prev) => [
        { ...request, id: nextId("ar"), submittedAt: "Today (prototype session)", status: "Awaiting approval" },
        ...prev,
      ]);
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
        detail: "Authorised model override approved — the selected model becomes the operational baseline model.",
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
      setApprovals((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const comments = note
            ? [
                ...item.comments,
                {
                  id: nextId("cm"),
                  author: "You · Demand planning lead",
                  at: "Today (prototype session)",
                  body: note,
                },
              ]
            : item.comments;
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
          return { ...item, status, comments };
        }),
      );
    },
    [],
  );

  const editRecommendation = useCallback((id: string, plannerOverride: number) => {
    setApprovals((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
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
        return { ...item, plannerOverride };
      }),
    );
  }, []);

  const addApprovalComment = useCallback((id: string, body: string) => {
    setApprovals((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              comments: [
                ...item.comments,
                { id: nextId("cm"), author: "You · Demand planning lead", at: "Today (prototype session)", body },
              ],
            }
          : item,
      ),
    );
  }, []);

  const setRequestStatus = useCallback((id: string, status: AdjustmentRequest["status"]) => {
    setAdjustmentRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }, []);

  // ---------------------------------------------- guided workflow lifecycle
  const emptyStages = useMemo(
    () =>
      Object.fromEntries(workflowStages.map((s) => [s.id, false])) as Record<StageId, boolean>,
    [],
  );
  const [stageDone, setStageDone] = usePersistentState<Record<StageId, boolean>>("stageDone", emptyStages);
  const [issueActions, setIssueActions] = usePersistentState<Record<string, IssueResolution>>("issueActions", {});
  const [rolesConfirmed, setRolesConfirmed] = usePersistentState("rolesConfirmed", false);
  const [validationMode, setValidationMode] = usePersistentState<"auto" | "manual">("validationMode", "auto");
  const [championOverrideReason, setChampionOverrideReason] = usePersistentState("championOverrideReason", "");

  const completeStage = useCallback((id: StageId) => {
    setStageDone((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  }, []);

  const reopenStage = useCallback((id: StageId) => {
    setStageDone((prev) => ({ ...prev, [id]: false }));
  }, []);

  /**
   * The single authoritative reset. Every persisted slice is cleared, then the
   * requested mode is installed. Nothing else in the app may reset state.
   */
  const resetAll = useCallback((target: AppMode) => {
    clearPersistedState();
    setStageDone(emptyStages);
    setIssueActions({});
    setRolesConfirmed(false);
    setValidationMode("auto");
    setChampionOverrideReason("");
    setFilters(defaultFilters);
    setDrivers(defaultDrivers);
    setPublished(false);
    setSelectedModelBySku({});
    setUpload(null);
    setMappingState({});
    setValidationRun(false);
    setModelSelections({});
    setRunState("idle");
    setRunProgress(0);
    setDataset(null);

    if (target === "demo") {
      setMode("demo");
      setProject({
        name: "Apex Motors guided demonstration cycle",
        industry: "Auto ancillary manufacturing",
        grain: "SKU × Customer × Plant",
        frequency: "Monthly",
        horizon: 12,
        owner: "R. Iyer · Demand planning lead",
        createdAt: "Guided demo",
        source: "demo",
      });
      setEvents(seedEvents);
      setScenarios(seedScenarios);
      setReviewLines(seedReviewLines);
      setTransformations(seedTransformations);
      setIntelEvents(seedIntelEvents);
      setScenarioSpecs(seedScenarioSpecs);
      setCompareIds(["ss-1", "ss-2"]);
      setAdjustmentRequests(seedAdjustmentRequests);
      setApprovals(seedApprovalQueue);
      setVersions(seedVersions);
      setActiveVersionId("v-2026-07");
      setAuditLog(seedAuditLog);
      setUpload({
        name: "apex-motors-demand-history.csv",
        sizeLabel: "3.4 MB",
        rows: 27_000,
        uploadedAt: "Guided demo · fictional seeded extract",
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
  }, [emptyStages]);

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
      prev ? { ...prev, stats: { ...prev.stats, ...computeDatasetStats(prev.preview, mapping), rows: prev.stats.rows } } : prev,
    );
  }, []);

  const setIssueAction = useCallback((issueId: string, action: IssueResolution) => {
    setIssueActions((prev) => ({ ...prev, [issueId]: action }));
  }, []);

  const confirmRoles = useCallback(() => setRolesConfirmed(true), []);

  /** Issues come from the seeded demo, from the uploaded file, or nowhere. */
  const activeIssues = useMemo<DataIssue[]>(() => {
    if (mode === "demo") return dataIssues;
    if (mode === "user" && dataset) return deriveIssues(dataset.stats);
    return [];
  }, [mode, dataset]);

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
