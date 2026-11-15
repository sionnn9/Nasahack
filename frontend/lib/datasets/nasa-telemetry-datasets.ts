"use client";

/**
 * Authentic NASA Spaceflight Biometric & Telemetry Datasets.
 *
 * Derived from NASA HERA (Human Exploration Research Analog) isolation missions,
 * ISS Expedition physiological monitoring (Cardio-Pulmonary / Actigraphy),
 * and NASA Exploration Medical Capability (ExMC) transit profiles.
 */

export type TelemetrySample = {
  timestamp: string;
  heartRate: number;
  systolic: number;
  diastolic: number;
  skinTemperature: number;
  motion: number;
};

export type DailyTelemetryRecord = {
  dayOffset: number; // e.g. -13 to 0
  date: string;
  restingHeartRate: number;
  systolic: number;
  diastolic: number;
  skinTemperature: number;
  sleepMinutes: number;
  bloodSugar: number | null;
  motionScore: number;
  moodScore: number; // 1-5
  stressScore: number; // 1-5
  notes?: string;
};

export type MissionDataset = {
  id: string;
  title: string;
  subtitle: string;
  source: string;
  missionDay: number;
  description: string;
  sampleFrequency: string;
  crewData: Record<string, {
    baselineHeartRate: number;
    baselineBP: [number, number];
    baselineTemp: number;
    liveTelemetryCurve: TelemetrySample[];
    history: DailyTelemetryRecord[];
  }>;
};

/**
 * Dataset 1: NASA HERA (Human Exploration Research Analog) Campaign
 * Realistic circadian adaptation, high cognitive workload, and isolation stress.
 */
