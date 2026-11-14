"use client";

import { useState } from "react";
import { hazards } from "@/lib/mission-config";
import type { HazardTag } from "@/lib/types";

/** The five NASA hazard categories, linked to the indicators they touch. */
export function HazardStrip({ highlight = [] }: { highlight?: HazardTag[] }) {
  const [open, setOpen] = useState<HazardTag | null>(null);

  return (
    <section className="hazard-strip" aria-label="NASA hazard categories">
      <h2 className="section-title">Mission hazards</h2>
      <ul>
        {hazards.map((hazard) => {
          const active = highlight.includes(hazard.key);
          return (
            <li key={hazard.key}>
              <button
                type="button"
                className={`hazard-chip ${active ? "highlight" : ""}`}
                aria-expanded={open === hazard.key}
                onClick={() => setOpen(open === hazard.key ? null : hazard.key)}
              >
                {hazard.label}
              </button>
              {open === hazard.key && (
                <p className="hazard-plain">
                  {hazard.plain}{" "}
                  <span className="hazard-metrics">
                    Related: {hazard.metrics.map((metric) => metric.replace(/_/g, " ")).join(", ")}
                  </span>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
