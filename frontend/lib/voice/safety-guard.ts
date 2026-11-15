/**
 * Safety guard for anything the assistant might say.
 *
 * The step flow is the authority; this only decides whether a candidate answer
 * may be spoken. It is plain code (no model) so the same rules apply whether
 * the answer came from the scripted steps or from a language model.
 */

export const ALERT_REMINDER =
  "Keep the crew alerted or contact the medical officer.";

export const OUT_OF_SCOPE_ANSWER =
  "I don't have that. Alert the crew or contact the medical officer.";

/** Two short sentences, as specified. */
const MAX_SENTENCES = 2;
const MAX_CHARS = 240;

type Rule = { reason: string; pattern: RegExp };

/**
 * Blocked categories. These are refusal rules, not style checks: anything that
 * diagnoses, names a cause, gives medication or a dose, instructs a treatment
 * that is not already in the steps, or reassures.
 */
const BLOCKED: Rule[] = [
  {
    reason: "medication-or-dose",
    pattern:
      /\b(dose|dosage|mg|milligram|milligrams|ibuprofen|paracetamol|acetaminophen|aspirin|antibiotic|antibiotics|morphine|opioid|injection|inject|tablet|pills?)\b/i,
  },
  {
    reason: "diagnosis-or-cause",
    pattern:
      /\b(diagnos\w*|the cause|caused by|because of|suffering from|is having a|you have|they have a|itis|infection|hypoxia|dehydration)\b/i,
  },
  {
    reason: "treatment-instruction",
    pattern:
      /\b(give (him|her|them)|administer|start (him|her|them) on|put (him|her|them) on|apply|immobilise|immobilize|stitch|dress the wound)\b/i,
  },
  {
    reason: "reassurance",
    pattern:
      /\b(will be (fine|ok|okay|alright)|is going to be (fine|ok|okay)|nothing to worry|no need to worry|do not worry|don't worry|not serious|reassure)\b/i,
  },
];

export type GuardResult =
  | { ok: true; text: string }
  | { ok: false; reason: string; text: string };

function sentenceCount(text: string): number {
  return text
    .split(/[.!?]+/u)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

function contentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
}

/**
 * Answers must be supportable by the text we actually hold: the current step,
 * its alternative field, and the measurement guide. If too many of its content
 * words are absent from those sources, it is replaced with OUT_OF_SCOPE_ANSWER.
 */
export function isGrounded(candidate: string, sources: string[]): boolean {
  const words = contentWords(candidate);
  if (words.length === 0) return false;
  const source = ` ${sources.join(" ").toLowerCase()} `;
  const hits = words.filter((word) => source.includes(word)).length;
  return hits / words.length >= 0.6;
}

/** Appends the reminder once, never twice. */
export function withReminder(text: string): string {
  if (text.toLowerCase().includes("keep the crew alerted")) return text;
  return `${text.replace(/\s+$/u, "")} ${ALERT_REMINDER}`;
}

/**
 * Final gate before speech.
 *
 * Order matters: refusals and length are checked on the candidate alone, then
 * grounding against the allowed sources, then the reminder is appended.
 */
export function guardAnswer(
  candidate: string,
  sources: string[],
  options: { requireGrounding?: boolean } = {},
): GuardResult {
  const text = candidate.trim();
  if (!text) return { ok: false, reason: "empty", text: OUT_OF_SCOPE_ANSWER };

  if (text.length > MAX_CHARS) {
    return { ok: false, reason: "too-long", text: OUT_OF_SCOPE_ANSWER };
  }
  if (sentenceCount(text) > MAX_SENTENCES) {
    return { ok: false, reason: "too-many-sentences", text: OUT_OF_SCOPE_ANSWER };
  }
  for (const rule of BLOCKED) {
    if (rule.pattern.test(text)) {
      return { ok: false, reason: rule.reason, text: OUT_OF_SCOPE_ANSWER };
    }
  }
  if (options.requireGrounding !== false && !isGrounded(text, sources)) {
    return { ok: false, reason: "ungrounded", text: OUT_OF_SCOPE_ANSWER };
  }
  return { ok: true, text: withReminder(text) };
}

export const safetyRules = BLOCKED.map((rule) => rule.reason);
export const safetyLimits = { maxSentences: MAX_SENTENCES, maxChars: MAX_CHARS };
