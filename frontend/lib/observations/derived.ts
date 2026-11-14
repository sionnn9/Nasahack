import type {
  BodyArea,
  CheckIn,
  Comparison,
  Metric,
  Observation,
  Quality,
  StatusState,
} from "@/lib/types";
import { compareObservation } from "@/lib/status/compare";
import { gate } from "@/lib/quality/gate";
import { metricMeta } from "@/lib/metrics";

export const areaMetrics: Partial<Record<BodyArea, Metric[]>> = {
  Head: ["mood", "sleep_minutes"],
  Heart: ["heart_rate"],
  Arm: ["bp_systolic", "bp_diastolic"],
  Skin: ["skin_temp"],
  Abdomen: ["glucose"],
  Legs: ["motion"],
  Radiation: [],
};

const metricAreas: Record<Metric, BodyArea> = {
  heart_rate: "Heart",
  skin_temp: "Skin",
  bp_systolic: "Arm",
  bp_diastolic: "Arm",
  glucose: "Abdomen",
  sleep_minutes: "Head",
  mood: "Head",
  stress: "Head",
  rested: "Head",
  connected: "Head",
  motion: "Legs",
};

export function areaForMetric(metric: Metric): BodyArea {
  return metricAreas[metric];
}

export function forCrew(
  observations: Observation[],
  crewId: string,
  metric?: Metric,
): Observation[] {
  return observations
    .filter((entry) => entry.crewId === crewId && (!metric || entry.metric === metric))
    .sort(
      (a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime(),
    );
}

export function latest(observations: Observation[], metric?: Metric): Observation | null {
  const filtered = metric
    ? observations.filter((entry) => entry.metric === metric)
    : [...observations];
  filtered.sort(
    (a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime(),
  );
  return filtered[0] ?? null;
}

export function statusFor(
  observations: Observation[],
  crewId: string,
  metric: Metric,
  now: Date = new Date(),
): Comparison {
  const history = forCrew(observations, crewId, metric);
  const newest = latest(history);
  if (!newest) {
    return {
      state: "no_valid_reading",
      label: "No valid reading",
      detail: "Nothing recorded for this reading yet.",
      comparableCount: 0,
      range: null,
    };
  }
  return compareObservation(newest, history, now);
}

export function statusByArea(
  observations: Observation[],
  crewId: string,
  now: Date = new Date(),
): Partial<Record<BodyArea, StatusState>> {
  const result: Partial<Record<BodyArea, StatusState>> = {};
  for (const [area, metrics] of Object.entries(areaMetrics) as Array<
    [BodyArea, Metric[]]
  >) {
    if (metrics.length === 0) continue;
    const states = metrics.map((metric) => statusFor(observations, crewId, metric, now).state);
    const priority: StatusState[] = [
      "attention",
      "no_valid_reading",
      "insufficient_history",
      "within_range",
      "logged",
    ];
    result[area] = priority.find((state) => states.includes(state)) ?? "insufficient_history";
  }
  return result;
}

export function lastRecordedText(observation: Observation | null): string {
  if (!observation) return "Nothing recorded yet.";
  const meta = metricMeta[observation.metric];
  const time = new Date(observation.observedAt).toLocaleTimeString("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  });
  const value =
    observation.value === null ? "not measured" : `${observation.value} ${meta.unit}`;
  return `Last recorded: ${value}, ${time} UTC. Not a current measurement.`;
}

export function chartPoints(observations: Observation[]) {
  return observations.map((entry) => ({
    value: entry.value,
    at: entry.observedAt,
    lane: entry.lane,
    quality: entry.quality,
  }));
}

export function dailyTrend(observations: Observation[], metric: Metric) {
  const byDay = new Map<string, Observation>();
  for (const entry of observations) {
    if (entry.metric !== metric) continue;
    const day = entry.observedAt.slice(0, 10);
    const existing = byDay.get(day);
    if (!existing || entry.observedAt > existing.observedAt) byDay.set(day, entry);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, entry]) => ({
      value: entry.value,
      at: entry.observedAt,
      lane: entry.lane,
      quality: entry.quality,
    }));
}

let sequence = 0;

export function makeObservation(input: {
  crewId: string;
  metric: Metric;
  value: number | null;
  observedAt: string;
  enteredAt?: string;
  lane: Observation["lane"];
  method: string;
  context: Observation["context"];
  unit?: string;
  artifact?: "motion" | null;
  quality?: Quality;
  environment?: string;
}): Observation {
  const draft: Observation = {
    id: `obs-${Date.now()}-${(sequence += 1)}`,
    crewId: input.crewId,
    metric: input.metric,
    value: input.value,
    unit: input.unit ?? metricMeta[input.metric].unit,
    observedAt: input.observedAt,
    enteredAt: input.enteredAt ?? new Date().toISOString(),
    lane: input.lane,
    method: input.method,
    context: input.context,
    quality: input.quality ?? "ok",
    qualityReason: null,
    environment: input.environment ?? "mars_transit",
    procedureVersion: "demo-procedures-1",
    artifact: input.artifact ?? null,
  };
  const result = gate(draft);
  return { ...draft, quality: result.quality, qualityReason: result.qualityReason };
}

/** Check-in answers become manual observations, one per metric. */
export function observationsFromCheckIn(checkIn: CheckIn): Observation[] {
  const rows: Observation[] = [];
  const push = (
    metric: Metric,
    value: number | null,
    method = "self_report",
    context: Observation["context"] = "unknown",
  ) => {
    if (value === null || Number.isNaN(value)) return;
    rows.push(
      makeObservation({
        crewId: checkIn.crewId,
        metric,
        value,
        observedAt: checkIn.observedAt,
        enteredAt: checkIn.enteredAt,
        lane: "manual",
        method,
        context,
      }),
    );
  };

  push("sleep_minutes", checkIn.sleepMinutes);
  push("mood", checkIn.mood);
  push("stress", checkIn.stress);
  push("rested", checkIn.rested);
  push("connected", checkIn.connected);
  return rows;
}
