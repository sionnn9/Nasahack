import { describe, expect, it } from "vitest";
import { parseBedRestCsv, parseDuration } from "@/lib/replay/csv";

const csv = `Subject,Day,Phase,Sleep Duration,Heart Rate,Activity
P01,1,pre,7:44:00,62,0.21
P01,2,bedrest,No Data,58,0.04
P02,1,bedrest,6:40:00,60,0.03`;

describe("bed-rest replay parser", () => {
  it("reads 7:44:00 as 464 minutes, not 7.44 hours", () => {
    expect(parseDuration("7:44:00")).toBeCloseTo(464);
    expect(parseDuration("6:40:00")).toBeCloseTo(400);
  });

  it("keeps 'No Data' as missing", () => {
    expect(parseDuration("No Data")).toBeNull();
    const { rows } = parseBedRestCsv(csv);
    const missing = rows.find((row) => row.metric === "sleep_minutes" && row.day === 2);
    expect(missing?.value).toBeNull();
  });

  it("keeps phase and bed-rest day and three participants", () => {
    const { rows } = parseBedRestCsv(csv);
    expect(rows.some((row) => row.phase === "bedrest")).toBe(true);
    expect(rows.find((row) => row.metric === "heart_rate" && row.day === 1)?.value).toBe(62);
    expect(new Set(rows.map((row) => row.participant)).size).toBe(2);
  });
});
