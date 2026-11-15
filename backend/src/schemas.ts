import { z } from "zod";

/** Zod mirrors of frontend/lib/types.ts. No clinical interpretation here. */

const iso = z
  .string()
  .refine((value) => Number.isFinite(new Date(value).getTime()), "must be an ISO timestamp");

export const metricSchema = z.enum([
  "heart_rate",
  "skin_temp",
  "bp_systolic",
  "bp_diastolic",
  "glucose",
  "sleep_minutes",
  "mood",
  "stress",
  "rested",
  "connected",
  "motion",
]);

export const laneSchema = z.enum(["manual", "live", "replay", "synthetic"]);
export const qualitySchema = z.enum([
  "ok",
  "no_contact",
  "stale",
  "out_of_range",
  "motion",
  "not_measured",
]);
export const contextSchema = z.enum(["rest", "post_exercise", "post_meal", "unknown"]);
export const environmentSchema = z.enum([
  "mars_transit",
  "station",
  "lunar_base",
  "rover",
  "remote_clinic",
]);
export const linkStateSchema = z.enum(["live", "delayed", "blackout"]);
export const outboxStateSchema = z.enum(["queued", "sent", "delivered", "acknowledged"]);

export const symptomSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  onset: z.enum(["just_now", "today", "several_days"]),
  trend: z.enum(["better", "same", "worse"]),
  urgent: z.boolean(),
});

export const observationSchema = z.object({
  id: z.string().min(1),
  crewId: z.string().min(1),
  metric: metricSchema,
  value: z.number().nullable(),
  unit: z.string(),
  observedAt: iso,
  enteredAt: iso,
  lane: laneSchema,
  method: z.string(),
  context: contextSchema,
  rawValue: z.string().optional(),
  quality: qualitySchema,
  qualityReason: z.string().nullable().optional().default(null),
  environment: z.string(),
  procedureVersion: z.string(),
  artifact: z.enum(["motion"]).nullable().optional(),
});

export const checkInSchema = z
  .object({
    id: z.string().min(1),
    crewId: z.string().min(1),
    observedAt: iso,
    enteredAt: iso,
    sleepMinutes: z.number().nullable(),
    mood: z.number().nullable(),
    stress: z.number().nullable(),
    rested: z.number().nullable(),
    connected: z.number().nullable(),
    symptoms: z.array(symptomSchema),
    details: z.string(),
  })
  .loose();

export const encounterSchema = z
  .object({
    id: z.string().min(1),
    crewId: z.string().min(1),
    kind: z.enum(["assessment", "emergency", "daily"]),
    pathwayId: z.string(),
    startedAt: iso,
    endedAt: iso.nullable(),
  })
  .loose();

export const handoffSchema = z
  .object({
    id: z.string().min(1),
    crewId: z.string().min(1),
    createdAt: iso,
    includePrivate: z.boolean(),
  })
  .loose();

export const outboxItemSchema = z.object({
  id: z.string().min(1),
  crewId: z.string().min(1),
  kind: z.enum(["handoff", "support", "report"]),
  createdAt: iso,
  sentAt: iso.nullable().optional().default(null),
  acknowledgedAt: iso.nullable().optional().default(null),
  state: outboxStateSchema.optional(),
  delaySeconds: z.number().min(0).optional().default(0),
  title: z.string().optional().default("Handoff"),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
  private: z.boolean().optional().default(false),
  includePrivate: z.boolean().optional().default(false),
  history: z
    .array(z.object({ state: outboxStateSchema, at: iso, note: z.string() }))
    .optional()
    .default([]),
});

export type OutboxItemInput = z.infer<typeof outboxItemSchema>;

export const linkPutSchema = z.object({
  state: linkStateSchema,
  environment: environmentSchema,
});

export const sampleSchema = z.object({
  deviceId: z.string().min(1),
  crewId: z.string().min(1),
  metric: metricSchema,
  value: z.number(),
  observedAt: iso,
  contact: z.enum(["good", "poor", "none"]),
  motion: z.number().optional(),
});

export const syncedCollections = ["observations", "checkins", "encounters"] as const;
export type SyncCollection = (typeof syncedCollections)[number];

export const observationSyncSchema = z.array(observationSchema).max(500);
export const checkInSyncSchema = z.array(checkInSchema).max(500);
export const encounterSyncSchema = z.array(encounterSchema).max(500);
