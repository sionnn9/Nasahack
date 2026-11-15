/**
 * Urgent keyword rules.
 *
 * Plain code, run before any recognition cleanup or language model, so a
 * red-flag phrase moves the flow to "Alert the crew now" without waiting for
 * anything. Deliberately simple substring matching: no inference, no scoring,
 * no model. Errors must be in the safe direction, so it errs toward matching.
 *
 * This is not a triage tool and makes no clinical claim; it only reacts to
 * words the person already said.
 */

export type UrgentMatch = {
  /** The phrase that matched, as written in the list below. */
  term: string;
  /** Spoken line. The step itself always says "Alert the crew now". */
  spoken: string;
};

const URGENT_TERMS = [
  "not breathing",
  "isn't breathing",
  "is not breathing",
  "stopped breathing",
  "no pulse",
  "unconscious",
  "unresponsive",
  "collapsed",
  "passed out",
  "chest pain",
  "crushing chest",
  "bleeding",
  "bleeding heavily",
  "seizure",
  "fitting",
  "convulsing",
  "choking",
  "can't breathe",
  "cannot breathe",
] as const;

export const URGENT_SPOKEN =
  "Alert the crew now. This app cannot tell the cause. Keep the crew alerted.";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns the first urgent match, or null. Matching is on whole words so
 * "seizure" does not fire on "seizures-free history" being absent, but a
 * phrase inside a longer sentence still counts.
 */
export function matchUrgent(transcript: string): UrgentMatch | null {
  const text = normalize(transcript);
  if (!text) return null;
  const padded = ` ${text} `;
  for (const term of URGENT_TERMS) {
    if (padded.includes(` ${normalize(term)} `)) {
      return { term, spoken: URGENT_SPOKEN };
    }
  }
  return null;
}

export const urgentTerms = URGENT_TERMS;
