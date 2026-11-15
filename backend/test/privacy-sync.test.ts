import { afterEach, describe, expect, it } from "vitest";
import { crew, makeApp, type TestApp } from "./helpers.js";

let current: TestApp | null = null;

afterEach(async () => {
  await current?.app.close();
  current = null;
});

function observation(id: string, metric: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    crewId: "alex-morgan",
    metric,
    value: metric === "heart_rate" ? 80 : 3,
    unit: metric === "heart_rate" ? "bpm" : "/5",
    observedAt: "2026-01-01T00:00:00.000Z",
    enteredAt: "2026-01-01T00:00:00.000Z",
    lane: "manual",
    method: "self_report",
    context: "rest",
    quality: "ok",
    qualityReason: null,
    environment: "mars_transit",
    procedureVersion: "demo-procedures-1",
    ...overrides,
  };
}

function checkIn(id: string) {
  return {
    id,
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
}

describe("private data in sync", () => {
  it("drops private metrics by default and reports skipped", async () => {
    const test = await makeApp();
    current = test;
    const response = await test.app.inject({
      method: "POST",
      url: "/v1/sync/observations",
      headers: crew,
      payload: [
        observation("o-heart", "heart_rate"),
        observation("o-mood", "mood"),
        observation("o-stress", "stress"),
        observation("o-rested", "rested"),
        observation("o-connected", "connected"),
      ],
    });
    const body = response.json() as { applied: number; skipped: number; includePrivate: boolean };
    expect(body.applied).toBe(1);
    expect(body.skipped).toBe(4);
    expect(body.includePrivate).toBe(false);

    const rows = test.app.ctx.db
      .prepare("SELECT metric FROM observations ORDER BY metric")
      .all() as Array<{ metric: string }>;
    expect(rows.map((row) => row.metric)).toEqual(["heart_rate"]);
  });

  it("stores everything when includePrivate=true", async () => {
    const test = await makeApp();
    current = test;
    const response = await test.app.inject({
      method: "POST",
      url: "/v1/sync/observations?includePrivate=true",
      headers: crew,
      payload: [observation("o-mood", "mood"), observation("o-heart", "heart_rate")],
    });
    const body = response.json() as { skipped: number };
    expect(body.skipped).toBe(0);
    const rows = test.app.ctx.db
      .prepare("SELECT metric FROM observations ORDER BY metric")
      .all() as Array<{ metric: string }>;
    expect(rows.map((row) => row.metric)).toEqual(["heart_rate", "mood"]);
  });

  it("strips private check-in fields by default", async () => {
    const test = await makeApp();
    current = test;
    const response = await test.app.inject({
      method: "POST",
      url: "/v1/sync/checkins",
      headers: crew,
      payload: [checkIn("c1")],
    });
    const body = response.json() as { applied: number; skipped: number };
    expect(body.applied).toBe(1);
    expect(body.skipped).toBe(5);

    const row = test.app.ctx.db.prepare("SELECT json FROM checkins WHERE id = 'c1'").get() as {
      json: string;
    };
    const stored = JSON.parse(row.json) as Record<string, unknown>;
    expect(stored).not.toHaveProperty("mood");
    expect(stored).not.toHaveProperty("stress");
    expect(stored).not.toHaveProperty("rested");
    expect(stored).not.toHaveProperty("connected");
    expect(stored).not.toHaveProperty("details");
    expect(stored.sleepMinutes).toBe(420);
  });

  it("keeps private check-in fields when opted in", async () => {
    const test = await makeApp();
    current = test;
    await test.app.inject({
      method: "POST",
      url: "/v1/sync/checkins?includePrivate=true",
      headers: crew,
      payload: [checkIn("c2")],
    });
    const row = test.app.ctx.db.prepare("SELECT json FROM checkins WHERE id = 'c2'").get() as {
      json: string;
    };
    const stored = JSON.parse(row.json) as Record<string, unknown>;
    expect(stored.mood).toBe(2);
    expect(stored.details).toBe("private free text");
  });

  it("records skipped counts in the audit log", async () => {
    const test = await makeApp();
    current = test;
    await test.app.inject({
      method: "POST",
      url: "/v1/sync/observations",
      headers: crew,
      payload: [observation("o-mood", "mood"), observation("o-heart", "heart_rate")],
    });
    const row = test.app.ctx.db
      .prepare("SELECT detail_json FROM audit_log WHERE action = 'sync.push' AND ref = 'observations'")
      .get() as { detail_json: string };
    expect(JSON.parse(row.detail_json)).toMatchObject({ applied: 1, skipped: 1 });
  });
});
