import type { Metric } from "@/lib/types";

export const metricMeta: Record<
  Metric,
  { label: string; unit: string; precision: number; private: boolean }
> = {
  heart_rate: { label: "Heart rate", unit: "bpm", precision: 0, private: false },
  skin_temp: { label: "Skin temperature", unit: "°C", precision: 1, private: false },
  bp_systolic: { label: "Systolic pressure", unit: "mmHg", precision: 0, private: false },
  bp_diastolic: { label: "Diastolic pressure", unit: "mmHg", precision: 0, private: false },
  glucose: { label: "Blood sugar", unit: "mmol/L", precision: 1, private: false },
  sleep_minutes: { label: "Sleep", unit: "min", precision: 0, private: false },
  mood: { label: "Mood", unit: "/5", precision: 0, private: true },
  stress: { label: "Stress", unit: "/5", precision: 0, private: true },
  rested: { label: "Rested", unit: "/5", precision: 0, private: true },
  connected: { label: "Connected", unit: "/5", precision: 0, private: true },
  motion: { label: "Motion", unit: "g", precision: 2, private: false },
};

export const methodLabels: Record<string, string> = {
  cuff_upper_arm: "Upper-arm cuff",
  ppg_finger: "Finger pulse sensor",
  ppg_wrist: "Wrist optical sensor",
  thermometer_skin: "Skin thermometer",
  glucometer: "Glucometer",
  actigraphy: "Actigraphy file",
  self_report: "Self report",
  simulated_sensor: "Simulated sensor",
  manual_entry: "Manual entry",
};

export const contextLabels: Record<string, string> = {
  rest: "At rest",
  post_exercise: "After exercise",
  post_meal: "After a meal",
  unknown: "Context not recorded",
};

export function formatValue(metric: Metric, value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  const meta = metricMeta[metric];
  return `${value.toFixed(meta.precision)} ${meta.unit}`;
}

export const allMetrics: Metric[] = [
  "heart_rate",
  "bp_systolic",
  "bp_diastolic",
  "skin_temp",
  "glucose",
  "sleep_minutes",
  "mood",
  "stress",
  "rested",
  "connected",
  "motion",
];
