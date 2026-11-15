import type { FastifyInstance } from "fastify";
import type { Ctx } from "../context.js";
import { requireRole } from "../auth.js";
import { ApiError } from "../errors.js";
import { readLink } from "../link.js";
import { appendAudit } from "../audit.js";
import { getPacketRow, toPacketView, type PacketRow } from "../packets.js";
import { runDueTransitions } from "../scheduler.js";

export function registerSurgeon(app: FastifyInstance, ctx: Ctx) {
  app.get("/v1/surgeon/inbox", async (request) => {
    requireRole(ctx, request, ["ground"]);
    const rows = ctx.db
      .prepare(
        "SELECT * FROM packets WHERE state IN ('delivered','acknowledged') ORDER BY delivered_at DESC, created_at DESC",
      )
      .all() as PacketRow[];
    return {
      packets: rows.map((row) => toPacketView(ctx.db, row)),
      serverTime: ctx.now().toISOString(),
    };
  });

  app.post<{ Params: { id: string } }>("/v1/surgeon/packets/:id/ack", async (request) => {
    requireRole(ctx, request, ["ground"]);
    const row = getPacketRow(ctx.db, request.params.id);
    if (!row) throw new ApiError(404, "NOT_FOUND", "No such packet.");

    if (row.ack_at) {
      // Double acknowledgement is idempotent: the first timestamp wins.
      return {
        packet: toPacketView(ctx.db, row),
        serverTime: ctx.now().toISOString(),
        alreadyAcknowledged: true,
      };
    }

    if (row.state !== "delivered") {
      throw new ApiError(
        409,
        "NOT_DELIVERED",
        "Only a delivered packet can be acknowledged.",
      );
    }

    const now = ctx.now();
    const nowIso = now.toISOString();
    const link = readLink(ctx.db);
    const returnDelayMs = link.effectiveDelaySeconds * 1000;
    // In blackout the acknowledgement is recorded but held: ack_visible_at is
    // left NULL and the scheduler assigns it when the link returns.
    const held = link.state === "blackout";
    const ackVisibleAt = held
      ? null
      : new Date(now.getTime() + returnDelayMs).toISOString();

    ctx.db
      .prepare(
        "UPDATE packets SET ack_at = ?, ack_visible_at = ? WHERE id = ? AND ack_at IS NULL",
      )
      .run(nowIso, ackVisibleAt, row.id);

    // The acknowledgement event is written by the scheduler when the return
    // delay actually elapses, so the crew's history never shows it early.
    appendAudit(
      ctx.db,
      "ground",
      "packet.ack",
      row.id,
      { returnDelaySeconds: held ? null : returnDelayMs / 1000, heldForBlackout: held, crewId: row.crew_id },
      nowIso,
    );

    runDueTransitions(ctx, now);
    const updated = getPacketRow(ctx.db, row.id)!;
    return {
      packet: toPacketView(ctx.db, updated),
      serverTime: nowIso,
      alreadyAcknowledged: false,
    };
  });
}
