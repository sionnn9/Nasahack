"use client";

import {
  Activity,
  ArrowLeft,
  Check,
  CircleHelp,
  ChevronRight,
  Clock3,
  Moon,
  ShieldAlert,
  Sun,
  Utensils,
} from "lucide-react";
import {
  bodyAreas,
  computeWellbeingScore,
  formatSleep,
  formatUtcTime,
  isSensorQuality,
  moodLabel,
  type BodyArea,
  type CrewMember,
  type DailyCheckIn,
  type LiveVitals,
  type PageName,
  type QualityOverride,
  type SensorHistories,
  type SensorQuality,
  type TimelineEvent,
} from "./health-data";
import { AllReadings } from "./all-readings";
import { ReadingDetails } from "./reading-details";
import { BodyMap, LineChart } from "./visualizations";

const areaDisplayLabels: Record<BodyArea, string> = {
  Head: "Mood/Sleep",
  Heart: "Heart rate",
  Arm: "Blood Pressure",
  Skin: "Skin temperature",
  Abdomen: "Blood Sugar",
  Legs: "Motion/Activity",
  Radiation: "Radiation",
};

function DashboardPage({
  astronaut,
  page,
  dark,
  time,
  checking,
  selected,
  headTab,
  checkIn,
  vitals,
  histories,
  quality,
  qualityOverride,
  wellbeingHistory,
  supportRequested,
  timelineEvents,
  onThemeToggle,
  onSendEmergency,
  onBack,
  onOpenForm,
  onBeginSensorCheck,
  onSelectArea,
  onSetPage,
  onHeadTabChange,
  onQualityOverrideChange,
  onRequestSupport,
  onReplayTutorial,
}: {
  astronaut: CrewMember;
  page: PageName;
  dark: boolean;
  time: Date;
  checking: boolean;
  selected: BodyArea;
  headTab: "mood" | "sleep";
  checkIn: DailyCheckIn;
  vitals: LiveVitals;
  histories: SensorHistories;
  quality: SensorQuality;
  qualityOverride: QualityOverride;
  wellbeingHistory: number[];
  supportRequested: boolean;
  timelineEvents: TimelineEvent[];
  onThemeToggle: () => void;
  onSendEmergency: () => void;
  onBack: () => void;
  onOpenForm: () => void;
  onBeginSensorCheck: () => void;
  onSelectArea: (area: BodyArea) => void;
  onSetPage: (page: "daily" | "reports") => void;
  onHeadTabChange: (tab: "mood" | "sleep") => void;
  onQualityOverrideChange: (value: QualityOverride) => void;
  onRequestSupport: () => void;
  onReplayTutorial: () => void;
}) {
  const isUsable = quality === "Usable";
  const bodyLabels: Partial<Record<BodyArea, string[]>> = {
    Head: [
      `Mood: ${checkIn.mood ? moodLabel(checkIn.mood) : "Not entered yet"}`,
      `Sleep: ${formatSleep(checkIn)}`,
    ],
    Heart: [isUsable ? `${vitals.heartRate} bpm` : "No valid reading"],
    Arm: [
      isUsable
        ? `${vitals.systolic} / ${vitals.diastolic} mmHg`
        : "No valid reading",
    ],
    Skin: [
      isUsable ? `${vitals.skinTemperature.toFixed(1)} °C` : "No valid reading",
    ],
    Abdomen: [
      checkIn.bloodSugar ? `${checkIn.bloodSugar} mg/dL` : "Not entered yet",
    ],
    Legs: [isUsable ? `${vitals.motion.toFixed(2)} g` : "No valid reading"],
  };
  const currentHeartValues = histories.heartRate.filter(
    (value): value is number => value !== null,
  );
  const currentRange = currentHeartValues.length
    ? `${Math.min(...currentHeartValues)}–${Math.max(...currentHeartValues)} bpm`
    : "No valid reading";
  const events = [
    ...timelineEvents,
    ...(checkIn.symptoms.length
      ? [
          {
            label: "Symptoms reported",
            time: checkIn.enteredAt ?? "",
            kind: "symptoms" as const,
          },
        ]
      : []),
  ];
  const score = computeWellbeingScore(checkIn);

  return (
    <>
      <nav className="nav-bar">
        <button className="back-link" onClick={onBack}>
          <ArrowLeft /> Home
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
          <button
            className={page === "daily" ? "active" : ""}
            onClick={() => onSetPage("daily")}
          >
            Daily check &amp; trends
          </button>
          <button
            className={page === "reports" ? "active" : ""}
            onClick={() => onSetPage("reports")}
          >
            Reports
          </button>
        </div>
        <div className="nav-actions">
          <button
            className="nav-tutorial"
            onClick={onReplayTutorial}
            aria-label={`Replay tutorial for ${astronaut.name}`}
            title="Replay tutorial"
          >
            <CircleHelp />
            <span>Tutorial</span>
          </button>
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

      <section className="dashboard">
        <div className="welcome-row">
          <div>
            <div className="eyebrow">
              MISSION DAY 184{" "}
              <span className="status-chip">
                <span className="live-dot" /> SYNCED LOCALLY
              </span>
            </div>
            <h1>Welcome, {astronaut.name.split(" ")[0]}</h1>
            <p className="subtle">
              Your daily check-in, at a glance. Simulated readings.
            </p>
          </div>

          <div className="welcome-actions">
            <button className="secondary-button" onClick={onBeginSensorCheck}>
              <Activity />{" "}
              {checking ? "Checking sensors…" : "Check all sensors"}
            </button>
            <button className="primary-button" onClick={onOpenForm}>
              Fill today&apos;s form <ChevronRight />
            </button>
          </div>
        </div>

        <div className="task-row">
          {["Sensor check", "Mood", "Sleep", "Symptoms"].map((task, index) => (
            <span className="task-chip" key={task}>
              <span
                className={index === 0 || checkIn.enteredAt ? "task-check" : ""}
              >
                {index === 0 || checkIn.enteredAt ? (
                  <Check size={13} />
                ) : (
                  <span className="task-dot" />
                )}
              </span>
              {task}
            </span>
          ))}
          <label className="simulator-control">
            Simulate
            <select
              value={qualityOverride}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "Auto" || isSensorQuality(value)) {
                  onQualityOverrideChange(value);
                }
              }}
            >
              <option value="Auto">Auto</option>
              <option value="Usable">Usable</option>
              <option value="Poor contact">Poor contact</option>
              <option value="Disconnected">Disconnected</option>
            </select>
          </label>
        </div>

        <div className="overview-grid">
          <article className="body-card">
            <div className="body-heading">
              <div>
                <div className="eyebrow">BODY MAP</div>
                <h2>{selected === "Radiation" ? "Environment" : selected}</h2>
                <p>
                  {selected === "Radiation"
                    ? "Static environmental sample data."
                    : "Select a body area to explore its readings."}
                </p>
                <button
                  className={`radiation-chip ${selected === "Radiation" ? "selected" : ""}`}
                  onClick={() => onSelectArea("Radiation")}
                >
                  <span className="radiation-chip-dot" />
                  Environment · Radiation (static data)
                </button>
              </div>
              <button
                className="text-button"
                onClick={() =>
                  document
                    .getElementById("all-readings")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                All readings <ChevronRight />
              </button>
            </div>

            <div className="body-map">
              <BodyMap
                selected={selected}
                labels={bodyLabels}
                onSelect={onSelectArea}
              />
            </div>

            <div className="area-list" aria-label="Choose body area">
              {bodyAreas.map((area) => (
                <button
                  key={area}
                  className={selected === area ? "selected" : ""}
                  onClick={() => onSelectArea(area)}
                >
                  {areaDisplayLabels[area]}
                </button>
              ))}
            </div>
          </article>

          <ReadingDetails
            selected={selected}
            headTab={headTab}
            checkIn={checkIn}
            vitals={vitals}
            quality={quality}
            histories={histories}
            onHeadTabChange={onHeadTabChange}
          />
        </div>

        <section className="trends-section">
          <div className="section-head">
            <div>
              <div className="eyebrow">LIVE SENSOR TIMELINE</div>
              <h2>Today</h2>
            </div>
            <span className="date-pill">
              <Clock3 />{" "}
              {time.toLocaleDateString("en-GB", { dateStyle: "medium" })}
            </span>
          </div>

          <article className="chart-card today-timeline-card">
            <div className="chart-title">
              <div>
                <span className="metric-dot coral-dot" />
                <b>Heart rate</b>
                <span className="chart-source">Live sensor · bpm</span>
              </div>
              <b className="timeline-current">
                {isUsable ? `${vitals.heartRate} bpm` : "No valid reading"}
              </b>
            </div>
            <div className="chart-plot">
              <LineChart
                values={histories.heartRate}
                color="var(--coral)"
                tall
                label="Heart rate, live sensor values with gaps when not usable"
              />
              <div className="x-axis">
                <span>Earlier</span>
                <span>Recent</span>
                <span>Now</span>
              </div>
            </div>
            <p className="chart-alt">
              Recent sample range: {currentRange}. Unusable readings appear as
              gaps. Source: Live sensor.
            </p>
            {astronaut.id === "alex-morgan" && (
              <p className="quality-event">
                Poor contact · Sensor fit · 8 seconds · earlier today
              </p>
            )}
          </article>
        </section>

        <AllReadings
          astronaut={astronaut}
          checkIn={checkIn}
          vitals={vitals}
          quality={quality}
          histories={histories}
          wellbeingHistory={wellbeingHistory}
          supportRequested={supportRequested}
          onSelectArea={onSelectArea}
          onHeadTabChange={onHeadTabChange}
          onRequestSupport={onRequestSupport}
        />
      </section>
    </>
  );
}

export { DashboardPage };
