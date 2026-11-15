import type { FastifyInstance } from "fastify";
import { ApiError, parseOrThrow } from "../errors.js";
import type { Ctx } from "../context.js";
import { requireRole } from "../auth.js";
import {
  checkInSyncSchema,
  encounterSyncSchema,
  observationSyncSchema,
  syncedCollections,
  type SyncCollection,
} from "../schemas.js";
import { currentSeq, nextSeq } from "../db.js";
import { appendAudit } from "../audit.js";
import { reconcileObservation } from "../sync.js";
import { plausibilityRange } from "../quality/gate.js";
import type { Observation, Quality } from "../types.js";

type CollectionParams = { collection: string };

const privateMetrics = new Set(["mood", "stress", "rested", "connected"]);
const privateCheckInFields = ["mood", "stress", "rested", "connected", "details"] as const;

/** Private answers stay on the device unless the query opts in explicitly. */
function includesPrivate(request: { query: unknown }): boolean {
  const value = (request.query as { includePrivate?: string }).includePrivate;
  return value === "true" || value === "1";
}

function assertCollection(value: string): SyncCollection {
  if (!(syncedCollections as readonly string[]).includes(value)) {
    throw new ApiError(
      404,
      "UNKNOWN_COLLECTION",
      `Collection must be one of ${syncedCollections.join(", ")}.`,
    );
  }
  return value as SyncCollection;
}

type ObservationRow = {
  id: string;
  crew_id: string;
  metric: string;
  value: number | null;
  unit: string;
  observed_at: string;
  entered_at: string;
  lane: string;
  method: string;
  context: string;
  quality: Quality;
  quality_reason: string | null;
  environment: string;
  procedure_version: string;
  raw_value: string | null;
  updated_seq: number;
};

function rowToObservation(row: ObservationRow): Observation {
  const observation: Observation = {
    id: row.id,
    crewId: row.crew_id,
    metric: row.metric as Observation["metric"],
    value: row.value,
    unit: row.unit,
    observedAt: row.observed_at,
    enteredAt: row.entered_at,
    lane: row.lane as Observation["lane"],
    method: row.method,
    context: row.context as Observation["context"],
    quality: row.quality,
    qualityReason: row.quality_reason,
    environment: row.environment,
    procedureVersion: row.procedure_version,
  };
  if (row.raw_value !== null) observation.rawValue = row.raw_value;
  return observation;
}

export function registerSync(app: FastifyInstance, ctx: Ctx) {
  app.post<{ Params: CollectionParams }>("/v1/sync/:collection", async (request) => {
    const role = requireRole(ctx, request, ["crew"]);
    const collection = assertCollection(request.params.collection);
    const includePrivate = includesPrivate(request);
    const now = ctx.now();
    const nowIso = now.toISOString();
    let applied = 0;
    let skipped = 0;

    if (collection === "observations") {
      const items = parseOrThrow(observationSyncSchema, request.body);
      const incoming = items as Observation[];
      const insert = ctx.db.prepare(
        `INSERT INTO observations (
          id, crew_id, metric, value, unit, observed_at, entered_at, lane, method,
          context, quality, quality_reason, environment, procedure_version, raw_value, updated_seq
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      const updateQuality = ctx.db.prepare(
        `UPDATE observations
         SET quality = ?, quality_reason = ?, raw_value = ?, updated_seq = ?
         WHERE id = ?`,
      );

      for (const item of incoming) {
        if (!includePrivate && privateMetrics.has(item.metric)) {
          skipped += 1;
          continue;
        }
        const existing = ctx.db
          .prepare("SELECT id FROM observations WHERE id = ?")
          .get(item.id) as { id: string } | undefined;

        // Gate parity: the stored quality can only become stricter.
        const reconciled = reconcileObservation(item, now);
        const parityQuality: Quality = reconciled.quality;

        if (existing) {
          // Observations are immutable except the quality fields.
          const seq = nextSeq(ctx.db);
          updateQuality.run(
            parityQuality,
            reconciled.qualityReason,
            item.rawValue ?? null,
            seq,
            item.id,
          );
        } else {
          const seq = nextSeq(ctx.db);
          insert.run(
            item.id,
            item.crewId,
            item.metric,
            item.value,
            item.unit,
            item.observedAt,
            item.enteredAt,
            item.lane,
            item.method,
            item.context,
            parityQuality,
            reconciled.qualityReason,
            item.environment,
            item.procedureVersion,
            item.rawValue ?? null,
            seq,
          );
        }
        applied += 1;
      }
    } else {
      const schema = collection === "checkins" ? checkInSyncSchema : encounterSyncSchema;
      const items = parseOrThrow(schema, request.body) as Array<{ id: string; crewId: string }>;
      const upsert = ctx.db.prepare(
        `INSERT INTO ${collection} (id, crew_id, json, updated_seq) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET crew_id = excluded.crew_id, json = excluded.json,
           updated_seq = excluded.updated_seq`,
      );
      for (const original of items) {
        const item = original as Record<string, unknown> & { id: string; crewId: string };
        let stored: Record<string, unknown> = item;
        if (!includePrivate) {
          stored = { ...item };
          for (const field of privateCheckInFields) {
            if (field in stored) {
              delete stored[field];
              skipped += 1;
            }
          }
        }
        upsert.run(item.id, item.crewId, JSON.stringify(stored), nextSeq(ctx.db));
        applied += 1;
      }
    }

    const cursor = currentSeq(ctx.db);
    appendAudit(
      ctx.db,
      role,
      "sync.push",
      collection,
      { applied, skipped, cursor, includePrivate },
      nowIso,
    );
    return { applied, skipped, includePrivate, cursor, serverTime: nowIso };
  });

  app.get<{ Params: CollectionParams; Querystring: { since?: string; crewId?: string } }>(
    "/v1/sync/:collection",
    async (request) => {
      const role = requireRole(ctx, request, ["crew"]);
      const collection = assertCollection(request.params.collection);
      const since = Number(request.query.since ?? 0);
      if (!Number.isFinite(since) || since < 0) {
        throw new ApiError(400, "BAD_CURSOR", "since must be a non-negative number.");
      }
      const crewId = request.query.crewId;

      if (collection === "observations") {
        const rows = ctx.db
          .prepare(
            `SELECT * FROM observations
             WHERE updated_seq > ? AND (? IS NULL OR crew_id = ?)
             ORDER BY updated_seq ASC LIMIT 1000`,
          )
          .all(since, crewId ?? null, crewId ?? null) as ObservationRow[];
        const items = rows.map(rowToObservation).map((item) => ({
          ...item,
          plausibleRange: plausibilityRange(item.metric),
        }));
        return {
          items,
          cursor: currentSeq(ctx.db),
          serverTime: ctx.now().toISOString(),
          gate: "server-side, demo rules",
        };
      }

      const rows = ctx.db
        .prepare(
          `SELECT json FROM ${collection}
           WHERE updated_seq > ? AND (? IS NULL OR crew_id = ?)
           ORDER BY updated_seq ASC LIMIT 1000`,
        )
        .all(since, crewId ?? null, crewId ?? null) as Array<{ json: string }>;
      return {
        items: rows.map((row) => JSON.parse(row.json) as unknown),
        cursor: currentSeq(ctx.db),
        serverTime: ctx.now().toISOString(),
      };
    },
  );
}
