"use client";

import { LockKeyhole, MessageCircleHeart } from "lucide-react";
import {
  computeWellbeingScore,
  moodLabel,
  type DailyCheckIn,
} from "./health-data";
import { LineChart } from "./visualizations";

const answers = [
  { key: "mood", label: "Mood", reverse: false },
  { key: "stress", label: "Stress", reverse: true },
  { key: "rested", label: "Rested", reverse: false },
  { key: "connected", label: "Connected", reverse: false },
] as const;

function normalizedAnswer(value: string, reverse: boolean): number | null {
  if (!value) return null;
  const score = Number(value);
  return ((reverse ? 5 - score : score - 1) / 4) * 100;
}

function answerLabel(
  key: (typeof answers)[number]["key"],
  value: string,
): string {
  if (!value) return "Not entered yet";
  if (key === "mood") return moodLabel(value);
  return `${value} / 5`;
}

function WellbeingTile({
  checkIn,
  history,
  requestSent,
  onRequestSupport,
}: {
  checkIn: DailyCheckIn;
  history: number[];
  requestSent: boolean;
  onRequestSupport: () => void;
}) {
  const score = computeWellbeingScore(checkIn);
  const minimum = history.length ? Math.min(...history) : null;
  const maximum = history.length ? Math.max(...history) : null;
  const historyPoints = history.slice(-7);

  return (
    <aside className="wellbeing-tile">
      <div className="wellbeing-heading">
        <div>
          <div className="wellbeing-title">
            <LockKeyhole size={15} />
            <h3>Mental wellbeing check-in</h3>
          </div>
          <p>Self-reported. Not a diagnosis.</p>
        </div>
      </div>

      <div className="wellbeing-gauge-wrap">
        <div
          className="wellbeing-gauge"
          style={{
            background:
              score === null
                ? "conic-gradient(var(--raised) 360deg, var(--raised) 0deg)"
                : `conic-gradient(var(--accent) ${score * 3.6}deg, var(--raised) 0deg)`,
          }}
          role="img"
          aria-label={
            score === null
              ? "Not enough answers yet"
              : `Wellbeing check-in score ${score} out of 100`
          }
        >
          <div>
            {score === null ? (
              <span className="wellbeing-missing">Not enough answers yet.</span>
            ) : (
              <strong>{score} / 100</strong>
            )}
          </div>
        </div>
        {score === null && (
          <p className="wellbeing-prompt">Fill today&apos;s form.</p>
        )}
      </div>

      <div className="wellbeing-answers">
        {answers.map(({ key, label, reverse }) => {
          const value = checkIn[key];
          const normalized = normalizedAnswer(value, reverse);
          return (
            <div className="wellbeing-answer" key={key}>
              <div>
                <span>{label}</span>
                <b>{answerLabel(key, value)}</b>
              </div>
              <span
                className="wellbeing-answer-bar"
                role="img"
                aria-label={`${label}: ${answerLabel(key, value)}`}
              >
                <i
                  style={{
                    width: normalized === null ? "0%" : `${normalized}%`,
                  }}
                />
              </span>
            </div>
          );
        })}
      </div>

      <p className="wellbeing-formula">
        Average of your 4 answers today.
        <span>
          mood = (m−1)/4×100 · stress = (5−s)/4×100 · rested and connected =
          (answer−1)/4×100
        </span>
      </p>

      <div className="wellbeing-history">
        <div>
          <b>
            {minimum === null || maximum === null
              ? "Your last 7 days: no sample"
              : `Your last 7 days: ${minimum} to ${maximum}`}
          </b>
          <LineChart
            values={historyPoints}
            label="Sample wellbeing check-in values over the last seven days"
          />
        </div>
      </div>

      <button
        className="secondary-button support-button"
        onClick={onRequestSupport}
      >
        <MessageCircleHeart />
        {requestSent ? "Request saved privately" : "Request private support"}
      </button>
      {requestSent && (
        <p className="private-outbox-note">Saved to your private outbox.</p>
      )}
    </aside>
  );
}

export { WellbeingTile };
