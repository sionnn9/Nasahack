import { afterEach, describe, expect, it } from "vitest";
import { crew, ground, makeApp, packetBody, type TestApp } from "./helpers.js";

let current: TestApp | null = null;

afterEach(async () => {
  await current?.app.close();
  current = null;
});

describe("crewId scoping is required", () => {
  it("rejects a crew packet read without crewId", async () => {
    const test = await makeApp();
    current = test;
    await test.app.inject({
      method: "POST",
      url: "/v1/packets",
      headers: crew,
      payload: packetBody("c1"),
    });

    const response = await test.app.inject({
      method: "GET",
      url: "/v1/packets/c1",
      headers: crew,
    });
    expect(response.statusCode).toBe(400);
    expect((response.json() as { error: { code: string } }).error.code).toBe(
      "CREW_ID_REQUIRED",
    );

    const scoped = await test.app.inject({
      method: "GET",
      url: "/v1/packets/c1?crewId=alex-morgan",
      headers: crew,
    });
    expect(scoped.statusCode).toBe(200);
  });

  it("lets the ground key read a packet without crewId", async () => {
    const test = await makeApp();
    current = test;
    await test.app.inject({
      method: "POST",
      url: "/v1/packets",
      headers: crew,
      payload: packetBody("c2"),
    });
    const response = await test.app.inject({
      method: "GET",
      url: "/v1/packets/c2",
      headers: ground,
    });
    expect(response.statusCode).toBe(200);
  });

  it("rejects a crew sync pull without crewId", async () => {
    const test = await makeApp();
    current = test;
    const response = await test.app.inject({
      method: "GET",
      url: "/v1/sync/observations?since=0",
      headers: crew,
    });
    expect(response.statusCode).toBe(400);
    expect((response.json() as { error: { code: string } }).error.code).toBe(
      "CREW_ID_REQUIRED",
    );
  });

  it("lets the ground key pull sync rows without crewId", async () => {
    const test = await makeApp();
    current = test;
    await test.app.inject({
      method: "POST",
      url: "/v1/sync/observations",
      headers: crew,
      payload: [
        {
          id: "o1",
          crewId: "alex-morgan",
          metric: "heart_rate",
          value: 70,
          unit: "bpm",
          observedAt: "2026-01-01T00:00:00.000Z",
          enteredAt: "2026-01-01T00:00:00.000Z",
          lane: "live",
          method: "ppg_wrist",
          context: "rest",
          quality: "ok",
          qualityReason: null,
          environment: "mars_transit",
          procedureVersion: "demo-procedures-1",
        },
      ],
    });
    const response = await test.app.inject({
      method: "GET",
      url: "/v1/sync/observations?since=0",
      headers: ground,
    });
    expect(response.statusCode).toBe(200);
    expect((response.json() as { items: unknown[] }).items).toHaveLength(1);
  });
});
