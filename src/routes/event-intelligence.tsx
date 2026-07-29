import { createFileRoute } from "@tanstack/react-router";
import { EventIntelligence } from "@/components/event-intelligence-page";

export const Route = createFileRoute("/event-intelligence")({
  head: () => ({
    meta: [
      { title: "Event Intelligence — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Event registry with qualification checklist, evidence, double-counting checks, month-by-month impact curves and routing into calendar inputs, governed adjustments or scenarios.",
      },
      { property: "og:title", content: "Event Intelligence — Demand Intelligence Platform" },
      {
        property: "og:description",
        content: "Registry, qualification, double-counting check and routing logic for business events.",
      },
    ],
  }),
  component: EventIntelligence,
});
