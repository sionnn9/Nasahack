"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CircleHelp,
  LockKeyhole,
} from "lucide-react";
import {
  computeWellbeingScore,
  enteredReadings,
  formatSleep,
  formatUtcTime,
  getHistoricalCheckIns,
  getHistoricalDays,
  liveReadings,
  moodLabel,
  radiationSamples,
  radiationUnit,
  radiationDisclaimer,
  type BodyArea,
  type CrewMember,
  type DailyCheckIn,
  type LiveVitals,
  type SensorHistories,
  type SensorQuality,
} from "./health-data";
import { LineChart } from "./visualizations";
import { WellbeingTile } from "./wellbeing-tile";
import { SensorQualityBadge } from "./sensor-quality-badge";

type ReadingRowProps = {
  icon: React.ComponentType<{ size?: number }>;
  name: string;
  value: string;
  unit: string;
  source: string;
  status: string;
  updatedAt: string;
  flashKey?: string;
  color: string;
  chart: Array<number | null>;
  whatItIs: string;
  tellCrewWhen: string;
  quality?: SensorQuality;
  isPrivate?: boolean;
  animationDelay?: number;
  onSelect: () => void;
};

function ReadingRow({
  icon: Icon,
  name,
  value,
  unit,
  source,
  status,
  updatedAt,
  flashKey,
  color,
  chart,
  whatItIs,
  tellCrewWhen,
  quality,
  isPrivate = false,
  animationDelay = 0,
  onSelect,
}: ReadingRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      className="reading-row"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="reading-row-main">
        <button className="reading-select" onClick={onSelect}>
          <span className={`reading-icon ${color}`}>
            <Icon size={18} />
          </span>
          <span className="reading-name-value">
            <b>
              {name}
              {isPrivate && <LockKeyhole size={12} aria-label="Private" />}
            </b>
            <strong key={flashKey ?? updatedAt} className="reading-live-value">
              {value}
              {unit && value !== "Not entered yet" && value !== "No valid reading" && (
                <small> {unit}</small>
              )}
            </strong>
          </span>
        </button>

        <div className="reading-source-status">
          <span className={`source-badge ${source === "Live sensor" ? "live" : ""}`}>
            {source}
          </span>
          {quality ? (
            <SensorQualityBadge status={quality} />
          ) : (
            <span className="reading-status-word">{status}</span>
          )}
        </div>

        <div className="reading-spark-wrap">
          <LineChart
            values={chart}
            color={`var(--${color === "lavender" ? "lavender" : color})`}
            label={`${name} sample timeline`}
          />
          <span>Updated {updatedAt} UTC</span>
        </div>

        <button
          className="reading-expand"
          aria-label={`${expanded ? "Hide" : "Show"} information about ${name}`}
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
        </button>
      </div>

      {expanded && (
        <div className="reading-brief">
          <p>
            <b>What it is:</b> {whatItIs}
          </p>
          <p>
            <b>Tell the crew or Earth when:</b> {tellCrewWhen}
          </p>
        </div>
      )}
    </article>
  );
}

