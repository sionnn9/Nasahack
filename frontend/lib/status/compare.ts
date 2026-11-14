import type { Comparison, Metric, Observation, StatusState } from "@/lib/types";
import { gate } from "@/lib/quality/gate";
import { metricMeta } from "@/lib/metrics";

/** How far from the personal range a value must sit before it is flagged. */
const tolerance: Record<Metric, number> = {
  heart_rate: 6,
  bp_systolic: 8,
  bp_diastolic: 6,
  skin_temp: 0.3,
  glucose: 1.2,
  sleep_minutes: 60,
  mood: 1,
  stress: 1,
  rested: 1,
  connected: 1,
  motion: 0.15,
};

export const MIN_COMPARABLE = 5;
const MAX_COMPARABLE = 7;

export function isComparable(candidate: Observation, observation: Observation): boolean {
  return (
    candidate.metric === observation.metric &&
    candidate.method === observation.method &&
    candidate.context === observation.context &&
    candidate.lane === observation.lane &&
    candidate.id !== observation.id &&
    candidate.quality === "ok" &&
    candidate.value !== null
  );
}

export function comparableHistory(
  observation: Observation,
  history: Observation[],
): Observation[] {
  return history
    .filter((candidate) => isComparable(candidate, observation))
    .sort(
      (a, b) =>
        new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime(),
    )
    .slice(0, MAX_COMPARABLE);
}

export const stateLabels: Record<StatusState, string> = {
  logged: "Logged",
  attention: "Attention suggested",
  no_valid_reading: "No valid reading",
  within_range: "Within your recent range",
  insufficient_history: "Insufficient comparable history",
};

export function compareObservation(
  observation: Observation,
  history: Observation[],
  now: Date = new Date(),
): Comparison {
  const result = gate(observation, now);
  if (!result.accepted) {
    return {
      state: "no_valid_reading",
      label: stateLabels.no_valid_reading,
      detail: result.qualityReason ?? "This reading cannot be used.",
      comparableCount: 0,
      range: null,
    };
  }

  // Replay and synthetic lanes are context, not this person's current status.
  if (observation.lane === "replay" || observation.lane === "synthetic") {
    return {
      state: "logged",
      label: stateLabels.logged,
      detail: "Reference data from another source. Not used as your status.",
      comparableCount: 0,
      range: null,
    };
  }

  const comparable = comparableHistory(observation, history);
  const count = comparable.length;
  if (count < MIN_COMPARABLE) {
    return {
      state: "insufficient_history",
      label: stateLabels.insufficient_history,
      detail: `Needs ${MIN_COMPARABLE} comparable observations. ${count} available.`,
      comparableCount: count,
      range: null,
    };
  }

  const values = comparable.map((entry) => entry.value as number);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const value = observation.value as number;
  const delta = tolerance[observation.metric];
  const within = value >= low - delta && value <= high + delta;
  const meta = metricMeta[observation.metric];

  return {
    state: within ? "within_range" : "attention",
    label: within ? stateLabels.within_range : stateLabels.attention,
    detail: within
      ? `Compared with ${count} of your recent ${meta.label.toLowerCase()} readings.`
      : `Differs from your recent ${meta.label.toLowerCase()} readings. No cause assigned.`,
    comparableCount: count,
    range: { low, high },
  };
}

export type StatusSummary = {
  attention: number;
  noValid: number;
  within: number;
  insufficient: number;
  worst: StatusState;
  urgentSymptoms: string[];
};

export function summariseStatus(
  entries: Array<{ comparison: Comparison; observation?: Observation; urgent?: boolean }>,
): StatusSummary {
  const summary: StatusSummary = {
    attention: 0,
    noValid: 0,
    within: 0,
    insufficient: 0,
    worst: "logged",
    urgentSymptoms: [],
  };

  for (const entry of entries) {
    if (entry.comparison.state === "attention") summary.attention += 1;
    if (entry.comparison.state === "no_valid_reading") summary.noValid += 1;
    if (entry.comparison.state === "within_range") summary.within += 1;
    if (entry.comparison.state === "insufficient_history") summary.insufficient += 1;
    if (entry.comparison.state === "attention") summary.worst = "attention";
  }

  return summary;
}
