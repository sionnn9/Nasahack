"use client";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { hazardFor } from "@/lib/mission-config";
import { equipmentLabels } from "@/lib/mission-config";
import type { ReadingDefinition } from "@/lib/readings";

export function MeasureGuide({
  reading,
  onClose,
  onUnable,
}: {
  reading: ReadingDefinition;
  onClose: () => void;
  onUnable: () => void;
}) {
  const guide = reading.guide;
  return (
    <BottomSheet
      title={`How to measure: ${reading.name}`}
      subtitle="ILLUSTRATIVE STEPS — NOT CLINICALLY REVIEWED"
      onClose={onClose}
    >
      <section className="guide-block">
        <h3>What it measures</h3>
        <p>{guide.whatItMeasures}</p>
      </section>
      <section className="guide-block">
        <h3>Equipment</h3>
        <p>
          {guide.equipment.length === 0
            ? "Nothing needed."
            : guide.equipment.map((key) => equipmentLabels[key]).join(", ")}
        </p>
      </section>
      <section className="guide-block">
        <h3>Steps</h3>
        <ol>
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      <section className="guide-block">
        <h3>Why it matters in spaceflight</h3>
        <p>{guide.whyInSpaceflight}</p>
      </section>
      <section className="guide-block">
        <h3>Related hazards</h3>
        <div className="concern-hazards">
          {guide.hazards.map((hazard) => (
            <span className="hazard-tag" key={hazard} title={hazardFor(hazard).plain}>
              {hazardFor(hazard).label}
            </span>
          ))}
        </div>
      </section>
      <section className="guide-block">
        <h3>When to tell the crew or Earth</h3>
        <p>{guide.whenToTell}</p>
      </section>
      <section className="guide-block">
        <h3>What to record</h3>
        <p>{guide.whatToRecord}</p>
      </section>
      <div className="sheet-actions">
        <button type="button" className="secondary-button" onClick={onUnable}>
          Unable to measure
        </button>
        <button type="button" className="primary-button" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="disclaimer-line">
        Demo guide. Follow the crew medical officer&apos;s instructions on board.
      </p>
    </BottomSheet>
  );
}
