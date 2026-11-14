"use client";

import { bodyAreas } from "@/lib/mission-config";
import type { BodyArea, StatusState } from "@/lib/types";

export { Particles } from "./particles";

export type BodyMapMode = "status" | "coverage";

function BodyMap({
  selected,
  labels,
  onSelect,
  mode = "status",
  statuses = {},
}: {
  selected: BodyArea;
  labels: Partial<Record<BodyArea, string[]>>;
  onSelect: (area: BodyArea) => void;
  mode?: BodyMapMode;
  statuses?: Partial<Record<BodyArea, StatusState>>;
}) {
  const points: Record<Exclude<BodyArea, "Radiation">, [number, number]> = {
    Head: [160, 48],
    Heart: [170, 123],
    Arm: [94, 151],
    Skin: [148, 112],
    Abdomen: [160, 178],
    Legs: [163, 279],
  };
  const callouts: Record<
    Exclude<BodyArea, "Radiation">,
    {
      x: number;
      y: number;
      textX: number;
      textY: number;
      side: "left" | "right";
    }
  > = {
    Head: { x: 235, y: 42, textX: 243, textY: 38, side: "right" },
    Heart: { x: 235, y: 123, textX: 243, textY: 127, side: "right" },
    Arm: { x: 12, y: 151, textX: 4, textY: 147, side: "left" },
    Skin: { x: 235, y: 100, textX: 243, textY: 103, side: "right" },
    Abdomen: { x: 235, y: 184, textX: 243, textY: 188, side: "right" },
    Legs: { x: 235, y: 279, textX: 243, textY: 283, side: "right" },
  };
  const physicalAreas = bodyAreas.filter(
    (area): area is Exclude<BodyArea, "Radiation"> => area !== "Radiation",
  );

  return (
    <svg
      className="body-svg"
      viewBox="0 0 440 350"
      role="img"
      aria-label="Body map. Select a body area to see its readings."
    >
      <ellipse cx="160" cy="326" rx="72" ry="12" fill="var(--shadow)" />
      <g stroke="var(--body-line)" strokeWidth="2" strokeLinejoin="round">
        <circle cx="160" cy="42" r="28" fill="#f2d8c7" />
        <path
          d="M139 75 Q160 66 181 75 L198 91 221 169 Q223 181 210 184 L192 136 192 222 128 222 128 136 110 184 Q97 181 99 169 L122 91Z"
          fill="#dcefe9"
        />
        <path
          d="M128 222 L125 310 Q124 326 139 326 L152 326 158 236 164 236 170 326 184 326 Q198 325 195 310 L192 222Z"
          fill="#d9e4f5"
        />
        <path
          d="M147 97 Q160 87 173 97 L172 127 Q160 137 148 127Z"
          fill="#baded5"
          stroke="none"
        />
        <path
          d="M155 101 C142 94 141 111 160 121 C179 111 177 94 165 101 L160 105Z"
          fill="#ed8d7c"
          stroke="none"
        />
        <path
          d="M143 145 Q160 139 177 145 L175 182 Q160 190 145 182Z"
          fill="#f4dfc7"
          stroke="none"
        />
        <path d="M138 220 L182 220" fill="none" stroke="#a7cfc2" />
      </g>

      {physicalAreas.map((area) => {
        const [x, y] = points[area];
        const callout = callouts[area];
        const isSelected = selected === area;
        const values = labels[area] ?? ["Not entered yet"];
        const status = statuses[area] ?? "insufficient_history";
        const statusClass =
          mode === "coverage"
            ? status === "insufficient_history" || status === "logged"
              ? "coverage-missing"
              : "coverage-assessed"
            : `hotspot-${status}`;
        const lineStartX = callout.side === "left" ? 82 : x + 8;
        const lineEndX = callout.side === "left" ? 92 : callout.x;

        return (
          <g key={area}>
            <line
              x1={lineStartX}
              y1={y}
              x2={lineEndX}
              y2={callout.y}
              stroke="var(--muted)"
              strokeWidth="0.8"
            />
            <text
              x={callout.textX}
              y={callout.textY}
              className="body-reading-label"
              textAnchor={callout.side === "left" ? "start" : "start"}
            >
              <tspan>{values[0]}</tspan>
              {values.slice(1, 2).map((value) => (
                <tspan key={value} x={callout.textX} dy="13">
                  {value}
                </tspan>
              ))}
            </text>
            <g
              onClick={() => onSelect(area)}
              className={`body-hotspot ${statusClass}`}
              role="button"
              tabIndex={0}
              aria-label={`Select ${area}: ${values.join(", ")}. ${
                mode === "coverage"
                  ? status === "insufficient_history" || status === "logged"
                    ? "Not assessed."
                    : "Assessed."
                  : `Status: ${status.replace(/_/g, " ")}.`
              }`}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(area);
                }
              }}
            >
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 17 : 11}
                fill={isSelected ? "var(--accent)" : "var(--surface)"}
                fillOpacity={isSelected ? 0.25 : 0.85}
                stroke={isSelected ? "var(--accent)" : "var(--muted)"}
                strokeWidth={isSelected ? 3 : 1.5}
              />
              <circle cx={x} cy={y} r="3" className="hotspot-core" />
            </g>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({
  values,
  color = "var(--accent)",
  tall = false,
  label = "Simulated readings over time",
}: {
  values: Array<number | null>;
  color?: string;
  tall?: boolean;
  label?: string;
}) {
  const validValues = values.filter((value): value is number => value !== null);
  const min = validValues.length ? Math.min(...validValues) : 0;
  const max = validValues.length ? Math.max(...validValues) : 1;
  const spread = Math.max(max - min, 1);
  const points = values.map((value, index) =>
    value === null
      ? null
      : {
          x: values.length < 2 ? 300 : (index / (values.length - 1)) * 600,
          y: 120 - ((value - min) / spread) * 90,
        },
  );
  const segments: string[] = [];
  let segment = "";
  points.forEach((point) => {
    if (!point) {
      if (segment) segments.push(segment);
      segment = "";
      return;
    }

    segment += `${segment ? " L" : "M"}${point.x},${point.y}`;
  });
  if (segment) segments.push(segment);

  return (
    <svg
      className={`line-chart ${tall ? "chart-tall" : ""}`}
      viewBox="0 0 600 140"
      role="img"
      aria-label={label}
    >
      {[25, 60, 95, 130].map((y) => (
        <line
          key={y}
          x1="0"
          x2="600"
          y1={y}
          y2={y}
          stroke="var(--line)"
          strokeDasharray="3 6"
        />
      ))}
      {segments.map((path, index) => (
        <path
          key={index}
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

export { BodyMap, LineChart };
