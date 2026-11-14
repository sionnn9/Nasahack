"use client";

import {
  ArrowLeft,
  Download,
  LockKeyhole,
  Moon,
  Send,
  ShieldAlert,
  Sun,
  WifiOff,
} from "lucide-react";
import {
  computeWellbeingScore,
  formatSleep,
  moodLabel,
  radiationDisclaimer,
  radiationSamples,
  radiationUnit,
  type CrewMember,
  type DailyCheckIn,
  type LiveVitals,
  type SensorQuality,
} from "./health-data";

function ReportsPage({
  astronaut,
  checkIn,
  vitals,
  quality,
  time,
  dark,
  offline,
  includePrivate,
  hasAstronaut,
  onEdit,
  onBack,
  onSetPage,
  onThemeToggle,
  onSendEmergency,
  onToggleOffline,
  onTogglePrivate,
  onSend,
}: {
  astronaut: CrewMember;
  checkIn: DailyCheckIn;
  vitals: LiveVitals;
  quality: SensorQuality;
  time: Date;
  dark: boolean;
  offline: boolean;
  includePrivate: boolean;
  hasAstronaut: boolean;
  onEdit: () => void;
  onBack: () => void;
  onSetPage: (page: "daily" | "reports") => void;
  onThemeToggle: () => void;
  onSendEmergency: () => void;
  onToggleOffline: (value: boolean) => void;
  onTogglePrivate: (value: boolean) => void;
  onSend: () => void;
}) {
  const score = computeWellbeingScore(checkIn);
  const sensorValue = (value: string) =>
    quality === "Usable" ? value : "No valid reading";
  const report = {
    astronaut: astronaut.name,
    role: astronaut.role,
    generatedAt: time.toISOString(),
    readings: {
      heartRate: {
        value: sensorValue(String(vitals.heartRate)),
        unit: "bpm",
        source: "Live sensor",
        status: quality,
      },
      skinTemperature: {
        value: sensorValue(vitals.skinTemperature.toFixed(1)),
        unit: "°C",
        source: "Live sensor",
        status: quality,
      },
      bloodPressure: {
        value: sensorValue(`${vitals.systolic} / ${vitals.diastolic}`),
        unit: "mmHg",
        source: "Live sensor",
        status: quality,
      },
      motion: {
        value: sensorValue(vitals.motion.toFixed(2)),
        unit: "g",
        source: "Live sensor",
        status: quality,
      },
      sleep: { value: formatSleep(checkIn), source: "Entered by you" },
      bloodSugar: {
        value: checkIn.bloodSugar || "Not entered yet",
        unit: "mg/dL",
        source: "Entered by you",
      },
      stress: {
        value: checkIn.stress ? `${checkIn.stress} / 5` : "Not entered yet",
        source: "Entered by you",
      },
      rested: {
        value: checkIn.rested ? `${checkIn.rested} / 5` : "Not entered yet",
        source: "Entered by you",
      },
      connected: {
        value: checkIn.connected
          ? `${checkIn.connected} / 5`
          : "Not entered yet",
        source: "Entered by you",
      },
      radiation: {
        value: radiationSamples[radiationSamples.length - 1].toFixed(1),
        unit: radiationUnit,
        source: "Static sample data",
        note: radiationDisclaimer,
      },
    },
    symptoms: checkIn.symptoms,
    details: checkIn.details,
    simulated: true,
    ...(includePrivate
      ? {
          mood: {
            value: checkIn.mood ? moodLabel(checkIn.mood) : "Not entered yet",
            source: "Entered by you · Private",
          },
          wellbeing: {
            value: score === null ? "Not enough answers yet" : `${score} / 100`,
            source: "Average of four self-reported answers",
          },
        }
      : {}),
  };

  const downloadReport = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "crewsignal-report.json";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };

  return (
    <>
      <nav className="nav-bar">
        <button className="back-link" onClick={onBack}>
          <ArrowLeft /> {hasAstronaut ? "Daily check" : "Home"}
        </button>
        <span className="nav-time">
          EARTH UTC{" "}
          <b>
            {time.toLocaleTimeString("en-GB", {
              timeZone: "UTC",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </b>
        </span>
        <div className="nav-tabs">
          {hasAstronaut && (
            <button onClick={() => onSetPage("daily")}>
              Daily check &amp; trends
            </button>
          )}
          <button className="active" onClick={() => onSetPage("reports")}>
            Reports
          </button>
        </div>
        <div className="nav-actions">
          <button
            className="icon-button"
            onClick={onThemeToggle}
            aria-label="Toggle theme"
          >
            {dark ? <Sun /> : <Moon />}
          </button>
          <button className="nav-emergency" onClick={onSendEmergency}>
            <ShieldAlert /> Emergency
          </button>
        </div>
      </nav>

      <section className="reports-page">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">CREW HEALTH · REPORT</div>
          <h1>Daily report</h1>
          <p className="subtle">
            A clear summary for your crew and Earth. All readings are simulated.
          </p>
        </div>

        <div className="welcome-actions">
          <button className="secondary-button" onClick={onEdit}>
            Edit report
          </button>
          <button className="secondary-button" onClick={downloadReport}>
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

      <div className="report-controls report-privacy-controls">
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={offline}
            onChange={(event) => onToggleOffline(event.target.checked)}
          />
          Pretend I&apos;m offline (demo)
        </label>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={includePrivate}
            onChange={(event) => onTogglePrivate(event.target.checked)}
          />
          <LockKeyhole size={14} />
          Include mood and wellbeing
        </label>
        <span className="queued">
          <span className="queued-dot" />
          {offline ? "Queued, not sent" : "Ready to send"}
        </span>
      </div>

      <div className="report-grid">
        <article className="report-card">
          <div className="report-title">
            <span className="report-number">01</span>
            <h2>Crew member</h2>
          </div>
          <ReportLine label="Name" value={astronaut.name} />
          <ReportLine label="Role" value={astronaut.role} />
          <ReportLine label="Mission day" value="184" />
          <ReportLine
            label="Report time"
            value={`${time.toLocaleString("en-GB", {
              timeZone: "UTC",
              dateStyle: "medium",
              timeStyle: "short",
            })} UTC`}
          />
        </article>

        <article className="report-card">
          <div className="report-title">
            <span className="report-number">02</span>
            <h2>Live sensors</h2>
          </div>
          <ReportLine
            label="Heart rate · Live sensor"
            value={`${sensorValue(String(vitals.heartRate))} ${quality === "Usable" ? "bpm" : ""} · ${quality}`}
          />
          <ReportLine
            label="Skin temperature · Live sensor"
            value={`${sensorValue(vitals.skinTemperature.toFixed(1))} ${quality === "Usable" ? "°C" : ""} · ${quality}`}
          />
          <ReportLine
            label="Blood pressure · Live sensor"
            value={`${sensorValue(`${vitals.systolic} / ${vitals.diastolic}`)} ${quality === "Usable" ? "mmHg" : ""} · ${quality}`}
          />
          <ReportLine
            label="Motion · Live sensor"
            value={`${sensorValue(vitals.motion.toFixed(2))} ${quality === "Usable" ? "g" : ""} · ${quality}`}
          />
        </article>

        <article className="report-card">
          <div className="report-title">
            <span className="report-number">03</span>
            <h2>Entered by you</h2>
          </div>
          <ReportLine label="Sleep" value={formatSleep(checkIn)} />
          <ReportLine
            label="Blood sugar"
            value={
              checkIn.bloodSugar
                ? `${checkIn.bloodSugar} mg/dL`
                : "Not entered yet"
            }
          />
          <ReportLine
            label="Stress"
            value={checkIn.stress ? `${checkIn.stress} / 5` : "Not entered yet"}
          />
          <ReportLine
            label="Rested"
            value={checkIn.rested ? `${checkIn.rested} / 5` : "Not entered yet"}
          />
          <ReportLine
            label="Connected to crew"
            value={
              checkIn.connected
                ? `${checkIn.connected} / 5`
                : "Not entered yet"
            }
          />
          <ReportLine
            label="Symptoms"
            value={checkIn.symptoms.length ? checkIn.symptoms.join(", ") : "None reported"}
          />
          {checkIn.details && <ReportLine label="Details" value={checkIn.details} />}
          <p className="source-caption">
            Source: Entered by you
            {checkIn.enteredAt ? ` · ${checkIn.enteredAt} UTC` : ""}
          </p>
        </article>

        <article className="report-card">
          <div className="report-title">
            <span className="report-number">04</span>
            <h2>Static data</h2>
          </div>
          <ReportLine
            label="Radiation · Static sample data"
            value={`${radiationSamples[radiationSamples.length - 1].toFixed(1)} ${radiationUnit}`}
          />
          <p className="radiation-disclaimer">{radiationDisclaimer}</p>
        </article>

        {includePrivate && (
          <article className="report-card">
            <div className="report-title">
              <span className="report-number">05</span>
              <h2>Private wellbeing</h2>
            </div>
            <>
              <ReportLine
                label="Mood · Entered by you"
                value={checkIn.mood ? moodLabel(checkIn.mood) : "Not entered yet"}
              />
              <ReportLine
                label="Wellbeing check-in"
                value={
                  score === null
                    ? "Not enough answers yet"
                    : `${score} / 100`
                }
              />
              <p className="source-caption">
                Average of four self-reported answers. Included because you
                opted in.
              </p>
            </>
          </article>
        )}

        <article className="report-card summary-report">
          <div className="report-title">
            <span className="report-number">05</span>
            <h2>Summary</h2>
          </div>
          <p>
            {astronaut.name} completed a simulated daily health check. Live
            sensor values are shown with their quality status.{" "}
            {checkIn.symptoms.length
              ? `Reported symptoms: ${checkIn.symptoms.join(", ")}.`
              : "No symptoms reported."}
          </p>
          <span className="simulated-note">
            Simulated readings and sample data. Prototype. Not a medical device.
          </span>
        </article>
      </div>
      </section>
    </>
  );
}

function ReportLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="report-line">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

export { ReportsPage };
