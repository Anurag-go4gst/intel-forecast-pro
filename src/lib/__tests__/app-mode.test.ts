import { describe, expect, it } from "vitest";
import { computeDatasetStats, parseDate, parseDelimited } from "@/lib/app-mode";

describe("parseDelimited", () => {
  it("parses quoted delimited rows and strips the BOM", () => {
    const parsed = parseDelimited('\uFEFFsku,customer,qty\n"CLT,1048",Apex,12\nBRK-1,Kestrel,8');

    expect(parsed.columns).toEqual(["sku", "customer", "qty"]);
    expect(parsed.records).toEqual([
      { sku: "CLT,1048", customer: "Apex", qty: "12" },
      { sku: "BRK-1", customer: "Kestrel", qty: "8" },
    ]);
  });

  it("auto-detects tab-delimited files", () => {
    const parsed = parseDelimited("sku\tcustomer\tqty\nA\tB\t10");

    expect(parsed.columns).toEqual(["sku", "customer", "qty"]);
    expect(parsed.records[0]).toEqual({ sku: "A", customer: "B", qty: "10" });
  });
});

describe("parseDate", () => {
  it("parses supported ISO and day-first date formats", () => {
    expect(parseDate("2026-04")?.toISOString().slice(0, 10)).toBe("2026-04-01");
    expect(parseDate("2026-04-13")?.toISOString().slice(0, 10)).toBe("2026-04-13");
    expect(parseDate("13/04/2026")?.toISOString().slice(0, 10)).toBe("2026-04-13");
  });

  it("rejects impossible dates", () => {
    expect(parseDate("2026-02-30")).toBeNull();
    expect(parseDate("04/13/2026")).toBeNull();
    expect(parseDate("not a date")).toBeNull();
  });
});

describe("computeDatasetStats", () => {
  it("computes portfolio stats from uploaded rows", () => {
    const records = [
      { period: "2026-01-01", sku: "A", customer: "C1", plant: "P1", qty: "10", stockout: "no" },
      { period: "2026-02-01", sku: "A", customer: "C1", plant: "P1", qty: "12", stockout: "yes" },
      { period: "2026-04-01", sku: "A", customer: "C1", plant: "P1", qty: "-1", stockout: "no" },
      { period: "2026-04-01", sku: "A", customer: "C1", plant: "P1", qty: "-1", stockout: "no" },
      { period: "bad", sku: "B", customer: "C2", plant: "P2", qty: "", stockout: "0" },
    ];

    const stats = computeDatasetStats(records, {
      date: "period",
      sku: "sku",
      customer: "customer",
      plant: "plant",
      quantity: "qty",
      stockout: "stockout",
    });

    expect(stats.rows).toBe(5);
    expect(stats.skus).toBe(2);
    expect(stats.customers).toBe(2);
    expect(stats.plants).toBe(2);
    expect(stats.series).toBe(1);
    expect(stats.earliest).toBe("2026-01-01");
    expect(stats.latest).toBe("2026-04-01");
    expect(stats.frequency).toBe("Irregular");
    expect(stats.periods).toBe(3);
    expect(stats.missingPeriods).toBe(1);
    expect(stats.duplicateRows).toBe(1);
    expect(stats.negativeRows).toBe(2);
    expect(stats.unparseableDates).toBe(1);
    expect(stats.blankQuantities).toBe(1);
    expect(stats.invalidRows).toBe(1);
    expect(stats.stockoutSeries).toBe(1);
    expect(stats.shortHistorySeries).toBe(1);
  });
});
