"use client";

import { useState } from "react";
import { ShieldQuestion } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { metricMeta, methodLabels, contextLabels } from "@/lib/metrics";
import { isLateEntry } from "@/lib/quality/gate";
import type { Observation, Quality } from "@/lib/types";

const qualityText: Record<Quality, string> = {
  ok: "Usable",
  no_contact: "Not enough sensor contact",
  stale: "Old reading, not current",
  out_of_range: "Outside the plausible sensor range",
  motion: "Movement spoiled this reading",
  not_measured: "Nothing measured",
};

const qualityAction: Record<Quality, string> = {
  ok: "No action needed. Keep the sensor in place.",
  no_contact: "Check the sensor contact and try again.",
  stale: "Take a new reading if you need a current number.",
  out_of_range: "Repeat the measurement before using this number.",
  motion: "Sit still and repeat the measurement.",
  not_measured: "Measure it, or record that you were unable to.",
};

const laneText = {
  manual: "Manual entry",
  live: "Live sensor",
  replay: "Replay (ground file)",
  synthetic: "Synthetic demo data",
} as const;

export function formatClock(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TrustRing({
  observation,
  size = 22,
}: {
  observation: Observation | null;
  size?: number;
}) {
  const [open, setOpen] = useState(false);
  if (!observation) {
    return (
      <span className="trust-ring trust-empty" aria-label="No observation">
        <ShieldQuestion aria-hidden="true" />
      </span>
    );
  }

  const quality = observation.quality;
  const late = isLateEntry(observation);

  return (
    <>
      <button
        type="button"
        className={`trust-ring quality-${quality} lane-${observation.lane}`}
        style={{ width: size, height: size }}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Why can't I trust this number? ${metricMeta[observation.metric].label}, ${qualityText[quality]}, ${laneText[observation.lane]}`}
      >
        <span className="trust-ring-core" aria-hidden="true" />
      </button>

      {open && (
        <BottomSheet
          title="Why can't I trust this number?"
          subtitle={`${metricMeta[observation.metric].label} · ${qualityText[quality]}`}
          onClose={() => setOpen(false)}
        >
          <dl className="trust-details">
            <div>
              <dt>How this number was produced</dt>
              <dd>{laneText[observation.lane]}</dd>
            </div>
            <div>
              <dt>Method</dt>
              <dd>{methodLabels[observation.method] ?? observation.method}</dd>
            </div>
            <div>
              <dt>Measured at</dt>
              <dd>{formatClock(observation.observedAt)} UTC</dd>
            </div>
            <div>
              <dt>Entered at</dt>
              <dd>
                {formatClock(observation.enteredAt)} UTC
                {late && (
                  <span className="trust-note">
                    {" "}
                    Entered later than measured. Judged by the measured time.
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt>Context</dt>
              <dd>{contextLabels[observation.context]}</dd>
            </div>
            <div>
              <dt>Quality</dt>
              <dd>
                {observation.qualityReason ?? qualityText[quality]}
              </dd>
            </div>
            <div>
              <dt>What to do</dt>
              <dd>{qualityAction[quality]}</dd>
            </div>
          </dl>
          <p className="disclaimer-line">
            Sensor checks only. This is not a diagnosis and not a substitute for
            medical review.
          </p>
        </BottomSheet>
      )}
    </>
  );
}
