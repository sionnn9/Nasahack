"use client";

import { useState } from "react";
import { Check, LockKeyhole, X } from "lucide-react";
import {
  moodOptions,
  symptomOptions,
  type DailyCheckIn,
} from "./health-data";

function RatingOptions({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="rating-options" role="group" aria-label={label}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          className={value === String(rating) ? "chosen" : ""}
          aria-pressed={value === String(rating)}
          onClick={() => onChange(String(rating))}
        >
          {rating}
        </button>
      ))}
    </div>
  );
}

function FormDrawer({
  initialValue,
  onClose,
  onSave,
}: {
  initialValue: DailyCheckIn;
  onClose: () => void;
  onSave: (value: DailyCheckIn) => void;
}) {
  const [draft, setDraft] = useState<DailyCheckIn>({
    ...initialValue,
    symptoms: [...initialValue.symptoms],
  });

  const update = (changes: Partial<DailyCheckIn>) => {
    setDraft((current) => ({ ...current, ...changes }));
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside
        className="form-drawer"
        aria-labelledby="daily-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <div className="eyebrow">PRIVATE CHECK-IN</div>
            <h2 id="daily-form-title">Today&apos;s form</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close form"
          >
            <X />
          </button>
        </div>
        <p className="subtle">
          Your answers are saved on this device. Leave anything blank if you
          have not entered it.
        </p>

        <section className="form-group">
          <h3>Measurements you enter by hand</h3>
          <label className="form-label" htmlFor="sleep-hours">
            Sleep
          </label>
          <div className="sleep-input">
            <input
              id="sleep-hours"
              type="number"
              inputMode="numeric"
              min="0"
              max="24"
              value={draft.sleepHours}
              onChange={(event) => update({ sleepHours: event.target.value })}
              aria-label="Sleep hours"
            />
            <span>hours</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max="59"
              value={draft.sleepMinutes}
              onChange={(event) => update({ sleepMinutes: event.target.value })}
              aria-label="Sleep minutes"
            />
            <span>minutes</span>
          </div>

          <label className="form-label" htmlFor="blood-sugar">
            Blood sugar <span>mg/dL</span>
          </label>
          <input
            id="blood-sugar"
            className="manual-number-input"
            type="number"
            inputMode="numeric"
            min="1"
            value={draft.bloodSugar}
            disabled={draft.bloodSugarUnavailable}
            onChange={(event) =>
              update({
                bloodSugar: event.target.value,
                bloodSugarUnavailable: false,
              })
            }
            placeholder="Not entered yet"
          />
          <p className="field-note">
            Fingertip test with the glucometer. Entered by you.
          </p>
          <button
            type="button"
            className={`unavailable-button ${draft.bloodSugarUnavailable ? "chosen" : ""}`}
            aria-pressed={draft.bloodSugarUnavailable}
            onClick={() =>
              update({
                bloodSugarUnavailable: !draft.bloodSugarUnavailable,
                bloodSugar: "",
              })
            }
          >
            I couldn&apos;t measure this
          </button>
        </section>

        <section className="form-group">
          <h3>How you feel</h3>
          <label className="form-label">
            How are you feeling? <LockKeyhole size={14} />
            <span>Private</span>
          </label>
          <div className="mood-options">
            {moodOptions.map(({ value, label }) => (
              <button
                type="button"
                key={value}
                className={draft.mood === value ? "chosen" : ""}
                aria-pressed={draft.mood === value}
                onClick={() => update({ mood: value })}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="field-note">Self-reported and private.</p>

          <label className="form-label">How stressed do you feel?</label>
          <p className="field-note">1 = least · 5 = most</p>
          <RatingOptions
            value={draft.stress}
            onChange={(stress) => update({ stress })}
            label="Stress from 1 to 5"
          />

          <label className="form-label">How rested do you feel?</label>
          <RatingOptions
            value={draft.rested}
            onChange={(rested) => update({ rested })}
            label="How rested you feel, from 1 to 5"
          />

          <label className="form-label">
            How connected do you feel to the crew?
          </label>
          <RatingOptions
            value={draft.connected}
            onChange={(connected) => update({ connected })}
            label="How connected you feel to the crew, from 1 to 5"
          />
        </section>

        <section className="form-group">
          <h3>Symptoms</h3>
          <div className="symptom-list">
            {symptomOptions.map((symptom) => (
              <label key={symptom}>
                <input
                  type="checkbox"
                  checked={draft.symptoms.includes(symptom)}
                  onChange={(event) => {
                    if (event.target.checked) {
                      const nextSymptoms =
                        symptom === "None of these"
                          ? [symptom]
                          : [
                              ...draft.symptoms.filter(
                                (entry) =>
                                  entry !== "None of these" &&
                                  entry !== symptom,
                              ),
                              symptom,
                            ];
                      update({ symptoms: nextSymptoms });
                      return;
                    }

                    update({
                      symptoms: draft.symptoms.filter(
                        (entry) => entry !== symptom,
                      ),
                    });
                  }}
                />
                {symptom}
              </label>
            ))}
          </div>

          <label className="form-label" htmlFor="more">
            Tell us more
          </label>
          <textarea
            id="more"
            value={draft.details}
            onChange={(event) => update({ details: event.target.value })}
            placeholder="Anything else you want the crew to know?"
          />
        </section>

        <button
          className="primary-button save-button"
          onClick={() => onSave(draft)}
        >
          Save today&apos;s check-in <Check />
        </button>
      </aside>
    </div>
  );
}

export { FormDrawer };
