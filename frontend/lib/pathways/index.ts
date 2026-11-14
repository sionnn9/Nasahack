import lightheaded from "@/lib/pathways/lightheaded-v1.json";
import responsive from "@/lib/pathways/demo-responsive.json";
import unresponsive from "@/lib/pathways/demo-unresponsive.json";
import unsure from "@/lib/pathways/demo-unsure.json";
import type { Pathway } from "@/lib/types";

export const pathways = [
  lightheaded,
  responsive,
  unresponsive,
  unsure,
] as unknown as Pathway[];

export function pathwayById(id: string): Pathway | null {
  return pathways.find((pathway) => pathway.id === id) ?? null;
}

export function emergencyPathway(answer: "Yes" | "No" | "Unsure"): Pathway {
  if (answer === "Yes") return pathwayById("demo-responsive")!;
  if (answer === "No") return pathwayById("demo-unresponsive")!;
  return pathwayById("demo-unsure")!;
}

/** Choose an assessment pathway from reported symptoms, else a generic one. */
export function pathwayForSymptoms(symptoms: string[]): Pathway {
  const has = (value: string) => symptoms.some((name) => name.toLowerCase().includes(value));
  if (has("dizz") || has("tired") || has("nausea")) {
    return pathwayById("lightheaded-v1")!;
  }
  if (has("chest") || has("vision") || has("fainting")) {
    return pathwayById("demo-responsive")!;
  }
  return pathwayById("lightheaded-v1")!;
}
