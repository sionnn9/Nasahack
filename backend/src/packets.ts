import type { Db } from "./db.js";
import type { OutboxState } from "./types.js";

export type PacketRow = {
  id: string;
  crew_id: string;
  kind: string;
  title: string;
  payload_json: string;
  private: number;
  include_private: number;
  state: OutboxState;
  created_at: string;
  sent_at: string | null;
  visible_at: string | null;
  delivered_at: string | null;
  ack_at: string | null;
  ack_visible_at: string | null;
  delay_seconds: number;
};

export type PacketEvent = {
  state: OutboxState;
  at: string;
  note: string;
};

export type PacketView = {
  id: string;
  crewId: string;
  kind: string;
  title: string;
  payload: Record<string, unknown>;
  private: boolean;
  includePrivate: boolean;
  state: OutboxState;
  createdAt: string;
  sentAt: string | null;
  visibleAt: string | null;
  deliveredAt: string | null;
  ackAt: string | null;
  ackVisibleAt: string | null;
  delaySeconds: number;
  history: PacketEvent[];
};

const privateMetrics = new Set(["mood", "stress", "rested", "connected"]);
const privateKeys = new Set(["mood", "stress", "rested", "connected", "details"]);

/**
 * Defense in depth: the client may claim the private block is excluded, but
 * the server removes those fields anyway before storing.
 */
export function stripPrivate(payload: Record<string, unknown>): {
  payload: Record<string, unknown>;
  removed: string[];
} {
  const removed: string[] = [];
  const clone = structuredClone(payload) as Record<string, unknown>;

  for (const key of Object.keys(clone)) {
    if (privateKeys.has(key)) {
      delete clone[key];
      removed.push(key);
    }
  }

  if (Array.isArray(clone.observations)) {
    const kept = (clone.observations as Array<Record<string, unknown>>).filter((entry) => {
      if (typeof entry.metric === "string" && privateMetrics.has(entry.metric)) {
        removed.push(`observations.${String(entry.metric)}`);
        return false;
      }
      return true;
    });
    clone.observations = kept;
  }

  if (Array.isArray(clone.trends)) {
    const kept = (clone.trends as Array<Record<string, unknown>>).filter((entry) => {
      if (typeof entry.metric === "string" && privateMetrics.has(entry.metric)) {
        removed.push(`trends.${String(entry.metric)}`);
        return false;
      }
      return true;
    });
    clone.trends = kept;
  }

  for (const nested of ["checkIn", "checkin"]) {
    const value = clone[nested];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        if (privateKeys.has(key)) {
          delete record[key];
          removed.push(`${nested}.${key}`);
        }
      }
    }
  }

  return { payload: clone, removed };
}

export function recordEvent(
  db: Db,
  packetId: string,
  state: OutboxState,
  at: string,
  note: string,
): void {
  db.prepare("INSERT INTO packet_events (packet_id, state, at, note) VALUES (?, ?, ?, ?)").run(
    packetId,
    state,
    at,
    note,
  );
}

export function getPacketRow(db: Db, id: string): PacketRow | undefined {
  return db.prepare("SELECT * FROM packets WHERE id = ?").get(id) as PacketRow | undefined;
}

export function toPacketView(db: Db, row: PacketRow): PacketView {
  const events = db
    .prepare("SELECT state, at, note FROM packet_events WHERE packet_id = ? ORDER BY id ASC")
    .all(row.id) as PacketEvent[];
  return {
    id: row.id,
    crewId: row.crew_id,
    kind: row.kind,
    title: row.title,
    payload: JSON.parse(row.payload_json) as Record<string, unknown>,
    private: row.private === 1,
    includePrivate: row.include_private === 1,
    state: row.state,
    createdAt: row.created_at,
    sentAt: row.sent_at,
    visibleAt: row.visible_at,
    deliveredAt: row.delivered_at,
    ackAt: row.ack_at,
    ackVisibleAt: row.ack_visible_at,
    delaySeconds: row.delay_seconds,
    history: events,
  };
}

export function listPacketRows(db: Db, crewId: string): PacketRow[] {
  return db
    .prepare("SELECT * FROM packets WHERE crew_id = ? ORDER BY created_at DESC")
    .all(crewId) as PacketRow[];
}
