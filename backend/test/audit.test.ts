import { afterEach, describe, expect, it } from "vitest";
import { crew, ground, makeApp, packetBody, type TestApp } from "./helpers.js";

let current: TestApp | null = null;

afterEach(async () => {
  await current?.app.close();
  current = null;
});

async function setup(): Promise<TestApp> {
  current = await makeApp();
  return current;
}

describe("audit chain", () => {
  it("verifies a clean chain", async () => {
    const { app } = await setup();
    await app.inject({
      method: "PUT",
      url: "/v1/link",
      headers: crew,
      payload: { state: "delayed", environment: "station" },
    });
    await app.inject({ method: "POST", url: "/v1/packets", headers: crew, payload: packetBody("a1") });
    const response = await app.inject({
      method: "GET",
      url: "/v1/audit/verify",
      headers: ground,
    });
    const body = response.json() as { ok: boolean; checked: number; firstBrokenId: number | null };
    expect(body.ok).toBe(true);
    expect(body.checked).toBeGreaterThanOrEqual(2);
    expect(body.firstBrokenId).toBeNull();
  });

  it("detects a tampered row and reports the first break", async () => {
    const { app } = await setup();
    await app.inject({
      method: "POST",
      url: "/v1/sync/observations",
      headers: crew,
      payload: [],
    });
    await app.inject({
      method: "PUT",
      url: "/v1/link",
      headers: crew,
      payload: { state: "blackout", environment: "rover" },
    });
    app.ctx.db.prepare("UPDATE audit_log SET action = 'edited' WHERE id = 1").run();
    const response = await app.inject({
      method: "GET",
      url: "/v1/audit/verify",
      headers: ground,
    });
    const body = response.json() as {
      ok: boolean;
      firstBrokenId: number | null;
      expected: string;
      actual: string;
    };
    expect(body.ok).toBe(false);
    expect(body.firstBrokenId).toBe(1);
    expect(body.expected).not.toBe(body.actual);
  });

  it("requires the ground key", async () => {
    const { app } = await setup();
    const response = await app.inject({
      method: "GET",
      url: "/v1/audit/verify",
      headers: crew,
    });
    expect(response.statusCode).toBe(403);
  });
});
