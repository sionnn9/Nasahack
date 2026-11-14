"use client";

import type { Lane, Quality } from "@/lib/types";
import { metricMeta } from "@/lib/metrics";
import type { Metric } from "@/lib/types";

export type ChartPoint = {
  value: number | null;
  at: string;
  lane: Lane;
  quality: Quality;
};

const laneColors: Record<Lane, string> = {
  manual: "var(--blue)",
  live: "var(--accent)",
  replay: "var(--lavender)",
  synthetic: "var(--muted)",
};

const WIDTH = 640;
const DEFAULT_HEIGHT = 150;

/**
 * Single-lane chart. Gaps stay gaps: a missing or rejected value breaks the
 * line, it is never interpolated. A lane filter keeps lanes from merging.
 */
export function MetricChart({
  points,
  metric,
  band,
  height = DEFAULT_HEIGHT,
  label,
}: {
  points: ChartPoint[];
  metric: Metric;
  band?: { low: number; high: number } | null;
  height?: number;
  label: string;
}) {
  const usable = points.filter(
    (point) => point.value !== null && point.quality === "ok",
  );
  if (points.length === 0) {
    return <p className="chart-empty">No readings yet. Nothing is inferred.</p>;
  }

  const values = usable.map((point) => point.value as number);
  if (band) values.push(band.low, band.high);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const padding = (max - min || 1) * 0.12;
  const low = min - padding;
  const high = max + padding;
  const plotHeight = height - 42;
  const lane = points[0]?.lane ?? "live";

  const x = (index: number) =>
    points.length === 1 ? WIDTH / 2 : (index / (points.length - 1)) * (WIDTH - 24) + 12;
  const y = (value: number) => 12 + plotHeight - ((value - low) / (high - low)) * plotHeight;

  const segments: Array<Array<{ x: number; y: number }>> = [];
  let current: Array<{ x: number; y: number }> = [];
  points.forEach((point, index) => {
    if (point.value === null || point.quality !== "ok") {
      if (current.length > 0) segments.push(current);
      current = [];
      return;
    }
    current.push({ x: x(index), y: y(point.value) });
  });
  if (current.length > 0) segments.push(current);

  const first = points[0];
  const last = points[points.length - 1];
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-GB", {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <figure className="metric-chart" style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label={`${label}. ${usable.length} usable ${metricMeta[metric].label.toLowerCase()} points. Gaps are gaps.`}
        preserveAspectRatio="none"
      >
        {band && (
          <rect
            x={0}
            y={y(band.high)}
            width={WIDTH}
            height={Math.max(2, y(band.low) - y(band.high))}
            fill={laneColors[lane]}
            opacity={0.09}
          />
        )}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={0}
            x2={WIDTH}
            y1={12 + plotHeight * ratio}
            y2={12 + plotHeight * ratio}
            stroke="var(--line)"
            strokeDasharray="3 6"
          />
        ))}
        {segments.map((segment, index) =>
          segment.length === 1 ? (
            <circle
              key={index}
              cx={segment[0].x}
              cy={segment[0].y}
              r={3}
              fill={laneColors[lane]}
            />
          ) : (
            <polyline
              key={index}
              points={segment.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke={laneColors[lane]}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ),
        )}
        {points.map((point, index) => (
          <g key={`${point.at}-${index}`}>
            <title>
              {point.value === null
                ? `No usable reading · ${formatTime(point.at)} UTC`
                : `${point.value} ${metricMeta[metric].unit} · ${formatTime(point.at)} UTC · ${point.lane} · ${point.quality}`}
            </title>
            {point.value !== null && point.quality === "ok" ? (
              <circle
                cx={x(index)}
                cy={y(point.value)}
                r={2.4}
                fill={laneColors[lane]}
                opacity={0.9}
              />
            ) : (
              <circle cx={x(index)} cy={height - 30} r={1.6} fill="var(--muted)" opacity={0.5} />
            )}
          </g>
        ))}
      </svg>
      <figcaption className="chart-caption">
        <span>
          {metricMeta[metric].label} · {formatTime(first.at)}–{formatTime(last.at)} UTC
        </span>
        <span>
          {band
            ? `Shaded band: your recent ${band.low.toFixed(metricMeta[metric].precision)}–${band.high.toFixed(metricMeta[metric].precision)} ${metricMeta[metric].unit}`
            : "No personal band yet (fewer than 5 comparable readings)"}
        </span>
      </figcaption>
    </figure>
  );
}

export function ChartLegend() {
  return (
    <ul className="chart-legend" aria-label="Data lane legend">
      {(["live", "manual", "replay", "synthetic"] as Lane[]).map((lane) => (
        <li key={lane}>
          <span className={`legend-swatch lane-${lane}`} aria-hidden="true" />
          {lane === "live"
            ? "Live sensor"
            : lane === "manual"
              ? "Manual"
              : lane === "replay"
                ? "Replay"
                : "Synthetic"}
        </li>
      ))}
      <li>
        <span className="legend-gap" aria-hidden="true" /> Gap = no usable reading
      </li>
    </ul>
  );
}
