"use client";

import { useState } from "react";
import { ChevronDown, Info, PencilLine } from "lucide-react";
import { readings } from "@/lib/readings";
import { formatValue } from "@/lib/metrics";
import {
  dailyTrend,
  lastRecordedText,
  latest,
  statusFor,
} from "@/lib/observations/derived";
import { useStore } from "@/lib/store";
import { LaneBadge, StatusChip } from "@/components/health/status-chip";
import { TrustRing } from "@/components/health/trust-ring";
import { MetricChart } from "@/components/health/metric-chart";
import type { Metric, Observation } from "@/lib/types";

const groupTitles = {
  live: "Live sensors",
  manual: "Entered by you",
  static: "Static data",
} as const;

export function AllReadings({
  crewId,
  observations,
  onManualEntry,
  onOpenGuide,
}: {
  crewId: string;
  observations: Observation[];
  onManualEntry: () => void;
  onOpenGuide: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const privateUnlocked = useStore((state) => state.privateUnlocked);

  return (
    <section className="all-readings" aria-labelledby="all-readings-title">
      <div className="section-head">
        <h2 id="all-readings-title">All readings</h2>
        <button type="button" className="secondary-button" onClick={onManualEntry}>
          <PencilLine aria-hidden="true" /> Add manual reading
        </button>
      </div>

      {(["live", "manual", "static"] as const).map((group) => (
        <div className="reading-group" key={group}>
          <h3 className="reading-group-title">{groupTitles[group]}</h3>
          <ul>
            {readings
              .filter((reading) => reading.group === group)
              .map((reading) => {
                const isPrivate = !!reading.private;
                const locked = isPrivate && !privateUnlocked;
                const observation = reading.metric
                  ? latest(observations.filter((entry) => entry.crewId === crewId), reading.metric)
                  : null;
                const comparison =
                  reading.metric && !locked
                    ? statusFor(observations, crewId, reading.metric)
                    : null;
                const open = expanded === reading.key;
                const value =
                  reading.group === "static"
                    ? "2.4 mSv"
                    : locked
                      ? "Private"
                      : observation
                        ? formatValue(reading.metric as Metric, observation.value)
                        : "—";

                return (
                  <li key={reading.key} className="reading-item">
                    <div className="reading-row">
                      <div className="reading-row-main">
                        <div className="reading-name">
                          <strong>{reading.name}</strong>
                          <span className="reading-source">
                            {reading.group === "static"
                              ? "Dosimeter, read on schedule"
                              : observation
                                ? `Updated ${new Date(observation.observedAt).toLocaleTimeString(
                                    "en-GB",
                                    { timeZone: "UTC", hour: "2-digit", minute: "2-digit" },
                                  )} UTC`
                                : "Nothing recorded"}
                          </span>
                        </div>
                        <div className="reading-value">
                          <b>{value}</b>
                          {observation && !locked && <LaneBadge lane={observation.lane} />}
                        </div>
                      </div>

                      <div className="reading-row-side">
                        {comparison && <StatusChip comparison={comparison} compact />}
                        {!locked && (
                          <TrustRing
                            observation={
                              observation ??
                              (reading.group === "static"
                                ? ({
                                    id: "radiation-static",
                                    crewId,
                                    metric: "skin_temp",
                                    value: 2.4,
                                    unit: "mSv",
                                    observedAt: new Date().toISOString(),
                                    enteredAt: new Date().toISOString(),
                                    lane: "synthetic",
                                    method: "actigraphy",
                                    context: "unknown",
                                    quality: "ok",
                                    qualityReason: null,
                                    environment: "mars_transit",
                                    procedureVersion: "demo",
                                  } as Observation)
                                : null)
                            }
                          />
                        )}
                        <button
                          type="button"
                          className="icon-button"
                          aria-expanded={open}
                          aria-label={`More about ${reading.name}`}
                          onClick={() => setExpanded(open ? null : reading.key)}
                        >
                          <ChevronDown aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {open && (
                      <div className="reading-expanded">
                        <p>
                          <strong>What it is.</strong> {reading.whatItIs}
                        </p>
                        <p>
                          <strong>Tell the crew when.</strong> {reading.tellCrewWhen}
                        </p>
                        {observation && (
                          <p className="reading-last">
                            {lastRecordedText(observation)} Applied status:{" "}
                            {comparison?.label ?? "not compared"}.
                          </p>
                        )}
                        {reading.metric && observation && (
                          <MetricChart
                            points={dailyTrend(
                              observations.filter((entry) => entry.crewId === crewId),
                              reading.metric,
                            )}
                            metric={reading.metric}
                            label={`${reading.name} daily trend`}
                            band={comparison?.range ?? null}
                            height={110}
                          />
                        )}
                        <div className="reading-expanded-actions">
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => onOpenGuide(reading.key)}
                          >
                            <Info aria-hidden="true" /> Measurement guide
                          </button>
                          {reading.metric && (
                            <span className="lane-hint">
                              Lane: {observation?.lane ?? "none"} · Lanes are never merged.
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </section>
  );
}
