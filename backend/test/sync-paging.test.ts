import { afterEach, describe, expect, it } from "vitest";
import { crew, makeApp, type TestApp } from "./helpers.js";

let current: TestApp | null = null;

afterEach(async () => {
  await current?.app.close();
  current = null;
});

function seedObservations(test: TestApp, count: number) {
  const insert = test.app.ctx.db.prepare(
    `INSERT INTO observations (
      id, crew_id, metric, value, unit, observed_at, entered_at, lane, method,
      context, quality, quality_reason, environment, procedure_version, raw_value, updated_seq
    ) VALUES (?, 'alex-morgan', 'heart_rate', 70, 'bpm', ?, ?, 'live', 'ppg_wrist',
      'rest', 'ok', NULL, 'mars_transit', 'demo-procedures-1', NULL, ?)`,
  );
  const at = "2026-01-01T00:00:00.000Z";
  test.app.ctx.db.transaction(() => {
    for (let index = 1; index <= count; index += 1) {
      insert.run(`obs-${String(index).padStart(5, "0")}`, at, at, index);
    }
    test.app.ctx.db.prepare("UPDATE sync_seq SET value = ? WHERE id = 1").run(count);
  })();
}

describe("sync pull paging", () => {
  it("retrieves 2500 rows completely across three pulls", async () => {
    const test = await makeApp();
    current = test;
    seedObservations(test, 2500);
    await test.app.inject({
      method: "POST",
      url: "/v1/sync/encounters",
      headers: crew,
      payload: [],
    });

    const seen = new Set<string>();
    let since = 0;
    let pulls = 0;
    let hasMore = true;
    while (hasMore) {
      const response = await test.app.inject({
        method: "GET",
        url: `/v1/sync/observations?crewId=alex-morgan&since=${since}`,
        headers: crew,
      });
      const body = response.json() as {
        items: Array<{ id: string }>;
        cursor: number;
        hasMore: boolean;
      };
      pulls += 1;
      expect(body.items.length).toBeGreaterThan(0);
      expect(body.items.length).toBeLessThanOrEqual(1000);
      for (const item of body.items) seen.add(item.id);
      expect(body.cursor).toBeGreaterThan(since);
      since = body.cursor;
      hasMore = body.hasMore;
      if (pulls > 5) throw new Error("paging did not terminate");
    }

    expect(pulls).toBe(3);
    expect(seen.size).toBe(2500);
    expect(since).toBe(2500);
    expect(hasMore).toBe(false);
  });

  it("returns the last returned sequence, not the global counter", async () => {
    const test = await makeApp();
    current = test;
    seedObservations(test, 3);
    // A later unrelated row bumps the global sequence but is not returned here.
    test.app.ctx.db
      .prepare(
        `INSERT INTO checkins (id, crew_id, json, updated_seq) VALUES ('c1', 'kenji-sato', '{}', 99)`,
      )
      .run();
    test.app.ctx.db.prepare("UPDATE sync_seq SET value = 99 WHERE id = 1").run();

    const response = await test.app.inject({
      method: "GET",
      url: "/v1/sync/observations?crewId=alex-morgan&since=0",
      headers: crew,
    });
    const body = response.json() as { cursor: number; hasMore: boolean };
    expect(body.cursor).toBe(3);
    expect(body.hasMore).toBe(false);
  });

  it("pages check-ins and encounters the same way", async () => {
    const test = await makeApp();
    current = test;
    const insert = test.app.ctx.db.prepare(
      "INSERT INTO checkins (id, crew_id, json, updated_seq) VALUES (?, 'alex-morgan', '{}', ?)",
    );
    test.app.ctx.db.transaction(() => {
      for (let index = 1; index <= 1005; index += 1) insert.run(`c-${index}`, index);
      test.app.ctx.db.prepare("UPDATE sync_seq SET value = 1005 WHERE id = 1").run();
    })();

    const first = await test.app.inject({
      method: "GET",
      url: "/v1/sync/checkins?crewId=alex-morgan&since=0",
      headers: crew,
    });
    const firstBody = first.json() as { items: unknown[]; cursor: number; hasMore: boolean };
    expect(firstBody.items).toHaveLength(1000);
    expect(firstBody.hasMore).toBe(true);
    expect(firstBody.cursor).toBe(1000);

    const second = await test.app.inject({
      method: "GET",
      url: `/v1/sync/checkins?crewId=alex-morgan&since=${firstBody.cursor}`,
      headers: crew,
    });
    const secondBody = second.json() as { items: unknown[]; cursor: number; hasMore: boolean };
    expect(secondBody.items).toHaveLength(5);
    expect(secondBody.hasMore).toBe(false);
    expect(secondBody.cursor).toBe(1005);
  });
});
