import { crew } from "@/components/health/health-data";

export type EmergencySeverity = "CRITICAL" | "HIGH" | "MODERATE";

export type EmergencyCategory =
  | "cardiac"
  | "respiratory"
  | "trauma"
  | "unconscious"
  | "toxic"
  | "seizure"
  | "burn"
  | "decompression"
  | "general";

export type ActionStep = {
  id: string;
  stepNumber: number;
  instruction: string;
  detail: string;
  equipment?: string;
  location?: string;
  completed?: boolean;
};

export type EmergencyInterpretation = {
  id: string;
  category: EmergencyCategory;
  categoryLabel: string;
  severity: EmergencySeverity;
  affectedCrewName: string | null;
  confidence: number;
  detectedSymptoms: string[];
  spokenSummary: string;
  immediateActions: ActionStep[];
  precautions: string[];
  spaceSpecificNotes: string;
  timestamp: string;
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Identify crew member mentioned in the voice transcript. */
export function extractCrewMember(transcript: string, fallbackName?: string | null): string | null {
  const text = normalize(transcript);
  if (!text) return fallbackName ?? null;

  for (const person of crew) {
    const firstName = normalize(person.name.split(" ")[0]);
    const lastName = normalize(person.name.split(" ")[1] ?? "");
    const fullName = normalize(person.name);

    if (
      ` ${text} `.includes(` ${fullName} `) ||
      ` ${text} `.includes(` ${firstName} `) ||
      (lastName && ` ${text} `.includes(` ${lastName} `))
    ) {
      return person.name;
    }
  }

  // Self references ("I am", "I'm having", "my chest", "help me")
  if (
    text.includes("i am") ||
    text.includes("i'm") ||
    text.includes("im ") ||
    text.includes("my ") ||
    text.includes("help me") ||
    text.includes("i have") ||
    text.includes("i feel")
  ) {
    return fallbackName || crew[0].name;
  }

  return fallbackName ?? null;
}

type EmergencyProtocolDefinition = {
  category: EmergencyCategory;
  label: string;
  defaultSeverity: EmergencySeverity;
  keywords: string[];
  symptomLabels: Record<string, string>;
  spokenTemplate: (crewName: string | null, symptoms: string[]) => string;
  immediateActions: Omit<ActionStep, "completed">[];
  precautions: string[];
  spaceSpecificNotes: string;
};

/**
 * PRACTICAL CREW FIRST-RESPONSE PROTOCOLS
 * (Designed specifically for astronauts: practical actions, no medical diagnosis)
 */
const PROTOCOLS: Record<EmergencyCategory, EmergencyProtocolDefinition> = {
  cardiac: {
    category: "cardiac",
    label: "Action Plan: Chest Pain & Chest Tightness",
    defaultSeverity: "CRITICAL",
    keywords: [
      "chest pain",
      "crushing chest",
      "heart attack",
      "cardiac",
      "no pulse",
      "arrhythmia",
      "heart hurts",
      "chest pressure",
      "chest tightness",
      "left arm pain",
      "angina",
      "palpitations",
      "irregular heart",
      "defibrillator",
      "aed",
      "cardiac arrest",
    ],
    symptomLabels: {
      "chest pain": "Chest Pain Reported",
      "crushing chest": "Heavy Chest Pressure",
      "heart attack": "Severe Chest Discomfort",
      "no pulse": "No Pulse Felt",
      "left arm pain": "Left Arm Discomfort",
      palpitations: "Rapid / Racing Heartbeat",
    },
    spokenTemplate: (crewName) => {
      const subject = crewName ? crewName : "the crew member";
      return `Heard: Chest pain for ${subject}. Here is what to do right now. First, seat ${subject} in a comfortable strapped position so they do not float. Second, put the oxygen mask from Locker 2 on their face. Third, stick the heart monitor pads onto their chest. The Flight Surgeon on Earth has been alerted and will review their heart data.`;
    },
    immediateActions: [
      {
        id: "c-1",
        stepNumber: 1,
        instruction: "Seat patient in comfortable upright posture and secure straps",
        detail: "Fasten the waist tether so the astronaut stays stationary in microgravity and can breathe easily.",
        location: "Medical Bay Crew Berth",
      },
      {
        id: "c-2",
        stepNumber: 2,
        instruction: "Put the oxygen mask on their face and open valve",
        detail: "Grab the green oxygen mask from O2 Panel Alpha and place it over their nose and mouth.",
        equipment: "Oxygen Mask",
        location: "O2 Panel Alpha (Wall)",
      },
      {
        id: "c-3",
        stepNumber: 3,
        instruction: "Attach the stick-on heart sensor pads to their chest",
        detail: "Open Diagnostics Box 1 and place the adhesive sensor patches on their chest to send live heart rhythm to Earth.",
        equipment: "Heart Sensor Patches",
        location: "Diagnostics Shelf 01",
      },
      {
        id: "c-4",
        stepNumber: 4,
        instruction: "Clip the pulse & oxygen sensor onto their finger",
        detail: "Slip the pulse-oximeter clip onto their index finger to measure oxygen saturation.",
        equipment: "Finger Pulse Clip",
        location: "Diagnostics Shelf 01",
      },
      {
        id: "c-5",
        stepNumber: 5,
        instruction: "Bring the Automated Defibrillator (AED) to the bedside",
        detail: "Retrieve the AED box from Locker 2 and keep it ready. If the person becomes unresponsive, open the lid and listen to the voice prompts.",
        equipment: "Automated Defibrillator (AED)",
        location: "Medical Locker 02",
      },
      {
        id: "c-6",
        stepNumber: 6,
        instruction: "Keep patient calm and completely resting",
        detail: "Tell them to relax and avoid any physical movement while Earth Flight Control reviews telemetry.",
        location: "Bedside",
      },
    ],
    precautions: [
      "DO NOT give pills or medications without explicit authorization from the Flight Surgeon.",
      "DO NOT leave the astronaut unstrapped; floating while distressed causes disorientation.",
      "If the person loses consciousness and stops breathing, use the AED immediately and follow its automated voice instructions.",
    ],
    spaceSpecificNotes: "In zero gravity, keep the patient slightly angled up (30-45°) to prevent head congestion.",
  },

  respiratory: {
    category: "respiratory",
    label: "Action Plan: Difficulty Breathing & Choking",
    defaultSeverity: "CRITICAL",
    keywords: [
      "choking",
      "can't breathe",
      "cannot breathe",
      "cant breathe",
      "hard to breathe",
      "shortness of breath",
      "airway",
      "suffocating",
      "stridor",
      "wheezing",
      "gasping",
      "hypoxia",
      "low oxygen",
      "asthma",
      "respiratory",
    ],
    symptomLabels: {
      choking: "Choking / Blocked Throat",
      "can't breathe": "Cannot Catch Breath",
      "shortness of breath": "Shortness of Breath",
      wheezing: "Wheezing / Whistling Breath",
    },
    spokenTemplate: (crewName) => {
      const subject = crewName ? crewName : "the crew member";
      return `Heard: Breathing trouble or choking for ${subject}. Here is what to do right now. If choking and standing, lock your feet into the deck straps, stand behind ${subject}, and give quick upward abdominal thrusts. If they are having trouble breathing, sit them up and place the oxygen mask on them immediately.`;
    },
    immediateActions: [
      {
        id: "r-1",
        stepNumber: 1,
        instruction: "If choking: perform upward abdominal thrusts (Heimlich)",
        detail: "Lock your feet into deck floor straps, wrap arms around their upper abdomen from behind, and give quick inward and upward thrusts.",
        location: "Immediate Standing Area",
      },
      {
        id: "r-2",
        stepNumber: 2,
        instruction: "If patient collapses: open airway by tilting head back gently",
        detail: "Tilt head back slightly and lift chin. Look inside mouth; if food or an object is loose and visible, sweep it out with a finger.",
        location: "Patient Bedside",
      },
      {
        id: "r-3",
        stepNumber: 3,
        instruction: "Put the oxygen mask on their face",
        detail: "Turn on the green oxygen valve from Wall Panel Alpha and secure the mask elastic strap around their head.",
        equipment: "Oxygen Mask",
        location: "O2 Panel Alpha (Wall)",
      },
      {
        id: "r-4",
        stepNumber: 4,
        instruction: "Use the handheld suction wand if saliva or vomit is present",
        detail: "Turn on the battery suction unit from Cabinet Alpha to clear fluid so it does not float into their airway.",
        equipment: "Portable Suction Wand",
        location: "Medical Cabinet Alpha",
      },
      {
        id: "r-5",
        stepNumber: 5,
        instruction: "Clip the oxygen sensor to their finger",
        detail: "Monitor their oxygen number on the screen; verify it stays above 95%.",
        equipment: "Finger Pulse Clip",
        location: "Diagnostics Shelf 01",
      },
    ],
    precautions: [
      "DO NOT push objects deeper into the throat if you cannot see them clearly.",
      "Keep suction canister sealed so liquid droplets do not escape into cabin air.",
      "Check that cabin oxygen and CO2 displays on the wall are in the normal green zone.",
    ],
    spaceSpecificNotes: "In zero-g, saliva and liquids do not drain automatically; always keep the patient's head turned slightly to the side if they are lying down.",
  },

  trauma: {
    category: "trauma",
    label: "Action Plan: Cuts, Bleeding & Physical Injuries",
    defaultSeverity: "HIGH",
    keywords: [
      "bleeding",
      "blood",
      "hemorrhage",
      "cut",
      "laceration",
      "puncture",
      "wound",
      "stabbed",
      "broken bone",
      "fracture",
      "tourniquet",
      "open wound",
      "gash",
      "severed",
      "head injury",
    ],
    symptomLabels: {
      bleeding: "Active Bleeding",
      cut: "Skin Cut / Laceration",
      fracture: "Suspected Broken Bone",
      "head injury": "Head Impact / Bump",
    },
    spokenTemplate: (crewName) => {
      const subject = crewName ? crewName : "the crew member";
      return `Heard: Bleeding or physical injury for ${subject}. Here is what to do right now. Grab clean gauze from Trauma Pack 1 and press firmly directly on the cut with both hands. Keep pressing continuously. If heavy bleeding from an arm or leg will not stop, apply the tourniquet strap above the wound. Wipe any floating blood droplets with a towel.`;
    },
    immediateActions: [
      {
        id: "t-1",
        stepNumber: 1,
        instruction: "Press clean gauze firmly directly over the cut",
        detail: "Take sterile gauze from Trauma Pack 1 and hold firm, continuous pressure with both hands for at least 3 minutes.",
        equipment: "Sterile Gauze Pads",
        location: "Trauma Pack 01",
      },
      {
        id: "t-2",
        stepNumber: 2,
        instruction: "Wipe and catch all floating blood droplets with absorbent towels",
        detail: "Blood forms floating domes in microgravity; use clean towels around the wound to keep cabin air clean.",
        equipment: "Absorbent Surgical Towels",
        location: "Trauma Pack 01",
      },
      {
        id: "t-3",
        stepNumber: 3,
        instruction: "If heavy bleeding from arm/leg does not stop: apply Tourniquet",
        detail: "Wrap the black tourniquet strap 2-3 inches above the wound. Turn the plastic rod until bleeding stops, then lock the rod in the clip.",
        equipment: "CAT Tourniquet Strap",
        location: "Trauma Pack 01 Outer Pocket",
      },
      {
        id: "t-4",
        stepNumber: 4,
        instruction: "If bone fracture or sprain: wrap with soft SAM splint",
        detail: "Bend the orange/blue foam splint around the limb to keep it still, then secure loosely with elastic bandage.",
        equipment: "SAM Foam Splint",
        location: "Orthopedic Kit (Drawer 2)",
      },
      {
        id: "t-5",
        stepNumber: 5,
        instruction: "Fasten the astronaut to the medical bunk",
        detail: "Secure their waist strap and keep the injured arm or leg gently resting.",
        location: "Medical Bay Crew Berth",
      },
    ],
    precautions: [
      "DO NOT remove or loosen the tourniquet once tightened without instructions from Ground Control.",
      "DO NOT pull out any sharp object stuck deep in the body; pad around it and hold it steady.",
      "Wear medical gloves from the pack to protect against infection.",
    ],
    spaceSpecificNotes: "Zero-g surface tension makes blood cling in bubbles. Dab continuously with gauze so blood does not float away.",
  },

  unconscious: {
    category: "unconscious",
    label: "Action Plan: Unresponsive Crew Member / Fainting",
    defaultSeverity: "CRITICAL",
    keywords: [
      "unconscious",
      "unresponsive",
      "collapsed",
      "passed out",
      "fainted",
      "syncope",
      "blacked out",
      "knocked out",
      "not waking up",
      "coma",
      "lost consciousness",
    ],
    symptomLabels: {
      unconscious: "Unconscious / Not Answering",
      collapsed: "Sudden Collapse",
      fainted: "Fainted / Passed Out",
    },
    spokenTemplate: (crewName) => {
      const subject = crewName ? crewName : "the crew member";
      return `Heard: Unresponsive crew member ${subject}. Here is what to do right now. Tap their collarbone firmly and shout their name. Lay them on their side and strap their waist so their airway stays open. Check if their chest is rising. Put the finger oxygen sensor on them and alert the Flight Surgeon immediately.`;
    },
    immediateActions: [
      {
        id: "u-1",
        stepNumber: 1,
        instruction: "Tap their shoulders firmly and shout loudly: 'Can you hear me?'",
        detail: "Look at their face and chest for 5-10 seconds to check if they respond or are breathing normally.",
        location: "Patient Bedside",
      },
      {
        id: "u-2",
        stepNumber: 2,
        instruction: "Lay patient on their side (Recovery Position) and strap waist",
        detail: "Turn them gently onto their left side so vomit or saliva drains outward. Fasten waist strap so they don't float.",
        equipment: "Berth Restraint Strap",
        location: "Medical Berth",
      },
      {
        id: "u-3",
        stepNumber: 3,
        instruction: "If NOT breathing and no pulse: open AED box from Locker 2",
        detail: "Open the automated defibrillator lid, peel the 2 sticky pads, stick them onto bare chest as shown in pictures, and follow the spoken AED voice.",
        equipment: "Automated Defibrillator (AED)",
        location: "Medical Locker 02",
      },
      {
        id: "u-4",
        stepNumber: 4,
        instruction: "If breathing normally: clip oxygen sensor to their finger",
        detail: "Slip pulse-oximeter clip onto their index finger and verify the numbers appear on the telemetry screen.",
        equipment: "Finger Pulse Clip",
        location: "Diagnostics Shelf 01",
      },
      {
        id: "u-5",
        stepNumber: 5,
        instruction: "Put the oxygen mask on them at normal flow",
        detail: "Place mask over nose and mouth to keep their brain well oxygenated while they rest.",
        equipment: "Oxygen Mask",
        location: "O2 Panel Alpha (Wall)",
      },
    ],
    precautions: [
      "DO NOT leave an unconscious astronaut unrestrained in microgravity.",
      "DO NOT try to give food, pills, or water to an unresponsive person.",
    ],
    spaceSpecificNotes: "Always keep the head turned to the side so gravity-free fluids cannot obstruct breathing.",
  },

  toxic: {
    category: "toxic",
    label: "Action Plan: Cabin Smoke, Chemical or Gas Leak",
    defaultSeverity: "CRITICAL",
    keywords: [
      "ammonia",
      "chemical",
      "leak",
      "smoke",
      "fire",
      "toxic",
      "fumes",
      "burning eyes",
      "poison",
      "gas leak",
      "co2",
      "smell smoke",
      "contamination",
      "carbon dioxide",
    ],
    symptomLabels: {
      ammonia: "Ammonia Odor Detected",
      smoke: "Smoke in Cabin",
      "burning eyes": "Burning Eyes / Chemical Sting",
      "toxic fumes": "Fumes / Strange Odor",
    },
    spokenTemplate: () => {
      return `Heard: Smoke or chemical hazard in cabin. Here is what to do right now. Put on your Emergency Breathing Masks with 100 percent oxygen immediately. Evacuate all crew from the compartment, close and latch the pressure hatch, and switch cabin scrubbers to emergency mode.`;
    },
    immediateActions: [
      {
        id: "x-1",
        stepNumber: 1,
        instruction: "Put on Emergency Oxygen Masks immediately (All Crew)",
        detail: "Pull the emergency breathing mask from the bulkhead locker, strap it tight over face, and verify oxygen flow.",
        equipment: "Emergency Breathing Mask (PBA)",
        location: "Bulkhead Emergency Locker (Every Module)",
      },
      {
        id: "x-2",
        stepNumber: 2,
        instruction: "Evacuate the affected compartment and close the hatch",
        detail: "Move all crew into the adjacent safe module. Close the hatch door and turn the mechanical dogging wheel until locked.",
        location: "Inter-Module Bulkhead Hatch",
      },
      {
        id: "x-3",
        stepNumber: 3,
        instruction: "Press the Emergency Atmosphere Scrubber switch",
        detail: "On the environmental panel, flip the red toggle for Emergency Air Scrubbing to filter smoke and contaminants.",
        location: "Environmental Control Console (ECLSS)",
      },
      {
        id: "x-4",
        stepNumber: 4,
        instruction: "If chemical or ammonia touched eyes or skin: flush with saline",
        detail: "Use the squirt bottles from the eyewash station to flush eyes and skin continuously for 15 minutes.",
        equipment: "Eyewash Saline Squirt Bottles",
        location: "Module Utility Station",
      },
      {
        id: "x-5",
        stepNumber: 5,
        instruction: "Confirm all crew are accounted for on Comms",
        detail: "Call Commander on station radio and notify Ground Flight Control of module isolation.",
        location: "Station Radio / Comms",
      },
    ],
    precautions: [
      "DO NOT take off your breathing mask until Ground Control confirms the air is safe.",
      "DO NOT re-enter the sealed module without full breathing gear.",
    ],
    spaceSpecificNotes: "Space station ventilation circulates air quickly; sealing the door immediately isolates the danger.",
  },

  seizure: {
    category: "seizure",
    label: "Action Plan: Involuntary Shaking / Seizure",
    defaultSeverity: "HIGH",
    keywords: [
      "seizure",
      "convulsion",
      "convulsing",
      "fitting",
      "shaking",
      "stroke",
      "facial droop",
      "slurred speech",
      "paralysis",
      "numbness",
      "weakness on one side",
      "fast",
      "neurological",
    ],
    symptomLabels: {
      seizure: "Involuntary Body Shaking",
      "slurred speech": "Difficulty Speaking / Slurred",
      "facial droop": "Uneven Smile / Facial Weakness",
    },
    spokenTemplate: (crewName) => {
      const subject = crewName ? crewName : "the crew member";
      return `Heard: Involuntary shaking or seizure for ${subject}. Here is what to do right now. Push away any loose tools or equipment to protect them from bumping into walls. Do NOT hold their arms down or put anything in their mouth. When the shaking stops, roll them onto their side and let them rest quietly.`;
    },
    immediateActions: [
      {
        id: "s-1",
        stepNumber: 1,
        instruction: "Push away any floating gear or sharp bulkheads",
        detail: "Place soft foam pads or blankets around their head and limbs so they do not strike hard equipment.",
        equipment: "Foam Protection Pads",
        location: "Crew Quarters / Berth",
      },
      {
        id: "s-2",
        stepNumber: 2,
        instruction: "DO NOT pin down their arms or legs during shaking",
        detail: "Allow the movement to happen naturally; trying to forcibly hold limbs can cause muscle tears.",
        location: "Immediate",
      },
      {
        id: "s-3",
        stepNumber: 3,
        instruction: "DO NOT put anything inside their mouth",
        detail: "Never insert fingers, spoons, or objects into their mouth.",
        location: "Immediate",
      },
      {
        id: "s-4",
        stepNumber: 4,
        instruction: "When shaking stops: roll them onto their side",
        detail: "Gently position them on their left side with waist tethered. Wipe away any drool or saliva.",
        location: "Medical Berth",
      },
      {
        id: "s-5",
        stepNumber: 5,
        instruction: "Dim cabin lights and keep the area quiet",
        detail: "Dim the compartment lights and let them recover quietly while Earth monitors vitals.",
        location: "Lighting Switch",
      },
    ],
    precautions: [
      "DO NOT give drinks or pills until the astronaut is completely awake and talking normally.",
      "Check the clock to note how many minutes the shaking lasted for the medical log.",
    ],
    spaceSpecificNotes: "Floating during a seizure can cause accidental wall collisions; hold soft cushions around them.",
  },

  burn: {
    category: "burn",
    label: "Action Plan: Thermal & Electrical Burns",
    defaultSeverity: "HIGH",
    keywords: [
      "burn",
      "burned",
      "scalding",
      "electric shock",
      "electrocuted",
      "fire burn",
      "blister",
      "charred skin",
      "hot surface",
    ],
    symptomLabels: {
      burn: "Burned Skin",
      "electric shock": "Electrical Shock Reported",
      blister: "Skin Blisters",
    },
    spokenTemplate: (crewName) => {
      const subject = crewName ? crewName : "the crew member";
      return `Heard: Burn injury for ${subject}. Here is what to do right now. Make sure the heat or power source is turned off. Cool the burned skin with clean saline squirts for 10 minutes. Cover the burn with the sterile Water-Jel cooling sheet from Burn Kit 3. Do not pop any blisters.`;
    },
    immediateActions: [
      {
        id: "b-1",
        stepNumber: 1,
        instruction: "Switch off electrical power / heat source before touching",
        detail: "If electrical shock occurred, flip breaker switch off first so you do not get shocked.",
        location: "Module Power Breaker Panel",
      },
      {
        id: "b-2",
        stepNumber: 2,
        instruction: "Cool the burned skin with sterile saline for 10 minutes",
        detail: "Gently squirt room-temperature sterile saline bottles onto the burn; do NOT use freezing cold packs or ice.",
        equipment: "Saline Irrigation Bottles",
        location: "Medical Prep Cabinet",
      },
      {
        id: "b-3",
        stepNumber: 3,
        instruction: "Remove watches, rings, and tight wristbands",
        detail: "Swelling happens quickly; take off rings or telemetry bands before the skin swells.",
        location: "Immediate",
      },
      {
        id: "b-4",
        stepNumber: 4,
        instruction: "Cover with sterile Water-Jel burn dressing from Kit 3",
        detail: "Lay the moist Water-Jel sheet gently over the burn to stop pain and protect against bacteria.",
        equipment: "Water-Jel Burn Dressing",
        location: "Burn Kit 03",
      },
      {
        id: "b-5",
        stepNumber: 5,
        instruction: "Stick heart sensor pads on chest if electrical shock",
        detail: "Electrical shocks require heart rhythm monitoring; attach sensor patches from Diagnostics Box 1.",
        equipment: "Heart Sensor Patches",
        location: "Diagnostics Shelf 01",
      },
    ],
    precautions: [
      "DO NOT pop or peel blisters.",
      "DO NOT pull away clothing that is melted or stuck to the skin.",
      "DO NOT put butter, grease, or non-medical creams on the burn.",
    ],
    spaceSpecificNotes: "Burn fluids do not drain down in space; keep moist dressings clean and taped in place.",
  },

  decompression: {
    category: "decompression",
    label: "Action Plan: Cabin Pressure Drop & Suit Issues",
    defaultSeverity: "CRITICAL",
    keywords: [
      "decompression",
      "pressure drop",
      "cabin leak",
      "suit leak",
      "the bends",
      "joint pain after eva",
      "airlock pressure",
      "hypobaric",
      "barotrauma",
      "altitude sickness",
    ],
    symptomLabels: {
      decompression: "Air Pressure Drop Reported",
      "cabin leak": "Compartment Air Leak",
      "the bends": "Joint Pain After Spacewalk (EVA)",
    },
    spokenTemplate: (crewName) => {
      const subject = crewName ? crewName : "the crew member";
      return `Heard: Cabin pressure issue or spacewalk joint pain for ${subject}. Here is what to do right now. Put on the tight 100 percent oxygen mask immediately. Keep ${subject} resting completely without moving around. Contact Earth Mission Control on the radio for airlock repressurization steps.`;
    },
    immediateActions: [
      {
        id: "d-1",
        stepNumber: 1,
        instruction: "Put on 100% tight-seal Oxygen mask immediately",
        detail: "Breathe pure oxygen at high flow to wash out nitrogen bubbles from blood and joints.",
        equipment: "High-Flow Oxygen Mask",
        location: "Airlock Medical Console",
      },
      {
        id: "d-2",
        stepNumber: 2,
        instruction: "Keep astronaut resting completely still (No Exercise)",
        detail: "Strap the crew member into their bunk; moving muscles causes nitrogen bubbles to grow.",
        location: "Crew Berth",
      },
      {
        id: "d-3",
        stepNumber: 3,
        instruction: "Give water and electrolyte pouch to drink",
        detail: "Have them sip electrolyte fluid slowly to keep blood flowing smoothly.",
        equipment: "Electrolyte Water Pouch",
        location: "Galley / Medical Pack",
      },
      {
        id: "d-4",
        stepNumber: 4,
        instruction: "If compartment air leak: seal the bulkhead hatch",
        detail: "Locate where pressure is dropping, exit the module, and latch the pressure hatch shut.",
        location: "Airlock / Bulkhead Hatch",
      },
      {
        id: "d-5",
        stepNumber: 5,
        instruction: "Open direct radio channel to Flight Surgeon",
        detail: "Report joint pain severity and follow Ground Control instructions for airlock pressure increase.",
        location: "Comms Console",
      },
    ],
    precautions: [
      "DO NOT take off the 100% oxygen mask until the Flight Surgeon on Earth says it is safe.",
      "DO NOT allow the astronaut to walk, cycle, or exercise.",
    ],
    spaceSpecificNotes: "Nitrogen bubbles behave unpredictably in weightlessness; complete physical rest is essential.",
  },

  general: {
    category: "general",
    label: "Action Plan: General Medical Assistance",
    defaultSeverity: "MODERATE",
    keywords: [
      "emergency",
      "help",
      "sick",
      "dizzy",
      "severe pain",
      "nausea",
      "vomiting",
      "fever",
      "weakness",
      "disoriented",
      "abdominal pain",
      "allergic",
      "reaction",
    ],
    symptomLabels: {
      dizzy: "Dizziness / Vertigo Reported",
      "severe pain": "Pain / Discomfort Reported",
      nausea: "Space Sickness / Nausea",
      vomiting: "Vomiting / Emesis",
      allergic: "Allergic Reaction / Itching",
    },
    spokenTemplate: (crewName) => {
      const subject = crewName ? crewName : "the crew member";
      return `Heard: Health distress for ${subject}. Here is what to do right now. Help ${subject} into a comfortable strapped resting position on the medical bunk. Clip the oxygen and pulse sensor to their finger, and keep an emesis bag ready. Earth Flight Surgeon is alerted.`;
    },
    immediateActions: [
      {
        id: "g-1",
        stepNumber: 1,
        instruction: "Help astronaut into a comfortable resting position and strap waist",
        detail: "Fasten waist belt to medical berth so they feel secure and do not float.",
        location: "Medical Bay Crew Berth",
      },
      {
        id: "g-2",
        stepNumber: 2,
        instruction: "Clip pulse & oxygen sensor to their finger",
        detail: "Check heart rate and oxygen level on the medical screen.",
        equipment: "Finger Pulse Clip",
        location: "Diagnostics Shelf 01",
      },
      {
        id: "g-3",
        stepNumber: 3,
        instruction: "Keep a sealed sickness (emesis) bag within arm's reach",
        detail: "If feeling nauseous, have an absorbent bag ready so vomit does not enter cabin air.",
        equipment: "Sealed Emesis Bag",
        location: "Medical Supply Pocket",
      },
      {
        id: "g-4",
        stepNumber: 4,
        instruction: "Check forehead temperature with infrared thermometer",
        detail: "Hold scanner 1 inch from forehead to check if they have a fever.",
        equipment: "Forehead Thermometer",
        location: "Diagnostics Shelf 01",
      },
      {
        id: "g-5",
        stepNumber: 5,
        instruction: "Notify Flight Surgeon on Earth via Comms",
        detail: "Open channel to Mission Control so flight doctor can review vitals and speak with crew.",
        location: "Comms Console",
      },
    ],
    precautions: [
      "Always catch any vomit in sealed emesis bags immediately; floating particles are hazardous.",
      "DO NOT give prescription drugs without Flight Surgeon clearance.",
    ],
    spaceSpecificNotes: "Space Motion Sickness is very common; dim the cabin lights and keep the head stationary.",
  },
};

/** Preset quick cards for the UI chips. */
export const emergencyPresets = [
  { id: "cardiac", label: "Chest Pain", icon: "heart", category: "cardiac" as EmergencyCategory },
  { id: "respiratory", label: "Breathing / Choking", icon: "wind", category: "respiratory" as EmergencyCategory },
  { id: "trauma", label: "Bleeding / Injury", icon: "bandage", category: "trauma" as EmergencyCategory },
  { id: "unconscious", label: "Unresponsive / Faint", icon: "activity", category: "unconscious" as EmergencyCategory },
  { id: "toxic", label: "Smoke / Chemical Leak", icon: "alert", category: "toxic" as EmergencyCategory },
  { id: "seizure", label: "Shaking / Seizure", icon: "zap", category: "seizure" as EmergencyCategory },
  { id: "burn", label: "Burns / Shock", icon: "flame", category: "burn" as EmergencyCategory },
  { id: "decompression", label: "Cabin Pressure Drop", icon: "shield", category: "decompression" as EmergencyCategory },
];

/** Primary interpretation function: takes raw speech and returns practical astronaut action plan. */
export function interpretEmergency(
  transcript: string,
  fallbackCrewName?: string | null,
): EmergencyInterpretation {
  const text = normalize(transcript);
  const affectedCrewName = extractCrewMember(transcript, fallbackCrewName);

  if (!text) {
    return getPresetInterpretation("general", affectedCrewName);
  }

  // Score each category based on keyword matches
  let bestCategory: EmergencyCategory = "general";
  let maxScore = 0;
  const detectedSymptoms: string[] = [];

  const categoryKeys = Object.keys(PROTOCOLS) as EmergencyCategory[];

  for (const cat of categoryKeys) {
    const proto = PROTOCOLS[cat];
    let catScore = 0;

    for (const kw of proto.keywords) {
      const normalizedKw = normalize(kw);
      if (` ${text} `.includes(` ${normalizedKw} `) || text === normalizedKw) {
        const weight = normalizedKw.split(" ").length >= 2 ? 3 : 1.5;
        catScore += weight;

        const symptomLabel = proto.symptomLabels[kw] || kw.charAt(0).toUpperCase() + kw.slice(1);
        if (!detectedSymptoms.includes(symptomLabel)) {
          detectedSymptoms.push(symptomLabel);
        }
      }
    }

    if (catScore > maxScore) {
      maxScore = catScore;
      bestCategory = cat;
    }
  }

  if (maxScore === 0) {
    bestCategory = "general";
    detectedSymptoms.push("Health Distress Reported");
  }

  const proto = PROTOCOLS[bestCategory];
  const severity = proto.defaultSeverity;
  const spokenSummary = proto.spokenTemplate(affectedCrewName, detectedSymptoms);

  return {
    id: `eval-${Date.now()}`,
    category: bestCategory,
    categoryLabel: proto.label,
    severity,
    affectedCrewName,
    confidence: maxScore > 0 ? Math.min(0.98, 0.75 + maxScore * 0.08) : 0.65,
    detectedSymptoms,
    spokenSummary,
    immediateActions: proto.immediateActions.map((action) => ({ ...action, completed: false })),
    precautions: proto.precautions,
    spaceSpecificNotes: proto.spaceSpecificNotes,
    timestamp: new Date().toISOString(),
  };
}

/** Returns a fully populated interpretation from a category preset. */
export function getPresetInterpretation(
  category: EmergencyCategory,
  crewName?: string | null,
): EmergencyInterpretation {
  const proto = PROTOCOLS[category] || PROTOCOLS.general;
  const symptoms = Object.values(proto.symptomLabels).slice(0, 2);
  const spokenSummary = proto.spokenTemplate(crewName ?? null, symptoms);

  return {
    id: `preset-${category}-${Date.now()}`,
    category,
    categoryLabel: proto.label,
    severity: proto.defaultSeverity,
    affectedCrewName: crewName ?? null,
    confidence: 1.0,
    detectedSymptoms: symptoms,
    spokenSummary,
    immediateActions: proto.immediateActions.map((action) => ({ ...action, completed: false })),
    precautions: proto.precautions,
    spaceSpecificNotes: proto.spaceSpecificNotes,
    timestamp: new Date().toISOString(),
  };
}
