import type { FastifyInstance } from "fastify";
import type { Ctx } from "../context.js";
import { requireRole } from "../auth.js";
import { parseOrThrow } from "../errors.js";
import { linkPutSchema } from "../schemas.js";
import { readLink, writeLink } from "../link.js";
import { appendAudit } from "../audit.js";

export function registerLink(app: FastifyInstance, ctx: Ctx) {
  app.get("/v1/link", async (request) => {
    requireRole(ctx, request, ["crew", "ground", "device"]);
    return {
      link: readLink(ctx.db),
      serverTime: ctx.now().toISOString(),
    };
  });

  app.put("/v1/link", async (request) => {
    const role = requireRole(ctx, request, ["crew", "ground"]);
    const body = parseOrThrow(linkPutSchema, request.body);
    const previous = readLink(ctx.db);
    const link = writeLink(ctx.db, body.state, body.environment, ctx.now().toISOString());

    appendAudit(
      ctx.db,
      role,
      "link.changed",
      "link",
      {
        from: { state: previous.state, environment: previous.environment },
        to: { state: link.state, environment: link.environment },
        scenarioDelaySeconds: link.scenarioDelaySeconds,
        effectiveDelaySeconds: link.effectiveDelaySeconds,
      },
      ctx.now().toISOString(),
    );

    ctx.bus.emit({ type: "link.changed", data: link });
    return { link, serverTime: ctx.now().toISOString() };
  });
}
