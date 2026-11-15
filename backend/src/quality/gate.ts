import { rules } from "./rules.js";
import type { Metric, Observation, Quality } from "../types.js";

/**
 * Quality gate. Copied from frontend/lib/quality/gate.ts, unchanged in logic.
 * Pure: same inputs, same output.
 *
 * Plausibility ranges are sensor-sanity limits from the demo rules, never
 * clinical limits. A flagged observation stays in the log but must not enter
 * charts, baselines or comparisons.
 */
export type GateResult = {
  quality: Quality;
  qualityReason: string | null;
  accepted: boolean;
};

export const STALE_AFTER_MS = 60 * 60 * 1000;

const ranges: Partial<Record<Metric, { low: number; high: number }>> = {};
for (const rule of rules) {
  ranges[rule.metric as Metric] = { low: rule.low, high: rule.high };
}
for (const metric of ["stress", "rested", "connected"] as Metric[]) {
  ranges[metric] = ranges.mood;
}

export function plausibilityRange(metric: Metric) {
  return ranges[metric] ?? null;
}

const plain: Record<Quality, string> = {
  ok: "Sensor reported a usable value.",
  no_contact: "The sensor was not touching the skin, so the value is not usable.",
  stale: "This value is older than 60 minutes. It is history, not a current reading.",
  out_of_range: "The value is outside the plausible range for this sensor. Repeat the measurement.",
  motion: "Movement during the measurement made this value unreliable.",
  not_measured: "Nothing was measured for this reading.",
};

export function gate(
  observation: Observation,
  now: Date = new Date(),
  options: { ignoreStaleness?: boolean } = {},
): GateResult {
  const rejected = (quality: Quality, reason?: string): GateResult => ({
    quality,
    qualityReason: reason ?? plain[quality],
    accepted: false,
  });

  if (observation.quality === "not_measured" || observation.value === null) {
    return rejected("not_measured");
  }

  if (observation.artifact === "motion") {
    return rejected("motion");
  }

  if (observation.quality === "no_contact") {
    return rejected("no_contact");
  }

  const range = plausibilityRange(observation.metric);
  if (range && (observation.value < range.low || observation.value > range.high)) {
    return rejected(
      "out_of_range",
      `Value is outside the plausible sensor range (${range.low}–${range.high}). Repeat the measurement.`,
    );
  }

  // Staleness applies only to manual and live lanes. Replay and synthetic data
  // are historical by definition, so they are never "stale".
  if (
    !options.ignoreStaleness &&
    (observation.lane === "manual" || observation.lane === "live")
  ) {
    const observed = new Date(observation.observedAt).getTime();
    if (Number.isFinite(observed) && now.getTime() - observed > STALE_AFTER_MS) {
      return {
        quality: "stale",
        qualityReason: plain.stale,
        accepted: false,
      };
    }
  }

  return { quality: "ok", qualityReason: null, accepted: true };
}

export function isLateEntry(observation: Observation): boolean {
  if (observation.lane !== "manual") return false;
  const observed = new Date(observation.observedAt).getTime();
  const entered = new Date(observation.enteredAt).getTime();
  if (!Number.isFinite(observed) || !Number.isFinite(entered)) return false;
  return entered - observed > 5 * 60 * 1000;
}

/** 0 = usable, higher = stricter, so a disagreement keeps the stricter flag. */
export const qualityRank: Record<Quality, number> = {
  ok: 0,
  stale: 1,
  motion: 2,
  no_contact: 3,
  out_of_range: 4,
  not_measured: 5,
};
