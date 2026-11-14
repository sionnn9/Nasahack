import type {
  CheckIn,
  Concern,
  HazardTag,
  Metric,
  Observation,
} from "@/lib/types";
import { gate } from "@/lib/quality/gate";
import { comparableHistory } from "@/lib/status/compare";
import { metricMeta } from "@/lib/metrics";

const WINDOW_HOURS = 72;

const hazardsForMetric: Partial<Record<Metric, HazardTag[]>> = {
  heart_rate: ["gravity", "distance"],
  bp_systolic: ["gravity", "distance"],
  bp_diastolic: ["gravity", "distance"],
  sleep_minutes: ["isolation", "environment"],
  mood: ["isolation"],
  stress: ["isolation", "environment"],
  rested: ["isolation", "environment"],
  connected: ["isolation", "distance"],
  skin_temp: ["environment", "radiation"],
  glucose: ["distance"],
  motion: ["gravity"],
};

function withinWindow(iso: string, now: Date): boolean {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return false;
  return now.getTime() - time <= WINDOW_HOURS * 60 * 60 * 1000;
}

/** A value is flagged only against this person's own comparable history. */
function differsFromOwnRange(
  observation: Observation,
  history: Observation[],
  now: Date,
): boolean {
  // Historical trend work asks "was this value usable when recorded?", not
  // "is it a current reading?", so staleness is ignored here.
  if (!gate(observation, now, { ignoreStaleness: true }).accepted) return false;
  const comparable = comparableHistory(observation, history);
  if (comparable.length < 5) return false;
  const values = comparable.map((entry) => entry.value as number);
  const tolerance = { heart_rate: 6, sleep_minutes: 60, stress: 1 } as Record<
    Metric,
    number
  >;
  const low = Math.min(...values) - tolerance[observation.metric];
  const high = Math.max(...values) + tolerance[observation.metric];
  return (observation.value as number) < low || (observation.value as number) > high;
}

function latestPerMetric(observations: Observation[], metric: Metric): Observation[] {
  return [...observations]
    .filter((entry) => entry.metric === metric)
    .sort(
      (a, b) =>
        new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime(),
    );
}

export function buildConcerns(
  observations: Observation[],
  checkIns: CheckIn[],
  now: Date = new Date(),
): Concern[] {
  const concerns: Concern[] = [];
  const inWindow = observations.filter((entry) => withinWindow(entry.observedAt, now));

  const signals: Array<{ observation: Observation; text: string }> = [];
  for (const metric of ["heart_rate", "sleep_minutes", "stress"] as Metric[]) {
    const candidates = latestPerMetric(inWindow, metric);
    const latest = candidates[0];
    if (!latest) continue;
    if (differsFromOwnRange(latest, inWindow, now)) {
      signals.push({
        observation: latest,
        text: `${metricMeta[metric].label} differs from your recent readings`,
      });
    }
  }

  // A symptom with a worsening trend is its own concern, never a reassuring number.
  const symptomSignals = checkIns
    .filter((checkIn) => withinWindow(checkIn.observedAt, now))
    .flatMap((checkIn) =>
      checkIn.symptoms
        .filter((symptom) => symptom.trend === "worse" || symptom.urgent)
        .map((symptom) => ({ checkIn, symptom })),
    );

  if (signals.length >= 2) {
    const metrics = signals.map((signal) => signal.observation.metric);
    const hazardSet = new Set<HazardTag>();
    for (const metric of metrics) {
      for (const hazard of hazardsForMetric[metric] ?? []) hazardSet.add(hazard);
    }
    concerns.push({
      id: `concern-${metrics.sort().join("-")}`,
      crewId: signals[0].observation.crewId,
      createdAt: now.toISOString(),
      title: "These signals changed together",
      summary: "These changed in the same 72 hours. This does not establish a cause.",
      signals: signals.map((signal) => ({
        metric: signal.observation.metric,
        text: signal.text,
        observedAt: signal.observation.observedAt,
      })),
      hazards: [...hazardSet],
      windowHours: WINDOW_HOURS,
    });
  }

  if (symptomSignals.length > 0) {
    const names = [...new Set(symptomSignals.map((entry) => entry.symptom.name))];
    const hazardSet = new Set<HazardTag>(["isolation", "environment"]);
    if (names.some((name) => /dizzi|vision|chest/i.test(name))) {
      hazardSet.add("gravity");
      hazardSet.add("distance");
    }
    concerns.push({
      id: `concern-symptom-${names.sort().join("-").toLowerCase().replace(/\W+/g, "-")}`,
      crewId: symptomSignals[0].checkIn.crewId,
      createdAt: now.toISOString(),
      title: "Reported symptoms need assessment",
      summary:
        "A reported symptom outranks a reassuring number. This does not establish a cause.",
      signals: symptomSignals.map(({ checkIn, symptom }) => ({
        metric: "symptom",
        text: `${symptom.name} — ${
          symptom.onset === "several_days" ? "several days" : symptom.onset === "today" ? "today" : "just now"
        }, ${symptom.trend}`,
        observedAt: checkIn.observedAt,
      })),
      hazards: [...hazardSet],
      windowHours: WINDOW_HOURS,
    });
  }

  return concerns;
}
