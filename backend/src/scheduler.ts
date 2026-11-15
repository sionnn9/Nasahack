import type { Ctx } from "./context.js";
import { appendAudit } from "./audit.js";
import { getPacketRow, recordEvent, toPacketView, type PacketRow } from "./packets.js";

/**
 * All transitions are computed from stored timestamps and guarded by the
 * previous state, so a restart neither loses a delivery nor repeats one.
 */
export type TickResult = {
  delivered: string[];
  acknowledged: string[];
};

export function runDueTransitions(ctx: Ctx, now: Date = ctx.now()): TickResult {
  const nowIso = now.toISOString();
  const delivered: string[] = [];
  const acknowledged: string[] = [];

  const dueDeliveries = ctx.db
    .prepare(
      "SELECT * FROM packets WHERE state = 'sent' AND visible_at IS NOT NULL AND visible_at <= ? ORDER BY visible_at ASC",
    )
    .all(nowIso) as PacketRow[];

  for (const row of dueDeliveries) {
    const update = ctx.db
      .prepare(
        "UPDATE packets SET state = 'delivered', delivered_at = ? WHERE id = ? AND state = 'sent'",
      )
      .run(nowIso, row.id);
    if (update.changes !== 1) continue;

    recordEvent(
      ctx.db,
      row.id,
      "delivered",
      nowIso,
      "Ground station received the packet.",
    );
    appendAudit(
      ctx.db,
      "system",
      "packet.delivered",
      row.id,
      { crewId: row.crew_id, delaySeconds: row.delay_seconds },
      nowIso,
    );
    delivered.push(row.id);
    const updated = getPacketRow(ctx.db, row.id);
    if (updated) ctx.bus.emit({ type: "packet.delivered", data: toPacketView(ctx.db, updated) });
  }

  const dueAcks = ctx.db
    .prepare(
      `SELECT * FROM packets
       WHERE state = 'delivered' AND ack_at IS NOT NULL AND ack_visible_at IS NOT NULL
         AND ack_visible_at <= ? ORDER BY ack_visible_at ASC`,
    )
    .all(nowIso) as PacketRow[];

  for (const row of dueAcks) {
    const update = ctx.db
      .prepare(
        `UPDATE packets SET state = 'acknowledged'
         WHERE id = ? AND state = 'delivered' AND ack_visible_at <= ?`,
      )
      .run(row.id, nowIso);
    if (update.changes !== 1) continue;

    recordEvent(
      ctx.db,
      row.id,
      "acknowledged",
      nowIso,
      "The return delay elapsed. The crew can now see the acknowledgement.",
    );
    appendAudit(
      ctx.db,
      "system",
      "packet.acknowledged",
      row.id,
      { crewId: row.crew_id },
      nowIso,
    );
    acknowledged.push(row.id);
    const updated = getPacketRow(ctx.db, row.id);
    if (updated) {
      ctx.bus.emit({ type: "packet.acknowledged", data: toPacketView(ctx.db, updated) });
    }
  }

  return { delivered, acknowledged };
}

export function startScheduler(ctx: Ctx, intervalMs = 1000): () => void {
  runDueTransitions(ctx);
  const timer = setInterval(() => {
    try {
      runDueTransitions(ctx);
    } catch (error) {
      console.error("Scheduler tick failed", error);
    }
  }, intervalMs);
  return () => clearInterval(timer);
}
