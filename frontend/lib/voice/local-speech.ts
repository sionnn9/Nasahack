/**
 * Spoken replies that never leave the device.
 *
 * Only voices with `localService === true` are used, which excludes the cloud
 * voices Chrome and Edge expose. If a device has no local voice the caller
 * shows text only and says so in the UI.
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

/** Local voices only, English preferred, with fallback to any available system voice. */
export function pickLocalVoice(): SpeechSynthesisVoice | null {
  const engine = synth();
  if (!engine) return null;
  const all = engine.getVoices();
  if (all.length === 0) return null;
  const local = all.filter((voice) => voice.localService);
  const candidates = local.length > 0 ? local : all;
  return (
    candidates.find((voice) => voice.lang.toLowerCase().startsWith("en")) ??
    all.find((voice) => voice.lang.toLowerCase().startsWith("en")) ??
    all[0] ??
    null
  );
}

/**
 * Voices populate asynchronously, so wait for `voiceschanged` before deciding
 * a device has no local voice.
 */
export function waitForLocalVoice(timeoutMs = 2000): Promise<SpeechSynthesisVoice | null> {
  const immediate = pickLocalVoice();
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
      resolve(pickLocalVoice());
    };
    const onChange = () => {
      if (pickLocalVoice()) finish();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    engine.addEventListener("voiceschanged", onChange);
  });
}

let sequence = 0;

/**
 * Speaks one line and resolves when it finishes. Resolves "cancelled" when a
 * newer line interrupted it, so callers can ignore stale completions.
 */
export async function speak(
  text: string,
  options: { rate?: number; voice?: SpeechSynthesisVoice | null } = {},
): Promise<SpeakResult> {
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
    utterance.rate = options.rate ?? 1;
    utterance.pitch = 1;

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
  synth()?.cancel();
  sequence += 1;
}