function AllReadings({
  astronaut,
  checkIn,
  vitals,
  quality,
  histories,
  wellbeingHistory,
  supportRequested,
  onSelectArea,
  onHeadTabChange,
  onRequestSupport,
}: {
  astronaut: CrewMember;
  checkIn: DailyCheckIn;
  vitals: LiveVitals;
  quality: SensorQuality;
  histories: SensorHistories;
  wellbeingHistory: number[];
  supportRequested: boolean;
  onSelectArea: (area: BodyArea) => void;
  onHeadTabChange: (tab: "mood" | "sleep") => void;
  onRequestSupport: () => void;
}) {
  const [history] = useState(() => getHistoricalDays(astronaut.id));
  const [checkInHistory] = useState(() => getHistoricalCheckIns(astronaut.id));
  const dailyHistory = history.filter((day) => day.dayOffset < 0);
  const radiationHistory = radiationSamples;
  const usable = quality === "Usable";
  const enteredAt = checkIn.enteredAt
    ? `Entered at ${checkIn.enteredAt}`
    : "Not entered yet";
  const currentTime = formatUtcTime(new Date());
  const moodText = checkIn.mood ? moodLabel(checkIn.mood) : "Not entered yet";
  const sleepText = formatSleep(checkIn);
  const bloodSugarText = checkIn.bloodSugar
    ? checkIn.bloodSugar
    : "Not entered yet";
  const stressText = checkIn.stress
    ? checkIn.stress
    : "Not entered yet";
  const liveValues = {
    heartRate: usable ? String(vitals.heartRate) : "No valid reading",
    skinTemperature: usable
      ? vitals.skinTemperature.toFixed(1)
      : "No valid reading",
    bloodPressure: usable
      ? `${vitals.systolic} / ${vitals.diastolic}`
      : "No valid reading",
    motion: usable ? vitals.motion.toFixed(2) : "No valid reading",
  };
  const liveCharts = {
    heartRate: [
      ...dailyHistory.map((day) => day.restingHeartRate),
      null,
      ...histories.heartRate,
    ],
    skinTemperature: [
      ...dailyHistory.map((day) => day.skinTemperature),
      null,
      ...histories.skinTemperature,
    ],
    bloodPressure: [
      ...history.map((day) => day.systolic),
      null,
      ...histories.bloodPressure,
    ],
    motion: histories.motion,
  };

  return (
    <section className="all-readings-section" id="all-readings">
      <div className="section-head">
        <div>
          <div className="eyebrow">YOUR HEALTH SNAPSHOT</div>
          <h2>All readings</h2>
        </div>
        <span className="subtle">Every value shows its source</span>
      </div>

      <article className="all-readings-card">
        <div className="all-readings-layout">
          <div className="reading-groups">
            <ReadingGroup title="Live sensors">
              {liveReadings.map((reading, index) => (
                <ReadingRow
                  key={reading.key}
                  icon={reading.icon}
                  name={reading.name}
                  value={liveValues[reading.key]}
                  unit={reading.unit}
                  source="Live sensor"
                  status={quality}
                  updatedAt={formatUtcTime(vitals.updatedAt[reading.key])}
                  flashKey={vitals.updatedAt[reading.key]}
                  color={reading.color}
                  chart={liveCharts[reading.key]}
                  whatItIs={reading.whatItIs}
                  tellCrewWhen={reading.tellCrewWhen}
                  quality={quality}
                  animationDelay={index * 45}
                  onSelect={() => onSelectArea(reading.area)}
                />
              ))}
            </ReadingGroup>

            <ReadingGroup title="Entered by you">
              {enteredReadings.map((reading, index) => {
                const currentValue =
                  reading.key === "sleep"
                    ? sleepText
                    : reading.key === "mood"
                      ? moodText
                      : reading.key === "bloodSugar"
                        ? bloodSugarText
                        : stressText;
                const chart =
                  reading.key === "sleep"
                    ? history.map((day) => day.sleepMinutes)
                    : reading.key === "bloodSugar"
                      ? history.map((day) => day.bloodSugar)
                      : reading.key === "mood"
                        ? checkInHistory.map((day) => day.mood)
                        : checkInHistory.map((day) => day.stress);

                return (
                  <ReadingRow
                    key={reading.key}
                    icon={reading.icon}
                    name={reading.name}
                    value={currentValue}
                    unit={reading.unit}
                    source="Entered by you"
                    status={enteredAt}
                    updatedAt={checkIn.enteredAt ?? currentTime}
                    color={reading.color}
                    chart={chart}
                    whatItIs={reading.whatItIs}
                    tellCrewWhen={reading.tellCrewWhen}
                    isPrivate={reading.key === "mood"}
                    animationDelay={index * 45}
                    onSelect={() => {
                      onSelectArea(reading.area);
                      if (reading.key === "sleep") onHeadTabChange("sleep");
                      if (reading.key === "mood" || reading.key === "stress") {
                        onHeadTabChange("mood");
                      }
                    }}
                  />
                );
              })}
            </ReadingGroup>

            <ReadingGroup title="Static data">
              <ReadingRow
                icon={CircleHelp}
                name="Radiation"
                value={radiationSamples[radiationSamples.length - 1].toFixed(1)}
                unit={radiationUnit}
                source="Static sample data"
                status="Static sample"
                updatedAt={currentTime}
                color="lavender"
                chart={radiationHistory}
                whatItIs="An illustrative absorbed dose rate sample series."
                tellCrewWhen="Tell the crew if you have questions about the environment data."
                onSelect={() => onSelectArea("Radiation")}
              />
              <p className="radiation-disclaimer">{radiationDisclaimer}</p>
            </ReadingGroup>
          </div>

          <WellbeingTile
            checkIn={checkIn}
            history={wellbeingHistory}
            requestSent={supportRequested}
            onRequestSupport={onRequestSupport}
          />
        </div>
      </article>
    </section>
  );
}

function ReadingGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="reading-group">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export { AllReadings };
