"use client";

import { Check, LockKeyhole, X } from "lucide-react";
import { symptomOptions } from "./health-data";

function FormDrawer({
  mood,
  stress,
  symptoms,
  onClose,
  onMoodSelect,
  onStressSelect,
  onSymptomsUpdate,
  onSave,
}: {
  mood: string;
  stress: string;
  symptoms: string[];
  onClose: () => void;
  onMoodSelect: (value: string) => void;
  onStressSelect: (value: string) => void;
  onSymptomsUpdate: (nextSymptoms: string[]) => void;
  onSave: () => void;
}) {
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside
        className="form-drawer"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <div className="eyebrow">PRIVATE CHECK-IN</div>
            <h2>Today&apos;s form</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close form"
          >
            <X />
          </button>
        </div>

        <p className="subtle">Your answers are saved on this device.</p>

        <label className="form-label">
          How are you feeling? <LockKeyhole size={14} />
          <span>Private</span>
        </label>
        <div className="mood-options">
          {["Low", "Uneasy", "Okay", "Calm", "Great"].map((value) => (
            <button
              key={value}
              className={mood === value ? "chosen" : ""}
              onClick={() => onMoodSelect(value)}
            >
              {value}
            </button>
          ))}
        </div>

        <label className="form-label" htmlFor="sleep">
          How much did you sleep?
        </label>
        <div className="sleep-input">
          <input id="sleep" type="number" defaultValue="7" min="0" max="24" />
          <span>hours</span>
          <input type="number" defaultValue="20" min="0" max="59" />
          <span>minutes</span>
        </div>

        <label className="form-label">
          How stressed do you feel? <span>1 = least · 5 = most</span>
        </label>
        <div className="stress-options">
          {["1", "2", "3", "4", "5"].map((value) => (
            <button
              key={value}
              className={stress === value ? "chosen" : ""}
              onClick={() => onStressSelect(value)}
            >
              {value}
            </button>
          ))}
        </div>

        <label className="form-label">Any symptoms today?</label>
        <div className="symptom-list">
          {symptomOptions.map((symptom) => (
            <label key={symptom}>
              <input
                type="checkbox"
                checked={symptoms.includes(symptom)}
                onChange={(event) => {
                  if (event.target.checked) {
                    onSymptomsUpdate([
                      ...symptoms.filter((entry) => entry !== "None of these"),
                      symptom,
                    ]);
                    return;
                  }

                  onSymptomsUpdate(
                    symptoms.filter((entry) => entry !== symptom),
                  );
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
          placeholder="Anything else you want the crew to know?"
        />

        <button className="primary-button save-button" onClick={onSave}>
          Save today&apos;s check-in <Check />
        </button>
      </aside>
    </div>
  );
}

export { FormDrawer };
