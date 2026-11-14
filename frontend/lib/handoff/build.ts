import type {
  CheckIn,
  Encounter,
  Handoff,
  Metric,
  Observation,
} from "@/lib/types";
import { metricMeta } from "@/lib/metrics";
import { statusFor } from "@/lib/observations/derived";

const privateMetrics: Metric[] = ["mood", "stress", "rested", "connected"];

export const publicMetrics: Metric[] = [
  "heart_rate",
  "bp_systolic",
  "bp_diastolic",
  "skin_temp",
  "glucose",
  "sleep_minutes",
  "motion",
];

export function buildHandoff(input: {
  crewId: string;
  encounter: Encounter | null;
  checkIn: CheckIn | null;
  observations: Observation[];
  includePrivate: boolean;
  notes: string;
  now?: Date;
}): Handoff {
  const now = input.now ?? new Date();
  const crewObservations = input.observations.filter(
    (entry) => entry.crewId === input.crewId,
  );
  const allowed = input.includePrivate
    ? [...publicMetrics, ...privateMetrics]
    : publicMetrics;

  const recent = crewObservations.filter((entry) => {
    const time = new Date(entry.observedAt).getTime();
    return (
      allowed.includes(entry.metric) &&
      Number.isFinite(time) &&
      now.getTime() - time <= 72 * 60 * 60 * 1000
    );
  });

  const trends = publicMetrics
    .filter((metric) => allowed.includes(metric))
    .map((metric) => {
      const comparison = statusFor(crewObservations, input.crewId, metric, now);
      if (comparison.comparableCount === 0) return null;
      return {
        metric,
        text: `${metricMeta[metric].label}: ${comparison.label.toLowerCase()}. ${comparison.detail}`,
      };
    })
    .filter((entry): entry is { metric: Metric; text: string } => entry !== null);

  return {
    id: `handoff-${input.crewId}-${Date.now()}`,
    crewId: input.crewId,
    createdAt: now.toISOString(),
    encounterId: input.encounter?.id ?? null,
    symptoms: input.encounter?.symptoms ?? input.checkIn?.symptoms ?? [],
    observations: recent,
    trends,
    actions: input.encounter?.actions ?? [],
    unknowns: input.encounter?.unknowns ?? [],
    includePrivate: input.includePrivate,
    notes: input.notes,
    recipients: [
      "Flight surgeon, Earth",
      "Crew medical officer, on board",
    ],
  };
}

/** Summary derived from the data — never static prose. */
export function summariseHandoff(handoff: Handoff): string[] {
  const lines: string[] = [];
  lines.push(
    `${handoff.observations.length} observations in the last 72 hours across ${new Set(
      handoff.observations.map((entry) => entry.metric),
    ).size} readings.`,
  );
  if (handoff.symptoms.length > 0) {
    lines.push(
      `Reported symptoms: ${handoff.symptoms
        .map((symptom) => `${symptom.name} (${symptom.onset}, ${symptom.trend})`)
        .join("; ")}.`,
    );
  } else {
    lines.push("No symptoms were reported in this packet.");
  }
  if (handoff.unknowns.length > 0) {
    lines.push(`${handoff.unknowns.length} items could not be assessed or measured.`);
  }
  const unreviewed = handoff.observations.filter((entry) => entry.quality !== "ok");
  if (unreviewed.length > 0) {
    lines.push(
      `${unreviewed.length} readings carry a quality flag and are not used in comparisons.`,
    );
  }
  if (handoff.trends.length > 0) {
    lines.push(handoff.trends[0].text);
  }
  lines.push("No cause is assigned and no diagnosis is included in this packet.");
  return lines;
}
