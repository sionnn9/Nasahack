import type { FastifyInstance } from "fastify";
import type { Ctx, SseEvent } from "../context.js";
import { requireRole } from "../auth.js";

export function registerStream(app: FastifyInstance, ctx: Ctx) {
  app.get("/v1/stream", async (request, reply) => {
    requireRole(ctx, request, ["crew", "ground"]);

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    reply.raw.write(": connected\n\n");

    const send = (event: SseEvent) => {
      if (reply.raw.writableEnded) return;
      reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
    };

    const unsubscribe = ctx.bus.subscribe(send);
    const heartbeat = setInterval(() => {
      if (reply.raw.writableEnded) return;
      reply.raw.write(": heartbeat\n\n");
    }, 15_000);

    let closed = false;
    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      unsubscribe();
    };

    request.raw.on("close", cleanup);
    request.raw.on("error", cleanup);
    reply.raw.on("close", cleanup);
    reply.raw.on("error", cleanup);
    app.addHook("onClose", async () => cleanup());
  });
}
