"use client";

import { useEffect, useRef, useState } from "react";
import {
  createInitialHistories,
  createInitialVitals,
  type LiveVitals,
  type QualityOverride,
  type SensorHistories,
  type SensorQuality,
} from "./health-data";

const HISTORY_LENGTH = 60;

function nextHistory(
  current: Array<number | null>,
  value: number,
  usable: boolean,
): Array<number | null> {
  return [...current.slice(-(HISTORY_LENGTH - 1)), usable ? value : null];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function useHealthSimulation(
  restingHeartRate: number,
  crewId: string,
  baselineShift = 0,
) {
  const [vitals, setVitals] = useState<LiveVitals>(() =>
    createInitialVitals(restingHeartRate + baselineShift),
  );
  const vitalsRef = useRef(vitals);
  const [histories, setHistories] = useState<SensorHistories>(() =>
    createInitialHistories(restingHeartRate + baselineShift),
  );
  const [qualityOverride, setQualityOverride] =
    useState<QualityOverride>("Auto");
  const qualityOverrideRef = useRef<QualityOverride>("Auto");
  const quality: SensorQuality =
    qualityOverride === "Auto" ? "Usable" : qualityOverride;

  useEffect(() => {
    const initialVitals = createInitialVitals(restingHeartRate + baselineShift);
    vitalsRef.current = initialVitals;
    setVitals(initialVitals);
    setHistories(createInitialHistories(restingHeartRate + baselineShift));

    let elapsedSeconds = 0;
    const timer = window.setInterval(() => {
      elapsedSeconds += 1;
      const current = vitalsRef.current;
      const now = new Date().toISOString();
      const next: LiveVitals = {
        ...current,
        heartRate: Math.round(
          clamp(current.heartRate + (Math.random() * 3 - 1.5), 55, 95),
        ),
        skinTemperature: Number(
          clamp(
            current.skinTemperature + (Math.random() * 0.06 - 0.03),
            33.85,
            34.15,
          ).toFixed(1),
        ),
        motion:
          elapsedSeconds % 40 < 4
            ? Number((0.2 + Math.random() * 0.1).toFixed(2))
            : Number(clamp(0.05 + Math.random() * 0.02, 0.03, 0.08).toFixed(2)),
        updatedAt: {
          ...current.updatedAt,
          heartRate: now,
          skinTemperature: now,
          motion: now,
        },
      };

      if (elapsedSeconds % 30 === 0) {
        next.systolic = 117 + Math.round(Math.random() * 6 - 3);
        next.diastolic = 76 + Math.round(Math.random() * 4 - 2);
        next.updatedAt = { ...next.updatedAt, bloodPressure: now };
      }

      vitalsRef.current = next;
      setVitals(next);

      const usable = qualityOverrideRef.current === "Auto" ||
        qualityOverrideRef.current === "Usable";
      setHistories((previous) => ({
        heartRate: nextHistory(previous.heartRate, next.heartRate, usable),
        skinTemperature: nextHistory(
          previous.skinTemperature,
          next.skinTemperature,
          usable,
        ),
        bloodPressure: nextHistory(
          previous.bloodPressure,
          next.systolic,
          usable,
        ),
        motion: nextHistory(previous.motion, next.motion, usable),
      }));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [crewId, restingHeartRate, baselineShift]);

  const changeQualityOverride = (next: QualityOverride) => {
    qualityOverrideRef.current = next;
    setQualityOverride(next);
  };

  return {
    vitals,
    histories,
    quality,
    qualityOverride,
    onQualityOverrideChange: changeQualityOverride,
  };
}