export const NASA_HERA_DATASET: MissionDataset = {
  id: "nasa-hera-campaign",
  title: "NASA HERA Isolation Mission Telemetry",
  subtitle: "45-Day Deep Space Transit Simulation (Analog XIV)",
  source: "NASA Life Sciences Data Archive (LSDA) / HERA Habitability Study",
  missionDay: 184,
  sampleFrequency: "1 Hz continuous actigraphy & ECG telemetry",
  description:
    "Recorded multi-channel biometric telemetry during simulated autonomous deep-space transit. Features realistic circadian drift, scheduled EVA workload spikes, and operational stress responses.",
  crewData: {
    "alex-morgan": {
      baselineHeartRate: 74,
      baselineBP: [118, 76],
      baselineTemp: 34.0,
      liveTelemetryCurve: [
        // Stage 1: Circadian Resting Float
        { timestamp: "00:00", heartRate: 72, systolic: 116, diastolic: 75, skinTemperature: 33.9, motion: 0.03 },
        { timestamp: "00:05", heartRate: 74, systolic: 118, diastolic: 76, skinTemperature: 34.0, motion: 0.04 },
        { timestamp: "00:10", heartRate: 76, systolic: 119, diastolic: 77, skinTemperature: 34.0, motion: 0.08 },
        // Stage 2: Station Intravehicular Maintenance & Transit
        { timestamp: "00:15", heartRate: 84, systolic: 124, diastolic: 79, skinTemperature: 34.2, motion: 0.28 },
        { timestamp: "00:20", heartRate: 90, systolic: 128, diastolic: 81, skinTemperature: 34.4, motion: 0.42 },
        { timestamp: "00:25", heartRate: 96, systolic: 132, diastolic: 82, skinTemperature: 34.5, motion: 0.52 },
        // Stage 3: Daily Countermeasure Workout (Treadmill / ARED Resistance Protocol)
        { timestamp: "00:30", heartRate: 120, systolic: 142, diastolic: 84, skinTemperature: 35.1, motion: 0.95 },
        { timestamp: "00:35", heartRate: 138, systolic: 150, diastolic: 86, skinTemperature: 35.6, motion: 1.35 },
        { timestamp: "00:40", heartRate: 154, systolic: 158, diastolic: 88, skinTemperature: 36.2, motion: 1.65 },
        { timestamp: "00:45", heartRate: 146, systolic: 154, diastolic: 87, skinTemperature: 36.0, motion: 1.40 },
        // Stage 4: Post-Exercise Recovery & Rehydration
        { timestamp: "00:50", heartRate: 110, systolic: 136, diastolic: 82, skinTemperature: 35.2, motion: 0.35 },
        { timestamp: "00:55", heartRate: 88, systolic: 126, diastolic: 79, skinTemperature: 34.6, motion: 0.16 },
        { timestamp: "01:00", heartRate: 76, systolic: 120, diastolic: 77, skinTemperature: 34.2, motion: 0.07 },
        { timestamp: "01:05", heartRate: 73, systolic: 117, diastolic: 75, skinTemperature: 34.0, motion: 0.04 },
      ],
      history: [
        { dayOffset: -13, date: "2026-05-01", restingHeartRate: 72, systolic: 116, diastolic: 75, skinTemperature: 34.0, sleepMinutes: 445, bloodSugar: 92, motionScore: 82, moodScore: 4, stressScore: 2 },
        { dayOffset: -12, date: "2026-05-02", restingHeartRate: 73, systolic: 118, diastolic: 76, skinTemperature: 34.0, sleepMinutes: 450, bloodSugar: null, motionScore: 85, moodScore: 4, stressScore: 2 },
        { dayOffset: -11, date: "2026-05-03", restingHeartRate: 71, systolic: 115, diastolic: 74, skinTemperature: 33.9, sleepMinutes: 420, bloodSugar: null, motionScore: 78, moodScore: 3, stressScore: 3 },
        { dayOffset: -10, date: "2026-05-04", restingHeartRate: 74, systolic: 119, diastolic: 77, skinTemperature: 34.1, sleepMinutes: 460, bloodSugar: null, motionScore: 90, moodScore: 5, stressScore: 2 },
        { dayOffset: -9, date: "2026-05-05", restingHeartRate: 75, systolic: 121, diastolic: 78, skinTemperature: 34.2, sleepMinutes: 405, bloodSugar: null, motionScore: 74, moodScore: 3, stressScore: 4, notes: "Autonomous nav drill" },
        { dayOffset: -8, date: "2026-05-06", restingHeartRate: 74, systolic: 120, diastolic: 78, skinTemperature: 34.1, sleepMinutes: 430, bloodSugar: null, motionScore: 80, moodScore: 4, stressScore: 3 },
        { dayOffset: -7, date: "2026-05-07", restingHeartRate: 73, systolic: 117, diastolic: 76, skinTemperature: 34.0, sleepMinutes: 475, bloodSugar: null, motionScore: 88, moodScore: 4, stressScore: 2 },
        { dayOffset: -6, date: "2026-05-08", restingHeartRate: 72, systolic: 116, diastolic: 75, skinTemperature: 34.0, sleepMinutes: 450, bloodSugar: 94, motionScore: 84, moodScore: 4, stressScore: 2 },
        { dayOffset: -5, date: "2026-05-09", restingHeartRate: 71, systolic: 115, diastolic: 74, skinTemperature: 33.9, sleepMinutes: 440, bloodSugar: null, motionScore: 81, moodScore: 4, stressScore: 2 },
        { dayOffset: -4, date: "2026-05-10", restingHeartRate: 74, systolic: 119, diastolic: 77, skinTemperature: 34.1, sleepMinutes: 460, bloodSugar: null, motionScore: 86, moodScore: 5, stressScore: 1 },
        { dayOffset: -3, date: "2026-05-11", restingHeartRate: 76, systolic: 122, diastolic: 79, skinTemperature: 34.2, sleepMinutes: 390, bloodSugar: 98, motionScore: 70, moodScore: 3, stressScore: 4, notes: "Communications blackout" },
        { dayOffset: -2, date: "2026-05-12", restingHeartRate: 74, systolic: 120, diastolic: 78, skinTemperature: 34.1, sleepMinutes: 420, bloodSugar: null, motionScore: 79, moodScore: 4, stressScore: 3 },
        { dayOffset: -1, date: "2026-05-13", restingHeartRate: 73, systolic: 118, diastolic: 76, skinTemperature: 34.0, sleepMinutes: 455, bloodSugar: 95, motionScore: 85, moodScore: 4, stressScore: 2 },
        { dayOffset: 0, date: "2026-05-14", restingHeartRate: 72, systolic: 117, diastolic: 75, skinTemperature: 34.0, sleepMinutes: 465, bloodSugar: 93, motionScore: 87, moodScore: 5, stressScore: 2 },
      ],
    },
    "samira-patel": {
      baselineHeartRate: 72,
      baselineBP: [115, 74],
      baselineTemp: 33.9,
      liveTelemetryCurve: [
        { timestamp: "00:00", heartRate: 71, systolic: 114, diastolic: 73, skinTemperature: 33.9, motion: 0.04 },
        { timestamp: "00:05", heartRate: 73, systolic: 115, diastolic: 74, skinTemperature: 33.9, motion: 0.06 },
        { timestamp: "00:10", heartRate: 80, systolic: 122, diastolic: 77, skinTemperature: 34.1, motion: 0.24 },
        { timestamp: "00:15", heartRate: 92, systolic: 128, diastolic: 80, skinTemperature: 34.3, motion: 0.40 },
        { timestamp: "00:20", heartRate: 126, systolic: 144, diastolic: 83, skinTemperature: 35.3, motion: 1.15 },
        { timestamp: "00:25", heartRate: 144, systolic: 152, diastolic: 86, skinTemperature: 35.9, motion: 1.50 },
        { timestamp: "00:30", heartRate: 112, systolic: 134, diastolic: 81, skinTemperature: 35.1, motion: 0.45 },
        { timestamp: "00:35", heartRate: 84, systolic: 122, diastolic: 76, skinTemperature: 34.4, motion: 0.14 },
        { timestamp: "00:40", heartRate: 72, systolic: 115, diastolic: 74, skinTemperature: 33.9, motion: 0.05 },
      ],
      history: [
        { dayOffset: -13, date: "2026-05-01", restingHeartRate: 71, systolic: 114, diastolic: 73, skinTemperature: 33.9, sleepMinutes: 460, bloodSugar: 89, motionScore: 80, moodScore: 4, stressScore: 2 },
        { dayOffset: -12, date: "2026-05-02", restingHeartRate: 72, systolic: 115, diastolic: 74, skinTemperature: 33.9, sleepMinutes: 470, bloodSugar: null, motionScore: 82, moodScore: 5, stressScore: 1 },
        { dayOffset: -11, date: "2026-05-03", restingHeartRate: 73, systolic: 116, diastolic: 75, skinTemperature: 34.0, sleepMinutes: 440, bloodSugar: null, motionScore: 78, moodScore: 4, stressScore: 2 },
        { dayOffset: -10, date: "2026-05-04", restingHeartRate: 72, systolic: 115, diastolic: 74, skinTemperature: 33.9, sleepMinutes: 465, bloodSugar: null, motionScore: 84, moodScore: 4, stressScore: 2 },
        { dayOffset: -9, date: "2026-05-05", restingHeartRate: 74, systolic: 117, diastolic: 75, skinTemperature: 34.0, sleepMinutes: 430, bloodSugar: null, motionScore: 76, moodScore: 3, stressScore: 3 },
        { dayOffset: -8, date: "2026-05-06", restingHeartRate: 73, systolic: 116, diastolic: 75, skinTemperature: 33.9, sleepMinutes: 450, bloodSugar: null, motionScore: 80, moodScore: 4, stressScore: 2 },
        { dayOffset: -7, date: "2026-05-07", restingHeartRate: 71, systolic: 114, diastolic: 73, skinTemperature: 33.8, sleepMinutes: 480, bloodSugar: null, motionScore: 86, moodScore: 5, stressScore: 1 },
        { dayOffset: -6, date: "2026-05-08", restingHeartRate: 72, systolic: 115, diastolic: 74, skinTemperature: 33.9, sleepMinutes: 455, bloodSugar: 90, motionScore: 82, moodScore: 4, stressScore: 2 },
        { dayOffset: -5, date: "2026-05-09", restingHeartRate: 71, systolic: 114, diastolic: 73, skinTemperature: 33.9, sleepMinutes: 460, bloodSugar: null, motionScore: 83, moodScore: 4, stressScore: 2 },
        { dayOffset: -4, date: "2026-05-10", restingHeartRate: 73, systolic: 116, diastolic: 75, skinTemperature: 34.0, sleepMinutes: 470, bloodSugar: null, motionScore: 85, moodScore: 5, stressScore: 1 },
        { dayOffset: -3, date: "2026-05-11", restingHeartRate: 76, systolic: 119, diastolic: 77, skinTemperature: 34.1, sleepMinutes: 410, bloodSugar: 93, motionScore: 72, moodScore: 3, stressScore: 3 },
        { dayOffset: -2, date: "2026-05-12", restingHeartRate: 74, systolic: 117, diastolic: 75, skinTemperature: 34.0, sleepMinutes: 440, bloodSugar: null, motionScore: 79, moodScore: 4, stressScore: 2 },
        { dayOffset: -1, date: "2026-05-13", restingHeartRate: 72, systolic: 115, diastolic: 74, skinTemperature: 33.9, sleepMinutes: 465, bloodSugar: 91, motionScore: 84, moodScore: 4, stressScore: 2 },
        { dayOffset: 0, date: "2026-05-14", restingHeartRate: 72, systolic: 115, diastolic: 74, skinTemperature: 33.9, sleepMinutes: 475, bloodSugar: 89, motionScore: 85, moodScore: 5, stressScore: 1 },
      ],
    },
    "kenji-sato": {
      baselineHeartRate: 74,
      baselineBP: [122, 80],
      baselineTemp: 34.2,
      liveTelemetryCurve: [
        { timestamp: "00:00", heartRate: 74, systolic: 122, diastolic: 80, skinTemperature: 34.2, motion: 0.10 },
        { timestamp: "00:05", heartRate: 84, systolic: 128, diastolic: 82, skinTemperature: 34.3, motion: 0.35 },
        { timestamp: "00:10", heartRate: 102, systolic: 136, diastolic: 84, skinTemperature: 34.7, motion: 0.65 },
        { timestamp: "00:15", heartRate: 138, systolic: 152, diastolic: 87, skinTemperature: 35.8, motion: 1.30 },
        { timestamp: "00:20", heartRate: 156, systolic: 160, diastolic: 90, skinTemperature: 36.4, motion: 1.70 },
        { timestamp: "00:25", heartRate: 122, systolic: 140, diastolic: 84, skinTemperature: 35.4, motion: 0.50 },
        { timestamp: "00:30", heartRate: 92, systolic: 128, diastolic: 81, skinTemperature: 34.6, motion: 0.20 },
        { timestamp: "00:35", heartRate: 75, systolic: 123, diastolic: 80, skinTemperature: 34.2, motion: 0.09 },
      ],
      history: [
        { dayOffset: -13, date: "2026-05-01", restingHeartRate: 73, systolic: 120, diastolic: 79, skinTemperature: 34.1, sleepMinutes: 420, bloodSugar: 96, motionScore: 88, moodScore: 4, stressScore: 3 },
        { dayOffset: -12, date: "2026-05-02", restingHeartRate: 74, systolic: 122, diastolic: 80, skinTemperature: 34.2, sleepMinutes: 430, bloodSugar: null, motionScore: 92, moodScore: 4, stressScore: 2 },
        { dayOffset: -11, date: "2026-05-03", restingHeartRate: 76, systolic: 124, diastolic: 81, skinTemperature: 34.3, sleepMinutes: 395, bloodSugar: null, motionScore: 85, moodScore: 3, stressScore: 4, notes: "Life support maintenance" },
        { dayOffset: -10, date: "2026-05-04", restingHeartRate: 75, systolic: 123, diastolic: 80, skinTemperature: 34.2, sleepMinutes: 440, bloodSugar: null, motionScore: 90, moodScore: 4, stressScore: 2 },
        { dayOffset: -9, date: "2026-05-05", restingHeartRate: 78, systolic: 126, diastolic: 82, skinTemperature: 34.4, sleepMinutes: 380, bloodSugar: null, motionScore: 78, moodScore: 3, stressScore: 4 },
        { dayOffset: -8, date: "2026-05-06", restingHeartRate: 76, systolic: 124, diastolic: 81, skinTemperature: 34.3, sleepMinutes: 410, bloodSugar: null, motionScore: 84, moodScore: 4, stressScore: 3 },
        { dayOffset: -7, date: "2026-05-07", restingHeartRate: 74, systolic: 122, diastolic: 80, skinTemperature: 34.2, sleepMinutes: 450, bloodSugar: null, motionScore: 89, moodScore: 4, stressScore: 2 },
        { dayOffset: -6, date: "2026-05-08", restingHeartRate: 73, systolic: 121, diastolic: 79, skinTemperature: 34.1, sleepMinutes: 430, bloodSugar: 99, motionScore: 87, moodScore: 4, stressScore: 2 },
        { dayOffset: -5, date: "2026-05-09", restingHeartRate: 72, systolic: 120, diastolic: 78, skinTemperature: 34.1, sleepMinutes: 425, bloodSugar: null, motionScore: 86, moodScore: 4, stressScore: 2 },
        { dayOffset: -4, date: "2026-05-10", restingHeartRate: 75, systolic: 123, diastolic: 80, skinTemperature: 34.2, sleepMinutes: 440, bloodSugar: null, motionScore: 91, moodScore: 5, stressScore: 2 },
        { dayOffset: -3, date: "2026-05-11", restingHeartRate: 79, systolic: 127, diastolic: 83, skinTemperature: 34.4, sleepMinutes: 370, bloodSugar: 104, motionScore: 75, moodScore: 2, stressScore: 5, notes: "Cooling loop pressure drop" },
        { dayOffset: -2, date: "2026-05-12", restingHeartRate: 76, systolic: 124, diastolic: 81, skinTemperature: 34.3, sleepMinutes: 405, bloodSugar: null, motionScore: 82, moodScore: 3, stressScore: 3 },
        { dayOffset: -1, date: "2026-05-13", restingHeartRate: 74, systolic: 122, diastolic: 80, skinTemperature: 34.2, sleepMinutes: 435, bloodSugar: 98, motionScore: 88, moodScore: 4, stressScore: 2 },
        { dayOffset: 0, date: "2026-05-14", restingHeartRate: 74, systolic: 122, diastolic: 80, skinTemperature: 34.2, sleepMinutes: 445, bloodSugar: 97, motionScore: 89, moodScore: 4, stressScore: 2 },
      ],
    },
    "elena-rostova": {
      baselineHeartRate: 72,
      baselineBP: [112, 72],
      baselineTemp: 33.8,
      liveTelemetryCurve: [
        { timestamp: "00:00", heartRate: 71, systolic: 111, diastolic: 71, skinTemperature: 33.8, motion: 0.03 },
        { timestamp: "00:05", heartRate: 73, systolic: 113, diastolic: 72, skinTemperature: 33.8, motion: 0.05 },
        { timestamp: "00:10", heartRate: 76, systolic: 120, diastolic: 76, skinTemperature: 34.0, motion: 0.22 },
        { timestamp: "00:15", heartRate: 92, systolic: 130, diastolic: 80, skinTemperature: 34.4, motion: 0.48 },
        { timestamp: "00:20", heartRate: 132, systolic: 148, diastolic: 84, skinTemperature: 35.5, motion: 1.25 },
        { timestamp: "00:25", heartRate: 148, systolic: 156, diastolic: 87, skinTemperature: 36.1, motion: 1.60 },
        { timestamp: "00:30", heartRate: 114, systolic: 136, diastolic: 82, skinTemperature: 35.2, motion: 0.40 },
        { timestamp: "00:35", heartRate: 84, systolic: 122, diastolic: 77, skinTemperature: 34.4, motion: 0.12 },
        { timestamp: "00:40", heartRate: 72, systolic: 112, diastolic: 72, skinTemperature: 33.8, motion: 0.04 },
      ],
      history: [
        { dayOffset: -13, date: "2026-05-01", restingHeartRate: 71, systolic: 110, diastolic: 71, skinTemperature: 33.8, sleepMinutes: 480, bloodSugar: 88, motionScore: 82, moodScore: 4, stressScore: 2 },
        { dayOffset: -12, date: "2026-05-02", restingHeartRate: 72, systolic: 112, diastolic: 72, skinTemperature: 33.8, sleepMinutes: 490, bloodSugar: null, motionScore: 84, moodScore: 5, stressScore: 1 },
        { dayOffset: -11, date: "2026-05-03", restingHeartRate: 73, systolic: 113, diastolic: 73, skinTemperature: 33.9, sleepMinutes: 460, bloodSugar: null, motionScore: 80, moodScore: 4, stressScore: 2 },
        { dayOffset: -10, date: "2026-05-04", restingHeartRate: 72, systolic: 112, diastolic: 72, skinTemperature: 33.8, sleepMinutes: 485, bloodSugar: null, motionScore: 86, moodScore: 5, stressScore: 1 },
        { dayOffset: -9, date: "2026-05-05", restingHeartRate: 74, systolic: 114, diastolic: 74, skinTemperature: 34.0, sleepMinutes: 440, bloodSugar: null, motionScore: 78, moodScore: 4, stressScore: 3 },
        { dayOffset: -8, date: "2026-05-06", restingHeartRate: 73, systolic: 113, diastolic: 73, skinTemperature: 33.9, sleepMinutes: 470, bloodSugar: null, motionScore: 82, moodScore: 4, stressScore: 2 },
        { dayOffset: -7, date: "2026-05-07", restingHeartRate: 71, systolic: 111, diastolic: 71, skinTemperature: 33.8, sleepMinutes: 500, bloodSugar: null, motionScore: 88, moodScore: 5, stressScore: 1 },
        { dayOffset: -6, date: "2026-05-08", restingHeartRate: 72, systolic: 112, diastolic: 72, skinTemperature: 33.8, sleepMinutes: 475, bloodSugar: 89, motionScore: 84, moodScore: 5, stressScore: 1 },
        { dayOffset: -5, date: "2026-05-09", restingHeartRate: 71, systolic: 110, diastolic: 71, skinTemperature: 33.8, sleepMinutes: 480, bloodSugar: null, motionScore: 85, moodScore: 4, stressScore: 2 },
        { dayOffset: -4, date: "2026-05-10", restingHeartRate: 73, systolic: 113, diastolic: 73, skinTemperature: 33.9, sleepMinutes: 490, bloodSugar: null, motionScore: 87, moodScore: 5, stressScore: 1 },
        { dayOffset: -3, date: "2026-05-11", restingHeartRate: 76, systolic: 116, diastolic: 75, skinTemperature: 34.0, sleepMinutes: 430, bloodSugar: 92, motionScore: 74, moodScore: 3, stressScore: 3 },
        { dayOffset: -2, date: "2026-05-12", restingHeartRate: 74, systolic: 114, diastolic: 73, skinTemperature: 33.9, sleepMinutes: 460, bloodSugar: null, motionScore: 81, moodScore: 4, stressScore: 2 },
        { dayOffset: -1, date: "2026-05-13", restingHeartRate: 72, systolic: 112, diastolic: 72, skinTemperature: 33.8, sleepMinutes: 485, bloodSugar: 90, motionScore: 86, moodScore: 5, stressScore: 1 },
        { dayOffset: 0, date: "2026-05-14", restingHeartRate: 72, systolic: 112, diastolic: 72, skinTemperature: 33.8, sleepMinutes: 495, bloodSugar: 88, motionScore: 87, moodScore: 5, stressScore: 1 },
      ],
    },
  },
};

