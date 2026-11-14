"use client";

import { useState } from "react";
import { Info, ShieldAlert } from "lucide-react";
import {
  areaMetrics,
  dailyTrend,
  latest,
  statusFor,
} from "@/lib/observations/derived";
import { formatValue, metricMeta } from "@/lib/metrics";
import { readingFor } from "@/lib/readings";
import { MetricChart, ChartLegend, type ChartPoint } from "@/components/health/metric-chart";
import { StatusChip } from "@/components/health/status-chip";
import { TrustRing, formatClock } from "@/components/health/trust-ring";
import { useStore } from "@/lib/store";
import type { BodyArea, Metric, Observation } from "@/lib/types";

export function ReadingDetails({
  crewId,
  area,
  observations,
  liveToday,
  onOpenGuide,
}: {
  crewId: string;
  area: BodyArea;
  observations: Observation[];
  liveToday: Partial<Record<Metric, ChartPoint[]>>;
  onOpenGuide: (key: string) => void;
}) {
  const privateUnlocked = useStore((state) => state.privateUnlocked);
  const metrics = areaMetrics[area] ?? [];
  const [headTab, setHeadTab] = useState<"mood" | "sleep_minutes">("mood");

  const shown =
    area === "Head" ? [headTab] : metrics.length > 0 ? metrics : [];

  return (
    <section className="body-card reading-details" aria-labelledby="details-title">
      <header className="details-head">
        <div>
          <span className="eyebrow-line" />
          <h2 id="details-title">{area}</h2>
        </div>
        {area === "Head" && (
          <div className="head-tabs" role="tablist" aria-label="Head readings">
            <button
              type="button"
              role="tab"
              aria-selected={headTab === "mood"}
              onClick={() => setHeadTab("mood")}
            >
              Mood
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={headTab === "sleep_minutes"}
              onClick={() => setHeadTab("sleep_minutes")}
            >
              Sleep
            </button>
          </div>
        )}
      </header>

      {area === "Radiation" ? (
        <div className="details-static">
          <p className="details-value">
            2.4 <small>mSv cumulative</small>
          </p>
          <p>
            Passive dosimeters are read on a schedule. This is not a live measurement and
            cannot be compared with other readings.
          </p>
          <button type="button" className="text-button" onClick={() => onOpenGuide("radiation")}>
            <Info aria-hidden="true" /> Measurement guide
          </button>
        </div>
      ) : (
        shown.map((metric) => (
          <MetricDetail
            key={metric}
            metric={metric}
            crewId={crewId}
            observations={observations}
            liveToday={liveToday}
            locked={
              !!readingFor(metric)?.private && !privateUnlocked
            }
            onOpenGuide={onOpenGuide}
          />
        ))
      )}
    </section>
  );
}

function MetricDetail({
  metric,
  crewId,
  observations,
  liveToday,
  locked,
  onOpenGuide,
}: {
  metric: Metric;
  crewId: string;
  observations: Observation[];
  liveToday: Partial<Record<Metric, ChartPoint[]>>;
  locked: boolean;
  onOpenGuide: (key: string) => void;
}) {
  const meta = metricMeta[metric];
  const newest = latest(
    observations.filter((entry) => entry.crewId === crewId),
    metric,
  );
  const comparison = statusFor(observations, crewId, metric);
  const reading = readingFor(metric);
  const livePoints = liveToday[metric] ?? [];
  const trendPoints = dailyTrend(
    observations.filter((entry) => entry.crewId === crewId),
    metric,
  );
  const [showGuide, setShowGuide] = useState(false);

  if (locked) {
    return (
      <div className="metric-detail locked">
        <h3>{meta.label}</h3>
        <p>Private answer. Unlock it in the wellbeing tile to see the value and trend.</p>
      </div>
    );
  }

  return (
    <div className="metric-detail">
      <div className="metric-head">
        <div>
          <h3>{meta.label}</h3>
          <p className="metric-sub">{reading?.whatItIs}</p>
        </div>
        <div className="metric-head-side">
          <span className="details-value">
            {newest ? formatValue(metric, newest.value) : "—"}
          </span>
          <TrustRing observation={newest} />
        </div>
      </div>

      <div className="metric-row">
        <StatusChip comparison={comparison} />
        {newest && (
          <span className="metric-method">
            {newest.lane} · measured {formatClock(newest.observedAt)} UTC
          </span>
        )}
      </div>

      <div className="metric-charts">
        <div>
          <h4>Today (live)</h4>
          <MetricChart
            points={livePoints.length > 0 ? livePoints : trendPoints.slice(-1)}
            metric={metric}
            band={comparison.range}
            label={`${meta.label} today`}
            height={130}
          />
        </div>
        <div>
          <h4>14-day trend (daily)</h4>
          <MetricChart
            points={trendPoints}
            metric={metric}
            band={comparison.range}
            label={`${meta.label} 14 day trend`}
            height={130}
          />
        </div>
      </div>

      <ChartLegend />

      <div className="metric-foot">
        <p>
          <strong>Tell the crew when.</strong> {reading?.tellCrewWhen}
        </p>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setShowGuide((value) => !value);
            onOpenGuide(reading?.key ?? "");
          }}
        >
          <Info aria-hidden="true" /> Measurement guide
        </button>
      </div>

      {comparison.state === "attention" && (
        <p className="metric-attention">
          <ShieldAlert aria-hidden="true" /> Differs from your recent readings. This is a
          prompt to check, not a diagnosis.
        </p>
      )}
      {showGuide && null}
    </div>
  );
}
