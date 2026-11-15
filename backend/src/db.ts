import Database from "better-sqlite3";
import fs from "node:fs";
import nodePath from "node:path";

/**
 * SQLite storage. Timestamps are ISO UTC strings; ordering uses them directly
 * because they are lexicographically sortable in that form.
 *
 * Nothing here decides clinical meaning. The server only stores, routes,
 * delays and audits.
 */
export type Db = Database.Database;

const schema = `
CREATE TABLE IF NOT EXISTS packets (
  id TEXT PRIMARY KEY,
  crew_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  private INTEGER NOT NULL DEFAULT 0,
  include_private INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL,
  created_at TEXT NOT NULL,
  sent_at TEXT,
  visible_at TEXT,
  delivered_at TEXT,
  ack_at TEXT,
  ack_visible_at TEXT,
  delay_seconds REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS packet_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  packet_id TEXT NOT NULL,
  state TEXT NOT NULL,
  at TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS packet_events_packet ON packet_events (packet_id, at);

CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  crew_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL,
  unit TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  entered_at TEXT NOT NULL,
  lane TEXT NOT NULL,
  method TEXT NOT NULL,
  context TEXT NOT NULL,
  quality TEXT NOT NULL,
  quality_reason TEXT,
  environment TEXT NOT NULL,
  procedure_version TEXT NOT NULL,
  raw_value TEXT,
  updated_seq INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS observations_seq ON observations (updated_seq);
CREATE INDEX IF NOT EXISTS observations_crew ON observations (crew_id, observed_at);

CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  crew_id TEXT NOT NULL,
  json TEXT NOT NULL,
  updated_seq INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS encounters (
  id TEXT PRIMARY KEY,
  crew_id TEXT NOT NULL,
  json TEXT NOT NULL,
  updated_seq INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS link_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  state TEXT NOT NULL,
  environment TEXT NOT NULL,
  delay_scale REAL NOT NULL,
  changed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  ref TEXT NOT NULL DEFAULT '',
  detail_json TEXT NOT NULL DEFAULT '{}',
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_seq (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  value INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT PRIMARY KEY,
  last_seen_ms INTEGER NOT NULL
);
`;

export function openDatabase(path: string, delayScale = 1): Db {
  if (path !== ":memory:") {
    fs.mkdirSync(nodePath.dirname(path), { recursive: true });
  }
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(schema);

  const now = new Date().toISOString();
  db.prepare(
    `INSERT OR IGNORE INTO link_state (id, state, environment, delay_scale, changed_at)
     VALUES (1, 'live', 'mars_transit', ?, ?)`,
  ).run(delayScale, now);
  db.prepare(`INSERT OR IGNORE INTO sync_seq (id, value) VALUES (1, 0)`).run();
  return db;
}

export function nextSeq(db: Db): number {
  db.prepare("UPDATE sync_seq SET value = value + 1 WHERE id = 1").run();
  const row = db.prepare("SELECT value FROM sync_seq WHERE id = 1").get() as {
    value: number;
  };
  return row.value;
}

export function currentSeq(db: Db): number {
  const row = db.prepare("SELECT value FROM sync_seq WHERE id = 1").get() as {
    value: number;
  };
  return row.value;
}