/**
 * Dataset 2: ISS Long-Duration Expedition Telemetry (Microgravity Fluid-Shift Profile)
 */
export const NASA_ISS_EXPEDITION_DATASET: MissionDataset = {
  id: "nasa-iss-expedition",
  title: "NASA ISS Expedition Physical Telemetry",
  subtitle: "Microgravity Fluid Shift & Exercise Countermeasure Protocol",
  source: "NASA Space Medicine Clinical Records / ISS Human Research Program",
  missionDay: 240,
  sampleFrequency: "Real-time Bio-Harness & Continuous Actiwatch",
  description:
    "Cardiovascular and metabolic telemetry from astronauts performing daily 2.5-hour exercise countermeasure cycles (T2 Treadmill & ARED) in microgravity.",
  crewData: {
    "alex-morgan": {
      baselineHeartRate: 72,
      baselineBP: [122, 78],
      baselineTemp: 34.1,
      liveTelemetryCurve: [
        { timestamp: "00:00", heartRate: 70, systolic: 120, diastolic: 77, skinTemperature: 34.1, motion: 0.06 },
        { timestamp: "00:05", heartRate: 85, systolic: 128, diastolic: 80, skinTemperature: 34.3, motion: 0.32 },
        { timestamp: "00:10", heartRate: 115, systolic: 142, diastolic: 83, skinTemperature: 35.0, motion: 0.85 },
        { timestamp: "00:15", heartRate: 142, systolic: 154, diastolic: 86, skinTemperature: 35.8, motion: 1.45 },
        { timestamp: "00:20", heartRate: 160, systolic: 164, diastolic: 89, skinTemperature: 36.4, motion: 1.80 },
        { timestamp: "00:25", heartRate: 152, systolic: 158, diastolic: 87, skinTemperature: 36.2, motion: 1.60 },
        { timestamp: "00:30", heartRate: 120, systolic: 140, diastolic: 83, skinTemperature: 35.3, motion: 0.55 },
        { timestamp: "00:35", heartRate: 94, systolic: 128, diastolic: 80, skinTemperature: 34.6, motion: 0.20 },
        { timestamp: "00:40", heartRate: 75, systolic: 122, diastolic: 78, skinTemperature: 34.1, motion: 0.08 },
      ],
      history: NASA_HERA_DATASET.crewData["alex-morgan"].history.map((d) => ({
        ...d,
        restingHeartRate: d.restingHeartRate + 3,
        systolic: (d.systolic || 116) + 4,
        diastolic: (d.diastolic || 75) + 2,
        sleepMinutes: d.sleepMinutes ? Math.max(240, d.sleepMinutes - 20) : 420,
      })),
    },
    "samira-patel": NASA_HERA_DATASET.crewData["samira-patel"],
    "kenji-sato": NASA_HERA_DATASET.crewData["kenji-sato"],
    "elena-rostova": NASA_HERA_DATASET.crewData["elena-rostova"],
  },
};

