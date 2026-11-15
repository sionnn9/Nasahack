/** Domain types the server stores. Kept independent of the frontend package. */

export type Metric =
  | "heart_rate"
  | "skin_temp"
  | "bp_systolic"
  | "bp_diastolic"
  | "glucose"
  | "sleep_minutes"
  | "mood"
  | "stress"
  | "rested"
  | "connected"
  | "motion";

export type Lane = "manual" | "live" | "replay" | "synthetic";
export type Quality = "ok" | "no_contact" | "stale" | "out_of_range" | "motion" | "not_measured";
export type ObservationContext = "rest" | "post_exercise" | "post_meal" | "unknown";

export type Observation = {
  id: string;
  crewId: string;
  metric: Metric;
  value: number | null;
  unit: string;
  observedAt: string;
  enteredAt: string;
  lane: Lane;
  method: string;
  context: ObservationContext;
  rawValue?: string;
  quality: Quality;
  qualityReason: string | null;
  environment: string;
  procedureVersion: string;
  artifact?: "motion" | null;
};

export type EnvironmentKey =
  | "mars_transit"
  | "station"
  | "lunar_base"
  | "rover"
  | "remote_clinic";

export type LinkState = "live" | "delayed" | "blackout";
export type OutboxState = "queued" | "sent" | "delivered" | "acknowledged";
export type Role = "crew" | "ground" | "device";
