"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Printer, Send, ShieldCheck } from "lucide-react";
import { CrewNav } from "@/components/health/crew-nav";
import { LaneBadge } from "@/components/health/status-chip";
import { TrustRing } from "@/components/health/trust-ring";
import { formatValue, metricMeta } from "@/lib/metrics";
import { buildHandoff, summariseHandoff } from "@/lib/handoff/build";
import { environmentFor, missionConfig } from "@/lib/mission-config";
import { useStore } from "@/lib/store";
import type { Handoff } from "@/lib/types";

export function ReportsPage() {
  const observations = useStore((state) => state.observations);
  const checkIns = useStore((state) => state.checkIns);
  const encounters = useStore((state) => state.encounters);
  const environment = useStore((state) => state.environment);
  const enqueue = useStore((state) => state.enqueue);
  const notify = useStore((state) => state.notify);

  const [crewId, setCrewId] = useState(missionConfig.crew[0].id);
  const [encounterId, setEncounterId] = useState<string>("");
  const [includePrivate, setIncludePrivate] = useState(false);
  const [notes, setNotes] = useState("");

  const crewEncounters = encounters.filter((entry) => entry.crewId === crewId);
  const encounter =
    crewEncounters.find((entry) => entry.id === encounterId) ?? crewEncounters[0] ?? null;
  const latestCheckIn =
    checkIns
      .filter((entry) => entry.crewId === crewId)
      .sort((a, b) => (a.observedAt < b.observedAt ? 1 : -1))[0] ?? null;

  const handoff: Handoff = useMemo(
    () =>
      buildHandoff({
        crewId,
        encounter,
        checkIn: latestCheckIn,
        observations,
        includePrivate,
        notes,
      }),
    [crewId, encounter, latestCheckIn, observations, includePrivate, notes],
  );

  const summary = summariseHandoff(handoff);
  const emergencyEncounters = encounters.filter(
    (entry) => entry.kind === "emergency" && entry.crewId === crewId,
  );
  const member = missionConfig.crew.find((entry) => entry.id === crewId)!;

  const download = () => {
    const blob = new Blob([JSON.stringify({ handoff, summary }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `crewsignal-handoff-${crewId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const queue = async () => {
    const now = new Date().toISOString();
    const preset = environmentFor(environment);
    await enqueue({
      id: `handoff-${handoff.id}-${Date.now()}`,
      crewId,
      kind: "handoff",
      createdAt: now,
      sentAt: null,
      acknowledgedAt: null,
      state: "queued",
      delaySeconds: preset.delaySeconds,
      title: `Handoff · ${member.name}`,
      payload: handoff,
      private: includePrivate,
      history: [
        {
          state: "queued",
          at: now,
          note: "Queued on board. Nothing has been sent yet.",
        },
      ],
    });
    notify("Handoff queued in the outbox. Delivery state is shown honestly.", "ok");
  };

  return (
    <section className="reports-page">
      <CrewNav />
      <header className="reports-head">
        <div>
          <p className="illustrative-label">HANDOFF PACKET — REVIEW BEFORE SHARING</p>
          <h1>Prepare a handoff</h1>
          <p className="assessment-sub">
            You choose what is shared. Private answers stay off unless you tick them.
          </p>
        </div>
        <div className="reports-actions no-print">
          <button type="button" className="secondary-button" onClick={() => window.print()}>
            <Printer aria-hidden="true" /> Print / PDF
          </button>
          <button type="button" className="secondary-button" onClick={download}>
            <Download aria-hidden="true" /> Download JSON
          </button>
          <button type="button" className="primary-button" onClick={() => void queue()}>
            <Send aria-hidden="true" /> Queue for Earth
          </button>
        </div>
      </header>

      <div className="report-controls no-print">
        <label>
          Crew member
          <select
            value={crewId}
            onChange={(event) => {
              setCrewId(event.target.value);
              setEncounterId("");
            }}
          >
            {missionConfig.crew.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Source
          <select value={encounter?.id ?? ""} onChange={(event) => setEncounterId(event.target.value)}>
            <option value="">Latest check-in{encounter ? " + latest encounter" : ""}</option>
            {crewEncounters.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.kind} · {new Date(entry.startedAt).toLocaleString("en-GB", {
                  timeZone: "UTC",
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                UTC
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={includePrivate}
            onChange={(event) => setIncludePrivate(event.target.checked)}
          />
          Include mood, stress, rested and connected
        </label>
        <label className="report-notes">
          Note to the flight surgeon
          <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
      </div>

      <article className="report-card">
        <h2>
          <span className="report-number">01</span> Who and when
        </h2>
        <p>
          {member.name} · {member.role} · {missionConfig.missionName}, day{" "}
          {missionConfig.missionDay}. Prepared{" "}
          {new Date(handoff.createdAt).toLocaleString("en-GB", {
            timeZone: "UTC",
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          UTC.
        </p>
        <p>Recipients: {handoff.recipients.join(", ")}.</p>
      </article>

      <article className="report-card">
        <h2>
          <span className="report-number">02</span> Reported symptoms
        </h2>
        {handoff.symptoms.length === 0 ? (
          <p>No symptoms reported.</p>
        ) : (
          <ul className="report-list">
            {handoff.symptoms.map((symptom) => (
              <li key={symptom.id}>
                <strong>{symptom.name}</strong> — started {symptom.onset.replace(/_/g, " ")},
                trend {symptom.trend}
                {symptom.urgent && <span className="urgent-tag">Needs attention</span>}
              </li>
            ))}
          </ul>
        )}
        {emergencyEncounters.length > 0 && (
          <div className="emergency-report">
            <h3>Emergency situation report</h3>
            {emergencyEncounters.slice(0, 2).map((entry) => (
              <p key={entry.id}>
                {new Date(entry.startedAt).toLocaleString("en-GB", {
                  timeZone: "UTC",
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                UTC — {entry.pathwayId}, outcome {entry.outcome}.{" "}
                {entry.actions.map((action) => action.text).join(" ") || "No actions logged."}
              </p>
            ))}
          </div>
        )}
      </article>

      <article className="report-card">
        <h2>
          <span className="report-number">03</span> Measurements
        </h2>
        {handoff.observations.length === 0 ? (
          <p>No measurements in the last 72 hours.</p>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th scope="col">Reading</th>
                <th scope="col">Value</th>
                <th scope="col">Lane</th>
                <th scope="col">Measured (UTC)</th>
                <th scope="col">Quality</th>
              </tr>
            </thead>
            <tbody>
              {handoff.observations.slice(0, 40).map((entry) => (
                <tr key={entry.id}>
                  <td>{metricMeta[entry.metric].label}</td>
                  <td>{formatValue(entry.metric, entry.value)}</td>
                  <td>
                    <LaneBadge lane={entry.lane} />
                  </td>
                  <td>
                    {new Date(entry.observedAt).toLocaleString("en-GB", {
                      timeZone: "UTC",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>
                    <span className="report-quality">
                      {entry.quality}
                      <TrustRing observation={entry} size={16} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="disclaimer-line">
          Quality flags are shown, not hidden. Flagged values are excluded from comparisons.
        </p>
      </article>

      <article className="report-card">
        <h2>
          <span className="report-number">04</span> Trends compared with this person
        </h2>
        {handoff.trends.length === 0 ? (
          <p>Not enough comparable history to describe a trend.</p>
        ) : (
          <ul className="report-list">
            {handoff.trends.map((trend) => (
              <li key={trend.metric}>{trend.text}</li>
            ))}
          </ul>
        )}
        {handoff.unknowns.length > 0 && (
          <>
            <h3>Unknowns</h3>
            <ul className="report-list">
              {handoff.unknowns.map((unknown) => (
                <li key={unknown}>{unknown}</li>
              ))}
            </ul>
          </>
        )}
      </article>

      <article className="report-card">
        <h2>
          <span className="report-number">05</span> Summary
        </h2>
        <ul className="report-list">
          {summary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {handoff.notes && <p className="report-note">Crew note: {handoff.notes}</p>}
        <p className="disclaimer-line">
          <ShieldCheck aria-hidden="true" /> Generated from the data above. Private answers{" "}
          {includePrivate ? "are included" : "are excluded"}. Demo packet, not a medical record.
        </p>
      </article>

      <p className="no-print">
        <Link className="text-button" href={`/crew/${crewId}`}>
          Edit source data on the daily page
        </Link>
      </p>
    </section>
  );
}
