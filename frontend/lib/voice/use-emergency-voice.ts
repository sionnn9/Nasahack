"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { crew } from "@/components/health/health-data";
import {
  interpretEmergency,
  getPresetInterpretation,
  type EmergencyCategory,
  type EmergencyInterpretation,
} from "./emergency-interpreter";
import {
  defaultVoiceLanguage,
  languageByCode,
  voiceLanguages,
  type VoiceLanguage,
} from "./languages";
import {
  speak,
  speechAvailable,
  stopSpeaking,
  waitForLocalVoice,
} from "./local-speech";
import { initKokoroTTS, isKokoroReady } from "./kokoro-tts";
import { OnDeviceModel, type ModelStatus } from "./on-device-model";
import { EmergencyVoiceEngine, VoiceError } from "./vosk-engine";

export type VoiceStatus =
  | "idle"
  | "preparing"
  | "ready"
  | "listening"
  | "speaking"
  | "unavailable";

export type VoiceLogEntry = { at: string; heard: string; answer: string };

export type VoiceCallbacks = {
  onCrew: (name: string) => void;
  onStoryAppend: (text: string) => void;
  onUiStep: (step: number) => void;
  onAlertCrew: () => void;
  onContactMedical: () => void;
  onLog: (entry: VoiceLogEntry) => void;
};

const LANGUAGE_KEY = "crewsignal-voice-language-v1";
const CACHE_PREFIX = "crewsignal-voice-";

export async function isModelCached(url: string): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  const names = (await caches.keys()).filter((name) =>
    name.startsWith(CACHE_PREFIX),
  );
  for (const name of names) {
    const cache = await caches.open(name);
    if (await cache.match(url)) return true;
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function playEmergencyChime(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.16); // A5

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Audio context may be restricted before interaction
  }
}

function playAlarmTone(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "square";
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.setValueAtTime(659, now + 0.15);
    osc1.frequency.setValueAtTime(880, now + 0.3);

    osc2.frequency.setValueAtTime(440, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
  } catch {
    // Ignore audio error
  }
}

type WebSpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type WebSpeechRecognitionConstructor = new () => WebSpeechRecognitionInstance;

function getWebSpeechConstructor(): WebSpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    SpeechRecognition?: WebSpeechRecognitionConstructor;
    webkitSpeechRecognition?: WebSpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