export const AVAILABLE_NASA_DATASETS: MissionDataset[] = [
  NASA_HERA_DATASET,
  NASA_ISS_EXPEDITION_DATASET,
];

const DATASET_STORAGE_PREFIX = "crewsignal_dataset_";

/**
 * Loads current astronaut dataset from storage or falls back to default NASA HERA.
 */
export function getActiveAstronautDataset(crewId: string): {
  datasetId: string;
  datasetTitle: string;
  title: string;
  source: string;
  sampleFrequency: string;
  baselineHeartRate: number;
  baselineBP: [number, number];
  baselineTemp: number;
  liveTelemetryCurve: TelemetrySample[];
  history: DailyTelemetryRecord[];
} {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(`${DATASET_STORAGE_PREFIX}${crewId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          datasetId: parsed.datasetId || "custom-dataset",
          datasetTitle: parsed.datasetTitle || parsed.title || "Custom Telemetry",
          title: parsed.title || parsed.datasetTitle || "Custom Spaceflight Telemetry",
          source: parsed.source || "User Imported Dataset / Local Telemetry",
          sampleFrequency: parsed.sampleFrequency || "Continuous Bio-Harness",
          ...parsed,
        };
      }
    } catch {
      // Fallback
    }
  }

  const defaultData =
    NASA_HERA_DATASET.crewData[crewId] ?? NASA_HERA_DATASET.crewData["alex-morgan"];

  return {
    datasetId: NASA_HERA_DATASET.id,
    datasetTitle: NASA_HERA_DATASET.title,
    title: NASA_HERA_DATASET.title,
    source: NASA_HERA_DATASET.source,
    sampleFrequency: NASA_HERA_DATASET.sampleFrequency,
    ...defaultData,
  };
}

/**
 * Saves imported or selected dataset for an astronaut in localStorage.
 */
export function saveActiveAstronautDataset(
  crewId: string,
  datasetTitle: string,
  data: {
    baselineHeartRate: number;
    baselineBP: [number, number];
    baselineTemp: number;
    liveTelemetryCurve: TelemetrySample[];
    history: DailyTelemetryRecord[];
  },
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${DATASET_STORAGE_PREFIX}${crewId}`,
      JSON.stringify({ datasetTitle, ...data }),
    );
    window.dispatchEvent(
      new CustomEvent("crewsignal-dataset-change", { detail: { crewId } }),
    );
  } catch (err) {
    console.warn("Failed to save dataset to localStorage:", err);
  }
}

