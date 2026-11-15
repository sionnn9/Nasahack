import type { FastifyInstance } from "fastify";
import type { Ctx, SseEvent } from "../context.js";
import { requireRole } from "../auth.js";
import { ApiError } from "../errors.js";
import type { Role } from "../types.js";

/**
 * A stream subscriber only sees events it is allowed to see. Crew members see
 * their own packets and samples; the ground console sees non-private packet
 * events only.
 */
export function scopeEvent(
  event: SseEvent,
  role: Role,
  crewId: string | null,
): SseEvent | null {
  if (event.type === "link.changed") return event;
  const data = event.data as { crewId?: string; private?: boolean };
  if (event.type === "sample") {
    if (role !== "crew" || !crewId) return null;
    return data.crewId === crewId ? event : null;
  }
  if (role === "crew") {
    return crewId && data.crewId === crewId ? event : null;
  }
  if (role === "ground") {
    return data.private === true ? null : event;
  }
  return null;
}

export function registerStream(app: FastifyInstance, ctx: Ctx) {
  app.get("/v1/stream", async (request, reply) => {
    const role = requireRole(ctx, request, ["crew", "ground"]);
    const crewId = (request.query as { crewId?: string }).crewId ?? null;
    if (role === "crew" && !crewId) {
      throw new ApiError(
        400,
        "CREW_ID_REQUIRED",
        "Crew streams must name the crew member with ?crewId=.",
      );
    }

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
      const scoped = scopeEvent(event, role, crewId);
      if (!scoped) return;
      reply.raw.write(`event: ${scoped.type}\ndata: ${JSON.stringify(scoped.data)}\n\n`);
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
