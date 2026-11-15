import { describe, expect, it } from "vitest";
import { sendableObservations, stripPrivateCheckIn } from "@/lib/repo/synced-repository";
import type { CheckIn, Observation } from "@/lib/types";

function observation(id: string, metric: Observation["metric"]): Observation {
  return {
    id,
    crewId: "alex-morgan",
    metric,
    value: 3,
    unit: "/5",
    observedAt: "2026-01-01T00:00:00.000Z",
    enteredAt: "2026-01-01T00:00:00.000Z",
    lane: "manual",
    method: "self_report",
    context: "rest",
    quality: "ok",
    qualityReason: null,
    environment: "mars_transit",
    procedureVersion: "demo-procedures-1",
  };
}

const checkIn: CheckIn = {
  id: "c1",
  crewId: "alex-morgan",
  observedAt: "2026-01-01T00:00:00.000Z",
  enteredAt: "2026-01-01T00:00:00.000Z",
  sleepMinutes: 420,
  mood: 2,
  stress: 4,
  rested: 2,
  connected: 3,
  symptoms: [],
  details: "private free text",
};

describe("frontend private sync filter", () => {
  it("never sends private metrics without consent", () => {
    const outbound = sendableObservations(
      [
        observation("heart", "heart_rate"),
        observation("mood", "mood"),
        observation("stress", "stress"),
        observation("rested", "rested"),
        observation("connected", "connected"),
      ],
      {},
    );
    expect(outbound.map((item) => item.metric)).toEqual(["heart_rate"]);
  });

  it("sends private metrics for a crew member who opted in", () => {
    const outbound = sendableObservations(
      [observation("heart", "heart_rate"), observation("mood", "mood")],
      { "alex-morgan": true },
    );
    expect(outbound.map((item) => item.metric)).toEqual(["heart_rate", "mood"]);
  });

  it("strips private check-in fields and keeps sleep", () => {
    const stripped = stripPrivateCheckIn(checkIn);
    expect(stripped).not.toHaveProperty("mood");
    expect(stripped).not.toHaveProperty("stress");
    expect(stripped).not.toHaveProperty("rested");
    expect(stripped).not.toHaveProperty("connected");
    expect(stripped).not.toHaveProperty("details");
    expect(stripped.sleepMinutes).toBe(420);
    // The local copy passed in is untouched.
    expect(checkIn.mood).toBe(2);
  });
});
