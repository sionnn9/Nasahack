import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/server.js";
import { loadConfig } from "../src/config.js";
import { openDatabase, type Db } from "../src/db.js";

export const crew = { authorization: "Bearer crew-demo-key" };
export const ground = { authorization: "Bearer ground-demo-key" };
export const device = { authorization: "Bearer device-demo-key" };

export type TestApp = {
  app: FastifyInstance;
  advance: (ms: number) => void;
  now: () => Date;
  setClock: (date: Date) => void;
};

export async function makeApp(
  env: Record<string, string> = {},
  options: { db?: Db; start?: Date } = {},
): Promise<TestApp> {
  let clock = options.start ?? new Date("2026-01-01T00:00:00.000Z");
  const config = loadConfig({ DB_PATH: ":memory:", ...env } as NodeJS.ProcessEnv);
  const app = await buildApp(config, {
    db: options.db,
    now: () => clock,
    scheduler: false,
  });
  return {
    app,
    advance: (ms) => {
      clock = new Date(clock.getTime() + ms);
    },
    now: () => clock,
    setClock: (date) => {
      clock = date;
    },
  };
}

export function packetBody(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    crewId: "alex-morgan",
    kind: "handoff",
    createdAt: "2026-01-01T00:00:00.000Z",
    includePrivate: false,
    private: false,
    title: "Handoff",
    delaySeconds: 0,
    payload: {
      id: `handoff-${id}`,
      crewId: "alex-morgan",
      createdAt: "2026-01-01T00:00:00.000Z",
      includePrivate: false,
      observations: [
        { metric: "mood", value: 2 },
        { metric: "heart_rate", value: 80 },
      ],
      trends: [{ metric: "stress", text: "up" }],
      notes: "steady",
    },
    history: [],
    ...overrides,
  };
}

export function tempDbPath(): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "crewsignal-test-"));
  return {
    path: join(dir, "test.db"),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

export function openMemory(): Db {
  return openDatabase(":memory:");
}
