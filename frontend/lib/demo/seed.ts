import { missionConfig } from "@/lib/mission-config";
import type { Observation } from "@/lib/types";

/**
 * Demo history so personal comparisons have something honest to compare with.
 * Every seeded row carries a lane. These are scenario values, not real vitals.
 */
function base(crewId: string, metric: Observation["metric"], unit: string) {
  return {
    crewId,
    metric,
    unit,
    lane: "live" as const,
    quality: "ok" as const,
    qualityReason: null,
    environment: "mars_transit",
    procedureVersion: "demo-seed-1",
  };
}

export function seedObservations(now: Date = new Date()): Observation[] {
  const rows: Observation[] = [];

  for (const member of missionConfig.crew) {
    const drift = member.id === "alex-morgan";
    const seedSleepDrop = member.id === "samira-patel";

    for (let day = 13; day >= 0; day -= 1) {
      const date = new Date(now);
      date.setUTCDate(date.getUTCDate() - day);
      date.setUTCHours(7, 30, 0, 0);
      const iso = date.toISOString();
      const wave = Math.sin((day / 13) * Math.PI * 2) * 2;
      const rising = drift && day <= 2 ? 8 - day : 0;

      const heartRate = Math.round(member.restingHeartRate + wave + rising);
      const sleepBase = seedSleepDrop && day <= 2 ? 290 - (2 - day) * 15 : 430 + wave * 8;
      const stress = drift && day <= 2 ? 4 : 2 + (day % 3 === 0 ? 1 : 0);
      const moodValue = drift && day <= 2 ? 2 : 4;
      const skinTemp = Number((33.9 + wave * 0.02).toFixed(1));
      const systolic = Math.round(116 + wave);
      const diastolic = Math.round(75 + wave / 2);

      rows.push(
        {
          ...base(member.id, "heart_rate", "bpm"),
          id: `seed-${member.id}-hr-${day}`,
          value: heartRate,
          observedAt: iso,
          enteredAt: iso,
          method: "ppg_wrist",
          context: "rest",
        },
        {
          ...base(member.id, "skin_temp", "°C"),
          id: `seed-${member.id}-temp-${day}`,
          value: skinTemp,
          observedAt: iso,
          enteredAt: iso,
          method: "thermometer_skin",
          context: "rest",
        },
        {
          ...base(member.id, "sleep_minutes", "min"),
          id: `seed-${member.id}-sleep-${day}`,
          value: Math.round(sleepBase),
          observedAt: iso,
          enteredAt: iso,
          lane: "manual",
          method: "self_report",
          context: "unknown",
        },
        {
          ...base(member.id, "stress", "/5"),
          id: `seed-${member.id}-stress-${day}`,
          value: stress,
          observedAt: iso,
          enteredAt: iso,
          lane: "manual",
          method: "self_report",
          context: "unknown",
        },
        {
          ...base(member.id, "mood", "/5"),
          id: `seed-${member.id}-mood-${day}`,
          value: moodValue,
          observedAt: iso,
          enteredAt: iso,
          lane: "manual",
          method: "self_report",
          context: "unknown",
        },
      );

      // Cuff and glucose readings exist only for some days, so history is
      // genuinely uneven and the app has to say "insufficient" sometimes.
      if (day % 2 === 0) {
        rows.push({
          ...base(member.id, "bp_systolic", "mmHg"),
          id: `seed-${member.id}-sys-${day}`,
          value: systolic,
          observedAt: iso,
          enteredAt: iso,
          lane: "manual",
          method: "cuff_upper_arm",
          context: "rest",
        });
        rows.push({
          ...base(member.id, "bp_diastolic", "mmHg"),
          id: `seed-${member.id}-dia-${day}`,
          value: diastolic,
          observedAt: iso,
          enteredAt: iso,
          lane: "manual",
          method: "cuff_upper_arm",
          context: "rest",
        });
      }
      if (day % 3 === 0) {
        rows.push({
          ...base(member.id, "glucose", "mmol/L"),
          id: `seed-${member.id}-glucose-${day}`,
          value: Number((5.2 + wave * 0.1).toFixed(1)),
          observedAt: iso,
          enteredAt: iso,
          lane: "manual",
          method: "glucometer",
          context: "post_meal",
        });
      }
    }
  }

  return rows;
}
