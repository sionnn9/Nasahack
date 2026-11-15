import { crew } from "@/components/health/health-data";
import type { VoiceLanguage, VoicePhraseKey, VoiceStepKey } from "./languages";

/**
 * Deterministic dialogue for the emergency flow: a state machine over the
 * steps the screen already shows. No model, no inference, no medical advice.
 *
 * Recognised answers only ever move the flow forward or repeat a prompt. An
 * unclear answer is never treated as agreement.
 */

export type IntentKind = VoicePhraseKey | "crew";

export type Intent = { kind: IntentKind; crewId?: string };

export type StepDefinition = {
  id: VoiceStepKey;
  /** Spoken with local TTS. Mirrors the text already on screen. */
  spoken: string;
  mode: "command" | "dictation";
  intents: IntentKind[];
  /** Screen step this voice step maps onto in app/page.tsx. */
  uiStep: number;
};

const stepOrder: {
  id: VoiceStepKey;
  mode: "command" | "dictation";
  intents: IntentKind[];
  uiStep: number;
}[] = [
  {
    id: "who",
    mode: "command",
    intents: ["crew", "unknownPerson", "unsure", "repeat", "stop", "cancel"],
    uiStep: 0,
  },
  {
    id: "what",
    mode: "dictation",
    intents: ["next", "repeat", "stop", "cancel"],
    uiStep: 0,
  },
  {
    id: "breathing",
    mode: "command",
    intents: ["yes", "no", "unsure", "repeat", "back", "stop"],
    uiStep: 1,
  },
  {
    id: "comfort",
    mode: "command",
    intents: ["next", "repeat", "back", "stop"],
    uiStep: 2,
  },
  {
    id: "contact",
    mode: "command",
    intents: ["yes", "unavailable", "repeat", "back", "stop"],
    uiStep: 3,
  },
];

export function firstName(fullName: string): string {
  return fullName.split(" ")[0];
}

export function buildSteps(language: VoiceLanguage): StepDefinition[] {
  return stepOrder.map((step) => {
    // A model without open vocabulary cannot take dictation, so the step
    // becomes a typed step in that language.
    const mode =
      step.mode === "dictation" && !language.supportsDictation
        ? "command"
        : step.mode;
    return {
      id: step.id,
      spoken: language.prompts[step.id],
      mode,
      intents: mode === "command" && step.id === "what" ? ["next", "repeat", "stop", "cancel"] : step.intents,
      uiStep: step.uiStep,
    };
  });
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Candidate = { phrase: string; intent: Intent };

function candidatesFor(step: StepDefinition, language: VoiceLanguage): Candidate[] {
  const candidates: Candidate[] = [];
  for (const kind of step.intents) {
    if (kind === "crew") {
      // Crew names are proper nouns and stay as recorded in every language.
      for (const person of crew) {
        const intent: Intent = { kind: "crew", crewId: person.id };
        candidates.push({ phrase: normalize(firstName(person.name)), intent });
        candidates.push({ phrase: normalize(person.name), intent });
      }
      continue;
    }
    for (const phrase of language.phrases[kind]) {
      candidates.push({ phrase: normalize(phrase), intent: { kind } });
    }
  }
  // Longest phrase wins so "not sure" is never read as "no".
  return candidates.sort((a, b) => b.phrase.length - a.phrase.length);
}

function containsPhrase(text: string, phrase: string): boolean {
  if (!phrase) return false;
  if (text === phrase) return true;
  return ` ${text} `.includes(` ${phrase} `);
}

/**
 * Maps a transcript to an intent. Returns null when nothing matched, so the
 * caller never advances on an unclear or low-confidence answer.
 *
 * Dictation steps match control words exactly, so ordinary dictated speech
 * ("I felt pain and could not stand") is never mistaken for a command.
 */
export function resolveIntent(
  step: StepDefinition,
  transcript: string,
  language: VoiceLanguage,
): Intent | null {
  const text = normalize(transcript);
  if (!text) return null;
  for (const candidate of candidatesFor(step, language)) {
    const matched =
      step.mode === "dictation"
        ? text === candidate.phrase
        : containsPhrase(text, candidate.phrase);
    if (matched) return candidate.intent;
  }
  return null;
}

/** Constrained grammar handed to Vosk. "[unk]" keeps noise out of results. */
export function buildGrammar(
  step: StepDefinition,
  language: VoiceLanguage,
): string {
  const phrases = new Set<string>();
  for (const candidate of candidatesFor(step, language)) {
    phrases.add(candidate.phrase);
  }
  phrases.add("[unk]");
  return JSON.stringify([...phrases]);
}
