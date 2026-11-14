"use client";

import { Download, LockKeyhole, Send, WifiOff } from "lucide-react";
import { metrics, type CrewMember } from "./health-data";

function ReportsPage({
  astronaut,
  mood,
  stress,
  symptoms,
  time,
  offline,
  onEdit,
  onToggleOffline,
  onSend,
}: {
  astronaut: CrewMember | null;
  mood: string;
  stress: string;
  symptoms: string[];
  time: Date;
  offline: boolean;
  onEdit: () => void;
  onToggleOffline: (value: boolean) => void;
  onSend: () => void;
}) {
  return (
    <section className="reports-page">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">CREW HEALTH · REPORT</div>
          <h1>Daily report</h1>
          <p className="subtle">A clear summary for your crew and Earth.</p>
        </div>

        <div className="welcome-actions">
          <button className="secondary-button" onClick={onEdit}>
            Edit report
          </button>
          <button
            className="secondary-button"
            onClick={() => {
              const blob = new Blob(
                [
                  JSON.stringify(
                    {
                      astronaut: astronaut?.name,
                      generatedAt: time.toISOString(),
                      readings: metrics,
                      mood,
                      symptoms,
                      simulated: true,
                    },
                    null,
                    2,
                  ),
                ],
                { type: "application/json" },
              );

              const anchor = document.createElement("a");
              anchor.href = URL.createObjectURL(blob);
              anchor.download = "crewsignal-report.json";
              anchor.click();
              URL.revokeObjectURL(anchor.href);
            }}
          >
            <Download /> Download JSON
          </button>
          <button
            className="primary-button"
            disabled={offline}
            onClick={onSend}
          >
            {offline ? (
              <>
                <WifiOff /> Offline: download only
              </>
            ) : (
              <>
                <Send /> Send to Earth
              </>
            )}
          </button>
        </div>
      </div>

      <div className="report-controls">
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={offline}
            onChange={(event) => onToggleOffline(event.target.checked)}
          />{" "}
          Pretend I&apos;m offline (demo)
        </label>
        <span className="queued">
          <span className="queued-dot" />{" "}
          {offline ? "Queued, not sent" : "Ready to send"}
        </span>
      </div>

      <div className="report-grid">
        <article className="report-card">
          <div className="report-title">
            <span className="report-number">01</span>
            <h2>Crew member</h2>
          </div>
          <div className="report-line">
            <span>Name</span>
            <b>{astronaut?.name || "Alex Morgan"}</b>
          </div>
          <div className="report-line">
            <span>Role</span>
            <b>{astronaut?.role || "Commander"}</b>
          </div>
          <div className="report-line">
            <span>Mission day</span>
            <b>184</b>
          </div>
          <div className="report-line">
            <span>Report time</span>
            <b>
              {time.toLocaleString("en-GB", {
                timeZone: "UTC",
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              UTC
            </b>
          </div>
        </article>

        <article className="report-card">
          <div className="report-title">
            <span className="report-number">02</span>
            <h2>Sensor readings</h2>
          </div>
          {metrics.slice(0, 4).map((metric) => (
            <div className="report-line" key={metric.name}>
              <span>{metric.name}</span>
              <b>
                {metric.value} {metric.unit}
                <small> · {metric.source}</small>
              </b>
            </div>
          ))}
        </article>

        <article className="report-card">
          <div className="report-title">
            <span className="report-number">03</span>
            <h2>Daily check-in</h2>
          </div>
          <div className="report-line">
            <span>
              Mood <LockKeyhole size={13} />
            </span>
            <b>{mood || "Not entered"}</b>
          </div>
          <div className="report-line">
            <span>Sleep</span>
            <b>7h 20m · Entered by you</b>
          </div>
          <div className="report-line">
            <span>Stress</span>
            <b>{stress} / 5 · Entered by you</b>
          </div>
          <div className="report-line">
            <span>Symptoms</span>
            <b>{symptoms.length ? symptoms.join(", ") : "None reported"}</b>
          </div>
        </article>

        <article className="report-card summary-report">
          <div className="report-title">
            <span className="report-number">04</span>
            <h2>Summary</h2>
          </div>
          <p>
            {astronaut?.name || "Alex Morgan"} completed a simulated daily
            health check. Heart rate and skin temperature are available from
            live sensor simulation.{" "}
            {symptoms.length
              ? `Reported symptoms: ${symptoms.join(", ")}.`
              : "No symptoms reported."}
          </p>
          <span className="simulated-note">
            Simulated data. Prototype. Not a medical device.
          </span>
        </article>
      </div>
    </section>
  );
}

export { ReportsPage };
