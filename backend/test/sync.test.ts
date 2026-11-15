import { afterEach, describe, expect, it } from "vitest";
import { crew, makeApp, type TestApp } from "./helpers.js";

let current: TestApp | null = null;

afterEach(async () => {
  await current?.app.close();
  current = null;
});

function observation(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    crewId: "alex-morgan",
    metric: "heart_rate",
    value: 80,
    unit: "bpm",
    observedAt: "2025-12-31T22:00:00.000Z",
    enteredAt: "2026-01-01T00:00:00.000Z",
    lane: "manual",
    method: "manual_entry",
    context: "rest",
    quality: "ok",
    qualityReason: null,
    environment: "mars_transit",
    procedureVersion: "demo-procedures-1",
    ...overrides,
  };
}

async function setup(): Promise<TestApp> {
  current = await makeApp();
  return current;
}

describe("sync", () => {
  it("upserts idempotently and advances the cursor", async () => {
    const { app } = await setup();
    const first = await app.inject({
      method: "POST",
      url: "/v1/sync/observations",
      headers: crew,
      payload: [observation("o1"), observation("o2")],
    });
    expect(first.statusCode).toBe(200);
    expect((first.json() as { cursor: number }).cursor).toBe(2);

    const again = await app.inject({
      method: "POST",
      url: "/v1/sync/observations",
      headers: crew,
      payload: [observation("o1")],
    });
    expect((again.json() as { applied: number }).applied).toBe(1);
    const count = app.ctx.db.prepare("SELECT COUNT(*) AS c FROM observations").get() as { c: number };
    expect(count.c).toBe(2);

    const pulled = await app.inject({
      method: "GET",
      url: "/v1/sync/observations?crewId=alex-morgan&since=0",
      headers: crew,
    });
    expect((pulled.json() as { items: unknown[] }).items).toHaveLength(2);
    const next = await app.inject({
      method: "GET",
      url: `/v1/sync/observations?crewId=alex-morgan&since=${(again.json() as { cursor: number }).cursor}`,
      headers: crew,
    });
    expect((next.json() as { items: unknown[] }).items).toHaveLength(0);
  });

  it("applies staleness only to manual and live rows", async () => {
    const { app } = await setup();
    await app.inject({
      method: "POST",
      url: "/v1/sync/observations",
      headers: crew,
      payload: [
        observation("manual-stale"),
        observation("replay-old", { lane: "replay", method: "actigraphy" }),
        observation("synthetic-old", { lane: "synthetic" }),
        observation("fresh", { observedAt: "2026-01-01T00:00:00.000Z" }),
      ],
    });
    const response = await app.inject({
      method: "GET",
      url: "/v1/sync/observations?crewId=alex-morgan&since=0",
      headers: crew,
    });
    const items = (response.json() as { items: Array<{ id: string; quality: string }> }).items;
    const quality = Object.fromEntries(items.map((item) => [item.id, item.quality]));
    expect(quality["manual-stale"]).toBe("stale");
    expect(quality["replay-old"]).toBe("ok");
    expect(quality["synthetic-old"]).toBe("ok");
    expect(quality.fresh).toBe("ok");
  });

  it("keeps the stricter flag when client and server disagree", async () => {
    const { app } = await setup();
    await app.inject({
      method: "POST",
      url: "/v1/sync/observations",
      headers: crew,
      payload: [
        observation("implausible", { value: 400 }),
        observation("client-flagged", { value: 80, quality: "no_contact" }),
      ],
    });
    const response = await app.inject({
      method: "GET",
      url: "/v1/sync/observations?crewId=alex-morgan&since=0",
      headers: crew,
    });
    const items = (
      response.json() as {
        items: Array<{ id: string; quality: string; qualityReason: string | null }>;
      }
    ).items;
    const implausible = items.find((item) => item.id === "implausible");
    expect(implausible?.quality).toBe("out_of_range");
    expect(implausible?.qualityReason).toContain("Server gate");
    expect(items.find((item) => item.id === "client-flagged")?.quality).toBe("no_contact");
  });

  it("stores late manual entries by observed time without inventing a value", async () => {
    const { app } = await setup();
    await app.inject({
      method: "POST",
      url: "/v1/sync/observations",
      headers: crew,
      payload: [
        observation("late", {
          observedAt: "2025-12-31T18:00:00.000Z",
          enteredAt: "2026-01-01T00:00:00.000Z",
        }),
        observation("missing", { value: null, quality: "not_measured" }),
      ],
    });
    const response = await app.inject({
      method: "GET",
      url: "/v1/sync/observations?crewId=alex-morgan&since=0",
      headers: crew,
    });
    const items = (response.json() as { items: Array<{ id: string; quality: string }> }).items;
    expect(items.find((item) => item.id === "late")?.quality).toBe("stale");
    expect(items.find((item) => item.id === "missing")?.quality).toBe("not_measured");
  });

  it("rejects unknown collections", async () => {
    const { app } = await setup();
    const response = await app.inject({
      method: "POST",
      url: "/v1/sync/notes",
      headers: crew,
      payload: [],
    });
    expect(response.statusCode).toBe(404);
  });
});
