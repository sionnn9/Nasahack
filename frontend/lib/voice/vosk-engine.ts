"use client";

import type { KaldiRecognizer, Model } from "vosk-browser";

const SAMPLE_RATE = 16000;

export type VoiceErrorCode = "denied" | "no-device" | "model" | "unsupported";

export class VoiceError extends Error {
  code: VoiceErrorCode;

  constructor(code: VoiceErrorCode, message: string) {
    super(message);
    this.name = "VoiceError";
    this.code = code;
  }
}

export type EngineHandlers = {
  onFinal: (text: string) => void;
  onPartial?: (text: string) => void;
};

/**
 * Thin wrapper over vosk-browser.
 *
 * vosk-browser runs the WASM decoder in its own Web Worker; this class only
 * feeds it audio buffers. Recognition is fully local: the model archive is
 * served from the same origin and nothing is uploaded.
 */
export class EmergencyVoiceEngine {
  private model: Model | null = null;
  private recognizer: KaldiRecognizer | null = null;
  private grammar: string | null = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private muted = false;
  private loadedUrl: string | null = null;

  constructor(private handlers: EngineHandlers) {}

  get modelReady(): boolean {
    return this.model !== null;
  }

  get modelUrl(): string | null {
    return this.loadedUrl;
  }

  /** Loads one language model. Switching language disposes the previous one. */
  async loadModel(modelUrl: string): Promise<void> {
    if (this.model && this.loadedUrl === modelUrl) return;
    if (this.model) {
      this.recognizer?.remove();
      this.recognizer = null;
      this.model.terminate();
      this.model = null;
    }
    if (typeof window === "undefined") {
      throw new VoiceError("unsupported", "Voice needs a browser window.");
    }
    try {
      const { createModel } = await import("vosk-browser");
      this.model = await createModel(modelUrl);
      this.loadedUrl = modelUrl;
    } catch (error) {
      throw new VoiceError(
        "model",
        error instanceof Error ? error.message : "The speech model failed to load.",
      );
    }
    this.buildRecognizer();
  }

  /**
   * Must be called from the user gesture that opens the emergency flow:
   * AudioContext and getUserMedia both require one.
   */
  async requestMicrophone(): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new VoiceError("unsupported", "This browser has no microphone support.");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      this.stream = stream;
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        throw new VoiceError("denied", "Microphone permission was denied.");
      }
      throw new VoiceError("no-device", "No microphone is available.");
    }
  }

  setGrammar(grammar: string | null): void {
    if (this.grammar === grammar && this.recognizer) return;
    this.grammar = grammar;
    this.buildRecognizer();
  }

  private buildRecognizer(): void {
    if (!this.model) return;
    try {
      this.recognizer = this.grammar
        ? new this.model.KaldiRecognizer(SAMPLE_RATE, this.grammar)
        : new this.model.KaldiRecognizer(SAMPLE_RATE);
    } catch {
      this.recognizer = null;
      return;
    }
    this.recognizer.on("result", (message) => {
      if (message.event !== "result") return;
      const text = message.result?.text?.trim();
      if (text) this.handlers.onFinal(text);
    });
    this.recognizer.on("partialresult", (message) => {
      if (message.event !== "partialresult") return;
      const partial = message.result?.partial?.trim();
      if (partial) this.handlers.onPartial?.(partial);
    });
  }

  /** Starts pulling audio. Safe to call repeatedly. */
  start(): void {
    if (!this.stream || this.node) return;
    const context = new AudioContext({ sampleRate: SAMPLE_RATE });
    this.audioContext = context;
    void context.resume();

    const source = context.createMediaStreamSource(this.stream);
    const node = context.createScriptProcessor(4096, 1, 1);
    node.onaudioprocess = (event) => {
      if (this.muted || !this.recognizer) return;
      try {
        this.recognizer.acceptWaveform(event.inputBuffer);
      } catch {
        // A failed buffer must never break the screen.
      }
    };
    source.connect(node);
    node.connect(context.destination);
    this.source = source;
    this.node = node;
    this.setMicrophoneEnabled(true);
  }

  /** Silences capture while the device speaks so it does not hear itself. */
  setMicrophoneEnabled(enabled: boolean): void {
    this.muted = !enabled;
    this.stream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  dispose(): void {
    this.node?.disconnect();
    this.source?.disconnect();
    this.node = null;
    this.source = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    void this.audioContext?.close();
    this.audioContext = null;
    this.recognizer?.remove();
    this.recognizer = null;
    this.model?.terminate();
    this.model = null;
  }
}
