/**
 * Spoken-language registry for the emergency assistant.
 *
 * Each entry is self-contained so adding a language is a data-only change:
 * the recogniser loads that language's own Vosk model on demand and the
 * synthesiser picks a matching *local* voice.
 *
 * TRANSLATION STATUS
 * ------------------
 * `"source"` means the strings are the app's own English wording.
 * `"unreviewed"` means they were written here and MUST be checked by a native
 * speaker before use. Nothing in this app may claim an unreviewed string is
 * reviewed.
 */

export type VoicePhraseKey =
  | "yes"
  | "no"
  | "unsure"
  | "repeat"
  | "back"
  | "next"
  | "unavailable"
  | "stop"
  | "cancel"
  | "unknownPerson";

export type VoiceStepKey = "who" | "what" | "breathing" | "comfort" | "contact";

export type TranslationStatus = "source" | "unreviewed";

export type VoiceLanguage = {
  /** BCP-47 primary subtag, also the /public/models/<code>/ folder name. */
  code: string;
  label: string;
  /** Same-origin model archive. Nothing is fetched cross-origin. */
  voskModelUrl: string;
  /** Human-readable archive size, shown before a download happens. */
  modelSizeLabel: string;
  modelBytes: number;
  /** Prefix used to match an installed local TTS voice, e.g. "en". */
  ttsLang: string;
  /** Open-vocabulary Vosk models can take dictation; grammar-only cannot. */
  supportsDictation: boolean;
  translationStatus: TranslationStatus;
  safetyLine: string;
  prompts: Record<VoiceStepKey, string>;
  phrases: Record<VoicePhraseKey, string[]>;
  /** Label shown if an unreviewed language needs checking. */
  reviewNote?: string;
};

const english: VoiceLanguage = {
  code: "en",
  label: "English",
  voskModelUrl: "/models/en/vosk-model-small-en-us-0.15.tar.gz",
  modelSizeLabel: "40 MB",
  modelBytes: 41205931,
  ttsLang: "en",
  supportsDictation: true,
  translationStatus: "source",
  safetyLine:
    "This app cannot tell the cause. We'll help you share what's happening.",
  prompts: {
    who: "Who needs help? Say a name, or tap a name on screen.",
    what: "What happened? Say what you noticed, then say next.",
    breathing: "Is their breathing as usual? Say yes, no, or not sure.",
    comfort:
      "Thank you. Stay with them and keep them comfortable. Say next when you are ready.",
    contact:
      "Alert the crew and contact the medical officer or Earth now. Say done, or not available.",
  },
  phrases: {
    yes: ["yes", "yeah", "yep", "correct", "that is right", "done", "okay", "alert them"],
    no: ["no", "nope"],
    unsure: ["unsure", "not sure", "i do not know", "i don't know", "i dont know", "unknown"],
    repeat: ["repeat", "say again", "again", "repeat that"],
    back: ["back", "go back", "previous"],
    next: ["next", "continue", "go on"],
    unavailable: ["not available", "unavailable", "no equipment"],
    stop: ["stop"],
    cancel: ["cancel", "never mind", "nevermind"],
    unknownPerson: ["unknown person", "someone else", "not one of the crew"],
  },
};

/**
 * Only languages the user has confirmed are listed. Every added language must
 * have a real small Vosk model on https://alphacephei.com/vosk/models.
 */
export const voiceLanguages: VoiceLanguage[] = [english];

export const defaultVoiceLanguage = english;

export function languageByCode(code: string): VoiceLanguage | undefined {
  return voiceLanguages.find((language) => language.code === code);
}
