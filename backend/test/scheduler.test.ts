import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/server.js";
import { loadConfig } from "../src/config.js";
import { openDatabase } from "../src/db.js";
import { runDueTransitions } from "../src/scheduler.js";
import { crew, ground, makeApp, packetBody, tempDbPath, type TestApp } from "./helpers.js";

let current: TestApp | null = null;

afterEach(async () => {
  await current?.app.close();
  current = null;
});

async function delayedStation() {
  current = await makeApp();
  const { app } = current;
  await app.inject({
    method: "PUT",
    url: "/v1/link",
    headers: crew,
    payload: { state: "delayed", environment: "station" },
  });
  await app.inject({ method: "POST", url: "/v1/packets", headers: crew, payload: packetBody("s1") });
  return current;
}

describe("delivery and acknowledgement timing", () => {
  it("delivers only after the visible time and exactly once", async () => {
    const test = await delayedStation();
    expect(runDueTransitions(test.app.ctx, test.now()).delivered).toEqual([]);
    test.advance(1000);
    expect(runDueTransitions(test.app.ctx, test.now()).delivered).toEqual(["s1"]);
    test.advance(5000);
    expect(runDueTransitions(test.app.ctx, test.now()).delivered).toEqual([]);
    const events = test.app.ctx.db
      .prepare("SELECT COUNT(*) AS c FROM packet_events WHERE packet_id = 's1' AND state = 'delivered'")
      .get() as { c: number };
    expect(events.c).toBe(1);
  });

  it("survives a restart and delivers once, on time", async () => {
    const temp = tempDbPath();
    let clock = new Date("2026-01-01T00:00:00.000Z");
    const config = loadConfig({ DB_PATH: temp.path } as NodeJS.ProcessEnv);
    const first = await buildApp(config, { now: () => clock, scheduler: false });
    await first.inject({
      method: "PUT",
      url: "/v1/link",
      headers: crew,
      payload: { state: "delayed", environment: "station" },
    });
    await first.inject({
      method: "POST",
      url: "/v1/packets",
      headers: crew,
      payload: packetBody("restart-1"),
    });
    await first.close();

    clock = new Date(clock.getTime() + 1000);
    const db = openDatabase(temp.path);
    const second = await buildApp(config, { db, now: () => clock, scheduler: false });
    expect(runDueTransitions(second.ctx, clock).delivered).toEqual(["restart-1"]);
    expect(runDueTransitions(second.ctx, clock).delivered).toEqual([]);
    const row = db.prepare("SELECT state FROM packets WHERE id = 'restart-1'").get() as {
      state: string;
    };
    expect(row.state).toBe("delivered");
    await second.close();
    db.close();
    temp.cleanup();
  });

  it("rejects acknowledgement before delivery", async () => {
    const test = await delayedStation();
    const response = await test.app.inject({
      method: "POST",
      url: "/v1/surgeon/packets/s1/ack",
      headers: ground,
    });
    expect(response.statusCode).toBe(409);
    expect((response.json() as { error: { code: string } }).error.code).toBe("NOT_DELIVERED");
  });

  it("makes the ack visible only after the return delay", async () => {
    const test = await delayedStation();
    test.advance(1000);
    runDueTransitions(test.app.ctx, test.now());

    const ack = await test.app.inject({
      method: "POST",
      url: "/v1/surgeon/packets/s1/ack",
      headers: ground,
    });
    const acked = (ack.json() as { packet: { state: string; ackVisibleAt: string } }).packet;
    expect(acked.state).toBe("delivered");

    test.advance(500);
    const early = await test.app.inject({
      method: "GET",
      url: "/v1/packets/s1?crewId=alex-morgan",
      headers: crew,
    });
    expect((early.json() as { packet: { state: string } }).packet.state).toBe("delivered");

    test.advance(600);
    runDueTransitions(test.app.ctx, test.now());
    const after = await test.app.inject({
      method: "GET",
      url: "/v1/packets/s1?crewId=alex-morgan",
      headers: crew,
    });
    expect((after.json() as { packet: { state: string } }).packet.state).toBe("acknowledged");
  });

  it("treats a second acknowledgement as idempotent", async () => {
    const test = await delayedStation();
    test.advance(1000);
    runDueTransitions(test.app.ctx, test.now());
    const first = await test.app.inject({
      method: "POST",
      url: "/v1/surgeon/packets/s1/ack",
      headers: ground,
    });
    const second = await test.app.inject({
      method: "POST",
      url: "/v1/surgeon/packets/s1/ack",
      headers: ground,
    });
    expect(second.statusCode).toBe(200);
    expect((second.json() as { alreadyAcknowledged: boolean }).alreadyAcknowledged).toBe(true);
    const firstAck = (first.json() as { packet: { ackAt: string } }).packet.ackAt;
    const secondAck = (second.json() as { packet: { ackAt: string } }).packet.ackAt;
    expect(secondAck).toBe(firstAck);
  });

  it("hides undelivered packets from the surgeon inbox", async () => {
    const test = await delayedStation();
    const inbox = await test.app.inject({
      method: "GET",
      url: "/v1/surgeon/inbox",
      headers: ground,
    });
    expect((inbox.json() as { packets: unknown[] }).packets).toHaveLength(0);
    test.advance(1000);
    runDueTransitions(test.app.ctx, test.now());
    const later = await test.app.inject({
      method: "GET",
      url: "/v1/surgeon/inbox",
      headers: ground,
    });
    expect((later.json() as { packets: unknown[] }).packets).toHaveLength(1);
  });
});
