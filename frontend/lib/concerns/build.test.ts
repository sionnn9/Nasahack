import { describe, expect, it } from "vitest";
import { buildConcerns } from "@/lib/concerns/build";
import type { CheckIn, Observation } from "@/lib/types";

const now = new Date("2026-11-14T12:00:00.000Z");
const hoursAgo = (hours: number) =>
  new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

function observation(
  id: string,
  metric: Observation["metric"],
  value: number,
  hours: number,
  method: string,
): Observation {
  return {
    id,
    crewId: "alex-morgan",
    metric,
    value,
    unit: metric === "sleep_minutes" ? "min" : "bpm",
    observedAt: hoursAgo(hours),
    enteredAt: hoursAgo(hours),
    lane: "manual",
    method,
    context: "rest",
    quality: "ok",
    qualityReason: null,
    environment: "mars_transit",
    procedureVersion: "demo-procedures-1",
  };
}

function checkIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    id: "ci-1",
    crewId: "alex-morgan",
    observedAt: hoursAgo(5),
    enteredAt: hoursAgo(5),
    sleepMinutes: 300,
    mood: 3,
    stress: 3,
    rested: 3,
    connected: 4,
    symptoms: [],
    details: "",
    ...overrides,
  };
}

describe("concern builder", () => {
  it("groups co-occurring signals without assigning a cause", () => {
    const observations: Observation[] = [];
    for (let index = 0; index < 5; index += 1) {
      observations.push(
        observation(`hr-${index}`, "heart_rate", 64 + index, 48 - index, "ppg_finger"),
        observation(`sl-${index}`, "sleep_minutes", 420, 50 - index, "self_report"),
      );
    }
    observations.push(
      observation("hr-latest", "heart_rate", 92, 2, "ppg_finger"),
      observation("sl-latest", "sleep_minutes", 250, 3, "self_report"),
    );

    const concerns = buildConcerns(observations, [], now);
    expect(concerns).toHaveLength(1);
    expect(concerns[0].summary).toContain("does not establish a cause");
    expect(concerns[0].signals.length).toBe(2);
    expect(concerns[0].hazards.length).toBeGreaterThan(0);
    expect(JSON.stringify(concerns[0])).not.toMatch(/healthy|diagnos/i);
  });

  it("creates a concern from a worsening symptom with no numbers at all", () => {
    const concerns = buildConcerns(
      [],
      [
        checkIn({
          symptoms: [
            { id: "s1", name: "Dizziness", onset: "today", trend: "worse", urgent: false },
          ],
        }),
      ],
      now,
    );
    expect(concerns).toHaveLength(1);
    expect(concerns[0].title).toContain("symptoms");
  });

  it("ignores signals older than 72 hours", () => {
    const observations: Observation[] = [];
    for (let index = 0; index < 5; index += 1) {
      observations.push(
        observation(`hr-${index}`, "heart_rate", 64 + index, 200 + index, "ppg_finger"),
      );
    }
    observations.push(observation("hr-latest", "heart_rate", 92, 120, "ppg_finger"));
    expect(buildConcerns(observations, [], now)).toHaveLength(0);
  });
});
