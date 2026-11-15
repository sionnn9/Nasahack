import type { Db } from "./db.js";
import type { EnvironmentKey, LinkState } from "./types.js";

/**
 * Scenario one-way delays in seconds. These are demo link estimates, not
 * physics: DELAY_SCALE compresses them for a walkthrough.
 */
export const SCENARIO_DELAYS: Record<EnvironmentKey, number> = {
  mars_transit: 1200,
  station: 1,
  lunar_base: 1.3,
  rover: 2,
  remote_clinic: 0,
};

export const environmentKeys: EnvironmentKey[] = [
  "mars_transit",
  "station",
  "lunar_base",
  "rover",
  "remote_clinic",
];

export type LinkRow = {
  state: LinkState;
  environment: EnvironmentKey;
  delayScale: number;
  changedAt: string;
};

export type LinkView = LinkRow & {
  scenarioDelaySeconds: number;
  effectiveDelaySeconds: number;
};

export function effectiveDelayMs(
  state: LinkState,
  environment: EnvironmentKey,
  delayScale: number,
): number {
  if (state !== "delayed") return 0;
  return SCENARIO_DELAYS[environment] * 1000 * delayScale;
}

export function linkView(row: LinkRow): LinkView {
  return {
    ...row,
    scenarioDelaySeconds: SCENARIO_DELAYS[row.environment],
    effectiveDelaySeconds: effectiveDelayMs(row.state, row.environment, row.delayScale) / 1000,
  };
}

export function readLink(db: Db): LinkView {
  const row = db
    .prepare("SELECT state, environment, delay_scale, changed_at FROM link_state WHERE id = 1")
    .get() as {
    state: LinkState;
    environment: EnvironmentKey;
    delay_scale: number;
    changed_at: string;
  };
  return linkView({
    state: row.state,
    environment: row.environment,
    delayScale: row.delay_scale,
    changedAt: row.changed_at,
  });
}

export function writeLink(
  db: Db,
  state: LinkState,
  environment: EnvironmentKey,
  at: string = new Date().toISOString(),
): LinkView {
  db.prepare("UPDATE link_state SET state = ?, environment = ?, changed_at = ? WHERE id = 1").run(
    state,
    environment,
    at,
  );
  return readLink(db);
}
