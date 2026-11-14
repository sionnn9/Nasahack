import type { CheckIn } from "@/lib/types";

export type TaskState = "done" | "due" | "overdue" | "upcoming";

export type MissionTask = {
  id: string;
  label: string;
  detail: string;
  dueHourUtc: number;
  state: TaskState;
};

const schedule = [
  { id: "sleep", label: "Sleep log", detail: "Record last night's sleep.", dueHourUtc: 7 },
  { id: "measure", label: "Morning readings", detail: "Heart rate and temperature.", dueHourUtc: 9 },
  { id: "checkin", label: "Daily check-in", detail: "Symptoms, mood and stress.", dueHourUtc: 18 },
];

export function tasksFor(
  crewId: string,
  checkIns: CheckIn[],
  now: Date = new Date(),
): MissionTask[] {
  const today = now.toISOString().slice(0, 10);
  const todays = checkIns.filter(
    (entry) => entry.crewId === crewId && entry.observedAt.slice(0, 10) === today,
  );
  return schedule.map((task) => {
    const done = todays.some((entry) => entry.id.startsWith(`${task.id}-`));
    const hour = now.getUTCHours() + now.getUTCMinutes() / 60;
    const state: TaskState = done
      ? "done"
      : hour > task.dueHourUtc + 2
        ? "overdue"
        : hour >= task.dueHourUtc - 1
          ? "due"
          : "upcoming";
    return { ...task, state };
  });
}

/** Consecutive days with at least one check-in, counting back from today. */
export function checkInStreak(crewId: string, checkIns: CheckIn[], now = new Date()): number {
  const days = new Set(
    checkIns
      .filter((entry) => entry.crewId === crewId)
      .map((entry) => entry.observedAt.slice(0, 10)),
  );
  let streak = 0;
  const cursor = new Date(now);
  for (let index = 0; index < 400; index += 1) {
    const day = cursor.toISOString().slice(0, 10);
    if (!days.has(day)) {
      if (index === 0) {
        cursor.setUTCDate(cursor.getUTCDate() - 1);
        continue;
      }
      break;
    }
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
