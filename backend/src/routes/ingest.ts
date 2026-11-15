import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { ApiError, parseOrThrow } from "../errors.js";
import type { Ctx } from "../context.js";
import { requireRole } from "../auth.js";
import { sampleSchema } from "../schemas.js";
import { gate } from "../quality/gate.js";
import { nextSeq } from "../db.js";
import { readLink } from "../link.js";
import type { Observation, Quality } from "../types.js";

const MAX_SAMPLES_PER_SECOND = 20;

export function registerIngest(app: FastifyInstance, ctx: Ctx) {
  const buckets = new Map<string, { windowStart: number; count: number }>();

  app.post("/v1/ingest/sample", async (request, reply) => {
    requireRole(ctx, request, ["device"]);
    const body = parseOrThrow(sampleSchema, request.body);

    const nowMs = ctx.now().getTime();
    const bucket = buckets.get(body.deviceId) ?? { windowStart: nowMs, count: 0 };
    if (nowMs - bucket.windowStart >= 1000) {
      bucket.windowStart = nowMs;
      bucket.count = 0;
    }
    bucket.count += 1;
    buckets.set(body.deviceId, bucket);
    if (bucket.count > MAX_SAMPLES_PER_SECOND) {
      throw new ApiError(429, "RATE_LIMIT", "Too many samples from this device.");
    }

    // Contact state maps to the same quality vocabulary the UI uses.
    let quality: Quality = "ok";
    let artifact: Observation["artifact"] = null;
    if (body.contact === "none") {
      quality = "no_contact";
    } else if (body.contact === "poor") {
      quality = (body.motion ?? 0) > 0.5 ? "motion" : "no_contact";
      if (quality === "motion") artifact = "motion";
    }

    const link = readLink(ctx.db);
    const observation: Observation = {
      id: `dev-${body.deviceId}-${randomUUID()}`,
      crewId: body.crewId,
      metric: body.metric,
      value: body.value,
      unit: body.metric === "heart_rate" ? "bpm" : "",
      observedAt: body.observedAt,
      enteredAt: ctx.now().toISOString(),
      lane: "live",
      method: "ppg_finger",
      context: "rest",
      quality,
      qualityReason: null,
      environment: link.environment,
      procedureVersion: "demo-procedures-1",
    };
    if (artifact) observation.artifact = artifact;

    const result = gate(observation, ctx.now());
    const storedQuality = result.quality;
    const reason = result.qualityReason;
    const seq = nextSeq(ctx.db);

    ctx.db
      .prepare(
        `INSERT INTO observations (
          id, crew_id, metric, value, unit, observed_at, entered_at, lane, method,
          context, quality, quality_reason, environment, procedure_version, raw_value, updated_seq
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        observation.id,
        observation.crewId,
        observation.metric,
        observation.value,
        observation.unit,
        observation.observedAt,
        observation.enteredAt,
        observation.lane,
        observation.method,
        observation.context,
        storedQuality,
        reason,
        observation.environment,
        observation.procedureVersion,
        null,
        seq,
      );

    ctx.db
      .prepare(
        `INSERT INTO devices (device_id, last_seen_ms) VALUES (?, ?)
         ON CONFLICT(device_id) DO UPDATE SET last_seen_ms = excluded.last_seen_ms`,
      )
      .run(body.deviceId, nowMs);

    const stored: Observation = { ...observation, quality: storedQuality, qualityReason: reason };
    ctx.bus.emit({ type: "sample", data: stored });

    return reply.status(202).send({
      accepted: result.accepted,
      observation: stored,
      cursor: seq,
      serverTime: ctx.now().toISOString(),
    });
  });
}
