"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, Volume2 } from "lucide-react";
import { PathwayRunner } from "@/components/health/pathway-runner";
import { crew } from "@/lib/mission-config";
import { emergencyPathway } from "@/lib/pathways";

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

/**
 * Help a Crewmate. Opens instantly, works with no typing, and allows an
 * unknown identity. Every pathway is illustrative.
 */
export function EmergencyPage({ drill = false }: { drill?: boolean }) {
  const [answer, setAnswer] = useState<"Yes" | "No" | "Unsure" | null>(null);
  const [who, setWho] = useState<string>("unknown");

  const pathway = answer ? emergencyPathway(answer) : null;
  const question = "Is the person responding?";

  return (
    <section className="emergency-screen">
      <header className="assessment-head">
        <p className="illustrative-label">ILLUSTRATIVE — NOT CLINICALLY REVIEWED</p>
        <h1>{drill ? "Drill: help a crewmate" : "Help a crewmate"}</h1>
        <p className="assessment-sub">
          No typing needed. Identity can stay unknown. Nothing here is a diagnosis.
        </p>
      </header>

      {!pathway ? (
        <div className="step-card emergency-start">
          <div className="step-title-row">
            <h2>{question}</h2>
            <button
              type="button"
              className="icon-button"
              aria-label="Read this question aloud"
              onClick={() => speak(question)}
            >
              <Volume2 aria-hidden="true" />
            </button>
          </div>

          <div className="identity-row">
            <label htmlFor="emergency-who">Who needs help?</label>
            <select
              id="emergency-who"
              value={who}
              onChange={(event) => setWho(event.target.value)}
            >
              <option value="unknown">Unknown / not sure</option>
              {crew.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div className="step-options emergency-options">
            <button
              type="button"
              className="step-option"
              onClick={() => setAnswer("Yes")}
            >
              Yes
            </button>
            <button
              type="button"
              className="step-option danger"
              onClick={() => setAnswer("No")}
            >
              No
            </button>
            <button
              type="button"
              className="step-option"
              onClick={() => setAnswer("Unsure")}
            >
              Unsure
            </button>
          </div>
          <p className="disclaimer-line">
            <ShieldAlert aria-hidden="true" /> Each answer opens a different pathway. If in
            doubt, alert the crew.
          </p>
        </div>
      ) : (
        <PathwayRunner
          crewId={who}
          pathwayId={pathway.id}
          drill={drill}
          symptoms={[]}
        />
      )}

      <div className="emergency-footer">
        <Link className="secondary-button" href={drill ? "/emergency" : "/emergency/drill"}>
          {drill ? "Exit drill" : "Practice this flow (drill)"}
        </Link>
        <Link className="secondary-button" href="/">
          Home
        </Link>
        {answer && (
          <button
            type="button"
            className="text-button"
            onClick={() => setAnswer(null)}
          >
            Start over
          </button>
        )}
      </div>
    </section>
  );
}
