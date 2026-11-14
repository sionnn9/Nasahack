import { describe, expect, it } from "vitest";
import { compareObservation } from "@/lib/status/compare";
import type { Observation } from "@/lib/types";

const now = new Date("2026-11-14T12:00:00.000Z");

function obs(id: string, value: number, overrides: Partial<Observation> = {}): Observation {
  return {
    id,
    crewId: "alex-morgan",
    metric: "heart_rate",
    value,
    unit: "bpm",
    observedAt: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
    enteredAt: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
    lane: "live",
    method: "ppg_finger",
    context: "rest",
    quality: "ok",
    qualityReason: null,
    environment: "mars_transit",
    procedureVersion: "demo-procedures-1",
    ...overrides,
  };
}

describe("compare with personal history", () => {
  it("does not turn missing history into a green state", () => {
    const result = compareObservation(obs("new", 70), [obs("a", 68), obs("b", 69)], now);
    expect(result.state).toBe("insufficient_history");
    expect(result.range).toBeNull();
  });

  it("requires five comparable observations before within-range", () => {
    const history = [1, 2, 3, 4, 5].map((n) => obs(`h${n}`, 68 + n));
    const result = compareObservation(obs("new", 70), history, now);
    expect(result.state).toBe("within_range");
    expect(result.comparableCount).toBe(5);
  });

  it("suggests attention when a value sits outside the personal range", () => {
    const history = [1, 2, 3, 4, 5].map((n) => obs(`h${n}`, 60 + n));
    const result = compareObservation(obs("new", 95), history, now);
    expect(result.state).toBe("attention");
    expect(result.detail).toContain("No cause assigned");
  });

  it("never reports green for a bad reading", () => {
    const history = [1, 2, 3, 4, 5].map((n) => obs(`h${n}`, 70));
    const result = compareObservation(obs("new", 70, { quality: "no_contact" }), history, now);
    expect(result.state).toBe("no_valid_reading");
  });

  it("only compares the same metric, method and context", () => {
    const history = [
      ...([1, 2, 3, 4, 5].map((n) => obs(`rest${n}`, 70))),
      ...([6, 7, 8, 9, 10].map((n) => obs(`ex${n}`, 140, { context: "post_exercise" }))),
    ];
    const result = compareObservation(obs("new", 72), history, now);
    expect(result.comparableCount).toBe(5);
    expect(result.state).toBe("within_range");
  });
});
