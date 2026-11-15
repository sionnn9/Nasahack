"use client";

import { LockKeyhole, Radio } from "lucide-react";
import {
  formatSleep,
  formatUtcTime,
  moodLabel,
  radiationDisclaimer,
  radiationSamples,
  radiationUnit,
  type BodyArea,
  type DailyCheckIn,
  type LiveVitals,
  type SensorHistories,
  type SensorQuality,
  CLINICAL_REFERENCE_RANGES,
  getReadingClinicalZone,
} from "./health-data";
import { liveReadings } from "./health-data";
import { LineChart } from "./visualizations";
import { SensorQualityBadge } from "./sensor-quality-badge";

function ReadingDetails({
  selected,
  headTab,
  checkIn,
  vitals,
  quality,
  histories,
  onHeadTabChange,
}: {
  selected: BodyArea;
  headTab: "mood" | "sleep";
  checkIn: DailyCheckIn;
  vitals: LiveVitals;
  quality: SensorQuality;
  histories: SensorHistories;
  onHeadTabChange: (tab: "mood" | "sleep") => void;
}) {
  if (selected === "Radiation") {
    return (
      <article className="detail-card new-detail-card">
        <div className="detail-top">
          <div>
            <div className="eyebrow">STATIC SAMPLE DATA</div>
            <h2>Radiation</h2>
          </div>
          <span className="reading-icon lavender">
            <Radio size={18} />
          </span>
        </div>
        <div className="reading">
          <strong>{radiationSamples[radiationSamples.length - 1].toFixed(1)}</strong>
          <span>{radiationUnit}</span>
        </div>
        <span className="source-badge">Static sample data</span>
        <LineChart
          values={radiationSamples}
          color="var(--lavender)"
          tall
          label="Radiation static sample data timeline"
        />
        <p className="radiation-disclaimer">{radiationDisclaimer}</p>
        <p className="plain-explanation">
          Twenty-four illustrative hourly sample values. No personal
          measurement or exposure estimate is provided.
        </p>
      </article>
    );
  }

  if (selected === "Head") {
    const isMood = headTab === "mood";
    const value = isMood
      ? checkIn.mood
        ? moodLabel(checkIn.mood)
        : "Not entered yet"
      : formatSleep(checkIn);

    return (
      <article className="detail-card new-detail-card">
        <div className="eyebrow">ENTERED BY YOU</div>
        <h2>Head</h2>
        <div className="details-tabs" role="tablist" aria-label="Head readings">
          <button
            role="tab"
            aria-selected={isMood}
            className={isMood ? "active" : ""}
            onClick={() => onHeadTabChange("mood")}
          >
            Mood <LockKeyhole size={13} />
          </button>
          <button
            role="tab"
            aria-selected={!isMood}
            className={!isMood ? "active" : ""}
            onClick={() => onHeadTabChange("sleep")}
          >
            Sleep
          </button>
        </div>
        <p className="detail-reading-label">{isMood ? "Mood" : "Sleep"}</p>
        <div className="reading detail-reading">
          <strong>{value}</strong>
          {!isMood && checkIn.sleepHours !== "" && <span>hours and minutes</span>}
        </div>
        {isMood && (
          <p className="privacy-caption">
            <LockKeyhole size={14} /> Private. Not included in reports unless you
            choose to include it.
          </p>
        )}
        <p className="plain-explanation">
          What you entered · {checkIn.enteredAt
            ? `${checkIn.enteredAt} UTC`
            : "Not entered yet"}
        </p>
      </article>
    );
  }

  if (selected === "Abdomen") {
    return (
      <article className="detail-card new-detail-card">
        <div className="eyebrow">ENTERED BY YOU</div>
        <h2>Blood sugar</h2>
        <div className="reading detail-reading">
          <strong>{checkIn.bloodSugar || "Not entered yet"}</strong>
          {checkIn.bloodSugar && <span>mg/dL</span>}
        </div>
        <p className="plain-explanation">
          What you entered · Fingertip test with the glucometer.
          {checkIn.bloodSugarUnavailable
            ? " You marked that you could not measure this today."
            : ""}
        </p>
        <p className="source-caption">
          What you entered ·{" "}
          {checkIn.enteredAt
            ? `${checkIn.enteredAt} UTC`
            : "Not entered yet"}
        </p>
      </article>
    );
  }

  const reading = liveReadings.find((item) => item.area === selected);
  if (!reading) return null;

  const displayedValue =
    quality !== "Usable"
      ? "No valid reading"
      : selected === "Heart"
        ? String(vitals.heartRate)
        : selected === "Skin"
          ? vitals.skinTemperature.toFixed(1)
          : selected === "Arm"
            ? `${vitals.systolic} / ${vitals.diastolic}`
            : vitals.motion.toFixed(2);
  const unit = quality !== "Usable" ? "" : reading.unit;
  const values = histories[reading.key].filter(
    (value): value is number => value !== null,
  );
  const currentValue =
    selected === "Heart"
      ? vitals.heartRate
      : selected === "Skin"
        ? vitals.skinTemperature
        : selected === "Arm"
          ? vitals.systolic
          : vitals.motion;

  const refRange = CLINICAL_REFERENCE_RANGES[reading.key];
  const clinicalZone = getReadingClinicalZone(reading.key, currentValue);

  const rangeValues = values.length ? values : [currentValue];
  const minimum = Math.min(...rangeValues);
  const maximum = Math.max(...rangeValues);

  // Position needle against standard clinical physiological scale (e.g. 45–180 bpm)
  const clinicalPosition =
    refRange.max === refRange.min
      ? 50
      : Math.max(
          2,
          Math.min(
            98,
            ((currentValue - refRange.min) / (refRange.max - refRange.min)) * 100,
          ),
        );

  // Nominal band overlay on track
  const nominalLeft = ((refRange.nominalLow - refRange.min) / (refRange.max - refRange.min)) * 100;
  const nominalWidth = ((refRange.nominalHigh - refRange.nominalLow) / (refRange.max - refRange.min)) * 100;

  const updatedAt = formatUtcTime(vitals.updatedAt[reading.key]);
  const isBloodPressure = selected === "Arm";
  const isSkin = selected === "Skin";
  const isMotion = selected === "Legs";

  return (
    <article className="detail-card new-detail-card">
      <div className="detail-top">
        <div>
          <div className="eyebrow">
            CURRENT READING <span className="source-label">Live sensor</span>
          </div>
          <h2>{reading.name}</h2>
        </div>
        <span className={`reading-icon ${reading.color}`}>
          <reading.icon size={18} />
        </span>
      </div>

      <div className="reading detail-reading">
        <strong>{displayedValue}</strong>
        {unit && <span>{unit}</span>}
        {quality === "Usable" && (
          <span className={`clinical-zone-pill ${clinicalZone.tone}`}>
            {clinicalZone.label}
          </span>
        )}
      </div>

      <div className="reading-status detail-quality">
        <SensorQualityBadge status={quality} />
        <span>Updated {updatedAt} UTC</span>
      </div>

      {quality === "Usable" ? (
        <div className={`live-reading-meter ${isBloodPressure ? "range-bar" : "gauge-meter"}`}>
          <div className="meter-track">
            {/* Highlight nominal clinical target zone */}
           {/*  <span
              className="meter-nominal-band"
              style={{
                left: `${nominalLeft}%`,
                width: `${nominalWidth}%`,
              }}
              title={`Nominal baseline zone: ${refRange.nominalLow}–${refRange.nominalHigh} ${reading.unit}`}
            /> */}
            <span
              className="meter-indicator-needle"
              style={{ left: `${clinicalPosition}%` }}
              title={`Current: ${displayedValue} ${reading.unit}`}
            />
          </div>
          <div className="meter-labels">
            <span>Scale min: {refRange.min} {isSkin ? "°C" : isMotion ? "g" : ""}</span>
            <span className="meter-center-target">
              Target: {refRange.nominalLow}–{refRange.nominalHigh} {reading.unit}
            </span>
            <span>Scale max: {refRange.max} {isSkin ? "°C" : isMotion ? "g" : ""}</span>
          </div>
          <small className="observed-recent-span">
            Observed (last 60s): <b>{minimum.toFixed(isSkin ? 1 : isMotion ? 2 : 0)} – {maximum.toFixed(isSkin ? 1 : isMotion ? 2 : 0)} {reading.unit}</b>
          </small>
        </div>
      ) : (
        <div className="unusable-reading-note">
          Current reading is omitted from the timeline while sensor contact is
          not usable.
        </div>
      )}

      <LineChart
        values={histories[reading.key]}
        color={`var(--${reading.color})`}
        tall
        label={`${reading.name} live sensor timeline`}
      />
      <p className="plain-explanation">{reading.whatItIs}</p>
      <p className="source-caption">Source: Live bio-telemetry · Active sensor stream</p>
      <p className="plain-explanation">
        Tell the crew or flight surgeon if readings exceed expected mission thresholds.
      </p>
    </article>
  );
}

export { ReadingDetails };
