"use client";

import { ArrowLeft, ChevronRight, Radio, Send, ShieldAlert } from "lucide-react";
import { crew, type CrewMember } from "./health-data";

function EmergencyScreen({
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
}: {
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
}) {
  const selectedPerson = crew.find((person) => person.name === who);

  return (
    <section className="emergency-screen">
      <header className="emergency-header">
        <button
          className="icon-button"
          onClick={onBack}
          aria-label="Close emergency helper"
        >
          <ArrowLeft />
        </button>
        <span>Emergency helper</span>
        <span className="offline-pill">
          <span className="live-dot" /> Works offline
        </span>
      </header>

      <div className="emergency-content">
        <div className="emergency-symbol">
          <ShieldAlert size={30} />
        </div>

        <div className="eyebrow">ILLUSTRATIVE · NOT CLINICALLY REVIEWED</div>
        <h1>Let&apos;s get help.</h1>
        <p>
          This app cannot tell the cause. We&apos;ll help you share what&apos;s
          happening.
        </p>

        {!who ? (
          <>
            <h2>Who needs help?</h2>
            <div className="who-grid">
              {crew.map((person) => (
                <button
                  key={person.name}
                  className="who-button"
                  onClick={() => onWhoSelect(person.name)}
                >
                  <span className="avatar">{person.initials}</span>
                  {person.name}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="selected-person">
              <span className="avatar">{selectedPerson?.initials}</span>
              <span>
                Helping <b>{who}</b>
              </span>
              <button className="text-button" onClick={() => onWhoSelect("")}>
                Change
              </button>
            </div>

            <label className="story-label" htmlFor="story">
              What happened?
            </label>
            <textarea
              id="story"
              value={story}
              onChange={(event) => onStoryChange(event.target.value)}
              placeholder="Type what you noticed. You can edit this at any time."
            />

            <div className="voice-row">
              <button
                className="mic-button"
                aria-label="Voice is unavailable in this preview"
              >
                <span>●</span>
              </button>
              <span>Voice is not available, please type.</span>
            </div>

            <button
              className="primary-button"
              onClick={onContinue}
              disabled={!story.trim()}
            >
              Continue <ChevronRight />
            </button>

            {step > 0 && (
              <div className="helper-reply">
                <div className="helper-label">CREWSIGNAL HELPER</div>
                <p>
                  {step === 1
                    ? "Is their breathing as usual? If you are unsure, alert the crew now."
                    : step === 2
                      ? "Thank you. Stay with them and keep them comfortable."
                      : "Alert the crew and contact the medical officer or Earth now."}
                </p>
                <p className="safety-note">This app cannot tell the cause.</p>
                <button className="primary-button" onClick={onContinue}>
                  Continue
                </button>
              </div>
            )}
          </>
        )}

        <div className="urgent-actions">
          <button onClick={saveReport}>
            <Radio /> Alert the crew
          </button>
          <button onClick={saveReport}>
            <Send /> Contact medical officer or Earth
          </button>
        </div>
      </div>

      {who && story && (
        <div className="situation-box">
          <strong>
            Situation report ·{" "}
            {time.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </strong>
          <p>
            {who || "Crew member"}: {story || "Emergency support requested."}
          </p>
          <button className="text-button" onClick={onReportView}>
            Add to Reports <ChevronRight />
          </button>
        </div>
      )}
    </section>
  );
}

export { EmergencyScreen };
