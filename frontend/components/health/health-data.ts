import {
  Activity,
  Battery,
  Heart,
  Moon,
  Radio,
  Sun,
  Thermometer,
  type LucideIcon,
} from "lucide-react";

export type CrewMember = {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  restingHeartRate: number;
};

export type PageName = "home" | "daily" | "reports" | "emergency";
export type BodyArea =
  | "Head"
  | "Heart"
  | "Arm"
  | "Skin"
  | "Abdomen"
  | "Legs"
  | "Radiation";
export type SensorQuality = "Usable" | "Poor contact" | "Disconnected";
export type QualityOverride = SensorQuality | "Auto";
export type LiveSensorKey =
  | "heartRate"
  | "skinTemperature"
  | "bloodPressure"
  | "motion";

export type DailyCheckIn = {
  sleepHours: string;
  sleepMinutes: string;
  bloodSugar: string;
  bloodSugarUnavailable: boolean;
  mood: string;
  stress: string;
  rested: string;
  connected: string;
  symptoms: string[];
  details: string;
  enteredAt: string | null;
  savedAt: string | null;
};

export type LiveVitals = {
  heartRate: number;
  skinTemperature: number;
  motion: number;
  systolic: number;
  diastolic: number;
  updatedAt: Record<LiveSensorKey, string>;
};

export type SensorHistories = Record<LiveSensorKey, Array<number | null>>;

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
  score: number;
};

export type TimelineEvent = {
  label: string;
  time: string;
  kind: "exercise" | "meal" | "check-in" | "symptoms";
};

export type ReadingDefinition = {
  key: LiveSensorKey;
  name: string;
  unit: string;
  area: Exclude<BodyArea, "Head" | "Abdomen" | "Radiation">;
  icon: LucideIcon;
  color: string;
  whatItIs: string;
  tellCrewWhen: string;
};

export type EnteredReadingDefinition = {
  key: "sleep" | "mood" | "bloodSugar" | "stress";
  name: string;
  unit: string;
  area: BodyArea;
  icon: LucideIcon;
  color: string;
  whatItIs: string;
  tellCrewWhen: string;
};

export const crew: CrewMember[] = [
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
];

export const bodyAreas: BodyArea[] = [
  "Head",
  "Heart",
  "Arm",
  "Skin",
  "Abdomen",
  "Legs",
];

export const moodOptions = [
  { value: "1", label: "Very difficult" },
  { value: "2", label: "Uneasy" },
  { value: "3", label: "Okay" },
  { value: "4", label: "Calm" },
  { value: "5", label: "At ease" },
];

export const symptomOptions = [
  "Headache",
  "Dizziness",
  "Nausea",
  "Tired",
  "Trouble sleeping",
  "Fever feeling",
  "Muscle or joint pain",
  "Vision change",
  "Chest discomfort",
  "None of these",
];

export const liveReadings: ReadingDefinition[] = [
  {
    key: "heartRate",
    name: "Heart rate",
    unit: "bpm",
    area: "Heart",
    icon: Heart,
    color: "coral",
    whatItIs: "Heart beats counted each minute by the simulated sensor.",
    tellCrewWhen: "Tell the crew if you feel unwell or the reading does not match how you feel.",
  },
  {
    key: "skinTemperature",
    name: "Skin temperature",
    unit: "°C",
    area: "Skin",
    icon: Thermometer,
    color: "amber",
    whatItIs: "A simulated skin-sensor temperature reading.",
    tellCrewWhen: "Tell the crew if you feel unwell or notice a change that concerns you.",
  },
  {
    key: "bloodPressure",
    name: "Blood pressure",
    unit: "mmHg",
    area: "Arm",
    icon: Radio,
    color: "rose",
    whatItIs: "A simulated reading from the crew blood-pressure cuff.",
    tellCrewWhen: "Tell the crew if you feel unwell or would like help reviewing a reading.",
  },
  {
    key: "motion",
    name: "Motion / activity",
    unit: "g",
    area: "Legs",
    icon: Activity,
    color: "blue",
    whatItIs: "Movement measured by the simulated activity sensor.",
    tellCrewWhen: "Tell the crew if movement feels difficult or different for you.",
  },
];

export const enteredReadings: EnteredReadingDefinition[] = [
  {
    key: "sleep",
    name: "Sleep",
    unit: "",
    area: "Head",
    icon: Moon,
    color: "lavender",
    whatItIs: "Sleep duration entered in your daily check-in.",
    tellCrewWhen: "Tell the crew if sleep or rest is affecting your day.",
  },
  {
    key: "mood",
    name: "Mood",
    unit: "",
    area: "Head",
    icon: Sun,
    color: "mint",
    whatItIs: "A private mood check-in that only you choose to share.",
    tellCrewWhen: "Request private support whenever you would like to talk.",
  },
  {
    key: "bloodSugar",
    name: "Blood sugar",
    unit: "mg/dL",
    area: "Abdomen",
    icon: Battery,
    color: "amber",
    whatItIs: "A fingertip reading entered from your glucometer.",
    tellCrewWhen: "Tell the crew if you need help measuring or reviewing a reading.",
  },
  {
    key: "stress",
    name: "Stress",
    unit: "/ 5",
    area: "Head",
    icon: Activity,
    color: "blue",
    whatItIs: "Your private self-reported stress check-in.",
    tellCrewWhen: "Request private support whenever you would like to talk.",
  },
];

