import {
  Bot,
  CalendarClock,
  ClipboardCheck,
  DatabaseZap,
  FlaskConical,
  FolderPlus,
  Gauge,
  LayoutDashboard,
  LineChart,
  ScrollText,
  SlidersHorizontal,
  SplitSquareHorizontal,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type NavGroup =
  | "Prepare data"
  | "Build baseline"
  | "Apply judgement"
  | "Govern & monitor"
  | "Support";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  group: NavGroup;
  description: string;
  /** Workflow steps covered by this screen, if any. */
  steps?: string;
  search?: Record<string, string>;
};

/**
 * Navigation follows the authoritative forecasting workflow: every step in the
 * lifecycle appears in order, and screens that support the workflow without
 * being part of the sequence are grouped separately.
 */
export const navItems: NavItem[] = [
  {
    to: "/project",
    label: "Forecasting Project",
    icon: FolderPlus,
    group: "Prepare data",
    steps: "1",
    description: "Define granularity, bucket and horizon for the cycle",
  },
  {
    to: "/data-readiness",
    label: "Data Upload & Readiness",
    icon: DatabaseZap,
    group: "Prepare data",
    steps: "2–4",
    description: "Upload, map signals, resolve issues, certify the dataset",
  },
  {
    to: "/validation-setup",
    label: "Validation Setup",
    icon: SplitSquareHorizontal,
    group: "Build baseline",
    steps: "5",
    description: "Chronological training, validation and holdout periods",
  },
  {
    to: "/model-lab",
    label: "Model Lab",
    icon: FlaskConical,
    group: "Build baseline",
    steps: "6–7",
    description: "Run the tournament and select the champion model",
  },
  {
    to: "/baseline",
    label: "Baseline Forecast",
    icon: TrendingUp,
    group: "Build baseline",
    steps: "8",
    description: "Statistical baseline before any business event",
  },
  {
    to: "/event-intelligence",
    label: "Event Intelligence",
    icon: CalendarClock,
    group: "Apply judgement",
    steps: "9",
    description: "Qualify events and apply residual impact only",
  },
  {
    to: "/what-if",
    label: "What-if Scenarios",
    icon: SlidersHorizontal,
    group: "Apply judgement",
    steps: "10",
    description: "Simulation only — never changes the official forecast",
  },
  {
    to: "/forecast-review",
    label: "Forecast Review & Approval",
    icon: ClipboardCheck,
    group: "Govern & monitor",
    steps: "11–12",
    description: "Bridge, approval queue, versions and publication",
  },
  {
    to: "/performance",
    label: "Performance Monitoring",
    icon: Gauge,
    group: "Govern & monitor",
    steps: "13",
    description: "Forecast value added of every layer versus actuals",
  },
  {
    to: "/",
    label: "Executive Overview",
    icon: LayoutDashboard,
    group: "Support",
    description: "Portfolio summary and the guide",
  },
  {
    to: "/forecast-workspace",
    label: "Forecast Workspace",
    icon: LineChart,
    group: "Support",
    description: "Series-level detail for any SKU-customer-plant",
  },
  {
    to: "/audit-log",
    label: "Audit Log",
    icon: ScrollText,
    group: "Support",
    description: "Traceable record of every planning action",
  },
  {
    to: "/assistant",
    label: "AI Assistant",
    icon: Bot,
    group: "Support",
    description: "Grounded answers about the current forecast",
  },
];

export const navGroups: NavGroup[] = [
  "Prepare data",
  "Build baseline",
  "Apply judgement",
  "Govern & monitor",
  "Support",
];
