import type {
  BodyArea,
  CrewMember,
  EnvironmentKey,
  EquipmentKey,
  HazardTag,
  Metric,
  MissionConfig,
} from "@/lib/types";

/**
 * Mission configuration. Nothing in the UI should hard-code the mission day,
 * the environment delay or the equipment list.
 */
export const missionConfig: MissionConfig = {
  missionName: "Mars Transit",
  missionDay: 184,
  environment: "mars_transit",
  crew: [
    {
      id: "alex-morgan",
      name: "Alex Morgan",
      role: "Commander",
      initials: "AM",
      color: "mint",
      restingHeartRate: 70,
    },
    {
      id: "samira-patel",
      name: "Samira Patel",
      role: "Flight Engineer",
      initials: "SP",
      color: "blue",
      restingHeartRate: 66,
    },
    {
      id: "kenji-sato",
      name: "Kenji Sato",
      role: "Mission Specialist",
      initials: "KS",
      color: "amber",
      restingHeartRate: 72,
    },
    {
      id: "elena-rostova",
      name: "Elena Rostova",
      role: "Crew Medical Officer",
      initials: "ER",
      color: "rose",
      restingHeartRate: 64,
    },
  ],
  equipment: ["bp_cuff", "thermometer", "pulse_oximeter", "glucometer"],
  procedureVersion: "demo-procedures-1",
};

export const crew: CrewMember[] = missionConfig.crew;

export type EnvironmentPreset = {
  key: EnvironmentKey;
  label: string;
  /** One-way light delay estimate in seconds. Labelled as a scenario estimate. */
  delaySeconds: number;
  note: string;
};

export const environments: EnvironmentPreset[] = [
  {
    key: "mars_transit",
    label: "Mars transit",
    delaySeconds: 20 * 60,
    note: "Scenario estimate: up to 20 min one way.",
  },
  {
    key: "station",
    label: "Low Earth orbit station",
    delaySeconds: 5,
    note: "Scenario estimate: seconds, via relay.",
  },
  {
    key: "lunar_base",
    label: "Lunar base",
    delaySeconds: 1.3,
    note: "Scenario estimate: about 1.3 s one way.",
  },
  {
    key: "rover",
    label: "Surface rover",
    delaySeconds: 45,
    note: "Scenario estimate: under a minute via relay.",
  },
  {
    key: "remote_clinic",
    label: "Remote clinic",
    delaySeconds: 600,
    note: "Scenario estimate: 10 min one way.",
  },
];

export function environmentFor(key: EnvironmentKey): EnvironmentPreset {
  return environments.find((entry) => entry.key === key) ?? environments[0];
}

export function formatDelay(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)} s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

export const equipmentLabels: Record<EquipmentKey, string> = {
  bp_cuff: "Blood-pressure cuff",
  thermometer: "Thermometer",
  pulse_oximeter: "Pulse oximeter",
  glucometer: "Glucometer",
  ecg: "ECG",
  ultrasound: "Ultrasound",
};

export const hazards: Array<{
  key: HazardTag;
  label: string;
  plain: string;
  metrics: Metric[];
}> = [
  {
    key: "isolation",
    label: "Isolation & confinement",
    plain: "Limited space and limited people can change sleep and mood.",
    metrics: ["sleep_minutes", "mood", "stress", "connected"],
  },
  {
    key: "gravity",
    label: "Gravity fields",
    plain: "Less gravity changes how blood and muscles behave.",
    metrics: ["heart_rate", "bp_systolic", "bp_diastolic", "motion"],
  },
  {
    key: "distance",
    label: "Distance from Earth",
    plain: "Help from Earth may be delayed, so local steps matter.",
    metrics: ["heart_rate", "bp_systolic", "glucose"],
  },
  {
    key: "radiation",
    label: "Radiation",
    plain: "Radiation exposure is tracked from passive dosimeters.",
    metrics: ["skin_temp"],
  },
  {
    key: "environment",
    label: "Hostile closed environment",
    plain: "Air, noise and temperature are shared and can affect how you feel.",
    metrics: ["skin_temp", "heart_rate", "mood"],
  },
];

export function hazardFor(key: HazardTag) {
  return hazards.find((entry) => entry.key === key)!;
}

export const bodyAreas: BodyArea[] = [
  "Head",
  "Heart",
  "Arm",
  "Skin",
  "Abdomen",
  "Legs",
];
