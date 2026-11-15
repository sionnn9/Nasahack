"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bandage,
  Check,
  ChevronRight,
  Flame,
  HeartPulse,
  MapPin,
  Mic,
  MicOff,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  Volume2,
  VolumeX,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { crew, type CrewMember } from "./health-data";
import {
  emergencyPresets,
  type EmergencyCategory,
  type EmergencyInterpretation,
} from "@/lib/voice/emergency-interpreter";

type VoiceLogEntry = { at: string; heard: string; answer: string };

interface EmergencyScreenProps {
  time: Date;
  who: string;
  story: string;
  step: number;
  saveReport: () => void;
  onBack: () => void;
  onWhoSelect: (name: string) => void;
  onStoryChange: (value: string) => void;
  onContinue: () => void;
  onReportView: () => void;
  voice: {
    statusLabel: string;
    note: string;
    lastHeard: string;
    liveTranscript?: string;
    interimTranscript?: string;
    audioLevel?: number;
    micPermission?: "prompt" | "granted" | "denied";
    speechEngineType?: "Web Speech API" | "Vosk Offline" | "None";
    ttsVoice?: string;
    clearLiveTranscript?: () => void;
    languageCode: string;
    languages: { code: string; label: string; modelSizeLabel: string }[];
    onLanguage: (code: string) => void;
    log: VoiceLogEntry[];
    interpretation?: EmergencyInterpretation | null;
    isListening?: boolean;
    isSpeaking?: boolean;
    startListening?: () => void;
    stopListening?: () => void;
    toggleListening?: () => void;
    replayGuidance?: () => void;
    stopSpeaker?: () => void;
    onPresetSelect?: (category: EmergencyCategory) => void;
    onToggleActionStep?: (stepId: string) => void;
    onProcessText?: (text: string) => void;
    isBroadcastingAlarm?: boolean;
    triggerBroadcastAlarm?: () => void;
    isGroundLinkActive?: boolean;
    triggerGroundLink?: () => void;
  };
}

function getCategoryIcon(cat: EmergencyCategory) {
  switch (cat) {
    case "cardiac":
      return <HeartPulse className="cat-icon text-red-400" />;
    case "respiratory":
      return <Wind className="cat-icon text-cyan-400" />;
    case "trauma":
      return <Bandage className="cat-icon text-amber-400" />;
    case "unconscious":
      return <Activity className="cat-icon text-purple-400" />;
    case "toxic":
      return <AlertTriangle className="cat-icon text-yellow-400" />;
    case "seizure":
      return <Zap className="cat-icon text-blue-400" />;
    case "burn":
      return <Flame className="cat-icon text-orange-400" />;
    case "decompression":
      return <ShieldAlert className="cat-icon text-teal-400" />;
    default:
      return <Stethoscope className="cat-icon text-indigo-400" />;
  }
}

