import type { FastifyInstance } from "fastify";
import type { Ctx } from "../context.js";
import { requireRole } from "../auth.js";
import { ApiError, parseOrThrow } from "../errors.js";
import { outboxItemSchema } from "../schemas.js";
import { appendAudit } from "../audit.js";
import { readLink } from "../link.js";
import {
  getPacketRow,
  recordEvent,
  stripPrivate,
  toPacketView,
} from "../packets.js";

export function registerPackets(app: FastifyInstance, ctx: Ctx) {
  app.post("/v1/packets", async (request, reply) => {
    const role = requireRole(ctx, request, ["crew"]);
    if (role !== "crew") throw new ApiError(403, "FORBIDDEN", "Crew key required.");
    const body = parseOrThrow(outboxItemSchema, request.body);

    const existing = getPacketRow(ctx.db, body.id);
    if (existing) {
      return reply.status(200).send({
        packet: toPacketView(ctx.db, existing),
        serverTime: ctx.now().toISOString(),
        created: false,
      });
    }

    const link = readLink(ctx.db);
    if (link.state === "blackout") {
      appendAudit(
        ctx.db,
        "crew",
        "packet.rejected",
        body.id,
        { code: "LINK_BLACKOUT", crewId: body.crewId },
        ctx.now().toISOString(),
      );
      throw new ApiError(
        503,
        "LINK_BLACKOUT",
        "The link is in blackout. Nothing was stored. The packet stays queued on the device.",
      );
    }

    const now = ctx.now();
    const nowIso = now.toISOString();
    const delayMs = link.effectiveDelaySeconds * 1000;
    const visibleAt = new Date(now.getTime() + delayMs).toISOString();

    const stored = body.includePrivate
      ? { payload: body.payload, removed: [] as string[] }
      : stripPrivate(body.payload);

    ctx.db
      .prepare(
        `INSERT INTO packets (
          id, crew_id, kind, title, payload_json, private, include_private, state,
          created_at, sent_at, visible_at, delay_seconds
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'sent', ?, ?, ?, ?)`,
      )
      .run(
        body.id,
        body.crewId,
        body.kind,
        body.title,
        JSON.stringify(stored.payload),
        body.private ? 1 : 0,
        body.includePrivate ? 1 : 0,
        nowIso,
        nowIso,
        visibleAt,
        delayMs / 1000,
      );

    recordEvent(
      ctx.db,
      body.id,
      "sent",
      nowIso,
      link.state === "live"
        ? "Link is live. Server accepted the packet."
        : `Server accepted the packet. Delivery visible in ${Math.round(delayMs / 1000)} s.`,
    );
    appendAudit(
      ctx.db,
      "crew",
      "packet.sent",
      body.id,
      {
        crewId: body.crewId,
        kind: body.kind,
        delaySeconds: delayMs / 1000,
        stripped: stored.removed,
        includePrivate: body.includePrivate,
      },
      nowIso,
    );

    const row = getPacketRow(ctx.db, body.id)!;
    return reply
      .status(201)
      .send({ packet: toPacketView(ctx.db, row), serverTime: nowIso, created: true });
  });
}