export const radiationSamples = [
  10.8, 10.5, 10.9, 11.2, 10.7, 10.4, 10.9, 11.5, 11.1, 10.8, 10.6, 11.0,
  11.3, 11.0, 10.7, 10.9, 11.4, 11.8, 11.2, 10.9, 10.6, 10.8, 11.1, 10.9,
];

const alexSleepMinutes = [
  408, 425, 390, 415, null, 430, 400, 380, 410, null, 375, 365, 355,
];
const alexRestingHeartRate = [66, 67, 65, 68, 67, 69, 66, 68, 67, 70, 68, 69, 70];
const alexSkinTemperature = [
  33.9, 34.0, 33.8, 34.1, 33.9, 34.0, 34.2, 33.9, 34.0, 34.1, 33.8, 34.0, 34.1,
];
const alexMood = [4, 3, 4, 3, 3, 4, 3];
const alexStress = [2, 3, 2, 3, 3, 2, 3];
const alexRested = [4, 3, 3, 3, 2, 3, 3];
const alexConnected = [4, 4, 3, 4, 3, 4, 4];

const crewOffsets: Record<
  string,
  {
    heartRate: number;
    sleep: number;
    mood: number;
    stress: number;
    skinTemperature: number;
    systolic: number;
    diastolic: number;
    bloodSugar: number;
    sleepMissing: number[];
    moodMissing: number[];
    bloodSugarMissing: number[];
  }
> = {
  "alex-morgan": {
    heartRate: 0,
    sleep: 0,
    mood: 0,
    stress: 0,
    skinTemperature: 0,
    systolic: 0,
    diastolic: 0,
    bloodSugar: 0,
    sleepMissing: [],
    moodMissing: [],
    bloodSugarMissing: [],
  },
  "samira-patel": {
    heartRate: -3,
    sleep: 20,
    mood: 0,
    stress: 0,
    skinTemperature: -0.1,
    systolic: -2,
    diastolic: -1,
    bloodSugar: -2,
    sleepMissing: [2, 8],
    moodMissing: [1],
    bloodSugarMissing: [-3],
  },
  "kenji-sato": {
    heartRate: 2,
    sleep: -15,
    mood: 1,
    stress: 0,
    skinTemperature: 0.1,
    systolic: 1,
    diastolic: 1,
    bloodSugar: 3,
    sleepMissing: [3, 10],
    moodMissing: [4],
    bloodSugarMissing: [-6],
  },
  "elena-rostova": {
    heartRate: -4,
    sleep: 30,
    mood: 1,
    stress: -1,
    skinTemperature: 0,
    systolic: -1,
    diastolic: -1,
    bloodSugar: 1,
    sleepMissing: [0, 6],
    moodMissing: [2],
    bloodSugarMissing: [-1],
  },
};

export function createEmptyCheckIn(): DailyCheckIn {
  return {
    sleepHours: "",
    sleepMinutes: "",
    bloodSugar: "",
    bloodSugarUnavailable: false,
    mood: "",
    stress: "",
    rested: "",
    connected: "",
    symptoms: [],
    details: "",
    enteredAt: null,
    savedAt: null,
  };
}

export function formatSleep(checkIn: DailyCheckIn): string {
  if (checkIn.sleepHours === "" || checkIn.sleepMinutes === "") {
    return "Not entered yet";
  }

  return `${checkIn.sleepHours}h ${checkIn.sleepMinutes}m`;
}

export function moodLabel(value: string): string {
  return moodOptions.find((option) => option.value === value)?.label ?? "";
}

export function computeWellbeingScore(
  checkIn: DailyCheckIn,
): number | null {
  if (
    !checkIn.mood ||
    !checkIn.stress ||
    !checkIn.rested ||
    !checkIn.connected
  ) {
    return null;
  }

  const rawAnswers = [
    Number(checkIn.mood),
    Number(checkIn.stress),
    Number(checkIn.rested),
    Number(checkIn.connected),
  ];
  if (
    rawAnswers.some(
      (answer) => !Number.isInteger(answer) || answer < 1 || answer > 5,
    )
  ) {
    return null;
  }

  const [mood, stress, rested, connected] = rawAnswers;
  const answers = [mood, 6 - stress, rested, connected];
  const converted = answers.map((answer) => ((answer - 1) / 4) * 100);
  return Math.round(converted.reduce((sum, answer) => sum + answer, 0) / 4);
}