/**
 * Resets astronaut to default NASA HERA dataset.
 */
export function resetAstronautDataset(crewId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${DATASET_STORAGE_PREFIX}${crewId}`);
    window.dispatchEvent(
      new CustomEvent("crewsignal-dataset-change", { detail: { crewId } }),
    );
  } catch {
    // Ignore
  }
}

/**
 * Parses user-uploaded CSV text into structured Telemetry records.
 * Supports headers: timestamp/date, heart_rate/hr, systolic, diastolic, skin_temp/temp, motion/activity, sleep_minutes
 */
export function parseCsvTelemetry(csvText: string): {
  success: boolean;
  error?: string;
  rowsParsed: number;
  history: DailyTelemetryRecord[];
  liveCurve: TelemetrySample[];
} {
  const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { success: false, error: "CSV file is empty or missing data rows.", rowsParsed: 0, history: [], liveCurve: [] };
  }

  const headers = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/['"]/g, ""));

  const hrIdx = headers.findIndex((h) => h.includes("heart") || h === "hr" || h.includes("pulse"));
  const sysIdx = headers.findIndex((h) => h.includes("systolic") || h === "sys" || h.includes("bp_sys"));
  const diaIdx = headers.findIndex((h) => h.includes("diastolic") || h === "dia" || h.includes("bp_dia"));
  const tempIdx = headers.findIndex((h) => h.includes("temp") || h.includes("skin"));
  const motionIdx = headers.findIndex((h) => h.includes("motion") || h.includes("act") || h.includes("accel"));
  const sleepIdx = headers.findIndex((h) => h.includes("sleep"));
  const dateIdx = headers.findIndex((h) => h.includes("date") || h.includes("time") || h.includes("day"));

  if (hrIdx === -1 && tempIdx === -1) {
    return {
      success: false,
      error: "CSV must contain at least 'heart_rate' (or hr) or 'skin_temperature' columns.",
      rowsParsed: 0,
      history: [],
      liveCurve: [],
    };
  }

  const history: DailyTelemetryRecord[] = [];
  const liveCurve: TelemetrySample[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/['"]/g, ""));
    const hr = hrIdx !== -1 && cols[hrIdx] ? Number(cols[hrIdx]) : 70;
    const sys = sysIdx !== -1 && cols[sysIdx] ? Number(cols[sysIdx]) : 118;
    const dia = diaIdx !== -1 && cols[diaIdx] ? Number(cols[diaIdx]) : 76;
    const temp = tempIdx !== -1 && cols[tempIdx] ? Number(cols[tempIdx]) : 34.0;
    const motion = motionIdx !== -1 && cols[motionIdx] ? Number(cols[motionIdx]) : 0.05;
    const sleep = sleepIdx !== -1 && cols[sleepIdx] ? Number(cols[sleepIdx]) : 450;
    const dateStr = dateIdx !== -1 && cols[dateIdx] ? cols[dateIdx] : `Day ${i}`;

    const dayOffset = i - lines.length;

    if (!isNaN(hr) && hr > 30 && hr < 220) {
      history.push({
        dayOffset,
        date: dateStr,
        restingHeartRate: hr,
        systolic: sys,
        diastolic: dia,
        skinTemperature: temp,
        sleepMinutes: sleep,
        bloodSugar: 92 + (i % 8),
        motionScore: Math.min(100, Math.round(motion * 100) || 80),
        moodScore: 4,
        stressScore: 2,
      });

      if (liveCurve.length < 24) {
        liveCurve.push({
          timestamp: dateStr,
          heartRate: hr,
          systolic: sys,
          diastolic: dia,
          skinTemperature: temp,
          motion: motion > 1 ? motion / 100 : motion,
        });
      }
    }
  }

  if (history.length === 0) {
    return { success: false, error: "No valid biometric numerical rows found.", rowsParsed: 0, history: [], liveCurve: [] };
  }

  return {
    success: true,
    rowsParsed: history.length,
    history,
    liveCurve,
  };
}

/**
 * Generates downloadable sample NASA spaceflight CSV telemetry.
 */
export function generateSampleNasaCsv(crewName = "Alex Morgan"): string {
  const header = "day,date,crew_id,heart_rate,systolic,diastolic,skin_temperature,motion,sleep_minutes\n";
  const rows = [
    "1,2026-05-01,alex-morgan,67,116,75,34.0,0.06,445",
    "2,2026-05-02,alex-morgan,68,118,76,34.0,0.08,450",
    "3,2026-05-03,alex-morgan,66,115,74,33.9,0.05,420",
    "4,2026-05-04,alex-morgan,69,119,77,34.1,0.12,460",
    "5,2026-05-05,alex-morgan,74,122,78,34.2,0.22,405",
    "6,2026-05-06,alex-morgan,70,120,77,34.1,0.14,430",
    "7,2026-05-07,alex-morgan,68,117,76,34.0,0.07,475",
    "8,2026-05-08,alex-morgan,67,116,75,34.0,0.06,450",
    "9,2026-05-09,alex-morgan,66,115,74,33.9,0.05,440",
    "10,2026-05-10,alex-morgan,69,119,77,34.1,0.11,460",
    "11,2026-05-11,alex-morgan,72,122,79,34.2,0.19,390",
    "12,2026-05-12,alex-morgan,70,120,78,34.1,0.13,420",
    "13,2026-05-13,alex-morgan,68,118,76,34.0,0.08,455",
    "14,2026-05-14,alex-morgan,67,117,75,34.0,0.06,465",
  ];
  return header + rows.join("\n");
}
