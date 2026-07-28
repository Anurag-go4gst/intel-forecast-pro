import { describe, expect, it } from "vitest";
import {
  patternCurve,
  residualImpact,
  routeEvent,
  seedIntelEvents,
  type IntelEvent,
} from "@/lib/event-domain";

const event = (patch: Partial<IntelEvent>): IntelEvent => ({
  ...seedIntelEvents[0],
  id: "test-event",
  name: "Test event",
  ...patch,
});

describe("patternCurve", () => {
  it("creates the expected one-time spike shape", () => {
    expect(patternCurve("One-time spike", 12, 4)).toEqual([0, 12, 0, 0]);
  });

  it("keeps multi-period demand transfer at zero total for the default shape", () => {
    const curve = patternCurve("Multi-period demand transfer", 10, 6);

    expect(curve.reduce((sum, value) => sum + value, 0)).toBe(0);
  });
});

describe("residualImpact", () => {
  it("applies the full impact when the event is not reflected", () => {
    expect(
      residualImpact(event({ expectedImpact: 25, reflection: "Not reflected" })),
    ).toMatchObject({
      expected: 25,
      alreadyReflected: 0,
      residual: 25,
      applied: 25,
    });
  });

  it("blocks application when evidence is unclear", () => {
    expect(residualImpact(event({ expectedImpact: 25, reflection: "Unclear" }))).toMatchObject({
      expected: 25,
      applied: 0,
    });
  });
});

describe("routeEvent", () => {
  it("routes confirmed recurring events to structured model inputs", () => {
    const result = routeEvent(
      event({
        recurrence: "Recurring",
        reliability: "Confirmed document",
        probabilityPct: 90,
        reflection: "Not reflected",
        category: "Operational event",
      }),
    );

    expect(result.outcome).toBe("Structured calendar/model input");
  });

  it("routes conflicting evidence to manual review before other outcomes", () => {
    const result = routeEvent(event({ reflection: "Conflicting", probabilityPct: 90 }));

    expect(result.outcome).toBe("Manual review required");
  });

  it("keeps weak rumours out of the forecast", () => {
    const result = routeEvent(
      event({
        reliability: "Market rumour",
        probabilityPct: 30,
        reflection: "Not reflected",
        sourceChecks: [],
      }),
    );

    expect(result.outcome).toBe("No forecast change");
  });
});
