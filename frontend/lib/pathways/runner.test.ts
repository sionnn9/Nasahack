import { describe, expect, it } from "vitest";
import { advance, optionsFor, reassessRemainingMs, startPathway } from "@/lib/pathways/runner";
import { pathwayById } from "@/lib/pathways";
import type { Observation } from "@/lib/types";
import { buildEncounter } from "@/lib/encounters/build";

const at = "2026-11-14T12:00:00.000Z";
const pathway = pathwayById("lightheaded-v1")!;

function measure(id: string): Observation {
  return {
    id,
    crewId: "alex-morgan",
    metric: "heart_rate",
    value: 72,
    unit: "bpm",
    observedAt: at,
    enteredAt: at,
    lane: "manual",
    method: "manual_entry",
    context: "rest",
    quality: "ok",
    qualityReason: null,
    environment: "mars_transit",
    procedureVersion: "demo-procedures-1",
  };
}

describe("pathway runner", () => {
  it("starts on the first step and offers an escape hatch on every question", () => {
    const state = startPathway(pathway, at);
    expect(state.stepId).toBe("s1");
    const step = pathway.steps[0];
    expect(optionsFor(step)).toContain("Unable to assess");
  });

  it("moves from a question to the urgent check", () => {
    const state = startPathway(pathway, at);
    const next = advance(state, pathway, { type: "answer", option: "Position change", at });
    expect(next.stepId).toBe("s2");
    expect(next.answers[0].answer).toBe("Position change");
  });

  it("routes Yes on the urgent check straight to emergency", () => {
    let state = startPathway(pathway, at);
    state = advance(state, pathway, { type: "answer", option: "None of these", at });
    state = advance(state, pathway, { type: "answer", option: "Yes", at });
    expect(state.mode).toBe("emergency");
    expect(state.outcome).toBe("emergency");
  });

  it("treats 'Unable to assess' on the urgent check as unsafe", () => {
    let state = startPathway(pathway, at);
    state = advance(state, pathway, { type: "answer", option: "None of these", at });
    state = advance(state, pathway, { type: "answer", option: "Unable to assess", at });
    expect(state.mode).toBe("emergency");
    expect(state.incomplete).toBe(true);
  });

  it("routes to the alternative step when the cuff is unavailable", () => {
    let state = startPathway(pathway, at);
    state = advance(state, pathway, { type: "answer", option: "Meal", at });
    state = advance(state, pathway, { type: "answer", option: "No", at });
    expect(state.stepId).toBe("s3");
    state = advance(state, pathway, { type: "equipment_unavailable", at });
    expect(state.stepId).toBe("s3b");
    expect(state.incomplete).toBe(true);
    expect(state.unknowns[0]).toContain("equipment unavailable");
  });

  it("records a measurement and continues", () => {
    let state = startPathway(pathway, at);
    state = advance(state, pathway, { type: "answer", option: "Exercise", at });
    state = advance(state, pathway, { type: "answer", option: "No", at });
    state = advance(state, pathway, { type: "measurement", observation: measure("m1"), at });
    expect(state.stepId).toBe("s4");
    expect(state.measurements).toHaveLength(1);
  });

  it("schedules reassessment after the action timer", () => {
    let state = startPathway(pathway, at);
    state = advance(state, pathway, { type: "answer", option: "Exercise", at });
    state = advance(state, pathway, { type: "answer", option: "No", at });
    state = advance(state, pathway, { type: "measurement", observation: measure("m1"), at });
    state = advance(state, pathway, { type: "measurement", observation: measure("m2"), at });
    expect(state.stepId).toBe("s5");
    state = advance(state, pathway, { type: "action_complete", at });
    expect(state.mode).toBe("reassess");
    expect(state.reassessDueAt).toBe("2026-11-14T12:15:00.000Z");
    expect(reassessRemainingMs(state, new Date("2026-11-14T12:10:00.000Z"))).toBe(
      5 * 60 * 1000,
    );
  });

  it("closes on Better and escalates on Worse", () => {
    const reassess = {
      ...startPathway(pathway, at),
      mode: "reassess" as const,
      stepId: null,
      reassessDueAt: at,
    };
    expect(advance(reassess, pathway, { type: "reassess", option: "Better", at }).outcome).toBe(
      "closed",
    );
    expect(advance(reassess, pathway, { type: "reassess", option: "Worse", at }).outcome).toBe(
      "emergency",
    );
  });

  it("builds an encounter marked illustrative", () => {
    const encounter = buildEncounter(startPathway(pathway, at), "alex-morgan", [], at);
    expect(encounter.illustrative).toBe(true);
    expect(encounter.outcome).toBe("open");
  });
});
