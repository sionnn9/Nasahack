import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { crew, makeApp, packetBody, type TestApp } from "./helpers.js";

let current: TestApp | null = null;

afterEach(async () => {
  await current?.app.close();
  current = null;
});

async function setup(): Promise<TestApp> {
  current = await makeApp();
  return current;
}

describe("packet ingest", () => {
  it("is idempotent by client id", async () => {
    const { app } = await setup();
    const first = await app.inject({
      method: "POST",
      url: "/v1/packets",
      headers: crew,
      payload: packetBody("p1"),
    });
    const second = await app.inject({
      method: "POST",
      url: "/v1/packets",
      headers: crew,
      payload: packetBody("p1"),
    });
    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(200);
    expect((second.json() as { created: boolean }).created).toBe(false);
    const count = app.ctx.db.prepare("SELECT COUNT(*) AS c FROM packets").get() as { c: number };
    expect(count.c).toBe(1);
    const events = app.ctx.db
      .prepare("SELECT COUNT(*) AS c FROM packet_events WHERE packet_id = 'p1'")
      .get() as { c: number };
    expect(events.c).toBe(1);
  });

  it("rejects during blackout and stores nothing", async () => {
    const { app } = await setup();
    await app.inject({
      method: "PUT",
      url: "/v1/link",
      headers: crew,
      payload: { state: "blackout", environment: "mars_transit" },
    });
    const response = await app.inject({
      method: "POST",
      url: "/v1/packets",
      headers: crew,
      payload: packetBody("p2"),
    });
    expect(response.statusCode).toBe(503);
    expect((response.json() as { error: { code: string } }).error.code).toBe("LINK_BLACKOUT");
    const count = app.ctx.db.prepare("SELECT COUNT(*) AS c FROM packets").get() as { c: number };
    expect(count.c).toBe(0);
  });

  it("strips private fields unless explicitly shared", async () => {
    const { app } = await setup();
    const hidden = await app.inject({
      method: "POST",
      url: "/v1/packets",
      headers: crew,
      payload: packetBody("p3", { includePrivate: false }),
    });
    const shared = await app.inject({
      method: "POST",
      url: "/v1/packets",
      headers: crew,
      payload: packetBody("p4", { includePrivate: true }),
    });
    const hiddenPayload = (hidden.json() as { packet: { payload: Record<string, unknown> } }).packet
      .payload;
    const sharedPayload = (shared.json() as { packet: { payload: Record<string, unknown> } }).packet
      .payload;
    expect(hiddenPayload.observations).toEqual([{ metric: "heart_rate", value: 80 }]);
    expect(hiddenPayload.trends).toEqual([]);
    expect(sharedPayload.observations).toHaveLength(2);
    const sharedTrends = sharedPayload.trends as Array<{ metric: string }>;
    expect(sharedTrends[0]?.metric).toBe("stress");
  });

  it("sets the visible time from the compressed scenario delay", async () => {
    const { app, advance } = await setup();
    await app.inject({
      method: "PUT",
      url: "/v1/link",
      headers: crew,
      payload: { state: "delayed", environment: "station" },
    });
    const created = await app.inject({
      method: "POST",
      url: "/v1/packets",
      headers: crew,
      payload: packetBody("p5"),
    });
    const packet = (created.json() as { packet: { sentAt: string; visibleAt: string } }).packet;
    expect(new Date(packet.visibleAt).getTime() - new Date(packet.sentAt).getTime()).toBe(1000);
    advance(500);
    const early = await app.inject({
      method: "GET",
      url: "/v1/packets/p5?crewId=alex-morgan",
      headers: crew,
    });
    expect((early.json() as { packet: { state: string } }).packet.state).toBe("sent");
  });

  it("scopes packet reads to the named crew member", async () => {
    const { app } = await setup();
    await app.inject({
      method: "POST",
      url: "/v1/packets",
      headers: crew,
      payload: packetBody("p6"),
    });
    const mine = await app.inject({
      method: "GET",
      url: "/v1/packets/p6?crewId=alex-morgan",
      headers: crew,
    });
    const other = await app.inject({
      method: "GET",
      url: "/v1/packets/p6?crewId=kenji-sato",
      headers: crew,
    });
    expect(mine.statusCode).toBe(200);
    expect(other.statusCode).toBe(404);
  });

  it("rejects unauthenticated requests with a stable error shape", async () => {
    const { app } = await setup();
    const response = await app.inject({ method: "GET", url: "/v1/link" });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Send Authorization: Bearer <key> with a valid key.",
      },
    });
  });
});

export type { FastifyInstance };
