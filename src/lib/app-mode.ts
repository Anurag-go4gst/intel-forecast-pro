/**
 * Operating-mode architecture.
 *
 * The platform runs in exactly one of three modes and their data must never
 * mix:
 *
 *   empty — no project exists. Nothing is shown except Create Project.
 *   demo  — the Apex Motors fictional seeded dataset is loaded explicitly.
 *   user  — a real file was uploaded; every statistic below is computed from
 *           that file, never seeded.
 */
import type { DataIssue } from "@/lib/workflow";

export type AppMode = "empty" | "demo" | "user";

// ------------------------------------------------------------------ project

export type ProjectConfig = {
  name: string;
  industry: string;
  grain: string;
  frequency: "Monthly" | "Weekly" | "Daily";
  horizon: number;
  owner: string;
  createdAt: string;
  /** Which mode created this project. */
  source: Exclude<AppMode, "empty">;
};

export const industryOptions = [
  "Auto ancillary manufacturing",
  "Industrial equipment",
  "Consumer durables",
  "Pharmaceutical distribution",
  "Food and beverage",
  "Other",
];

export const grainOptions = [
  "SKU × Customer × Plant",
  "SKU × Plant",
  "SKU × Customer",
  "SKU only",
];

export const frequencyOptions: ProjectConfig["frequency"][] = ["Monthly", "Weekly", "Daily"];

export const emptyProjectDraft = {
  name: "",
  industry: industryOptions[0],
  grain: grainOptions[0],
  frequency: "Monthly" as const,
  horizon: 12,
  owner: "",
};

// ------------------------------------------------------------------ parsing

export type DatasetRecord = Record<string, string>;

/** Minimal RFC-4180-ish delimited parser (comma, semicolon or tab). */
export function parseDelimited(text: string): { columns: string[]; records: DatasetRecord[] } {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!clean) return { columns: [], records: [] };
  const lines = clean.split("\n").filter((l) => l.trim().length > 0);
  const delimiter = pickDelimiter(lines[0]);
  const columns = splitLine(lines[0], delimiter).map((c) => c.trim());
  const records = lines.slice(1).map((line) => {
    const cells = splitLine(line, delimiter);
    const record: DatasetRecord = {};
    columns.forEach((col, i) => {
      record[col] = (cells[i] ?? "").trim();
    });
    return record;
  });
  return { columns, records };
}

