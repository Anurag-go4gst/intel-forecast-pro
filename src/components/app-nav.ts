import {
  Bot,
  CalendarClock,
  ClipboardCheck,
  DatabaseZap,
  GitCompareArrows,
  Gauge,
  LayoutDashboard,
  LineChart,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  group: "Plan" | "Analyse" | "Govern";
  description: string;
};

export const navItems: NavItem[] = [
  {
    to: "/",
    label: "Executive Overview",
    icon: LayoutDashboard,
    group: "Plan",
    description: "Demand signal, accuracy and risk at a glance",
  },
  {
    to: "/data-readiness",
    label: "Data Readiness",
    icon: DatabaseZap,
    group: "Plan",
    description: "Upload, validate and certify demand inputs",
  },
  {
    to: "/forecast-workspace",
    label: "Forecast Workspace",
    icon: LineChart,
    group: "Plan",
    description: "Generate and adjust the baseline forecast",
  },
  {
    to: "/model-comparison",
    label: "Model Comparison",
    icon: GitCompareArrows,
    group: "Analyse",
    description: "Compare model fit and select per combination",
  },
  {
    to: "/event-intelligence",
    label: "Event Intelligence",
    icon: CalendarClock,
    group: "Analyse",
    description: "Capture future events absent from history",
  },
  {
    to: "/what-if",
    label: "What-if Scenarios",
    icon: SlidersHorizontal,
    group: "Analyse",
    description: "Simulate drivers without touching the plan",
  },
  {
    to: "/forecast-review",
    label: "Forecast Review",
    icon: ClipboardCheck,
    group: "Govern",
    description: "Consensus, approval and publication",
  },
  {
    to: "/performance",
    label: "Performance Monitoring",
    icon: Gauge,
    group: "Govern",
    description: "Accuracy, bias, stockout and excess risk",
  },
  {
    to: "/assistant",
    label: "AI Assistant",
    icon: Bot,
    group: "Govern",
    description: "Ask questions about the current forecast",
  },
];

export const navGroups: Array<NavItem["group"]> = ["Plan", "Analyse", "Govern"];
