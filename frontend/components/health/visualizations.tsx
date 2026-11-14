"use client";

import { useEffect, useState } from "react";
import { bodyAreas, type BodyArea } from "./health-data";

function Particles() {
  const [dots, setDots] = useState<
    Array<{ x: number; y: number; r: number; d: number; h: number }>
  >([]);

  useEffect(() => {
    const count = window.innerWidth < 600 ? 35 : 60;
    setDots(
      Array.from({ length: count }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        r: Math.random() * 2 + 1,
        d: Math.random() * 8 + 4,
        h: Math.random(),
      })),
    );
  }, []);

  return (
    <div className="stars" aria-hidden="true">
      {dots.map((dot, index) => (
        <i
          key={index}
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: dot.r,
            height: dot.r,
            animationDuration: `${dot.d}s`,
            opacity: 0.2 + dot.h * 0.45,
          }}
        />
      ))}
    </div>
  );
}

function BodyMap({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (area: BodyArea) => void;
}) {
  const points: Record<BodyArea, [number, number]> = {
    Head: [160, 48],
    Heart: [170, 123],
    Skin: [148, 112],
    Arm: [94, 151],
    Abdomen: [160, 178],
    Legs: [163, 279],
  };

  return (
    <svg
      className="body-svg"
      viewBox="0 0 320 350"
      role="img"
      aria-label="Illustration of a body. Choose a body area to see its readings"
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

      {bodyAreas.map((area) => {
        const [x, y] = points[area];
        const isSelected = selected === area;

        return (
          <g
            key={area}
            onClick={() => onSelect(area)}
            className="body-hotspot"
            role="button"
            tabIndex={0}
            aria-label={`Select ${area}`}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
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
            <circle cx={x} cy={y} r="3" fill="var(--accent)" />
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({
  color = "var(--accent)",
  tall = false,
}: {
  color?: string;
  tall?: boolean;
}) {
  const yValues = [25, 60, 95, 130];
  const xValues = [0, 68, 131, 198, 270, 332, 394, 459, 526, 600];
  const yCoords = [95, 80, 69, 64, 67, 57, 50, 42, 48, 43];

  return (
    <svg
      className={`line-chart ${tall ? "chart-tall" : ""}`}
      viewBox="0 0 600 140"
      role="img"
      aria-label="Simulated readings over time"
    >
      {yValues.map((y) => (
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
      <path
        d="M0 95 C28 86 38 72 68 80 S103 91 131 69 S166 78 198 64 S242 82 270 67 S306 46 332 57 S366 72 394 50 S430 62 459 42 S496 68 526 48 S565 34 600 43"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {xValues.map((x, index) => (
        <circle
          key={`${x}-${index}`}
          cx={x}
          cy={yCoords[index]}
          r="3.5"
          fill={color}
        />
      ))}
    </svg>
  );
}

export { Particles, BodyMap, LineChart };