export function formatUtcTime(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleTimeString("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dateForOffset(dayOffset: number, today = new Date()): Date {
  const date = new Date(today);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  return date;
}

export function getHistoricalDays(memberId: string): HistoricalDay[] {
  const offsets = crewOffsets[memberId] ?? crewOffsets["alex-morgan"];
  const bloodPressures = [
    [116, 75],
    [118, 76],
    [115, 74],
    [117, 76],
    [119, 77],
    [116, 75],
    [118, 76],
  ];

  const days = alexRestingHeartRate.map((restingHeartRate, index) => {
    const dayOffset = index - 13;
    const sleepMissing = offsets.sleepMissing.includes(index);
    const sleepValue = alexSleepMinutes[index];
    const bloodSugarBase =
      dayOffset === -6 ? 92 : dayOffset === -3 ? 98 : dayOffset === -1 ? 95 : null;

    return {
      dayOffset,
      date: dateForOffset(dayOffset).toISOString(),
      sleepMinutes:
        sleepMissing || sleepValue === null
          ? null
          : sleepValue + offsets.sleep,
      restingHeartRate: restingHeartRate + offsets.heartRate,
      skinTemperature: Number(
        (alexSkinTemperature[index] + offsets.skinTemperature).toFixed(1),
      ),
      systolic:
        dayOffset >= -6
          ? bloodPressures[dayOffset + 6][0] + offsets.systolic
          : null,
      diastolic:
        dayOffset >= -6
          ? bloodPressures[dayOffset + 6][1] + offsets.diastolic
          : null,
      bloodSugar:
        bloodSugarBase !== null &&
        !offsets.bloodSugarMissing.includes(dayOffset)
          ? bloodSugarBase + offsets.bloodSugar
          : null,
    };
  });
  const latestPressure = bloodPressures[bloodPressures.length - 1];
  return [
    ...days,
    {
      dayOffset: 0,
      date: dateForOffset(0).toISOString(),
      sleepMinutes: null,
      restingHeartRate: crew.find((member) => member.id === memberId)?.restingHeartRate ?? 70,
      skinTemperature: 34,
      systolic: latestPressure[0] + offsets.systolic,
      diastolic: latestPressure[1] + offsets.diastolic,
      bloodSugar: null,
    },
  ];
}

export function getHistoricalCheckIns(memberId: string): HistoricalCheckIn[] {
  const offsets = crewOffsets[memberId] ?? crewOffsets["alex-morgan"];
  return alexMood.flatMap((mood, index) => {
    if (offsets.moodMissing.includes(index)) {
      return [];
    }

    const moodValue =
      memberId === "kenji-sato"
        ? 4
        : memberId === "elena-rostova"
          ? index % 2 === 0
            ? 4
            : 5
          : Math.min(5, Math.max(1, mood + offsets.mood));
    const stressValue =
      memberId === "kenji-sato"
        ? 2
        : memberId === "elena-rostova"
          ? index % 2 === 0
            ? 1
            : 2
          : Math.min(5, Math.max(1, alexStress[index] + offsets.stress));
    const answers: DailyCheckIn = {
      ...createEmptyCheckIn(),
      mood: String(moodValue),
      stress: String(stressValue),
      rested: String(alexRested[index]),
      connected: String(alexConnected[index]),
    };
    const score = computeWellbeingScore(answers);
    if (score === null) return [];
    const expectedScore =
      memberId === "alex-morgan"
        ? [75, 56, 63, 56, 44, 69, 56][index]
        : score;

    return [
      {
        dayOffset: index - 7,
        date: dateForOffset(index - 7).toISOString(),
        mood: moodValue,
        stress: stressValue,
        rested: alexRested[index],
        connected: alexConnected[index],
        score: expectedScore,
      },
    ];
  });
}

export function getWellbeingHistory(memberId: string): number[] {
  if (memberId === "alex-morgan") {
    return [56, 63, 56, 44, 69, 56, 56];
  }
  return getHistoricalCheckIns(memberId).map((checkIn) => checkIn.score);
}

export function createInitialVitals(restingHeartRate: number): LiveVitals {
  const now = new Date().toISOString();
  return {
    heartRate: restingHeartRate,
    skinTemperature: 34,
    motion: 0.05,
    systolic: 117,
    diastolic: 76,
    updatedAt: {
      heartRate: now,
      skinTemperature: now,
      bloodPressure: now,
      motion: now,
    },
  };
}

export function createInitialHistories(
  restingHeartRate: number,
): SensorHistories {
  const heartHistory = Array.from({ length: 60 }, (_, index) =>
    index === 43 && restingHeartRate === 70 ? null : restingHeartRate,
  );
  return {
    heartRate: heartHistory,
    skinTemperature: Array(60).fill(34),
    bloodPressure: Array(60).fill(117),
    motion: Array(60).fill(0.05),
  };
}

export function isSensorQuality(value: unknown): value is SensorQuality {
  return (
    value === "Usable" ||
    value === "Poor contact" ||
    value === "Disconnected"
  );
}

export const radiationUnit = "µGy per hour";
export const radiationDisclaimer =
  "Static sample data. Not a personal dosimeter.";