function pickDelimiter(header: string) {
  const counts: Array<[string, number]> = [
    [",", (header.match(/,/g) ?? []).length],
    [";", (header.match(/;/g) ?? []).length],
    ["\t", (header.match(/\t/g) ?? []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

function splitLine(line: string, delimiter: string) {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else quoted = !quoted;
      continue;
    }
    if (!quoted && ch === delimiter) {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}

// -------------------------------------------------------------- computation

export type DatasetStats = {
  rows: number;
  skus: number;
  customers: number;
  plants: number;
  series: number;
  earliest: string | null;
  latest: string | null;
  periods: number;
  frequency: "Monthly" | "Weekly" | "Daily" | "Irregular" | "Unknown";
  missingPeriods: number;
  duplicateRows: number;
  invalidRows: number;
  shortHistorySeries: number;
  stockoutSeries: number;
  negativeRows: number;
  unparseableDates: number;
  blankQuantities: number;
};

export const emptyStats: DatasetStats = {
  rows: 0,
  skus: 0,
  customers: 0,
  plants: 0,
  series: 0,
  earliest: null,
  latest: null,
  periods: 0,
  frequency: "Unknown",
  missingPeriods: 0,
  duplicateRows: 0,
  invalidRows: 0,
  shortHistorySeries: 0,
  stockoutSeries: 0,
  negativeRows: 0,
  unparseableDates: 0,
  blankQuantities: 0,
};

export type StatsMapping = {
  date?: string;
  sku?: string;
  customer?: string;
  plant?: string;
  quantity?: string;
  stockout?: string;
};

/** Parses dd/mm/yyyy, yyyy-mm-dd and yyyy-mm. Returns null when impossible. */
export function parseDate(raw: string): Date | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(value);
  if (match) {
    y = Number(match[1]);
    m = Number(match[2]);
    d = Number(match[3] ?? 1);
  } else {
    match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value);
    if (!match) return null;
    d = Number(match[1]);
    m = Number(match[2]);
    y = Number(match[3]);
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return date;
}

const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export function computeDatasetStats(records: DatasetRecord[], mapping: StatsMapping): DatasetStats {
  const stats: DatasetStats = { ...emptyStats, rows: records.length };
  if (records.length === 0) return stats;

  const dateCol = mapping.date;
  const skus = new Set<string>();
  const customers = new Set<string>();
  const plants = new Set<string>();
  const seriesMonths = new Map<string, Set<string>>();
  const seriesStockout = new Set<string>();
  const rowKeys = new Set<string>();
  const allDates: Date[] = [];
  const dayGaps: number[] = [];

  for (const record of records) {
    const sku = mapping.sku ? (record[mapping.sku] ?? "") : "";
    const customer = mapping.customer ? (record[mapping.customer] ?? "") : "";
    const plant = mapping.plant ? (record[mapping.plant] ?? "") : "";
    const rawDate = dateCol ? (record[dateCol] ?? "") : "";
    const rawQty = mapping.quantity ? (record[mapping.quantity] ?? "") : "";
    const date = parseDate(rawDate);

    if (sku) skus.add(sku);
    if (customer) customers.add(customer);
    if (plant) plants.add(plant);

    let invalid = false;
    if (dateCol && !date) {
      stats.unparseableDates++;
      invalid = true;
    }
    if (mapping.quantity) {
      if (rawQty === "") {
        stats.blankQuantities++;
        invalid = true;
      } else if (Number.isNaN(Number(rawQty))) {
        invalid = true;
      } else if (Number(rawQty) < 0) {
        stats.negativeRows++;
      }
    }
    if (!sku && mapping.sku) invalid = true;
    if (invalid) stats.invalidRows++;

    const seriesKey = [sku, customer, plant].filter(Boolean).join("|");
    const rowKey = `${seriesKey}@${rawDate}`;
    if (rowKeys.has(rowKey)) stats.duplicateRows++;
    else rowKeys.add(rowKey);

    if (date) {
      allDates.push(date);
      if (seriesKey) {
        const set = seriesMonths.get(seriesKey) ?? new Set<string>();
        set.add(monthKey(date));
        seriesMonths.set(seriesKey, set);
      }
    }
    if (mapping.stockout) {
      const flag = (record[mapping.stockout] ?? "").toLowerCase();
      if (flag === "y" || flag === "yes" || flag === "true" || flag === "1") {
        if (seriesKey) seriesStockout.add(seriesKey);
      }
    }
  }

  stats.skus = skus.size;
  stats.customers = customers.size;
  stats.plants = plants.size;
  stats.series = seriesMonths.size || (skus.size ? skus.size : 0);
  stats.stockoutSeries = seriesStockout.size;

  if (allDates.length) {
    allDates.sort((a, b) => a.getTime() - b.getTime());
    stats.earliest = allDates[0].toISOString().slice(0, 10);
    stats.latest = allDates[allDates.length - 1].toISOString().slice(0, 10);
    const unique = Array.from(new Set(allDates.map((d) => d.toISOString().slice(0, 10)))).sort();
    for (let i = 1; i < unique.length; i++) {
      dayGaps.push(
        (Date.parse(unique[i]) - Date.parse(unique[i - 1])) / 86_400_000,
      );
    }
    stats.frequency = detectFrequency(dayGaps);
    const months = new Set(allDates.map(monthKey));
    stats.periods =
      stats.frequency === "Monthly" || stats.frequency === "Unknown"
        ? months.size
        : unique.length;
  }

  // Missing periods and short-history series, per series.
  const expectedPeriods = expectedMonthSpan(stats.earliest, stats.latest);
  for (const [, months] of seriesMonths) {
    const sorted = Array.from(months).sort();
    if (sorted.length) {
      const span = expectedMonthSpan(`${sorted[0]}-01`, `${sorted[sorted.length - 1]}-01`);
      stats.missingPeriods += Math.max(0, span - sorted.length);
    }
    if (sorted.length < 18) stats.shortHistorySeries++;
  }
  if (expectedPeriods && stats.frequency === "Monthly") {
    stats.periods = Math.max(stats.periods, 0);
  }

  return stats;
}

function detectFrequency(dayGaps: number[]): DatasetStats["frequency"] {
  if (dayGaps.length === 0) return "Unknown";
  const median = [...dayGaps].sort((a, b) => a - b)[Math.floor(dayGaps.length / 2)];
  if (median >= 26 && median <= 32) return "Monthly";
  if (median >= 6 && median <= 8) return "Weekly";
  if (median >= 0.5 && median <= 1.5) return "Daily";
  return "Irregular";
}

function expectedMonthSpan(from: string | null, to: string | null) {
  if (!from || !to) return 0;
  const a = new Date(from);
  const b = new Date(to);
  return (
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth()) + 1
  );
}

// ------------------------------------------------------------ derived issues

/** Data-quality issues computed from the uploaded file — never seeded. */
export function deriveIssues(stats: DatasetStats): DataIssue[] {
  const issues: DataIssue[] = [];
  const push = (issue: DataIssue) => issues.push(issue);

  if (stats.unparseableDates > 0) {
    push({
      id: "u-date",
      severity: "Blocking",
      title: "Unparseable dates",
      scope: `${stats.unparseableDates} rows in the uploaded file`,
      records: stats.unparseableDates,
      series: 0,
      detail: `${stats.unparseableDates} rows contain a date that cannot be placed in a time bucket.`,
      consequence:
        "Rows without a valid period silently disappear from history and the model learns a false demand drop.",
      suggestion: "Re-parse using the source system calendar or exclude the affected records.",
    });
  }
  if (stats.duplicateRows > 0) {
    push({
      id: "u-dupe",
      severity: "Blocking",
      title: "Duplicate demand records",
      scope: `${stats.duplicateRows} repeated natural keys`,
      records: stats.duplicateRows,
      series: 0,
      detail: `${stats.duplicateRows} rows repeat the same date and series key.`,
      consequence: "Duplicated periods inflate demand level and every accuracy metric downstream.",
      suggestion: "De-duplicate on the natural key, keeping the latest extract timestamp.",
    });
  }
  if (stats.negativeRows > 0) {
    push({
      id: "u-neg",
      severity: "Blocking",
      title: "Negative demand quantities",
      scope: `${stats.negativeRows} rows`,
      records: stats.negativeRows,
      series: 0,
      detail: `${stats.negativeRows} rows carry a negative quantity.`,
      consequence: "Negative values distort seasonality and can produce negative forecasts.",
      suggestion: "Net credit notes against the original period and floor the result at zero.",
    });
  }
  if (stats.missingPeriods > 0) {
    push({
      id: "u-missing",
      severity: "Important",
      title: "Missing periods",
      scope: `${stats.missingPeriods} gaps inside series history`,
      records: stats.missingPeriods,
      series: 0,
      detail: `${stats.missingPeriods} period buckets are absent between the first and last observation of a series.`,
      consequence: "Gaps break seasonality detection at lag 12.",
      suggestion: "Zero-fill only where the customer relationship was active.",
    });
  }
  if (stats.stockoutSeries > 0) {
    push({
      id: "u-stockout",
      severity: "Important",
      title: "Stockout-distorted series",
      scope: `${stats.stockoutSeries} series carry stockout flags`,
      records: 0,
      series: stats.stockoutSeries,
      detail: `${stats.stockoutSeries} series contain periods flagged as stockout.`,
      consequence: "The model learns the constrained shipment level and under-forecasts real demand.",
      suggestion: "Add recorded lost demand back to the censored periods.",
    });
  }
  if (stats.blankQuantities > 0) {
    push({
      id: "u-blank",
      severity: "Warning",
      title: "Blank quantities",
      scope: `${stats.blankQuantities} rows`,
      records: stats.blankQuantities,
      series: 0,
      detail: `${stats.blankQuantities} rows have no quantity value.`,
      consequence: "A blank is not a zero. Treating it as zero teaches the model demand stopped.",
      suggestion: "Confirm whether the period was genuinely zero or simply not extracted.",
    });
  }
  if (stats.shortHistorySeries > 0) {
    push({
      id: "u-short",
      severity: "Warning",
      title: "Series with insufficient history",
      scope: `${stats.shortHistorySeries} series below 18 periods`,
      records: 0,
      series: stats.shortHistorySeries,
      detail: `${stats.shortHistorySeries} series do not yet have two full seasonal cycles.`,
      consequence: "Seasonal models cannot be validated for these series.",
      suggestion: "Route to the short-history model set and review manually each cycle.",
    });
  }
  if (stats.customers === 0) {
    push({
      id: "u-nocust",
      severity: "Informational",
      title: "Customer dimension not supplied",
      scope: "Whole dataset",
      records: 0,
      series: 0,
      detail: "No customer column was mapped, so series are keyed without a customer.",
      consequence: "No forecasting impact; customer-level accuracy reporting is unavailable.",
      suggestion: "Map the customer column if customer-level governance is required.",
    });
  }

  return issues;
}

/** Quality score 0–100 derived from unresolved issues against the row count. */
export function qualityScore(issues: DataIssue[], resolved: Record<string, unknown>) {
  const weight = { Blocking: 18, Important: 9, Warning: 4, Informational: 1 } as const;
  const penalty = issues
    .filter((i) => !resolved[i.id])
    .reduce((sum, i) => sum + weight[i.severity], 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}
