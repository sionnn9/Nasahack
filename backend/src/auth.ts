import type { FastifyReply, FastifyRequest } from "fastify";
import { ApiError } from "./errors.js";
import type { Ctx } from "./context.js";
import type { Role } from "./types.js";

/**
 * Three shared keys map to three roles. Anything else is 401.
 * The SSE route accepts the key as a query token only because EventSource
 * cannot set headers.
 */
export function roleFor(ctx: Ctx, request: FastifyRequest): Role | null {
  const header = request.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  // EventSource cannot set headers, so the stream route alone accepts ?token=.
  const query = request.url.startsWith("/v1/stream")
    ? ((request.query as { token?: string } | undefined)?.token ?? null)
    : null;
  const token = bearer ?? query;
  if (!token) return null;
  if (token === ctx.config.crewKey) return "crew";
  if (token === ctx.config.groundKey) return "ground";
  if (token === ctx.config.deviceKey) return "device";
  return null;
}

export function requireRole(
  ctx: Ctx,
  request: FastifyRequest,
  allowed: Role[],
): Role {
  const role = roleFor(ctx, request);
  if (!role) {
    throw new ApiError(401, "UNAUTHORIZED", "Send Authorization: Bearer <key> with a valid key.");
  }
  if (!allowed.includes(role)) {
    throw new ApiError(403, "FORBIDDEN", "This key is not allowed to use this route.");
  }
  return role;
}

export function unauthorized(reply: FastifyReply) {
  return reply
    .status(401)
    .send({ error: { code: "UNAUTHORIZED", message: "A valid API key is required." } });
}
