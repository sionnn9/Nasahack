import type { Encounter, Observation, SymptomEntry } from "@/lib/types";
import type { RunnerState } from "@/lib/pathways/runner";

export function buildEncounter(
  state: RunnerState,
  crewId: string,
  symptoms: SymptomEntry[],
  endedAt: string = new Date().toISOString(),
): Encounter {
  return {
    id: `enc-${state.pathwayId}-${Date.parse(state.startedAt) || Date.now()}`,
    crewId,
    kind: state.pathwayId.startsWith("demo-") ? "emergency" : "assessment",
    pathwayId: state.pathwayId,
    startedAt: state.startedAt,
    endedAt: state.mode === "done" || state.mode === "emergency" ? endedAt : null,
    symptoms,
    answers: state.answers,
    measurements: state.measurements.filter((entry) => entry.value !== null),
    actions: state.actions,
    unknowns: state.unknowns,
    outcome: state.outcome,
    illustrative: true,
  };
}

export function emptyEncounterObservations(encounter: Encounter): Observation[] {
  return encounter.measurements;
}