export function EmergencyScreen({
  time,
  who,
  story,
  step,
  saveReport,
  onBack,
  onWhoSelect,
  onStoryChange,
  onContinue,
  onReportView,
  voice,
}: EmergencyScreenProps) {
  const [manualText, setManualText] = useState("");
  const [showCrewPicker, setShowCrewPicker] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const selectedPerson = crew.find((person) => person.name === who);
  const interpretation = voice.interpretation;
  const isListening = voice.isListening ?? false;
  const isSpeaking = voice.isSpeaking ?? false;
  const liveTranscript = voice.liveTranscript || voice.interimTranscript || voice.lastHeard || "";
  const audioLevel = voice.audioLevel ?? 0;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), 3000);
  };

  // Automatically open the suggestions modal when an interpretation is generated
  useEffect(() => {
    if (interpretation) {
      setShowModal(true);
    }
  }, [interpretation?.id]);

  // Auto-engage microphone on emergency screen mount
  useEffect(() => {
    if (!voice.isListening && voice.startListening) {
      void voice.startListening();
    }
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    // Stop mic when manual submission happens
    voice.stopListening?.();
    voice.onProcessText?.(manualText);
    onStoryChange(manualText);
    setManualText("");
    setShowModal(true);
  };

  // When user clicks "Done Speaking", STOP THE MIC and interpret & show pop-up
  const handleInterpretCurrentLive = () => {
    if (liveTranscript.trim()) {
      voice.stopListening?.();
      voice.onProcessText?.(liveTranscript);
      onStoryChange(liveTranscript);
      setShowModal(true);
      showToast("Microphone stopped. Action plan displayed.");
    }
  };

  const completedStepsCount =
    interpretation?.immediateActions.filter((s) => s.completed).length ?? 0;
  const totalStepsCount = interpretation?.immediateActions.length ?? 0;

  return (
    <section className="emergency-screen emergency-v2">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="emergency-floating-toast" role="alert">
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="emergency-header">
        <button
          className="icon-button"
          onClick={onBack}
          aria-label="Exit emergency helper"
        >
          <ArrowLeft />
        </button>

        <div className="emergency-title-box">
          <span className="emergency-main-title">CREW FIRST-RESPONSE HELPER</span>
          <span className="emergency-time-tag">
            UTC {time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>

        <div className="header-actions">
          {/* Audio Visualizer Pill */}
          <div
            className={`voice-state-pill ${
              isListening ? "state-listening" : isSpeaking ? "state-speaking" : "state-idle"
            }`}
          >
            <span className="radar-dot" />
            <span className="state-label">
              {isListening ? "Listening Live" : isSpeaking ? "Speaking Advice" : "Microphone Off"}
            </span>
          </div>

          {/* PERMANENT STOP SPEAKER BUTTON IN HEADER */}
          <button
            type="button"
            className={`header-stop-speaker-btn ${isSpeaking ? "is-speaking-active" : ""}`}
            onClick={voice.stopSpeaker}
            title="Silence audio speaker output immediately"
          >
            <VolumeX size={16} />
            <span>STOP SPEAKER</span>
          </button>

          {/* Mic Toggle Button */}
          <button
            type="button"
            className={`mic-control-btn ${isListening ? "active" : ""}`}
            onClick={voice.toggleListening}
            title={isListening ? "Turn microphone off" : "Turn microphone on"}
          >
            {isListening ? <Mic size={18} /> : <MicOff size={18} />}
          </button>
        </div>
      </header>

      {/* MAIN SINGLE-COLUMN CONTENT */}
      <div className="emergency-single-column">
        {/* =========================================================================
            BIG STOP SPEAKER BANNER (Prominently displayed whenever speaker is active)
           ========================================================================= */}
        {isSpeaking && (
          <div className="big-speaker-alert-card">
            <div className="speaker-alert-left">
              <div className="soundwave-pulse-ring">
                <Volume2 size={26} className="pulsing-speaker-icon" />
              </div>
              <div className="speaker-alert-text">
                <span className="speaker-alert-headline">ASSISTANT IS SPEAKING ADVICE ALOUD</span>
                <span className="speaker-alert-subtext">Tap the big button to immediately stop and silence speech</span>
              </div>
            </div>
            <button
              type="button"
              className="giant-stop-speaker-btn"
              onClick={voice.stopSpeaker}
              title="Stop and silence the speaker immediately"
            >
              <VolumeX size={22} />
              <span>STOP SPEAKER</span>
            </button>
          </div>
        )}

        {/* Banner to re-open pop-up if dismissed */}
        {interpretation && !showModal && (
          <div className="reopen-modal-banner" onClick={() => setShowModal(true)}>
            <div className="reopen-left">
              {getCategoryIcon(interpretation.category)}
              <div>
                <strong>{interpretation.categoryLabel}</strong>
                <span>Tap to re-open action plan pop-up</span>
              </div>
            </div>
            <button type="button" className="reopen-btn">
              View Pop-Up <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* =========================================================================
            PRIMARY "HEARING NOW" LIVE SPEECH MONITOR
           ========================================================================= */}
        <div className={`live-speech-monitor-box ${isListening ? "is-listening" : ""}`}>
          <div className="monitor-top-bar">
            <div className="monitor-status-pill">
              <span className={`live-record-indicator ${isListening ? "pulsing" : ""}`} />
              <strong>{isListening ? "MICROPHONE ACTIVE · LISTENING" : "MICROPHONE OFF"}</strong>
            </div>

            {/* Dynamic Sound Equalizer Bars reacting to voice volume */}
            <div className="audio-level-equalizer" title={`Audio Level: ${audioLevel}%`}>
              <span className="eq-label">AUDIO IN:</span>
              <div className="eq-bars">
                <span
                  className="eq-bar"
                  style={{ height: `${Math.max(15, audioLevel * 0.9)}%` }}
                />
                <span
                  className="eq-bar"
                  style={{ height: `${Math.max(25, audioLevel * 1.2)}%` }}
                />
                <span
                  className="eq-bar"
                  style={{ height: `${Math.max(10, audioLevel * 1.5)}%` }}
                />
                <span
                  className="eq-bar"
                  style={{ height: `${Math.max(20, audioLevel * 1.1)}%` }}
                />
                <span
                  className="eq-bar"
                  style={{ height: `${Math.max(15, audioLevel * 0.8)}%` }}
                />
              </div>
              <span className="level-percent">{audioLevel}%</span>
            </div>

            {/* Engine Pill */}
            <div className="engine-tag">
              {voice.speechEngineType || "On-Device Engine"} · Voice: {voice.ttsVoice || "Adam Male"}
            </div>
          </div>

          {/* Microphone Access Alert if permission is prompt or denied */}
          {voice.micPermission !== "granted" && (
            <div className="mic-permission-banner">
              <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
              <div className="permission-message">
                <strong>
                  {voice.micPermission === "denied"
                    ? "Microphone Access Blocked in Browser"
                    : "Microphone Access Required"}
                </strong>
                <p>
                  {voice.micPermission === "denied"
                    ? "Your browser blocked microphone permissions. Click the lock/settings icon in the browser address bar to Allow microphone, then click Enable Microphone below."
                    : "Click below to grant microphone access so the assistant can hear your voice and analyze emergency symptoms."}
                </p>
              </div>
              <button
                type="button"
                className="grant-mic-btn"
                onClick={voice.startListening}
              >
                <Mic size={15} />
                <span>Enable Microphone</span>
              </button>
            </div>
          )}

          {/* Live Text Display: Shows exact words heard in real time */}
          <div className="live-hearing-screen">
            <div className="screen-title">
              <Sparkles size={14} className="text-cyan-400" />
              <span>HEARING NOW (LIVE SPEECH TRANSCRIPTION):</span>
            </div>

            <div className="screen-content">
              {liveTranscript ? (
                <p className="heard-words">
                  “{liveTranscript}”
                  {isListening && <span className="typing-cursor">|</span>}
                </p>
              ) : (
                <p className="hearing-placeholder">
                  {isListening
                    ? "Listening for voice... Say: “Alex is having severe chest pain and cannot breathe” or “Elena is bleeding from a cut”..."
                    : "Microphone is off. Tap 'Turn on Mic to Speak' or choose a quick preset below."}
                </p>
              )}
            </div>

            {/* Live Action Buttons */}
            <div className="hearing-actions-row">
              <button
                type="button"
                className="quick-interpret-btn"
                onClick={handleInterpretCurrentLive}
                disabled={!liveTranscript.trim()}
                title="Stops the microphone and generates immediate practical guidance pop-up"
              >
                <Sparkles size={14} />
                <span>Done Speaking · Stop Mic & Get Advice</span>
              </button>

              {/* PERMANENT STOP SPEAKER BUTTON IN LIVE MONITOR */}
              <button
                type="button"
                className={`monitor-stop-speaker-btn ${isSpeaking ? "is-speaking pulsing" : ""}`}
                onClick={voice.stopSpeaker}
                title="Silence speech audio immediately"
              >
                <VolumeX size={15} />
                <span>STOP SPEAKER</span>
              </button>

              <span className="silence-hint">
                {isListening
                  ? "Auto-stops after pause, or tap button above to stop mic immediately."
                  : "Microphone is currently stopped."}
              </span>

              {liveTranscript && (
                <button
                  type="button"
                  className="clear-speech-btn"
                  onClick={() => voice.clearLiveTranscript?.()}
                  title="Clear text"
                >
                  <Trash2 size={14} />
                  <span>Clear</span>
                </button>
              )}

              {!isListening && (
                <button
                  type="button"
                  className="resume-mic-btn"
                  onClick={voice.startListening}
                >
                  <Mic size={14} />
                  <span>Turn on Mic to Speak</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Manual Speech/Text Input */}
        <form onSubmit={handleManualSubmit} className="voice-text-form">
          <input
            type="text"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Or type/refine emergency symptoms here (e.g. 'Elena collapsed, bleeding on arm')..."
            className="voice-text-input"
          />
          <button type="submit" className="submit-speech-btn" disabled={!manualText.trim()}>
            Get Advice <ChevronRight size={16} />
          </button>
        </form>

        {/* Quick Test Voice Simulation Prompts */}
        <div className="test-speech-prompts">
          <span className="test-prompt-label">QUICK SIMULATION PRESETS:</span>
          <div className="test-chips-row">
            <button
              type="button"
              className="test-speech-chip"
              onClick={() => {
                const sample = "Alex is having severe chest pain and can't breathe";
                voice.stopListening?.();
                voice.onProcessText?.(sample);
                onStoryChange(sample);
                setShowModal(true);
              }}
            >
              “Alex severe chest pain”
            </button>
            <button
              type="button"
              className="test-speech-chip"
              onClick={() => {
                const sample = "Elena collapsed and is bleeding from a cut";
                voice.stopListening?.();
                voice.onProcessText?.(sample);
                onStoryChange(sample);
                setShowModal(true);
              }}
            >
              “Elena collapsed & bleeding”
            </button>
            <button
              type="button"
              className="test-speech-chip"
              onClick={() => {
                const sample = "Toxic ammonia leak in cabin, burning eyes";
                voice.stopListening?.();
                voice.onProcessText?.(sample);
                onStoryChange(sample);
                setShowModal(true);
              }}
            >
              “Ammonia leak & burning eyes”
            </button>
            <button
              type="button"
              className="test-speech-chip"
              onClick={() => {
                const sample = "Kenji is unresponsive and not breathing";
                voice.stopListening?.();
                voice.onProcessText?.(sample);
                onStoryChange(sample);
                setShowModal(true);
              }}
            >
              “Kenji unresponsive pulseless”
            </button>
          </div>
        </div>

        {/* Quick Emergency Category Presets */}
        <div className="quick-presets-section">
          <div className="preset-header">
            <span className="preset-title">RAPID EMERGENCY PROTOCOL SELECTORS</span>
            <span className="preset-hint">Tap any category to stop mic & open practical advice pop-up</span>
          </div>
          <div className="preset-chips-grid">
            {emergencyPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  voice.stopListening?.();
                  voice.onPresetSelect?.(preset.category);
                  setShowModal(true);
                }}
                className={`preset-chip ${
                  interpretation?.category === preset.category ? "preset-chip-active" : ""
                }`}
              >
                {getCategoryIcon(preset.category)}
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* BOTTOM SECTION: Communications & Voice Audit Log */}
        <div className="voice-log-bottom-card">
          <div className="log-bottom-header">
            <h4>COMMUNICATIONS & VOICE AUDIT LOG</h4>
            <span className="log-count">{voice.log.length} records</span>
          </div>
          <div className="voice-log-entries-horizontal">
            {voice.log.length === 0 ? (
              <p className="empty-log-note">
                No voice events logged yet. Spoken statements and assistant actions will be recorded here.
              </p>
            ) : (
              voice.log.slice(-6).reverse().map((entry, idx) => (
                <div key={idx} className="voice-log-item">
                  <span className="log-time">
                    {new Date(entry.at).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <div className="log-heard">“{entry.heard}”</div>
                  <div className="log-answer">{entry.answer}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SUGGESTIONS POP-UP MODAL
          (Appears automatically when advice is generated; speaks ONLY this suggestion)
         ========================================================================= */}
      {showModal && interpretation && (
        <div className="suggestions-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="suggestions-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header-bar">
              <div className="proto-title-group">
                {getCategoryIcon(interpretation.category)}
                <div>
                  <h2 className="modal-proto-title">{interpretation.categoryLabel}</h2>
                  <span className="modal-sub-label">
                    Practical Crew First-Response · No Medical Diagnosis · Earth Flight Surgeon Linked
                  </span>
                </div>
              </div>

              <div className="modal-top-controls">
                <div className={`severity-badge severity-${interpretation.severity.toLowerCase()}`}>
                  <AlertTriangle size={14} />
                  <span>{interpretation.severity} PRIORITY</span>
                </div>
                <button
                  type="button"
                  className="modal-close-icon"
                  onClick={() => setShowModal(false)}
                  aria-label="Close pop-up"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Patient Badge */}
            <div className="patient-symptoms-bar">
              <div className="patient-tag">
                <User size={14} />
                <span>
                  Patient: <strong>{interpretation.affectedCrewName || who || "Any Crew Member"}</strong>
                </span>
                <button
                  type="button"
                  className="change-patient-btn"
                  onClick={() => setShowCrewPicker((prev) => !prev)}
                >
                  Change
                </button>
              </div>

              {interpretation.detectedSymptoms.length > 0 && (
                <div className="symptoms-list">
                  {interpretation.detectedSymptoms.map((sym, idx) => (
                    <span key={idx} className="symptom-tag">
                      {sym}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Patient Selector Drawer if toggled */}
            {showCrewPicker && (
              <div className="crew-quick-select">
                <span>Select Affected Crew Member:</span>
                <div className="crew-pill-grid">
                  {crew.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className={`crew-choice-pill ${
                        (interpretation.affectedCrewName || who) === member.name ? "selected" : ""
                      }`}
                      onClick={() => {
                        onWhoSelect(member.name);
                        setShowCrewPicker(false);
                        showToast(`Patient set to ${member.name}`);
                      }}
                    >
                      <span className="mini-avatar">{member.initials}</span>
                      <span>{member.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Spoken Guidance Box (Only speaks this!) */}
            <div className={`spoken-guidance-box ${isSpeaking ? "is-speaking" : ""}`}>
              <div className="guidance-top">
                <div className="guidance-label">
                  <Sparkles size={14} className="text-cyan-400" />
                  <span>SPOKEN FIRST-AID GUIDANCE</span>
                </div>
              </div>
              <p className="guidance-text">“{interpretation.spokenSummary}”</p>

              {/* Single dedicated audio control bar */}
              <div className="modal-speaking-alert-strip">
                <button
                  type="button"
                  className={`big-modal-stop-btn ${isSpeaking ? "pulsing" : ""}`}
                  onClick={voice.stopSpeaker}
                  title="Silence speech audio immediately"
                >
                  <VolumeX size={18} />
                  <span>STOP SPEAKER</span>
                </button>
                <button
                  type="button"
                  className="modal-replay-alt-btn"
                  onClick={voice.replayGuidance}
                  title="Play audio advice again"
                >
                  <Volume2 size={16} />
                  <span>Replay Audio</span>
                </button>
              </div>
            </div>

            {/* Actionable Suggestions Checklist ("What to do right now") */}
            <div className="action-checklist-section">
              <div className="checklist-header">
                <div className="checklist-title">
                  <Stethoscope size={18} />
                  <h3>WHAT ASTRONAUTS CAN DO RIGHT NOW (Practical Steps)</h3>
                </div>
                <span className="progress-badge">
                  {completedStepsCount} of {totalStepsCount} completed
                </span>
              </div>

              <div className="checklist-items">
                {interpretation.immediateActions.map((action) => (
                  <div
                    key={action.id}
                    className={`checklist-item ${action.completed ? "is-completed" : ""}`}
                    onClick={() => voice.onToggleActionStep?.(action.id)}
                  >
                    <button
                      type="button"
                      className={`step-checkbox ${action.completed ? "checked" : ""}`}
                      aria-label={`Mark step ${action.stepNumber} complete`}
                    >
                      {action.completed ? <Check size={14} /> : <span>{action.stepNumber}</span>}
                    </button>

                    <div className="step-content">
                      <strong className="step-instruction">{action.instruction}</strong>
                      <p className="step-detail">{action.detail}</p>

                      {(action.equipment || action.location) && (
                        <div className="step-meta">
                          {action.location && (
                            <span className="location-pill">
                              <MapPin size={11} /> {action.location}
                            </span>
                          )}
                          {action.equipment && (
                            <span className="equip-pill">
                              <ShieldAlert size={11} /> {action.equipment}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Precautions & Warnings */}
            {interpretation.precautions.length > 0 && (
              <div className="precautions-box">
                <div className="precaution-title">
                  <AlertTriangle size={15} />
                  <span>CRITICAL SAFETY PRECAUTIONS & CONTRAINDICATIONS</span>
                </div>
                <ul>
                  {interpretation.precautions.map((precaution, idx) => (
                    <li key={idx}>{precaution}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Microgravity Space-Specific Notes */}
            {interpretation.spaceSpecificNotes && (
              <div className="space-notes-box">
                <strong>ZERO-G CLINICAL DYNAMICS:</strong> {interpretation.spaceSpecificNotes}
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="modal-footer-bar">
              <button
                type="button"
                className="modal-dismiss-btn"
                onClick={() => setShowModal(false)}
              >
                Close Pop-Up
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
export default EmergencyScreen;