export function useEmergencyVoice(callbacks: VoiceCallbacks) {
  const [language, setLanguageState] = useState<VoiceLanguage>(
    defaultVoiceLanguage,
  );
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [note, setNote] = useState("");
  const [lastHeard, setLastHeard] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [micPermission, setMicPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const [speechEngineType, setSpeechEngineType] = useState<"Web Speech API" | "Vosk Offline" | "None">("None");
  const [cached, setCached] = useState(false);
  const [modelStatus, setModelStatus] = useState<ModelStatus>("idle");
  const [modelProgress, setModelProgress] = useState("");
  const [interpretation, setInterpretation] =
    useState<EmergencyInterpretation | null>(null);
  const [kokoroReady, setKokoroReady] = useState(false);
  const [isBroadcastingAlarm, setIsBroadcastingAlarm] = useState(false);
  const [isGroundLinkActive, setIsGroundLinkActive] = useState(false);

  const modelRef = useRef<OnDeviceModel | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const languageRef = useRef(language);
  languageRef.current = language;

  const engineRef = useRef<EmergencyVoiceEngine | null>(null);
  const webSpeechRef = useRef<WebSpeechRecognitionInstance | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProcessedRef = useRef<string>("");
  const lastSpokenTextRef = useRef<string>("");

  const startedRef = useRef(false);
  const stoppedRef = useRef(false);
  const statusRef = useRef<VoiceStatus>("idle");
  statusRef.current = status;
  const interpretationRef = useRef<EmergencyInterpretation | null>(null);
  interpretationRef.current = interpretation;

  useEffect(() => {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    const match = stored ? languageByCode(stored) : undefined;
    if (match) {
      setLanguageState(match);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void isModelCached(language.voskModelUrl).then((value) => {
      if (active) setCached(value);
    });
    return () => {
      active = false;
    };
  }, [language]);

  // Background initialization of optional on-device model & Kokoro neural voice
  useEffect(() => {
    // 1. Kick off Kokoro TTS ("am_adam") neural voice preload
    void initKokoroTTS().then((ok) => {
      setKokoroReady(ok && isKokoroReady());
    });

    const model = new OnDeviceModel();
    modelRef.current = model;
    const start = () => {
      setModelStatus("preparing");
      void model
        .load((text) => setModelProgress(text))
        .then(() => setModelStatus(model.status));
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    let idleHandle: number | undefined;
    let timer: number | undefined;
    if (idleWindow.requestIdleCallback) {
      idleHandle = idleWindow.requestIdleCallback(start, { timeout: 4000 });
    } else {
      timer = window.setTimeout(start, 1500);
    }

    return () => {
      if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
      if (timer !== undefined) window.clearTimeout(timer);
      model.dispose();
      modelRef.current = null;
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      stopSpeaking();
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      try {
        webSpeechRef.current?.abort();
      } catch {
        // Ignore
      }
      webSpeechRef.current = null;
      try {
        micStreamRef.current?.getTracks().forEach((track) => track.stop());
      } catch {
        // Ignore
      }
      micStreamRef.current = null;
      try {
        audioContextRef.current?.close();
      } catch {
        // Ignore
      }
      audioContextRef.current = null;
      analyserRef.current = null;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  // Speak aloud ONLY the actionable suggestion
  const speakAdvice = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setStatus("speaking");

    // Ensure speech recognition is stopped while speaking
    if (webSpeechRef.current) {
      try {
        webSpeechRef.current.abort();
      } catch {
        // Ignore
      }
      webSpeechRef.current = null;
    }
    engineRef.current?.setMicrophoneEnabled(false);
    setAudioLevel(0);

    const result = await speak(text, {
      voice: voiceRef.current,
      rate: 1.02,
    });

    if (result === "unavailable") {
      setNote("Action guidance displayed on screen.");
    } else if (result === "spoke") {
      await delay(200);
    }

    // Keep microphone OFF after done speaking
    setStatus("idle");
    setNote("Guidance provided. Microphone is off.");
  }, []);

  // Main emergency speech interpretation and suggestion dispatch
  const handleFinalSpeech = useCallback(
    async (text: string) => {
      const heard = text.trim();
      const words = heard.split(/\s+/).filter(Boolean);
      if (!heard || words.length < 2) return;

      // STOP using the microphone once done speaking!
      stoppedRef.current = true;
      startedRef.current = false;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (webSpeechRef.current) {
        try {
          webSpeechRef.current.abort();
        } catch {
          // Ignore
        }
        webSpeechRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      engineRef.current?.setMicrophoneEnabled(false);
      setAudioLevel(0);

      // Prevent re-triggering speech for identical text
      if (heard === lastSpokenTextRef.current) return;
      lastSpokenTextRef.current = heard;

      setLastHeard(heard);
      setLiveTranscript(heard);
      setInterimTranscript("");

      // Interpret the user's voice input
      const result = interpretEmergency(
        heard,
        interpretationRef.current?.affectedCrewName,
      );
      setInterpretation(result);

      if (result.affectedCrewName) {
        callbacksRef.current.onCrew(result.affectedCrewName);
      }
      callbacksRef.current.onStoryAppend(heard);
      callbacksRef.current.onUiStep(1);

      callbacksRef.current.onLog({
        at: new Date().toISOString(),
        heard,
        answer: result.spokenSummary,
      });

      setNote(`Action Plan: ${result.categoryLabel}`);

      // Speak ONLY that practical suggestion
      await speakAdvice(result.spokenSummary);
    },
    [speakAdvice],
  );

  // Setup/restart the real-time audio volume visualizer loop
  const startVolumeMeter = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    const analyser = analyserRef.current;
    const ctx = audioContextRef.current;
    if (!analyser || !ctx) return;

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const buffer = new Uint8Array(analyser.fftSize);

    const checkVolume = () => {
      if (stoppedRef.current) {
        setAudioLevel(0);
        return;
      }
      if (ctx.state === "suspended") {
        void ctx.resume();
      }

      analyser.getByteTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        const dev = Math.abs(buffer[i] - 128);
        sum += dev;
      }
      const avg = sum / buffer.length;
      // Amplify average deviation to make volume meter sensitive to human voice (10-100%)
      const normalized = Math.min(100, Math.round(avg * 3.5));
      setAudioLevel(normalized);

      animFrameRef.current = requestAnimationFrame(checkVolume);
    };

    animFrameRef.current = requestAnimationFrame(checkVolume);
  }, []);

  // Start fresh Web Speech API recognition session
  const startWebSpeech = useCallback(() => {
    const WebSpeech = getWebSpeechConstructor();
    if (!WebSpeech) return false;

    // Tear down any stale instance before creating a fresh one
    if (webSpeechRef.current) {
      try {
        webSpeechRef.current.abort();
      } catch {
        // Ignore
      }
      webSpeechRef.current = null;
    }

    try {
      const recognition = new WebSpeech();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setStatus("listening");
        setSpeechEngineType("Web Speech API");
        setNote("Microphone live · speak emergency description now.");
      };

      recognition.onresult = (event: unknown) => {
        type SpeechEvent = {
          resultIndex: number;
          results: Array<Array<{ transcript: string }> & { isFinal?: boolean }>;
        };
        const speechEvent = event as SpeechEvent;
        let finalAccumulator = "";
        let interimAccumulator = "";

        for (let i = 0; i < speechEvent.results.length; ++i) {
          const piece = speechEvent.results[i][0]?.transcript || "";
          if (speechEvent.results[i].isFinal) {
            finalAccumulator += piece + " ";
          } else {
            interimAccumulator += piece;
          }
        }

        const currentSpokenText = (finalAccumulator + interimAccumulator).trim();

        if (currentSpokenText) {
          setLiveTranscript(currentSpokenText);
          setInterimTranscript(interimAccumulator);

          const preview = interpretEmergency(
            currentSpokenText,
            interpretationRef.current?.affectedCrewName,
          );
          setInterpretation(preview);
        }

        // Reset silence timer on each word spoken
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        // Auto-finalize after 2500ms of sustained silence and substantial phrase
        silenceTimerRef.current = setTimeout(() => {
          const trimmed = currentSpokenText.trim();
          const words = trimmed.split(/\s+/).filter(Boolean);
          const hasSubstance = words.length >= 3 || trimmed.length >= 14;

          if (hasSubstance && trimmed !== lastProcessedRef.current) {
            lastProcessedRef.current = trimmed;
            void handleFinalSpeech(trimmed);
          }
        }, 2500);
      };

      recognition.onerror = (event: unknown) => {
        const err = event as { error?: string };
        if (err.error === "no-speech") return;
        if (err.error === "not-allowed") {
          setStatus("unavailable");
          setMicPermission("denied");
          setNote("Microphone permission denied. Tap buttons below or type.");
        }
      };

      recognition.onend = () => {
        // Only restart if not explicitly stopped or muted
        if (!stoppedRef.current && startedRef.current) {
          try {
            recognition.start();
          } catch {
            // Ignore restart error
          }
        }
      };

      webSpeechRef.current = recognition;
      recognition.start();
      return true;
    } catch (e) {
      console.warn("startWebSpeech failed:", e);
      return false;
    }
  }, [handleFinalSpeech]);

  // Setup AudioContext & AnalyserNode from MediaStream
  const setupAudioGraph = useCallback(
    (stream: MediaStream) => {
      try {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtxClass) return;

        const ctx = audioContextRef.current ?? new AudioCtxClass();
        audioContextRef.current = ctx;

        if (ctx.state === "suspended") {
          void ctx.resume();
        }

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.3;
        analyserRef.current = analyser;

        const muteGain = ctx.createGain();
        muteGain.gain.setValueAtTime(0, ctx.currentTime);

        source.connect(analyser);
        analyser.connect(muteGain);
        muteGain.connect(ctx.destination);

        startVolumeMeter();
      } catch (e) {
        console.warn("Audio graph setup error:", e);
      }
    },
    [startVolumeMeter],
  );

  // Initialize Microphone Hardware & Speech Recognition
  const initMicrophoneAndEngines = useCallback(async () => {
    stoppedRef.current = false;
    startedRef.current = true;
    setStatus("listening");
    setNote("Microphone live · listening for your voice...");

    // Audio chime to indicate voice assistant is active
    playEmergencyChime();

    // Prepare speech synthesis voices
    if (speechAvailable()) {
      void waitForLocalVoice().then((v) => {
        voiceRef.current = v;
      });
    }

    // Step 1: Open hardware microphone stream
    let stream: MediaStream | null = micStreamRef.current;
    if (!stream && typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        micStreamRef.current = stream;
        setMicPermission("granted");
        setupAudioGraph(stream);
      } catch (err) {
        console.warn("getUserMedia failed or denied:", err);
        setMicPermission("denied");
        setNote("Microphone access denied. Please click Allow or use buttons.");
      }
    } else if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      startVolumeMeter();
    }

    // Step 2: Initialize Web Speech API if supported
    const webSpeechStarted = startWebSpeech();
    if (webSpeechStarted) {
      return;
    }

    // Step 3: Fallback to local Vosk WASM Engine if Web Speech is not present
    setSpeechEngineType("Vosk Offline");
    const engine = new EmergencyVoiceEngine({
      onFinal: (text) => {
        setLiveTranscript(text);
        const words = text.trim().split(/\s+/).filter(Boolean);
        if (words.length >= 3 || text.length >= 14) {
          void handleFinalSpeech(text);
        }
      },
      onPartial: (partial) => {
        setLiveTranscript(partial);
        setInterimTranscript(partial);
        const preview = interpretEmergency(
          partial,
          interpretationRef.current?.affectedCrewName,
        );
        setInterpretation(preview);
      },
    });
    engineRef.current = engine;

    const mic = engine.requestMicrophone();

    setStatus("preparing");
    try {
      await mic;
      setMicPermission("granted");
    } catch (error) {
      startedRef.current = false;
      if (error instanceof VoiceError && error.code === "denied") {
        setStatus("unavailable");
        setMicPermission("denied");
        setNote("Microphone permission denied. Buttons still work.");
      } else {
        setStatus("unavailable");
        setNote("No microphone available. Buttons still work.");
      }
      return;
    }

    const current = languageRef.current;
    try {
      await engine.loadModel(current.voskModelUrl);
    } catch {
      setStatus("unavailable");
      setNote("Speech model could not be loaded. Buttons still work.");
      return;
    }

    const ready = await isModelCached(current.voskModelUrl);
    setCached(ready);
    setStatus("listening");
    engine.start();
  }, [handleFinalSpeech, setupAudioGraph, startVolumeMeter, startWebSpeech]);

  // Invoked when user gestures from Emergency button
  const beginFromGesture = useCallback(() => {
    void initMicrophoneAndEngines();
  }, [initMicrophoneAndEngines]);

  // Stop listening completely (MUTE) - disables tracks and tears down recognition session
  const stopListening = useCallback(() => {
    stoppedRef.current = true;
    startedRef.current = false;
    stopSpeaking();

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // Disable microphone audio track
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    }

    // Abort speech recognition and discard dead instance
    if (webSpeechRef.current) {
      try {
        webSpeechRef.current.abort();
      } catch {
        // Ignore
      }
      webSpeechRef.current = null;
    }

    engineRef.current?.setMicrophoneEnabled(false);
    setAudioLevel(0);
    setStatus("idle");
    setNote("Microphone muted.");
  }, []);

  // Start listening (UNMUTE) - enables tracks, resumes AudioContext, creates fresh SpeechRecognition
  const startListening = useCallback(async () => {
    stoppedRef.current = false;
    startedRef.current = true;
    setStatus("listening");
    setNote("Listening for your voice...");

    // 1. Enable microphone tracks
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
    }

    // 2. Resume audio context & restart volume visualizer
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }
    if (analyserRef.current) {
      startVolumeMeter();
    }

    // 3. Start a fresh Web Speech recognition instance
    const speechStarted = startWebSpeech();

    // 4. Fallback or complete init if stream was missing
    if (!speechStarted && engineRef.current) {
      engineRef.current.setMicrophoneEnabled(true);
    } else if (!speechStarted && !micStreamRef.current) {
      await initMicrophoneAndEngines();
    }
  }, [initMicrophoneAndEngines, startVolumeMeter, startWebSpeech]);

  // Toggle between Muted (stopped) and Unmuted (listening)
  const toggleListening = useCallback(() => {
    if (status === "listening" || status === "speaking") {
      stopListening();
    } else {
      void startListening();
    }
  }, [startListening, status, stopListening]);

  const replayGuidance = useCallback(() => {
    if (interpretation?.spokenSummary) {
      void speakAdvice(interpretation.spokenSummary);
    }
  }, [interpretation?.spokenSummary, speakAdvice]);

  const stopSpeaker = useCallback(() => {
    stopSpeaking();
    setStatus("idle");
    setNote("Audio guidance silenced.");
  }, []);

  const setManualInterpretation = useCallback(
    (category: EmergencyCategory) => {
      // Stop microphone once preset is chosen
      stopListening();

      const result = getPresetInterpretation(
        category,
        interpretationRef.current?.affectedCrewName || crew[0].name,
      );
      setInterpretation(result);
      setLiveTranscript(`[Protocol Selected: ${result.categoryLabel}]`);
      callbacksRef.current.onUiStep(1);
      callbacksRef.current.onLog({
        at: new Date().toISOString(),
        heard: `[Selected Preset: ${result.categoryLabel}]`,
        answer: result.spokenSummary,
      });
      setNote(`Action Plan: ${result.categoryLabel}`);

      // Speak ONLY that practical suggestion
      void speakAdvice(result.spokenSummary);
    },
    [speakAdvice, stopListening],
  );

  const toggleActionStep = useCallback((stepId: string) => {
    setInterpretation((current) => {
      if (!current) return current;
      return {
        ...current,
        immediateActions: current.immediateActions.map((step) =>
          step.id === stepId ? { ...step, completed: !step.completed } : step,
        ),
      };
    });
  }, []);

  const processTextInput = useCallback(
    (text: string) => {
      setLiveTranscript(text);
      lastProcessedRef.current = text;
      lastSpokenTextRef.current = "";
      void handleFinalSpeech(text);
    },
    [handleFinalSpeech],
  );

  const clearLiveTranscript = useCallback(() => {
    setLiveTranscript("");
    setInterimTranscript("");
    lastProcessedRef.current = "";
    lastSpokenTextRef.current = "";
  }, []);

  const triggerBroadcastAlarm = useCallback(() => {
    playAlarmTone();
    setIsBroadcastingAlarm(true);
    callbacksRef.current.onAlertCrew();
    window.setTimeout(() => setIsBroadcastingAlarm(false), 5000);
  }, []);

  const triggerGroundLink = useCallback(() => {
    setIsGroundLinkActive(true);
    callbacksRef.current.onContactMedical();
    window.setTimeout(() => setIsGroundLinkActive(false), 3000);
  }, []);

  const changeLanguage = useCallback((code: string) => {
    const next = languageByCode(code);
    if (!next || next.code === languageRef.current.code) return;
    setLanguageState(next);
    try {
      localStorage.setItem(LANGUAGE_KEY, next.code);
    } catch {
      // Ignore storage error
    }
  }, []);

  return {
    language,
    languages: voiceLanguages,
    status,
    note,
    lastHeard,
    liveTranscript,
    interimTranscript,
    audioLevel,
    micPermission,
    speechEngineType,
    cached,
    modelStatus,
    modelProgress,
    interpretation,
    isListening: status === "listening",
    isSpeaking: status === "speaking",
    ttsVoice: voiceRef.current?.name
      ? `Adam (${voiceRef.current.name.split("-")[0].trim()})`
      : "Adam (Calm Male Voice)",
    isBroadcastingAlarm,
    isGroundLinkActive,
    beginFromGesture,
    stopVoice: stopListening,
    startListening,
    stopListening,
    toggleListening,
    replayGuidance,
    stopSpeaker,
    setManualInterpretation,
    toggleActionStep,
    processTextInput,
    clearLiveTranscript,
    triggerBroadcastAlarm,
    triggerGroundLink,
    changeLanguage,
    statusLabel: (() => {
      switch (status) {
        case "preparing":
          return "Initializing voice engine";
        case "listening":
          return "Voice Assistant Listening";
        case "speaking":
          return "Speaking Action Plan";
        case "ready":
          return cached ? "Voice ready · offline" : "Voice ready · live";
        case "unavailable":
          return "Mic unavailable";
        default:
          return "Microphone Off";
      }
    })(),
  };
}
