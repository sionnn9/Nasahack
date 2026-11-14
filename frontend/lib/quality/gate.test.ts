import { describe, expect, it } from "vitest";
import { gate, isLateEntry, STALE_AFTER_MS } from "@/lib/quality/gate";
import type { Observation } from "@/lib/types";

const now = new Date("2026-11-14T12:00:00.000Z");

function observation(overrides: Partial<Observation> = {}): Observation {
  return {
    id: "obs-1",
    crewId: "alex-morgan",
    metric: "heart_rate",
    value: 72,
    unit: "bpm",
    observedAt: now.toISOString(),
    enteredAt: now.toISOString(),
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

describe("quality gate", () => {
  it("accepts a fresh live value inside the plausible range", () => {
    const result = gate(observation(), now);
    expect(result.quality).toBe("ok");
    expect(result.accepted).toBe(true);
  });

  it("flags a live value older than 60 minutes as stale", () => {
    const old = new Date(now.getTime() - STALE_AFTER_MS - 1000).toISOString();
    const result = gate(observation({ observedAt: old }), now);
    expect(result.quality).toBe("stale");
    expect(result.accepted).toBe(false);
  });

  it("never marks replay data stale, however old it is", () => {
    const old = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const result = gate(observation({ lane: "replay", observedAt: old }), now);
    expect(result.quality).toBe("ok");
    expect(result.accepted).toBe(true);
  });

  it("never marks synthetic data stale", () => {
    const old = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(gate(observation({ lane: "synthetic", observedAt: old }), now).accepted).toBe(
      true,
    );
  });

  it("judges a late manual entry by observedAt, not enteredAt", () => {
    const observed = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    const entry = observation({
      lane: "manual",
      method: "cuff_upper_arm",
      observedAt: observed,
      enteredAt: now.toISOString(),
    });
    const result = gate(entry, now);
    expect(result.quality).toBe("ok");
    expect(result.accepted).toBe(true);
    expect(isLateEntry(entry)).toBe(true);
  });

  it("still flags a manual entry whose observed time is old", () => {
    const observed = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
    const result = gate(
      observation({
        lane: "manual",
        observedAt: observed,
        enteredAt: now.toISOString(),
      }),
      now,
    );
    expect(result.quality).toBe("stale");
  });

  it("rejects values outside the plausible sensor range", () => {
    const result = gate(observation({ value: 300 }), now);
    expect(result.quality).toBe("out_of_range");
    expect(result.accepted).toBe(false);
  });

  it("rejects missing measurements", () => {
    const result = gate(observation({ value: null }), now);
    expect(result.quality).toBe("not_measured");
  });

  it("keeps no-contact values out of comparisons", () => {
    expect(gate(observation({ quality: "no_contact" }), now).quality).toBe(
      "no_contact",
    );
  });

  it("flags motion artifacts", () => {
    expect(gate(observation({ artifact: "motion" }), now).quality).toBe("motion");
  });
});
