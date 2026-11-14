import type { Metric, Observation } from "@/lib/types";
import { makeObservation } from "@/lib/observations/derived";

/**
 * NASA bed-rest actigraphy is a ground analog, not this crew's data.
 * Durations arrive as `7:44:00` (hours:minutes:seconds) and must not be read
 * as decimal hours. "No Data" stays missing.
 */
export type ReplayRow = {
  participant: string;
  day: number;
  phase: string;
  metric: Metric;
  value: number | null;
  enteredAt: string;
};

const columnMetrics: Array<{ test: RegExp; metric: Metric }> = [
  { test: /sleep/i, metric: "sleep_minutes" },
  { test: /heart|^hr$/i, metric: "heart_rate" },
  { test: /activity|motion/i, metric: "motion" },
  { test: /temp/i, metric: "skin_temp" },
];

export function parseDuration(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || /no\s*data|n\/a|null/i.test(trimmed)) return null;
  const clock = trimmed.match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  if (clock) {
    const hours = Number(clock[1]);
    const minutes = Number(clock[2]);
    const seconds = Number(clock[3] ?? 0);
    return hours * 60 + minutes + seconds / 60;
  }
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : null;
}

function splitCsvLine(line: string): string[] {
  return line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
}

export function parseBedRestCsv(text: string): { rows: ReplayRow[]; skipped: number } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) return { rows: [], skipped: 0 };

  const header = splitCsvLine(lines[0]);
  const find = (pattern: RegExp) => header.findIndex((cell) => pattern.test(cell));
  const subjectIndex = find(/subject|participant|id/i);
  const dayIndex = find(/^day|bed\s*rest\s*day/i);
  const phaseIndex = find(/phase|condition/i);
  const dateIndex = find(/date|timestamp/i);

  const metricColumns = header
    .map((cell, index) => {
      const match = columnMetrics.find((entry) => entry.test.test(cell));
      return match ? { index, metric: match.metric, isDuration: /sleep/i.test(cell) } : null;
    })
    .filter((entry): entry is { index: number; metric: Metric; isDuration: boolean } => !!entry);

  if (metricColumns.length === 0) return { rows: [], skipped: lines.length - 1 };

  const rows: ReplayRow[] = [];
  let skipped = 0;

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const participant = subjectIndex >= 0 ? cells[subjectIndex] : "unknown";
    const day = dayIndex >= 0 ? Number(cells[dayIndex]) : Number.NaN;
    const phase = phaseIndex >= 0 ? cells[phaseIndex] : "unknown";
    if (!participant && !Number.isFinite(day)) {
      skipped += 1;
      continue;
    }
    for (const column of metricColumns) {
      const raw = cells[column.index] ?? "";
      const parsed = column.isDuration
        ? parseDuration(raw)
        : raw.trim() === "" || /no\s*data/i.test(raw)
          ? null
          : Number(raw);
      rows.push({
        participant,
        day: Number.isFinite(day) ? day : 0,
        phase,
        metric: column.metric,
        value: Number.isFinite(parsed as number) ? parsed : null,
        enteredAt:
          dateIndex >= 0 && cells[dateIndex]
            ? new Date(cells[dateIndex]).toISOString()
            : new Date().toISOString(),
      });
    }
  }

  return { rows, skipped };
}

export function replayObservations(
  rows: ReplayRow[],
  crewId: string,
  now: Date = new Date(),
): Observation[] {
  return rows.map((row) =>
    makeObservation({
      crewId,
      metric: row.metric,
      value: row.value,
      observedAt: new Date(now.getTime() - (row.day + 1) * 86_400_000).toISOString(),
      enteredAt: row.enteredAt,
      lane: "replay",
      method: "actigraphy",
      context: "unknown",
      quality: row.value === null ? "not_measured" : "ok",
    }),
  );
}
