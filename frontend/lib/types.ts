/**
 * Shared domain types. UI must not import from feature components for types.
 * Nothing in this file has side effects.
 */

export type CrewMember = {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  restingHeartRate: number;
};

export type BodyArea =
  | "Head"
  | "Heart"
  | "Arm"
  | "Skin"
  | "Abdomen"
  | "Legs"
  | "Radiation";

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

/** Every number shows which lane it came from. Lanes are never merged. */
export type Lane = "manual" | "live" | "replay" | "synthetic";

export type ObservationContext =
  | "rest"
  | "post_exercise"
  | "post_meal"
  | "unknown";

export type Quality =
  | "ok"
  | "no_contact"
  | "stale"
  | "out_of_range"
  | "motion"
  | "not_measured";

export type Observation = {
  id: string;
  crewId: string;
  metric: Metric;
  value: number | null;
  unit: string;
  /** When the body was actually measured. */
  observedAt: string;
  /** When the number reached the app. */
  enteredAt: string;
  lane: Lane;
  method: string;
  context: ObservationContext;
  rawValue?: string;
  quality: Quality;
  qualityReason: string | null;
  environment: string;
  procedureVersion: string;
  /** Optional sensor artifact hint used by the quality gate. */
  artifact?: "motion" | null;
};

export type GateResult = {
  quality: Quality;
  qualityReason: string | null;
  /** False when the value must stay out of charts, baselines and comparisons. */
  accepted: boolean;
};

export type StatusState =
  | "logged"
  | "attention"
  | "no_valid_reading"
  | "within_range"
  | "insufficient_history";

export type Comparison = {
  state: StatusState;
  label: string;
  detail: string;
  comparableCount: number;
  range: { low: number; high: number } | null;
};

export type SymptomOnset = "just_now" | "today" | "several_days";
export type SymptomTrend = "better" | "same" | "worse";

export type SymptomEntry = {
  id: string;
  name: string;
  onset: SymptomOnset;
  trend: SymptomTrend;
  /** True only for the demo list of symptoms that must never wait for a save. */
  urgent: boolean;
};

export type CheckIn = {
  id: string;
  crewId: string;
  observedAt: string;
  enteredAt: string;
  sleepMinutes: number | null;
  mood: number | null;
  stress: number | null;
  rested: number | null;
  connected: number | null;
  symptoms: SymptomEntry[];
  details: string;
};

export type Concern = {
  id: string;
  crewId: string;
  createdAt: string;
  title: string;
  /** Plain, non-diagnostic sentence: "These changed together. No cause assigned." */
  summary: string;
  signals: Array<{
    metric: Metric | "symptom";
    text: string;
    observedAt: string;
  }>;
  hazards: HazardTag[];
  windowHours: number;
};

export type HazardTag =
  | "isolation"
  | "gravity"
  | "distance"
  | "radiation"
  | "environment";

export type EncounterKind = "assessment" | "emergency" | "daily";

export type Encounter = {
  id: string;
  crewId: string;
  kind: EncounterKind;
  pathwayId: string;
  startedAt: string;
  endedAt: string | null;
  symptoms: SymptomEntry[];
  answers: Array<{
    stepId: string;
    question: string;
    answer: string;
    at: string;
  }>;
  measurements: Observation[];
  actions: Array<{ text: string; at: string; timerMinutes?: number }>;
  unknowns: string[];
  outcome: "open" | "closed" | "handoff" | "emergency" | "incomplete";
  illustrative: true;
};

export type Handoff = {
  id: string;
  crewId: string;
  createdAt: string;
  encounterId: string | null;
  symptoms: SymptomEntry[];
  observations: Observation[];
  trends: Array<{ metric: Metric; text: string }>;
  actions: Array<{ text: string; at: string }>;
  unknowns: string[];
  includePrivate: boolean;
  notes: string;
  recipients: string[];
};

export type LinkState = "live" | "delayed" | "blackout";

export type EnvironmentKey =
  | "mars_transit"
  | "station"
  | "lunar_base"
  | "rover"
  | "remote_clinic";

export type OutboxState =
  | "queued"
  | "sent"
  | "delivered"
  | "acknowledged";

export type OutboxItem = {
  id: string;
  crewId: string;
  kind: "handoff" | "support" | "report";
  createdAt: string;
  sentAt: string | null;
  acknowledgedAt: string | null;
  state: OutboxState;
  /** One-way estimate in seconds for the environment selected at send time. */
  delaySeconds: number;
  title: string;
  payload: Handoff | Record<string, unknown>;
  private: boolean;
  history: Array<{ state: OutboxState; at: string; note: string }>;
};

export type EquipmentKey =
  | "bp_cuff"
  | "thermometer"
  | "pulse_oximeter"
  | "glucometer"
  | "ecg"
  | "ultrasound";

export type MissionConfig = {
  missionName: string;
  missionDay: number;
  environment: EnvironmentKey;
  crew: CrewMember[];
  equipment: EquipmentKey[];
  procedureVersion: string;
};

export type PathwayOption = "Yes" | "No" | "Unsure" | "Unable to assess";

export type PathwayStep =
  | {
      id: string;
      type: "question";
      text: string;
      options: string[];
      next?: Record<string, string>;
    }
  | {
      id: string;
      type: "urgent_check";
      text: string;
      options: string[];
      next: Record<string, string>;
    }
  | {
      id: string;
      type: "measure";
      metric: Metric;
      needs: EquipmentKey | null;
      alt?: string;
      text: string;
      next: Record<string, string>;
    }
  | {
      id: string;
      type: "action";
      text: string;
      timer_minutes?: number;
      next?: Record<string, string>;
    }
  | {
      id: string;
      type: "note";
      text: string;
      next: Record<string, string>;
    };

export type Pathway = {
  id: string;
  label: string;
  title: string;
  category?: "assessment" | "emergency";
  triggers: string[];
  steps: PathwayStep[];
  reassess?: {
    after_minutes: number;
    question: string;
    options: string[];
    next: Record<string, string>;
  };
};

export type DemoRule = {
  id: string;
  metric: Metric;
  why: string;
  source: string;
  low: number;
  high: number;
};

/** Legacy shape kept for the seeded sensor charts. */
export type LiveVitals = {
  heartRate: number;
  skinTemperature: number;
  motion: number;
  systolic: number;
  diastolic: number;
  updatedAt: Record<"heartRate" | "skinTemperature" | "bloodPressure" | "motion", string>;
};

export type SensorHistories = Record<
  "heartRate" | "skinTemperature" | "bloodPressure" | "motion",
  Array<number | null>
>;

export type HistoricalDay = {
  dayOffset: number;
  date: string;
  sleepMinutes: number | null;
  restingHeartRate: number;
  skinTemperature: number;
  systolic: number | null;
  diastolic: number | null;
  bloodSugar: number | null;
};

export type HistoricalCheckIn = {
  dayOffset: number;
  date: string;
  mood: number;
  stress: number;
  rested: number;
  connected: number;
};

export type TimelineEvent = {
  label: string;
  time: string;
  kind: "exercise" | "meal" | "check-in" | "symptoms" | "measurement";
};
