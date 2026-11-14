"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { makeObservation } from "@/lib/observations/derived";
import { gate } from "@/lib/quality/gate";
import { useStore } from "@/lib/store";
import type { Metric, Observation, ObservationContext } from "@/lib/types";

const entryOptions: Array<{ metric: Metric; label: string; method: string }> = [
  { metric: "heart_rate", label: "Heart rate", method: "manual_entry" },
  { metric: "bp_systolic", label: "Blood pressure", method: "cuff_upper_arm" },
  { metric: "skin_temp", label: "Skin temperature", method: "thermometer_skin" },
  { metric: "glucose", label: "Blood sugar", method: "glucometer" },
];

function localDateTime(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function ManualEntry({
  crewId,
  onClose,
  onSaved,
}: {
  crewId: string;
  onClose: () => void;
  onSaved?: (observations: Observation[]) => void;
}) {
  const addObservations = useStore((state) => state.addObservations);
  const notify = useStore((state) => state.notify);
  const [metric, setMetric] = useState<Metric>("heart_rate");
  const [value, setValue] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [context, setContext] = useState<ObservationContext>("rest");
  const [observedLocal, setObservedLocal] = useState(localDateTime(new Date()));
  const [unable, setUnable] = useState(false);
  const [error, setError] = useState("");

  const isBp = metric === "bp_systolic";

  const submit = async () => {
    setError("");
    const observedAt = new Date(observedLocal).toISOString();
    if (Number.isNaN(new Date(observedLocal).getTime())) {
      setError("Enter the time the reading was taken.");
      return;
    }

    if (unable) {
      const observation = makeObservation({
        crewId,
        metric,
        value: null,
        observedAt,
        lane: "manual",
        method: entryOptions.find((entry) => entry.metric === metric)!.method,
        context,
        quality: "not_measured",
      });
      await addObservations([observation]);
      onSaved?.([observation]);
      notify("Recorded as unable to measure. No value was invented.", "neutral");
      onClose();
      return;
    }

    const numeric = Number(value);
    if (value.trim() === "" || Number.isNaN(numeric)) {
      setError("Enter a number, or record that you were unable to measure.");
      return;
    }

    const method = entryOptions.find((entry) => entry.metric === metric)!.method;
    const observations = [
      makeObservation({
        crewId,
        metric,
        value: numeric,
        observedAt,
        lane: "manual",
        method,
        context,
      }),
    ];

    if (isBp) {
      const bottom = Number(diastolic);
      if (diastolic.trim() === "" || Number.isNaN(bottom)) {
        setError("Enter both blood-pressure numbers.");
        return;
      }
      observations.push(
        makeObservation({
          crewId,
          metric: "bp_diastolic",
          value: bottom,
          observedAt,
          lane: "manual",
          method,
          context,
        }),
      );
    }

    const rejected = observations.find((entry) => !gate(entry).accepted);
    if (rejected) {
      setError(rejected.qualityReason ?? "This value cannot be used.");
      return;
    }

    await addObservations(observations);
    onSaved?.(observations);
    notify("Reading saved in the manual lane.", "ok");
    onClose();
  };

  return (
    <BottomSheet
      title="Add a manual reading"
      subtitle="Manual lane. Measured time is kept separate from entry time."
      onClose={onClose}
    >
      <div className="manual-form">
        <label>
          Reading
          <select value={metric} onChange={(event) => setMetric(event.target.value as Metric)}>
            {entryOptions.map((entry) => (
              <option key={entry.metric} value={entry.metric}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        {!unable && (
          <div className="manual-values">
            <label>
              {isBp ? "Systolic" : "Value"}
              <input
                inputMode="decimal"
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
            </label>
            {isBp && (
              <label>
                Diastolic
                <input
                  inputMode="decimal"
                  value={diastolic}
                  onChange={(event) => setDiastolic(event.target.value)}
                />
              </label>
            )}
          </div>
        )}

        <label>
          Measured at
          <input
            type="datetime-local"
            value={observedLocal}
            onChange={(event) => setObservedLocal(event.target.value)}
          />
        </label>

        <label>
          Context
          <select
            value={context}
            onChange={(event) => setContext(event.target.value as ObservationContext)}
          >
            <option value="rest">At rest</option>
            <option value="post_exercise">After exercise</option>
            <option value="post_meal">After a meal</option>
            <option value="unknown">Not recorded</option>
          </select>
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={unable}
            onChange={(event) => setUnable(event.target.checked)}
          />
          I was unable to measure
        </label>

        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}

        <div className="sheet-actions">
          <button type="button" className="primary-button" onClick={() => void submit()}>
            Save reading
          </button>
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
        </div>
        <p className="disclaimer-line">
          Values are checked against demo sensor limits, not clinical limits.
        </p>
      </div>
    </BottomSheet>
  );
}
