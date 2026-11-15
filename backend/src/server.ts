import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { pathToFileURL } from "node:url";
import { ZodError } from "zod";
import { loadConfig, type Config } from "./config.js";
import { openDatabase, type Db } from "./db.js";
import { ApiError } from "./errors.js";
import { createBus, type Ctx } from "./context.js";
import { registerHealth } from "./routes/health.js";

declare module "fastify" {
  interface FastifyInstance {
    ctx: Ctx;
  }
}

export type BuildOptions = {
  db?: Db;
  now?: () => Date;
};

export async function buildApp(
  config: Config,
  options: BuildOptions = {},
): Promise<FastifyInstance> {
  const ownsDb = !options.db;
  const db = options.db ?? openDatabase(config.dbPath, config.delayScale);
  const ctx: Ctx = {
    db,
    config,
    bus: createBus(),
    now: options.now ?? (() => new Date()),
  };

  const app = Fastify({ logger: false, trustProxy: true });
  app.decorate("ctx", ctx);

  await app.register(cors, {
    origin: config.corsOrigin.split(",").map((origin) => origin.trim()),
    methods: ["GET", "POST", "PUT", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: false,
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) {
      return reply
        .status(error.status)
        .send({ error: { code: error.code, message: error.message } });
    }
    if (error instanceof ZodError) {
      const message = error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ");
      return reply.status(400).send({ error: { code: "VALIDATION", message } });
    }
    const err = error as { statusCode?: number; code?: string; message?: string };
    const status = typeof err.statusCode === "number" ? err.statusCode : 500;
    if (status >= 500) {
      app.log.error(error);
      return reply
        .status(500)
        .send({ error: { code: "INTERNAL", message: "The server could not complete the request." } });
    }
    return reply.status(status).send({
      error: { code: err.code ?? "REQUEST", message: err.message ?? "Request failed." },
    });
  });

  app.setNotFoundHandler((_request, reply) =>
    reply
      .status(404)
      .send({ error: { code: "NOT_FOUND", message: "No such route." } }),
  );

  registerHealth(app, ctx);

  app.addHook("onClose", async () => {
    if (ownsDb) db.close();
  });

  return app;
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const config = loadConfig();
  const app = await buildApp(config);
  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info?.(`CrewSignal backend on http://${config.host}:${config.port}`);
    console.log(`CrewSignal backend listening on http://${config.host}:${config.port}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
