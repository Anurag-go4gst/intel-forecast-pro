import { describe, expect, it } from "vitest";
import { seedIntelEvents, seedScenarioSpecs } from "@/lib/event-domain";
import {
  approvalFromEvent,
  approvalFromScenario,
  changePct,
  proposedFinal,
} from "@/lib/governance-domain";

describe("approvalFromEvent", () => {
  const apexShutdown = seedIntelEvents.find((event) => event.id === "ie-0")!;

  it("turns an applied event into a queue line keyed by the event id", () => {
    const line = approvalFromEvent(apexShutdown, -26.2, 14);
    expect(line.id).toBe("aq-event-ie-0");
    expect(line.origin).toBe("Event routing");
    expect(line.status).toBe("Awaiting approval");
    expect(line.sku).toBe("CLT-1048");
    // Confirmed document at 97% probability qualifies as High confidence.
    expect(line.confidence).toBe("High");
  });

  it("applies the residual percentage to the scope baseline as an event adjustment", () => {
    const line = approvalFromEvent(apexShutdown, -26.2, 14);
    // CLT-1048 seeds a 141,600 baseline; -26.2% residual ≈ -37,099 units.
    expect(line.baseline).toBe(141_600);
    expect(line.eventAdjustment).toBe(Math.round((141_600 * -26.2) / 100));
    expect(line.plannerOverride).toBe(0);
    expect(proposedFinal({ ...line, comments: [] })).toBe(line.baseline + line.eventAdjustment);
  });

  it("records the double-counting evidence only when some impact was already reflected", () => {
    expect(approvalFromEvent(apexShutdown, -26.2, 14).evidence).toHaveLength(2);
    expect(approvalFromEvent(apexShutdown, -26.2, 0).evidence).toHaveLength(1);
  });
});

describe("approvalFromScenario", () => {
  const scenario = seedScenarioSpecs[0];

  it("turns a promoted scenario into a Low-confidence planner override line", () => {
    const line = approvalFromScenario(scenario, 9);
    expect(line.id).toBe(`aq-scenario-${scenario.id}`);
    expect(line.origin).toBe("Scenario promotion");
    expect(line.confidence).toBe("Low");
    expect(line.eventAdjustment).toBe(0);
    expect(line.plannerOverride).toBe(Math.round((line.baseline * 9) / 100));
    expect(changePct({ ...line, comments: [] })).toBeGreaterThan(0);
  });
});
