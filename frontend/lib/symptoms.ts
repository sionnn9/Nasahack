import type { SymptomOnset, SymptomTrend } from "@/lib/types";

/** Demo symptom list. `urgent` ones must never wait for the form to be saved. */
export const symptomCatalogue: Array<{ name: string; urgent: boolean }> = [
  { name: "Headache", urgent: false },
  { name: "Dizziness", urgent: false },
  { name: "Fainting", urgent: true },
  { name: "Nausea", urgent: false },
  { name: "Tired", urgent: false },
  { name: "Trouble sleeping", urgent: false },
  { name: "Fever feeling", urgent: false },
  { name: "Muscle or joint pain", urgent: false },
  { name: "Vision change", urgent: true },
  { name: "Chest discomfort", urgent: true },
];

export const onsetLabels: Record<SymptomOnset, string> = {
  just_now: "Just now",
  today: "Today",
  several_days: "Several days",
};

export const trendLabels: Record<SymptomTrend, string> = {
  better: "Better",
  same: "Same",
  worse: "Worse",
};

export function isUrgentSymptom(name: string): boolean {
  return symptomCatalogue.find((entry) => entry.name === name)?.urgent ?? false;
}
