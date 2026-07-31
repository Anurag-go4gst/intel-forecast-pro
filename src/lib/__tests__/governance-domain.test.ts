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

  it("applies the event's monthly curve to the baseline, netting to its true effect", () => {
    // ie-0 moves a shutdown Sep -> Oct: curve [0, 0, +82, -38, +14, 0]. The
    // September restoration and November catch-up outweigh the October trough,
    // so the event nets POSITIVE even though its peak-month impact is -38%.
    const line = approvalFromEvent(apexShutdown, -26.2, 14);
    expect(line.baseline).toBe(141_600);
    expect(line.plannerOverride).toBe(0);
    // Net effect is an uplift, not the large cut a peak-scaled figure would give.
    expect(line.eventAdjustment).toBeGreaterThan(0);
    // Months the curve does not touch stay exactly at the flat monthly baseline.
    const perMonth = Math.round(141_600 / 6);
    expect(line.monthly[0]).toBe(perMonth); // Jul, 0% impact
    expect(line.monthly[1]).toBe(perMonth); // Aug, 0% impact
    expect(line.monthly[5]).toBe(perMonth); // Dec, 0% impact
    // The decomposition is internally consistent: months sum to the proposed final.
    const monthlySum = line.monthly.reduce((sum, units) => sum + units, 0);
    expect(monthlySum).toBe(line.baseline + line.eventAdjustment);
    expect(proposedFinal({ ...line, comments: [] })).toBe(monthlySum);
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
