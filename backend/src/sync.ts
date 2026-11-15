import type { Observation, Quality } from "./types.js";
import { gate, qualityRank } from "./quality/gate.js";

export type Reconciliation = {
  quality: Quality;
  qualityReason: string | null;
  changed: boolean;
};

/**
 * Run the server gate for manual/live lanes (plausibility + staleness) and
 * plausibility only for replay/synthetic. When the client and server disagree,
 * the stricter flag wins and the reason records the disagreement.
 */
export function reconcileObservation(observation: Observation, now: Date): Reconciliation {
  const result = gate(observation, now, {
    ignoreStaleness: observation.lane === "replay" || observation.lane === "synthetic",
  });

  const clientQuality = observation.quality;
  const clientRank = qualityRank[clientQuality] ?? 0;
  const serverRank = qualityRank[result.quality] ?? 0;

  if (clientQuality === result.quality) {
    return {
      quality: clientQuality,
      qualityReason: observation.qualityReason ?? result.qualityReason,
      changed: false,
    };
  }

  if (serverRank > clientRank) {
    const note =
      clientQuality === "ok"
        ? `Server gate flagged this as ${result.quality}.`
        : `Server gate was stricter (${result.quality}) than the device flag (${clientQuality}).`;
    return {
      quality: result.quality,
      qualityReason: result.qualityReason ? `${result.qualityReason} ${note}` : note,
      changed: true,
    };
  }

  return {
    quality: clientQuality,
    qualityReason: observation.qualityReason
      ? `${observation.qualityReason} Server gate reported ${result.quality}.`
      : `Server gate reported ${result.quality}; the stricter client flag was kept.`,
    changed: false,
  };
}
