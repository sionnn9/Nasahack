import type { FastifyInstance } from "fastify";
import type { Ctx } from "../context.js";
import { requireRole } from "../auth.js";
import { verifyAudit } from "../audit.js";

export function registerAudit(app: FastifyInstance, ctx: Ctx) {
  app.get("/v1/audit/verify", async (request) => {
    requireRole(ctx, request, ["ground"]);
    const result = verifyAudit(ctx.db);
    return {
      ...result,
      rows: ctx.db.prepare("SELECT COUNT(*) AS count FROM audit_log").get(),
      serverTime: ctx.now().toISOString(),
    };
  });
}
