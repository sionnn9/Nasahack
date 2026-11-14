import type { EquipmentKey, HazardTag, Metric } from "@/lib/types";

export type ReadingGuide = {
  whatItMeasures: string;
  equipment: EquipmentKey[];
  steps: string[];
  whyInSpaceflight: string;
  hazards: HazardTag[];
  whenToTell: string;
  whatToRecord: string;
};

export type ReadingDefinition = {
  key: string;
  metric: Metric | null;
  name: string;
  unit: string;
  group: "live" | "manual" | "static";
  area: "Head" | "Heart" | "Arm" | "Skin" | "Abdomen" | "Legs" | "Radiation";
  whatItIs: string;
  tellCrewWhen: string;
  guide: ReadingGuide;
  private?: boolean;
};

export const readings: ReadingDefinition[] = [
  {
    key: "heart_rate",
    metric: "heart_rate",
    name: "Heart rate",
    unit: "bpm",
    group: "live",
    area: "Heart",
    whatItIs: "Beats per minute from the chest or wrist sensor.",
    tellCrewWhen: "Tell the crew if it feels wrong for how you feel, or if you feel unwell.",
    guide: {
      whatItMeasures: "How many times your heart beats in a minute.",
      equipment: ["pulse_oximeter"],
      steps: [
        "Sit still for two minutes.",
        "Place the sensor on a bare wrist or finger.",
        "Keep the arm relaxed and level with your heart.",
        "Wait for a steady number, then record it.",
      ],
      whyInSpaceflight:
        "Fluid shifts and lower gravity change resting heart rate during transit.",
      hazards: ["gravity", "distance"],
      whenToTell:
        "Tell the crew if it stays different from your usual resting readings for more than a day, or if you feel faint.",
      whatToRecord: "The number, the time, and whether you were at rest.",
    },
  },
  {
    key: "skin_temp",
    metric: "skin_temp",
    name: "Skin temperature",
    unit: "°C",
    group: "live",
    area: "Skin",
    whatItIs: "Skin-surface temperature from the body sensor.",
    tellCrewWhen: "Tell the crew if you feel feverish or the reading is far from your usual range.",
    guide: {
      whatItMeasures: "How warm your skin is at the sensor site.",
      equipment: ["thermometer"],
      steps: [
        "Place the probe flat on dry skin.",
        "Hold still until the reading settles.",
        "Record the number and the site.",
      ],
      whyInSpaceflight:
        "Cabin temperature is shared, and skin temperature can shift with workload and sleep loss.",
      hazards: ["environment", "radiation"],
      whenToTell:
        "Tell the crew if it is far from your recent readings and you also feel unwell.",
      whatToRecord: "The value, site, time and how you feel.",
    },
  },
  {
    key: "bp_systolic",
    metric: "bp_systolic",
    name: "Blood pressure",
    unit: "mmHg",
    group: "live",
    area: "Arm",
    whatItIs: "Cuff reading, shown as systolic over diastolic.",
    tellCrewWhen: "Tell the crew if you feel light-headed, faint, or the reading is unusual for you.",
    guide: {
      whatItMeasures: "The pressure in your arteries when your heart beats and rests.",
      equipment: ["bp_cuff"],
      steps: [
        "Sit with your back supported and feet flat.",
        "Rest the arm on a table at heart height.",
        "Fit the cuff on the upper arm and stay still.",
        "Record both numbers.",
      ],
      whyInSpaceflight:
        "Blood volume and vessel tone change in microgravity, so personal trends matter more than one number.",
      hazards: ["gravity", "distance"],
      whenToTell:
        "Tell the crew if you feel light-headed or faint, whatever the number says.",
      whatToRecord: "Systolic, diastolic, arm, time, and position.",
    },
  },
  {
    key: "motion",
    metric: "motion",
    name: "Motion",
    unit: "g",
    group: "live",
    area: "Legs",
    whatItIs: "Relative movement measured by the body-worn sensor.",
    tellCrewWhen: "No action needed on its own. It helps show activity around other readings.",
    guide: {
      whatItMeasures: "How much the body-worn sensor is moving.",
      equipment: [],
      steps: ["Wear the sensor as instructed.", "No manual step needed."],
      whyInSpaceflight:
        "Activity changes how other readings should be interpreted, such as heart rate after exercise.",
      hazards: ["gravity"],
      whenToTell: "Nothing to report from motion alone.",
      whatToRecord: "Nothing manually.",
    },
  },
  {
    key: "sleep",
    metric: "sleep_minutes",
    name: "Sleep",
    unit: "h m",
    group: "manual",
    area: "Head",
    whatItIs: "How long you slept, entered by you.",
    tellCrewWhen: "Tell the crew if sleep has been poor for several nights or you feel unwell.",
    guide: {
      whatItMeasures: "Time asleep, reported by you.",
      equipment: [],
      steps: ["Note the time you fell asleep.", "Note the time you woke.", "Enter hours and minutes."],
      whyInSpaceflight:
        "Sleep loss is common in confinement and can change mood, stress and resting heart rate.",
      hazards: ["isolation", "environment"],
      whenToTell: "Tell the crew if poor sleep lasts several nights or comes with other symptoms.",
      whatToRecord: "Hours and minutes, and whether it was restful.",
    },
  },
  {
    key: "mood",
    metric: "mood",
    name: "Mood",
    unit: "/5",
    group: "manual",
    area: "Head",
    whatItIs: "Your own answer, from very difficult to at ease.",
    tellCrewWhen: "Tell someone you trust if your mood stays low or you feel unsafe.",
    guide: {
      whatItMeasures: "How you feel, reported by you.",
      equipment: [],
      steps: ["Pick the answer that fits today.", "Add a note if you want to."],
      whyInSpaceflight: "Confinement and distance from home affect mood.",
      hazards: ["isolation", "distance"],
      whenToTell: "Tell the crew medical officer or a trusted crewmate if this persists.",
      whatToRecord: "The answer and a short note.",
    },
    private: true,
  },
  {
    key: "stress",
    metric: "stress",
    name: "Stress",
    unit: "/5",
    group: "manual",
    area: "Head",
    whatItIs: "Your own stress answer for today.",
    tellCrewWhen: "Tell someone you trust if stress is affecting sleep or work.",
    guide: {
      whatItMeasures: "How stressed you feel, reported by you.",
      equipment: [],
      steps: ["Pick 1 (low) to 5 (high)."],
      whyInSpaceflight: "Workload and confinement can raise stress.",
      hazards: ["isolation", "environment"],
      whenToTell: "Tell the crew if it lasts several days or affects sleep.",
      whatToRecord: "The answer.",
    },
    private: true,
  },
  {
    key: "glucose",
    metric: "glucose",
    name: "Blood sugar",
    unit: "mmol/L",
    group: "manual",
    area: "Abdomen",
    whatItIs: "A finger-prick reading you enter yourself.",
    tellCrewWhen: "Tell the crew if you feel shaky, very thirsty or unwell.",
    guide: {
      whatItMeasures: "Glucose in a drop of blood.",
      equipment: ["glucometer"],
      steps: [
        "Wash and dry your hands.",
        "Use a fresh strip and lancet.",
        "Apply the drop to the strip and record the number.",
      ],
      whyInSpaceflight: "Meal timing and activity change during transit.",
      hazards: ["distance"],
      whenToTell: "Tell the crew if you feel unwell or the value is far from your range.",
      whatToRecord: "The value, time, and whether it was after a meal.",
    },
  },
  {
    key: "radiation",
    metric: null,
    name: "Radiation dose",
    unit: "mSv",
    group: "static",
    area: "Radiation",
    whatItIs: "Passive dosimeter total, read on a schedule. Not a live measurement.",
    tellCrewWhen: "No action for you. Mission control tracks the total.",
    guide: {
      whatItMeasures: "Accumulated radiation dose from the passive dosimeter.",
      equipment: [],
      steps: ["No crew step. Dosimeters are read on schedule."],
      whyInSpaceflight: "Transit exposes the crew to radiation outside Earth's protection.",
      hazards: ["radiation"],
      whenToTell: "Nothing to report from this value alone.",
      whatToRecord: "Nothing manually.",
    },
  },
];

export function readingFor(metric: Metric): ReadingDefinition | undefined {
  return readings.find((reading) => reading.metric === metric);
}
