import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { crew, makeApp, type TestApp } from "./helpers.js";

let current: TestApp | null = null;

afterEach(async () => {
  await current?.app.close();
  current = null;
});

const customKeys = {
  CREW_KEY: "crew-custom-key",
  GROUND_KEY: "ground-custom-key",
  DEVICE_KEY: "device-custom-key",
};

describe("configuration safety", () => {
  it("refuses a non-loopback host while a demo key is in use", () => {
    expect(() =>
      loadConfig({ HOST: "0.0.0.0", DB_PATH: ":memory:" } as NodeJS.ProcessEnv),
    ).toThrow(/Refusing to start/);
    expect(() =>
      loadConfig({
        HOST: "0.0.0.0",
        CREW_KEY: "crew-custom-key",
        DB_PATH: ":memory:",
      } as NodeJS.ProcessEnv),
    ).toThrow(/Refusing to start/);
  });

  it("allows a non-loopback host once every key is replaced", () => {
    const config = loadConfig({
      HOST: "0.0.0.0",
      DB_PATH: ":memory:",
      ...customKeys,
    } as NodeJS.ProcessEnv);
    expect(config.host).toBe("0.0.0.0");
  });

  it("allows the demo keys on loopback", () => {
    const config = loadConfig({ HOST: "localhost", DB_PATH: ":memory:" } as NodeJS.ProcessEnv);
    expect(config.host).toBe("localhost");
  });
});

describe("observation quality updates", () => {
  it("does not erase a stored raw value when a later push omits it", async () => {
    const test = await makeApp();
    current = test;
    const base = {
      id: "raw-1",
      crewId: "alex-morgan",
      metric: "heart_rate",
      value: 78,
      unit: "bpm",
      observedAt: new Date(test.now().getTime() - 5 * 60_000).toISOString(),
      enteredAt: test.now().toISOString(),
      lane: "manual",
      method: "cuff",
      context: "rest",
      quality: "ok",
      qualityReason: null,
      environment: "mars_transit",
      procedureVersion: "demo-procedures-1",
    };

    await test.app.inject({
      method: "POST",
      url: "/v1/sync/observations",
      headers: crew,
      payload: [{ ...base, rawValue: "78 (cuff reading)" }],
    });
    await test.app.inject({
      method: "POST",
      url: "/v1/sync/observations",
      headers: crew,
      payload: [{ ...base, quality: "stale" }],
    });

    const row = test.app.ctx.db
      .prepare("SELECT raw_value, quality FROM observations WHERE id = 'raw-1'")
      .get() as { raw_value: string | null; quality: string };
    expect(row.raw_value).toBe("78 (cuff reading)");
    // The stricter client flag is kept; only raw_value must be preserved.
    expect(row.quality).toBe("stale");
  });
});
