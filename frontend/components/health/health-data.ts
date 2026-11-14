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
  name: string;
  role: string;
  initials: string;
  color: string;
};

export type Metric = {
  name: string;
  value: string;
  unit: string;
  source: string;
  icon: LucideIcon;
  color: string;
  note: string;
};

export type PageName = "home" | "daily" | "reports" | "emergency";
export type BodyArea = "Head" | "Heart" | "Skin" | "Arm" | "Abdomen" | "Legs";

export const crew: CrewMember[] = [
  { name: "Alex Morgan", role: "Commander", initials: "AM", color: "mint" },
  {
    name: "Samira Patel",
    role: "Flight Engineer",
    initials: "SP",
    color: "blue",
  },
  {
    name: "Kenji Sato",
    role: "Mission Specialist",
    initials: "KS",
    color: "amber",
  },
  {
    name: "Elena Rostova",
    role: "Crew Medical Officer",
    initials: "ER",
    color: "rose",
  },
];

export const metrics: Metric[] = [
  {
    name: "Heart rate",
    value: "68",
    unit: "bpm",
    source: "Live sensor",
    icon: Heart,
    color: "coral",
    note: "Tracks each heartbeat. Tell the crew if you feel unwell.",
  },
  {
    name: "Skin temperature",
    value: "36.4",
    unit: "°C",
    source: "Live sensor",
    icon: Thermometer,
    color: "amber",
    note: "A change can help the crew notice how your body is responding.",
  },
  {
    name: "Motion",
    value: "Active",
    unit: "",
    source: "Live sensor",
    icon: Activity,
    color: "blue",
    note: "Shows movement through your day. Tell the crew if movement feels difficult.",
  },
  {
    name: "Sleep",
    value: "7h 20m",
    unit: "",
    source: "Entered by you",
    icon: Moon,
    color: "lavender",
    note: "Your sleep helps the crew understand how rested you feel.",
  },
  {
    name: "Mood",
    value: "Calm",
    unit: "",
    source: "Entered by you",
    icon: Sun,
    color: "mint",
    note: "Private check-in. Share only when you choose.",
  },
  {
    name: "Stress",
    value: "2 / 5",
    unit: "",
    source: "Entered by you",
    icon: Activity,
    color: "blue",
    note: "A quick check-in to help plan support.",
  },
  {
    name: "Blood pressure",
    value: "112 / 74",
    unit: "mmHg",
    source: "Dataset replay",
    icon: Radio,
    color: "rose",
    note: "Entered readings help the crew follow changes over time.",
  },
  {
    name: "Blood sugar",
    value: "No valid reading",
    unit: "",
    source: "Simulated",
    icon: Battery,
    color: "amber",
    note: "No reading available yet. Add one when asked by the crew.",
  },
];

export const bodyAreas: BodyArea[] = [
  "Head",
  "Heart",
  "Skin",
  "Arm",
  "Abdomen",
  "Legs",
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
