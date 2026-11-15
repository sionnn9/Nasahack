import type { FastifyInstance } from "fastify";
import type { Ctx } from "../context.js";
import { readLink } from "../link.js";

export function registerHealth(app: FastifyInstance, ctx: Ctx) {
  app.get("/health", async () => {
    const link = readLink(ctx.db);
    return {
      ok: true,
      time: ctx.now().toISOString(),
      link: {
        state: link.state,
        environment: link.environment,
        scenarioDelaySeconds: link.scenarioDelaySeconds,
        effectiveDelaySeconds: link.effectiveDelaySeconds,
        delayScale: link.delayScale,
      },
    };
  });
}
