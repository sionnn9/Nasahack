"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { moodOptions } from "@/components/health/health-data";
import { onsetLabels, symptomCatalogue, trendLabels } from "@/lib/symptoms";
import { observationsFromCheckIn, makeObservation } from "@/lib/observations/derived";
import { pathwayForSymptoms } from "@/lib/pathways";
import { useStore } from "@/lib/store";
import type { CheckIn, SymptomEntry, SymptomOnset, SymptomTrend } from "@/lib/types";

function scale(value: string): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

export function FormDrawer({
  crewId,
  initial,
  onClose,
}: {
  crewId: string;
  initial?: CheckIn | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const saveCheckIn = useStore((state) => state.saveCheckIn);
  const addObservations = useStore((state) => state.addObservations);
  const notify = useStore((state) => state.notify);

  const [sleepHours, setSleepHours] = useState(
    initial?.sleepMinutes ? String(Math.floor(initial.sleepMinutes / 60)) : "",
  );
  const [sleepMinutes, setSleepMinutes] = useState(
    initial?.sleepMinutes ? String(initial.sleepMinutes % 60) : "",
  );
  const [bloodSugar, setBloodSugar] = useState("");
  const [bloodSugarUnavailable, setBloodSugarUnavailable] = useState(false);
  const [mood, setMood] = useState(initial?.mood ? String(initial.mood) : "");
  const [stress, setStress] = useState(initial?.stress ? String(initial.stress) : "");
  const [rested, setRested] = useState(initial?.rested ? String(initial.rested) : "");
  const [connected, setConnected] = useState(
    initial?.connected ? String(initial.connected) : "",
  );
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>(initial?.symptoms ?? []);
  const [details, setDetails] = useState(initial?.details ?? "");
  const [error, setError] = useState("");

  const urgent = symptoms.filter((symptom) => symptom.urgent);
  const hours = Number(sleepHours || 0);
  const minutes = Number(sleepMinutes || 0);

  const pathway = useMemo(
    () => pathwayForSymptoms(symptoms.map((symptom) => symptom.name)),
    [symptoms],
  );

  const toggleSymptom = (name: string, isUrgent: boolean) => {
    setSymptoms((current) => {
      const existing = current.find((symptom) => symptom.name === name);
      if (existing) return current.filter((symptom) => symptom.name !== name);
      return [
        ...current.filter((symptom) => symptom.name !== "None of these"),
        {
          id: `${name}-${Date.now()}`,
          name,
          onset: "today" as SymptomOnset,
          trend: "same" as SymptomTrend,
          urgent: isUrgent,
        },
      ];
    });
  };

  const updateSymptom = (name: string, patch: Partial<SymptomEntry>) => {
    setSymptoms((current) =>
      current.map((symptom) => (symptom.name === name ? { ...symptom, ...patch } : symptom)),
    );
  };

  const submit = async () => {
    setError("");
    if (sleepMinutes !== "" && (minutes < 0 || minutes > 59)) {
      setError("Sleep minutes must be between 0 and 59.");
      return;
    }
    if (sleepHours !== "" && (hours < 0 || hours > 24)) {
      setError("Sleep hours must be between 0 and 24.");
      return;
    }
    if (bloodSugar !== "" && !bloodSugarUnavailable) {
      const numeric = Number(bloodSugar);
      if (Number.isNaN(numeric) || numeric < 1 || numeric > 35) {
        setError(
          "Blood sugar is outside the plausible meter range (1–35 mmol/L). Repeat the measurement.",
        );
        return;
      }
    }

    const now = new Date();
    const observedAt = now.toISOString();
    const checkIn: CheckIn = {
      id: `checkin-${crewId}-${observedAt.slice(0, 10)}`,
      crewId,
      observedAt,
      enteredAt: observedAt,
      sleepMinutes: sleepHours === "" && sleepMinutes === "" ? null : hours * 60 + minutes,
      mood: scale(mood),
      stress: scale(stress),
      rested: scale(rested),
      connected: scale(connected),
      symptoms,
      details,
    };

    await saveCheckIn(checkIn);

    const rows = observationsFromCheckIn(checkIn);
    if (bloodSugar !== "" && !bloodSugarUnavailable) {
      rows.push(
        makeObservation({
          crewId,
          metric: "glucose",
          value: Number(bloodSugar),
          observedAt,
          lane: "manual",
          method: "glucometer",
          context: "unknown",
        }),
      );
    }
    if (bloodSugarUnavailable) {
      rows.push(
        makeObservation({
          crewId,
          metric: "glucose",
          value: null,
          observedAt,
          lane: "manual",
          method: "glucometer",
          context: "unknown",
          quality: "not_measured",
        }),
      );
    }
    await addObservations(rows);
    notify("Check-in saved. Answers stay on this device.", "ok");
    onClose();
  };

  return (
    <BottomSheet
      title="Daily check-in"
      subtitle="Symptoms outrank numbers. Nothing here is a diagnosis."
      onClose={onClose}
    >
      {urgent.length > 0 && (
        <div className="urgent-banner" role="alert">
          <ShieldAlert aria-hidden="true" />
          <div>
            <strong>This needs attention now.</strong>
            <p>
              You reported {urgent.map((symptom) => symptom.name).join(", ")}. You do not
              need to finish the form first.
            </p>
            <div className="urgent-actions">
              <button type="button" className="primary-button" onClick={() => router.push("/emergency")}>
                Start emergency help
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => router.push(`/crew/${crewId}/assess/${pathway.id}`)}
              >
                Start guided assessment
              </button>
            </div>
          </div>
        </div>
      )}

      <fieldset className="form-section">
        <legend>Sleep</legend>
        <div className="manual-values">
          <label>
            Hours
            <input
              inputMode="numeric"
              value={sleepHours}
              onChange={(event) => setSleepHours(event.target.value)}
            />
          </label>
          <label>
            Minutes
            <input
              inputMode="numeric"
              value={sleepMinutes}
              onChange={(event) => setSleepMinutes(event.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>Blood sugar</legend>
        <div className="manual-values">
          <label>
            mmol/L
            <input
              inputMode="decimal"
              value={bloodSugar}
              disabled={bloodSugarUnavailable}
              onChange={(event) => setBloodSugar(event.target.value)}
            />
          </label>
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={bloodSugarUnavailable}
            onChange={(event) => setBloodSugarUnavailable(event.target.checked)}
          />
          I couldn&apos;t measure this
        </label>
      </fieldset>

      <fieldset className="form-section">
        <legend>Mood</legend>
        <div className="option-row">
          {moodOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`option-pill ${mood === option.value ? "selected" : ""}`}
              aria-pressed={mood === option.value}
              onClick={() => setMood(mood === option.value ? "" : option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>Your answers (1–5)</legend>
        {(
          [
            ["Stress", stress, setStress, "1 low", "5 high"],
            ["Rested", rested, setRested, "1 not rested", "5 rested"],
            ["Connected", connected, setConnected, "1 isolated", "5 connected"],
          ] as const
        ).map(([label, value, setter, low, high]) => (
          <div className="rating-row" key={label}>
            <span>{label}</span>
            <div className="rating" role="group" aria-label={label}>
              {[1, 2, 3, 4, 5].map((number) => (
                <button
                  key={number}
                  type="button"
                  aria-pressed={value === String(number)}
                  className={value === String(number) ? "selected" : ""}
                  onClick={() => setter(value === String(number) ? "" : String(number))}
                >
                  {number}
                </button>
              ))}
            </div>
            <span className="rating-scale">{low} · {high}</span>
          </div>
        ))}
      </fieldset>

      <fieldset className="form-section">
        <legend>Symptoms</legend>
        <p className="form-hint">Each symptom gets when it started and whether it is changing.</p>
        <ul className="symptom-list">
          {symptomCatalogue.map((symptom) => {
            const selected = symptoms.find((entry) => entry.name === symptom.name);
            return (
              <li key={symptom.name} className={selected ? "selected" : ""}>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={!!selected}
                    onChange={() => toggleSymptom(symptom.name, symptom.urgent)}
                  />
                  {symptom.name}
                  {symptom.urgent && <span className="urgent-tag">Needs attention</span>}
                </label>
                {selected && (
                  <div className="symptom-detail">
                    <label>
                      Started
                      <select
                        value={selected.onset}
                        onChange={(event) =>
                          updateSymptom(symptom.name, {
                            onset: event.target.value as SymptomOnset,
                          })
                        }
                      >
                        {Object.entries(onsetLabels).map(([value, text]) => (
                          <option key={value} value={value}>
                            {text}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Trend
                      <select
                        value={selected.trend}
                        onChange={(event) =>
                          updateSymptom(symptom.name, {
                            trend: event.target.value as SymptomTrend,
                          })
                        }
                      >
                        {Object.entries(trendLabels).map(([value, text]) => (
                          <option key={value} value={value}>
                            {text}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </li>
            );
          })}
          <li>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={symptoms.length === 0}
                onChange={() => setSymptoms([])}
              />
              None of these
            </label>
          </li>
        </ul>
      </fieldset>

      <fieldset className="form-section">
        <legend>Anything else (optional)</legend>
        <textarea
          rows={3}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          placeholder="What you noticed, in your own words."
        />
      </fieldset>

      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}

      <div className="sheet-actions">
        <button type="button" className="primary-button" onClick={() => void submit()}>
          Save check-in
        </button>
        <button type="button" className="secondary-button" onClick={onClose}>
          Cancel
        </button>
      </div>
      <p className="disclaimer-line">
        Demo check-in. Answers are stored on this device and shared only through a handoff
        you review.
      </p>
    </BottomSheet>
  );
}
