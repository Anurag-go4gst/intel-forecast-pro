import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  CircleAlert,
  FileSpreadsheet,
  OctagonAlert,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { useState } from "react";
import { KpiTile, Panel, PageHeading, PrototypeNote, StatusPill } from "@/components/primitives";
import { dataSources, formatNumber, validationChecks } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/data-readiness")({
  head: () => ({
    meta: [
      { title: "Data Readiness — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Upload, validate and certify historical demand, customer schedules, inventory and master data before forecast generation.",
      },
      { property: "og:title", content: "Data Readiness — Demand Intelligence Platform" },
      {
        property: "og:description",
        content: "Validation, completeness and certification of demand planning inputs.",
      },
    ],
  }),
  component: DataReadiness;
});

function DataReadiness() {
  return null;
}
