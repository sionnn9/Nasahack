import { z } from "zod";

export type Config = {
  port: number;
  host: string;
  dbPath: string;
  corsOrigin: string;
  crewKey: string;
  groundKey: string;
  deviceKey: string;
  delayScale: number;
};

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  HOST: z.string().default("127.0.0.1"),
  DB_PATH: z.string().default("./data/crewsignal.db"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  CREW_KEY: z.string().min(8).default("crew-demo-key"),
  GROUND_KEY: z.string().min(8).default("ground-demo-key"),
  DEVICE_KEY: z.string().min(8).default("device-demo-key"),
  DELAY_SCALE: z.coerce.number().positive().default(1),
});

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid backend configuration: ${issues}`);
  }
  const value = parsed.data;
  return {
    port: value.PORT,
    host: value.HOST,
    dbPath: value.DB_PATH,
    corsOrigin: value.CORS_ORIGIN,
    crewKey: value.CREW_KEY,
    groundKey: value.GROUND_KEY,
    deviceKey: value.DEVICE_KEY,
    delayScale: value.DELAY_SCALE,
  };
}
