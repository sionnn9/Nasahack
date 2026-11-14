"use client";

import Link from "next/link";
import { ArrowRight, Repeat } from "lucide-react";
import { hazardFor } from "@/lib/mission-config";
import type { Concern } from "@/lib/types";

export function ConcernCard({
  concern,
  crewId,
  onRepeat,
  onHandoff,
  onAssessment,
}: {
  concern: Concern;
  crewId: string;
  onRepeat: () => void;
  onHandoff: () => void;
  onAssessment: () => void;
}) {
  return (
    <article className="concern-card" aria-labelledby={`${concern.id}-title`}>
      <header>
        <span className="concern-kicker">Concern · last {concern.windowHours} hours</span>
        <h3 id={`${concern.id}-title`}>{concern.title}</h3>
        <p className="concern-summary">{concern.summary}</p>
      </header>

      <ul className="concern-signals">
        {concern.signals.map((signal, index) => (
          <li key={`${signal.observedAt}-${index}`}>
            <span className="signal-dot" aria-hidden="true" />
            <span>{signal.text}</span>
            <time dateTime={signal.observedAt}>
              {new Date(signal.observedAt).toLocaleString("en-GB", {
                timeZone: "UTC",
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              UTC
            </time>
          </li>
        ))}
      </ul>

      <div className="concern-hazards">
        {concern.hazards.map((tag) => {
          const hazard = hazardFor(tag);
          return (
            <span key={tag} className="hazard-tag" title={hazard.plain}>
              {hazard.label}
            </span>
          );
        })}
      </div>

      <div className="concern-actions">
        <button type="button" className="secondary-button" onClick={onRepeat}>
          <Repeat aria-hidden="true" /> Repeat measurement
        </button>
        <button type="button" className="secondary-button" onClick={onAssessment}>
          Start guided assessment
        </button>
        <button type="button" className="primary-button" onClick={onHandoff}>
          Prepare handoff <ArrowRight aria-hidden="true" />
        </button>
      </div>
      <p className="disclaimer-line">
        These signals changed in the same window. No cause is assigned.{" "}
        <Link href={`/crew/${crewId}`}>See all readings</Link>
      </p>
    </article>
  );
}
