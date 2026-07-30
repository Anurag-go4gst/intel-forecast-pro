// Dependency-free client-side export helpers. CSV is used for the "Excel"
// download because every version of Excel opens a UTF-8 CSV without a
// file-format warning — no SheetJS/xlsx dependency is pulled in.

export type Cell = string | number | null | undefined;

function escapeCsv(value: Cell): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) lines.push(row.map(escapeCsv).join(","));
  // Prepend a BOM so Excel reads UTF-8 (₹, en-dashes) correctly.
  return "﻿" + lines.join("\r\n");
}

export function downloadFile(filename: string, content: string, mime: string) {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Downloads a table as an Excel-readable CSV file. */
export function downloadCsv(filename: string, headers: string[], rows: Cell[][]) {
  downloadFile(filename, toCsv(headers, rows), "text/csv;charset=utf-8;");
}
