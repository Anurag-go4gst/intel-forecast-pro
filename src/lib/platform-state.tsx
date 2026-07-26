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

type PlatformContextValue = {
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
};

const PlatformContext = createContext<PlatformContextValue | null>(null);

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${++idCounter}-${Date.now().toString(36)}`;

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [events, setEvents] = useState<DemandEvent[]>(seedEvents);
  const [scenarios, setScenarios] = useState<SavedScenario[]>(seedScenarios);
  const [drivers, setDrivers] = useState<ScenarioDriver>(defaultDrivers);
  const [reviewLines, setReviewLines] = useState<ReviewLine[]>(seedReviewLines);
  const [published, setPublished] = useState(false);
  const [runState, setRunState] = useState<ForecastRunState>("idle");
  const [runProgress, setRunProgress] = useState(0);
  const [selectedModelBySku, setSelectedModelBySku] = useState<Record<string, string>>({});
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

  const [upload, setUpload] = useState<UploadedFile | null>(null);
  const [mapping, setMappingState] = useState<Record<string, string>>({});
  const [validationRun, setValidationRun] = useState(false);
  const [transformations, setTransformations] =
    useState<TransformationEntry[]>(seedTransformations);

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


  const [intelEvents, setIntelEvents] = useState<IntelEvent[]>(seedIntelEvents);
  const [scenarioSpecs, setScenarioSpecs] = useState<ScenarioSpec[]>(seedScenarioSpecs);
  const [compareIds, setCompareIds] = useState<string[]>(["ss-1", "ss-2"]);
  const [adjustmentRequests, setAdjustmentRequests] =
    useState<AdjustmentRequest[]>(seedAdjustmentRequests);

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

  const [approvals, setApprovals] = useState<ApprovalItem[]>(seedApprovalQueue);
  const [versions, setVersions] = useState<ForecastVersionRecord[]>(seedVersions);
  const [activeVersionId, setActiveVersionId] = useState("v-2026-07");
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(seedAuditLog);

  const logAudit = useCallback((entry: Omit<AuditEntry, "id" | "at" | "date">) => {
    setAuditLog((prev) => [
      { ...entry, id: nextId("al"), at: "Today (prototype session)", date: "2026-07-26" },
      ...prev,
    ]);
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

  const value = useMemo<PlatformContextValue>(
    () => ({
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
    }),
    [
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
    ],
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used inside PlatformProvider");
  return ctx;
}
