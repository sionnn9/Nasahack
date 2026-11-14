import type {
  Encounter,
  EquipmentKey,
  Observation,
  Pathway,
  PathwayStep,
} from "@/lib/types";

/**
 * Generic, data-driven pathway runner. Content lives in JSON; this file only
 * moves between steps. Nothing here evaluates health or names a cause.
 */

export type RunnerMode = "step" | "reassess" | "done" | "emergency";

export type RunnerAnswer = {
  stepId: string;
  question: string;
  answer: string;
  at: string;
};

export type RunnerState = {
  pathwayId: string;
  mode: RunnerMode;
  stepId: string | null;
  answers: RunnerAnswer[];
  measurements: Observation[];
  actions: Array<{ text: string; at: string; timerMinutes?: number }>;
  unknowns: string[];
  incomplete: boolean;
  outcome: Encounter["outcome"];
  startedAt: string;
  reassessDueAt: string | null;
};

export type RunnerEvent =
  | { type: "answer"; option: string; at: string }
  | { type: "measurement"; observation: Observation | null; at: string }
  | { type: "equipment_unavailable"; at: string }
  | { type: "action_complete"; at: string }
  | { type: "reassess"; option: string; at: string };

export function pathwayStep(pathway: Pathway, id: string | null): PathwayStep | null {
  if (!id) return null;
  return pathway.steps.find((step) => step.id === id) ?? null;
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

function resolveTarget(
  map: Record<string, string> | undefined,
  option: string,
): string {
  if (!map) return "DONE";
  return map[option] ?? map.default ?? "DONE";
}

function moveTo(
  state: RunnerState,
  pathway: Pathway,
  target: string,
  at: string,
): RunnerState {
  switch (target) {
    case "EMERGENCY":
      return { ...state, mode: "emergency", outcome: "emergency", stepId: null };
    case "close":
    case "CLOSE":
      return { ...state, mode: "done", outcome: "closed", stepId: null };
    case "handoff":
    case "HANDOFF":
      return { ...state, mode: "done", outcome: "handoff", stepId: null };
    case "DONE":
      return {
        ...state,
        mode: "done",
        outcome: state.incomplete ? "incomplete" : "handoff",
        stepId: null,
      };
    case "reassess":
    case "REASSESS": {
      const minutes = pathway.reassess?.after_minutes ?? 15;
      return {
        ...state,
        mode: "reassess",
        stepId: null,
        reassessDueAt: addMinutes(at, minutes),
      };
    }
    default:
      return { ...state, mode: "step", stepId: target };
  }
}

export function startPathway(
  pathway: Pathway,
  at: string = new Date().toISOString(),
): RunnerState {
  const first = pathway.steps[0]?.id ?? null;
  return {
    pathwayId: pathway.id,
    mode: first ? "step" : "done",
    stepId: first,
    answers: [],
    measurements: [],
    actions: [],
    unknowns: [],
    incomplete: false,
    outcome: "open",
    startedAt: at,
    reassessDueAt: null,
  };
}

export function advance(
  state: RunnerState,
  pathway: Pathway,
  event: RunnerEvent,
): RunnerState {
  if (state.mode === "emergency" || state.mode === "done") return state;

  if (event.type === "reassess") {
    if (state.mode !== "reassess" || !pathway.reassess) return state;
    const target = resolveTarget(pathway.reassess.next, event.option);
    const next = moveTo(
      {
        ...state,
        answers: [
          ...state.answers,
          {
            stepId: "reassess",
            question: pathway.reassess.question,
            answer: event.option,
            at: event.at,
          },
        ],
      },
      pathway,
      target,
      event.at,
    );
    return next;
  }

  if (state.mode === "reassess") return state;

  const step = pathwayStep(pathway, state.stepId);
  if (!step) return state;

  if (event.type === "answer") {
    // "Unable to assess" can never replace the urgent screen, so it is
    // treated as "Unsure" there and as a recorded unknown elsewhere.
    const option =
      event.option === "Unable to assess" && step.type === "urgent_check"
        ? "Unsure"
        : event.option;
    const target =
      step.type === "action" ? "DONE" : resolveTarget(step.next, option);
    const withAnswer: RunnerState = {
      ...state,
      answers: [
        ...state.answers,
        {
          stepId: step.id,
          question: step.text,
          answer: event.option,
          at: event.at,
        },
      ],
      unknowns:
        event.option === "Unable to assess"
          ? [...state.unknowns, `${step.text} — unable to assess`]
          : state.unknowns,
      incomplete: state.incomplete || event.option === "Unable to assess",
    };
    return moveTo(withAnswer, pathway, target, event.at);
  }

  if (event.type === "measurement") {
    const nextState: RunnerState = {
      ...state,
      measurements: event.observation
        ? [...state.measurements, event.observation]
        : state.measurements,
      unknowns:
        event.observation === null
          ? [...state.unknowns, `${step.text} — not measured`]
          : state.unknowns,
      incomplete: state.incomplete || event.observation === null,
    };
    const target = event.observation
      ? resolveTarget(step.next, "default")
      : step.type === "measure" && step.alt
        ? step.alt
        : resolveTarget(step.next, "default");
    return moveTo(nextState, pathway, target, event.at);
  }

  if (event.type === "equipment_unavailable") {
    if (step.type !== "measure" || !step.needs) return state;
    const nextState: RunnerState = {
      ...state,
      incomplete: true,
      unknowns: [
        ...state.unknowns,
        `${step.text} — equipment unavailable (${step.needs})`,
      ],
    };
    const target = step.alt ?? resolveTarget(step.next, "default");
    return moveTo(nextState, pathway, target, event.at);
  }

  if (event.type === "action_complete") {
    const timerMinutes = step.type === "action" ? step.timer_minutes : undefined;
    const nextState: RunnerState = {
      ...state,
      actions: [
        ...state.actions,
        { text: step.text, at: event.at, timerMinutes },
      ],
    };
    if (pathway.reassess && step.type === "action" && timerMinutes) {
      return moveTo(nextState, pathway, "reassess", event.at);
    }
    return moveTo(nextState, pathway, resolveTarget(step.next, "default"), event.at);
  }

  return state;
}

/** Every question offers an escape hatch; never invent an answer. */
export function optionsFor(step: PathwayStep): string[] {
  if (step.type === "question") {
    return step.options.includes("Unable to assess")
      ? step.options
      : [...step.options, "Unable to assess"];
  }
  if (step.type === "urgent_check") {
    return step.options.includes("Unable to assess")
      ? step.options
      : [...step.options, "Unable to assess"];
  }
  return [];
}

export function equipmentMissing(
  step: PathwayStep,
  equipment: EquipmentKey[],
): boolean {
  return step.type === "measure" && step.needs !== null && !equipment.includes(step.needs);
}

export function reassessRemainingMs(
  state: RunnerState,
  now: Date = new Date(),
): number {
  if (!state.reassessDueAt) return 0;
  return Math.max(0, new Date(state.reassessDueAt).getTime() - now.getTime());
}
