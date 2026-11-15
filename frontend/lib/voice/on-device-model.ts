"use client";

import type { WebWorkerMLCEngine } from "@mlc-ai/web-llm";
import {
  isTooSlow,
  parseModelIntent,
  type ModelIntent,
} from "./intent-schema";
import { guardAnswer } from "./safety-guard";

/**
 * Optional on-device language model.
 *
 * Everything here is additive: if WebGPU is missing, the weights fail to load
 * or a reply takes longer than six seconds, the callers keep using the
 * deterministic step flow. No cloud service is ever contacted.
 */

export type ModelStatus = "idle" | "preparing" | "ready" | "unavailable";

/**
 * Default candidate. The benchmark in Task 1c decides between this and
 * Qwen2.5-1.5B-Instruct-q4f16_1-MLC; until that has actually run, nothing may
 * claim one is faster.
 */
export const DEFAULT_MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
export const ALTERNATIVE_MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

/** Mirrors modelIntentSchema; handed to WebLLM as a structured-output schema. */
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: [
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
      ],
    },
    crew: {
      type: ["string", "null"],
      enum: ["alex-morgan", "samira-patel", "kenji-sato", "elena-rostova", null],
    },
    symptoms: {
      type: "array",
      items: {
        type: "string",
        enum: [
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
        ],
      },
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    question: { type: ["string", "null"] },
  },
  required: ["intent", "crew", "symptoms", "confidence", "question"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = [
  "You classify one short line spoken by a crew member during a medical emergency.",
  "Reply with JSON only, matching the given schema.",
  "Never diagnose, never name a cause, never mention medication or a dose, never instruct a treatment, never reassure.",
  "Use only: yes, no, unsure, repeat, back, next, unavailable, stop, cancel, unknownPerson, crew, question, urgent.",
  "If the speaker asks a question about the current step, set intent to question and put it in question.",
].join(" ");

export function webgpuSupported(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

export class OnDeviceModel {
  private engine: WebWorkerMLCEngine | null = null;
  private worker: Worker | null = null;
  private loading: Promise<void> | null = null;
  status: ModelStatus = "idle";
  progress = "";
  modelId = DEFAULT_MODEL_ID;

  async hasAdapter(): Promise<boolean> {
    if (!webgpuSupported()) return false;
    try {
      const gpu = (navigator as Navigator & { gpu?: GPU }).gpu;
      const adapter = await gpu?.requestAdapter();
      return Boolean(adapter);
    } catch {
      return false;
    }
  }

  /** Starts in the background; safe to call many times. */
  async load(onProgress?: (text: string) => void, modelId = DEFAULT_MODEL_ID): Promise<void> {
    if (this.loading) return this.loading;
    if (this.engine) return;
    this.modelId = modelId;
    this.loading = (async () => {
      this.status = "preparing";
      if (!(await this.hasAdapter())) {
        this.status = "unavailable";
        return;
      }
      try {
        const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");
        this.worker = new Worker(new URL("./webllm.worker.ts", import.meta.url), {
          type: "module",
        });
        this.engine = await CreateWebWorkerMLCEngine(this.worker, modelId, {
          initProgressCallback: (report) => {
            this.progress = report.text;
            onProgress?.(report.text);
          },
        });
        this.status = "ready";
      } catch {
        this.status = "unavailable";
        this.engine = null;
      }
    })();
    return this.loading;
  }

  /**
   * Returns a validated intent, or null. Anything slow, malformed, low
   * confidence or out of schema returns null so the scripted step wins.
   */
  async understand(transcript: string, stepText: string): Promise<ModelIntent | null> {
    if (!this.engine || this.status !== "ready") return null;
    const started = Date.now();
    try {
      const completion = await this.engine.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Current step: ${stepText}\nSpoken: ${transcript}`,
          },
        ],
        temperature: 0,
        max_tokens: 120,
        response_format: {
          type: "json_object",
          schema: JSON.stringify(RESPONSE_SCHEMA),
        },
      });
      if (isTooSlow(started)) return null;
      const content = completion.choices?.[0]?.message?.content;
      if (typeof content !== "string") return null;
      return parseModelIntent(content);
    } catch {
      return null;
    }
  }

  /**
   * Short spoken answer to a question, constrained to the text we hold.
   * Returns null when the guard rejects it, so the caller speaks the scripted
   * line instead.
   */
  async answerQuestion(
    question: string,
    sources: string[],
  ): Promise<string | null> {
    if (!this.engine || this.status !== "ready") return null;
    const started = Date.now();
    try {
      const completion = await this.engine.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "Answer in at most two short sentences using ONLY the provided text. " +
              "No diagnosis, no cause, no medication, no dose, no treatment, no reassurance. " +
              "If the answer is not in the text, reply exactly: I don't have that.",
          },
          { role: "user", content: `${sources.join("\n")}\n\nQuestion: ${question}` },
        ],
        temperature: 0,
        max_tokens: 90,
      });
      if (isTooSlow(started)) return null;
      const content = completion.choices?.[0]?.message?.content;
      if (typeof content !== "string") return null;
      const guarded = guardAnswer(content, sources);
      return guarded.text;
    } catch {
      return null;
    }
  }

  dispose(): void {
    this.engine = null;
    this.worker?.terminate();
    this.worker = null;
    this.status = "idle";
  }
}
