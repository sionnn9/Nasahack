import {
  isKokoroReady,
  speakWithKokoro,
  stopKokoroAudio,
  KOKORO_DEFAULT_VOICE,
} from "./kokoro-tts";

/**
 * Spoken replies that never leave the device.
 *
 * Uses Kokoro-82M neural TTS ("am_adam") for natural human speech,
 * with automatic fallback to high-clarity local system Web Speech voices.
 */

export type SpeakResult = "spoke" | "unavailable" | "cancelled";

type VoiceWindow = Window & {
  speechSynthesis?: SpeechSynthesis;
  SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
};

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return (window as VoiceWindow).speechSynthesis ?? null;
}

export function speechAvailable(): boolean {
  return synth() !== null && typeof window.SpeechSynthesisUtterance === "function";
}

/**
 * Picks the best available clear male voice on the device (matching "Adam" persona).
 * Specifically targets Windows, Edge, Chrome, and Mac male natural voices
 * (e.g., Guy, Christopher, David, Mark, George, Daniel) and strictly excludes female voices.
 */
export function pickAdamVoice(): SpeechSynthesisVoice | null {
  const engine = synth();
  if (!engine) return null;
  const all = engine.getVoices();
  if (all.length === 0) return null;

  const english = all.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const pool = english.length > 0 ? english : all;

  // Strict female exclusions to avoid generic high-pitched default
  const femaleKeywords = [
    "zira",
    "hazel",
    "susan",
    "jenny",
    "aria",
    "female",
    "woman",
    "girl",
    "catherine",
    "linda",
    "eva",
    "stephanie",
    "samantha",
    "victoria",
    "karen",
  ];

  // Preferred deep/clear male voices in order of natural quality
  const maleKeywords = [
    "guy",
    "christopher",
    "david",
    "mark",
    "george",
    "ryan",
    "male",
    "james",
    "richard",
    "oliver",
    "daniel",
    "charles",
    "adam",
  ];

  // 1. Check for specific natural male voices
  for (const kw of maleKeywords) {
    const match = pool.find(
      (v) =>
        v.name.toLowerCase().includes(kw) &&
        !femaleKeywords.some((f) => v.name.toLowerCase().includes(f)),
    );
    if (match) return match;
  }

  // 2. Fallback to any non-female voice
  const nonFemale = pool.find(
    (v) => !femaleKeywords.some((f) => v.name.toLowerCase().includes(f)),
  );
  if (nonFemale) return nonFemale;

  return pool[0] ?? null;
}

/** Local voices only, male preferred for Adam persona */
export function pickLocalVoice(): SpeechSynthesisVoice | null {
  return pickAdamVoice();
}

/**
 * Voices populate asynchronously, so wait for `voiceschanged` before deciding
 * a device has no local voice.
 */
export function waitForLocalVoice(timeoutMs = 2000): Promise<SpeechSynthesisVoice | null> {
  const immediate = pickAdamVoice();
  if (immediate) return Promise.resolve(immediate);
  const engine = synth();
  if (!engine) return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      engine.removeEventListener("voiceschanged", onChange);
      resolve(pickAdamVoice());
    };
    const onChange = () => {
      if (pickAdamVoice()) finish();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    engine.addEventListener("voiceschanged", onChange);
  });
}

let sequence = 0;

/**
 * Speaks one line and resolves when it finishes.
 * Prefers Kokoro-82M neural model ("am_adam") and seamlessly falls back
 * to local system speech synthesis. Resolves "cancelled" if user stops.
 */
export async function speak(
  text: string,
  options: { rate?: number; voice?: SpeechSynthesisVoice | null; kokoroVoice?: string } = {},
): Promise<SpeakResult> {
  // Always stop prior speech first
  stopSpeaking();

  // 1. Try Kokoro Neural TTS ("am_adam") first if available
  if (isKokoroReady()) {
    const kokoroResult = await speakWithKokoro(text, {
      voice: options.kokoroVoice || KOKORO_DEFAULT_VOICE,
      speed: options.rate || 1.0,
    });
    if (kokoroResult === "spoke" || kokoroResult === "cancelled") {
      return kokoroResult;
    }
  }

  // 2. Fallback to System Speech Synthesis
  if (!speechAvailable()) return "unavailable";
  const engine = synth();
  const Utterance = (window as VoiceWindow).SpeechSynthesisUtterance;
  if (!engine || !Utterance) return "unavailable";

  const voice = options.voice ?? pickLocalVoice();

  const mine = ++sequence;
  engine.cancel();

  return new Promise((resolve) => {
    const utterance = new Utterance(text);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = "en-US";
    }
    // Deep, calm, authoritative male resonance (Adam flight doctor profile)
    utterance.pitch = 0.86;
    utterance.rate = options.rate ?? 0.96;

    let settled = false;
    const finish = (result: SpeakResult) => {
      if (settled) return;
      settled = true;
      resolve(mine === sequence ? result : "cancelled");
    };

    utterance.onend = () => finish("spoke");
    utterance.onerror = () => finish("cancelled");
    engine.speak(utterance);
  });
}

export function stopSpeaking(): void {
  stopKokoroAudio();
  synth()?.cancel();
  sequence += 1;
}
