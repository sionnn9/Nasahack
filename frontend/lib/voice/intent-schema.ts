import { z } from "zod";

/**
 * Structured output for the optional on-device model.
 *
 * The model is never allowed to produce an action: it may only report one of a
 * fixed set of intents plus supporting fields. Anything that fails this schema,
 * or arrives below the confidence floor, is discarded and the scripted step
 * prompt is used instead.
 */

export const modelIntents = [
  "yes",
  "no",
  "unsure",
  "repeat",
  "back",
  "next",
  "unavailable",
  "stop",
  "cancel",
  "unknownPerson",
  "crew",
  "question",
  "urgent",
] as const;

export const symptoms = [
  "chest pain",
  "shortness of breath",
  "dizziness",
  "nausea",
  "headache",
  "fatigue",
  "bleeding",
  "fever",
  "rash",
  "confusion",
] as const;

export const crewIds = [
  "alex-morgan",
  "samira-patel",
  "kenji-sato",
  "elena-rostova",
] as const;

export const MIN_CONFIDENCE = 0.6;
export const MAX_MODEL_TIMEOUT_MS = 6000;

export const modelIntentSchema = z.object({
  intent: z.enum(modelIntents),
  crew: z.enum(crewIds).nullable(),
  symptoms: z.array(z.enum(symptoms)).max(symptoms.length),
  confidence: z.number().min(0).max(1),
  question: z.string().max(200).nullable(),
});

export type ModelIntent = z.infer<typeof modelIntentSchema>;

/**
 * Parses and validates a model reply. Returns null on malformed JSON, schema
 * mismatch, or confidence below the floor, so the caller falls back to the
 * scripted prompt.
 */
export function parseModelIntent(
  raw: string,
  options: { minConfidence?: number } = {},
): ModelIntent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = modelIntentSchema.safeParse(parsed);
  if (!result.success) return null;
  const floor = options.minConfidence ?? MIN_CONFIDENCE;
  if (result.data.confidence < floor) return null;
  return result.data;
}

/** True when a model reply is too slow to be worth waiting for. */
export function isTooSlow(startedAt: number, now = Date.now()): boolean {
  return now - startedAt > MAX_MODEL_TIMEOUT_MS;
}
