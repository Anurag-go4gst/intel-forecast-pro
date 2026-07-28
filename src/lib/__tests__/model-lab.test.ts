import { describe, expect, it } from "vitest";
import { eligibilityFor, modelById, runTournament } from "@/lib/model-lab";

describe("eligibilityFor", () => {
  it("allows the foundation challenger for new items with short history", () => {
    const result = eligibilityFor(modelById("foundation"), "New item", 6);

    expect(result.eligible).toBe(true);
    expect(result.reason).toContain("Zero-shot challenger");
  });

  it("rejects continuous-demand models for intermittent series", () => {
    const result = eligibilityFor(modelById("ets"), "Intermittent", 24);

    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("intermittent methods required");
  });
});

describe("runTournament", () => {
  it("is deterministic for the same series key and options", () => {
    const options = {
      key: "CLT-1048|Apex|North",
      behaviour: "Seasonal" as const,
      historyMonths: 36,
      horizon: 12,
      baseVolume: 1250,
    };

    expect(runTournament(options)).toEqual(runTournament(options));
  });

  it("ranks eligible models and returns a champion", () => {
    const result = runTournament({
      key: "BRK-1180|Kestrel|Pune",
      behaviour: "Customer-schedule-driven",
      historyMonths: 36,
      horizon: 12,
    });

    expect(result.eligibleCount).toBeGreaterThan(0);
    expect(result.champion).not.toBeNull();
    expect(result.champion?.rank).toBe(1);
    expect(result.rows.filter((row) => row.eligible).every((row) => row.rank !== null)).toBe(true);
  });
});
