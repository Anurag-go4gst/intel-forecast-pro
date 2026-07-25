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

  const publish = useCallback(() => setPublished(true), []);

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
    ],
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used inside PlatformProvider");
  return ctx;
}
