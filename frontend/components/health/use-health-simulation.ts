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
import { getActiveAstronautDataset } from "@/lib/datasets/nasa-telemetry-datasets";

const HISTORY_LENGTH = 60;

export type ActivityMode = "auto" | "resting" | "active" | "exercise" | "recovery";

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

// Linear interpolation helper
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function useHealthSimulation(restingHeartRate: number, crewId: string) {
  const [datasetVersion, setDatasetVersion] = useState(0);
  const [activityMode, setActivityMode] = useState<ActivityMode>("auto");
  const activityModeRef = useRef<ActivityMode>("auto");

  // Keep ref synchronized
  useEffect(() => {
    activityModeRef.current = activityMode;
  }, [activityMode]);

  // Listen for dataset changes across the app
  useEffect(() => {
    const handleDatasetChange = (e: Event) => {
      const customEvt = e as CustomEvent<{ crewId?: string }>;
      if (!customEvt.detail?.crewId || customEvt.detail.crewId === crewId) {
        setDatasetVersion((v) => v + 1);
      }
    };
    window.addEventListener("crewsignal-dataset-change", handleDatasetChange);
    return () => {
      window.removeEventListener("crewsignal-dataset-change", handleDatasetChange);
    };
  }, [crewId]);

  const activeDataset = getActiveAstronautDataset(crewId);
  const effectiveRestingHr = Math.max(72, activeDataset.baselineHeartRate || restingHeartRate);

  const [vitals, setVitals] = useState<LiveVitals>(() =>
    createInitialVitals(effectiveRestingHr),
  );
  const vitalsRef = useRef(vitals);
  const [histories, setHistories] = useState<SensorHistories>(() =>
    createInitialHistories(effectiveRestingHr),
  );
  const [qualityOverride, setQualityOverride] =
    useState<QualityOverride>("Auto");
  const qualityOverrideRef = useRef<QualityOverride>("Auto");
  const quality: SensorQuality =
    qualityOverride === "Auto" ? "Usable" : qualityOverride;

  const [activePhaseName, setActivePhaseName] = useState<string>("Nominal Resting");

  useEffect(() => {
    const dataset = getActiveAstronautDataset(crewId);
    const startHr = Math.max(72, dataset.baselineHeartRate || restingHeartRate);
    const initialVitals = createInitialVitals(startHr);
    initialVitals.heartRate = startHr;
    initialVitals.skinTemperature = dataset.baselineTemp || 34.0;
    initialVitals.systolic = dataset.baselineBP[0] || 118;
    initialVitals.diastolic = dataset.baselineBP[1] || 76;

    vitalsRef.current = initialVitals;
    setVitals(initialVitals);
    setHistories(createInitialHistories(startHr));

    let elapsedSeconds = 0;
    const curve = dataset.liveTelemetryCurve || [];

    const timer = window.setInterval(() => {
      elapsedSeconds += 1;
      const current = vitalsRef.current;
      const now = new Date().toISOString();
      const mode = activityModeRef.current;

      // Target baselines provided by the active NASA dataset (minimum 72 for resting)
      const baseHeart = Math.max(72, dataset.baselineHeartRate);
      let targetHr = baseHeart;
      let targetSys = dataset.baselineBP[0];
      let targetDia = dataset.baselineBP[1];
      let targetTemp = dataset.baselineTemp;
      let targetMotionBase = 0.04;
      let phaseLabel = "Nominal Resting";

      if (mode === "resting") {
        targetHr = Math.max(71, baseHeart - 2);
        targetSys = dataset.baselineBP[0] - 3;
        targetDia = dataset.baselineBP[1] - 2;
        targetTemp = dataset.baselineTemp - 0.2;
        targetMotionBase = 0.03;
        phaseLabel = "Deep Rest / Sleep";
      } else if (mode === "active") {
        targetHr = baseHeart + 18;
        targetSys = dataset.baselineBP[0] + 12;
        targetDia = dataset.baselineBP[1] + 5;
        targetTemp = dataset.baselineTemp + 0.5;
        targetMotionBase = 0.36;
        phaseLabel = "Active Station Duty";
      } else if (mode === "exercise") {
        targetHr = baseHeart + 62;
        targetSys = dataset.baselineBP[0] + 32;
        targetDia = dataset.baselineBP[1] + 10;
        targetTemp = dataset.baselineTemp + 1.8;
        targetMotionBase = 1.30;
        phaseLabel = "T2 Treadmill & ARED Protocol";
      } else if (mode === "recovery") {
        targetHr = baseHeart + 20;
        targetSys = dataset.baselineBP[0] + 10;
        targetDia = dataset.baselineBP[1] + 4;
        targetTemp = dataset.baselineTemp + 0.8;
        targetMotionBase = 0.14;
        phaseLabel = "Active Recovery & Hydration";
      } else {
        // "auto" mode: dynamically cycle through the dataset's telemetry curve
        if (curve.length > 0) {
          const SECONDS_PER_KEYFRAME = 15;
          const totalDuration = curve.length * SECONDS_PER_KEYFRAME;
          const cycleTime = elapsedSeconds % totalDuration;
          const currentIndex = Math.floor(cycleTime / SECONDS_PER_KEYFRAME);
          const nextIndex = (currentIndex + 1) % curve.length;
          const progress = (cycleTime % SECONDS_PER_KEYFRAME) / SECONDS_PER_KEYFRAME;

          const p0 = curve[currentIndex];
          const p1 = curve[nextIndex];

          targetHr = Math.max(72, lerp(p0.heartRate, p1.heartRate, progress));
          targetSys = lerp(p0.systolic, p1.systolic, progress);
          targetDia = lerp(p0.diastolic, p1.diastolic, progress);
          targetTemp = lerp(p0.skinTemperature, p1.skinTemperature, progress);
          targetMotionBase = lerp(p0.motion, p1.motion, progress);

          if (targetHr > 120) {
            phaseLabel = "Countermeasure Workout";
          } else if (targetHr > 88) {
            phaseLabel = "Active Station Duty";
          } else if (targetHr > 74) {
            phaseLabel = "Post-Exercise Recovery";
          } else {
            phaseLabel = "Nominal Rest Float";
          }
        }
      }

      setActivePhaseName(phaseLabel);

      // LIVE STEP GENERATION:
      // Generates live random-walk steps anchored to the active dataset baseline
      // Heart rate is strictly maintained at 70 bpm and above
      const hrDelta = Math.random() * 3.2 - 1.6;
      const hrPull = (targetHr - current.heartRate) * 0.15;
      const rsaBreath = Math.sin(elapsedSeconds * 1.5) * 1.2;
      const computedHr = Math.round(
        clamp(Math.max(70, current.heartRate + hrDelta + hrPull + rsaBreath), 70, 185),
      );

      // 2. Skin Temperature (live micro-drift around dataset baseline)
      const tempDelta = Math.random() * 0.08 - 0.04;
      const tempPull = (targetTemp - current.skinTemperature) * 0.08;
      const computedTemp = Number(
        clamp(current.skinTemperature + tempDelta + tempPull, 32.5, 37.5).toFixed(1),
      );

      // 3. Motion Actigraphy (live variation every second: float jitter + movement spikes)
      let dynamicMotion = targetMotionBase;
      if (targetMotionBase > 0.8) {
        // High exercise cadence
        dynamicMotion = targetMotionBase + (Math.random() * 0.40 - 0.20);
      } else if (targetMotionBase > 0.2 || elapsedSeconds % 35 < 4) {
        // Active translation impulse
        dynamicMotion = 0.25 + Math.random() * 0.25;
      } else {
        // Microgravity calm float with tiny thruster / airflow drift
        dynamicMotion = 0.03 + Math.random() * 0.04;
      }
      const computedMotion: number = Number(clamp(dynamicMotion, 0.01, 2.0).toFixed(2));

      // 4. Blood Pressure (live arterial pulse drift anchored to dataset)
      const hrOffset = (computedHr - dataset.baselineHeartRate) * 0.40;
      const sysPull = (targetSys + hrOffset - current.systolic) * 0.15;
      const computedSys = Math.round(
        clamp(current.systolic + (Math.random() * 3.0 - 1.5) + sysPull, 85, 185),
      );
      const diaPull = (targetDia + (hrOffset * 0.25) - current.diastolic) * 0.15;
      const computedDia = Math.round(
        clamp(current.diastolic + (Math.random() * 2.0 - 1.0) + diaPull, 55, 110),
      );

      const next: LiveVitals = {
        ...current,
        heartRate: computedHr,
        skinTemperature: computedTemp,
        motion: computedMotion,
        systolic: computedSys,
        diastolic: computedDia,
        updatedAt: {
          heartRate: now,
          skinTemperature: now,
          bloodPressure: now,
          motion: now,
        },
      };

      vitalsRef.current = next;
      setVitals(next);

      const usable =
        qualityOverrideRef.current === "Auto" ||
        qualityOverrideRef.current === "Usable";

      // Every second, nextHistory shifts the waveform left by 1 index, creating live scrolling motion
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
  }, [crewId, datasetVersion, restingHeartRate]);

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
    activityMode,
    setActivityMode,
    activePhaseName,
  };
}
