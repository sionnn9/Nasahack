"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, CornerUpLeft, ShieldAlert, Volume2 } from "lucide-react";
import { ManualEntry } from "@/components/health/manual-entry";
import {
  advance,
  equipmentMissing,
  optionsFor,
  pathwayStep,
  reassessRemainingMs,
  startPathway,
  type RunnerState,
} from "@/lib/pathways/runner";
import { pathwayById } from "@/lib/pathways";
import { buildEncounter } from "@/lib/encounters/build";
import { missionConfig } from "@/lib/mission-config";
import { useStore } from "@/lib/store";
import type { CheckIn, Encounter } from "@/lib/types";

function elapsed(startedAt: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

export function PathwayRunner({
  crewId,
  pathwayId,
  encounterId,
  drill = false,
  symptoms = [],
}: {
  crewId: string;
  pathwayId: string;
  encounterId?: string | null;
  drill?: boolean;
  symptoms?: CheckIn["symptoms"];
}) {
  const router = useRouter();
  const pathway = pathwayById(pathwayId);
  const saveEncounter = useStore((state) => state.saveEncounter);
  const notify = useStore((state) => state.notify);
  const [state, setState] = useState<RunnerState | null>(() =>
    pathway ? startPathway(pathway) : null,
  );
  const [manualOpen, setManualOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [savedEncounter, setSavedEncounter] = useState<Encounter | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!state || !pathway) return;
    if (state.mode !== "done" && state.mode !== "emergency") return;
    if (savedEncounter) return;
    const encounter = buildEncounter(state, crewId, symptoms);
    setSavedEncounter(encounter);
    void saveEncounter(encounter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.mode]);

  const step = useMemo(
    () => (pathway && state ? pathwayStep(pathway, state.stepId) : null),
    [pathway, state],
  );

  if (!pathway || !state) {
    return (
      <section className="assessment">
        <h1>Pathway not found</h1>
        <p>This pathway is missing. Nothing was inferred.</p>
      </section>
    );
  }

  const missing =
    step?.type === "measure" && equipmentMissing(step, missionConfig.equipment);
  const between = state.mode === "reassess" ? reassessRemainingMs(state, new Date(now)) : 0;

  const dispatch = (event: Parameters<typeof advance>[2]) =>
    setState((current) => (current ? advance(current, pathway, event) : current));

  if (state.mode === "done") {
    return (
      <section className="assessment">
        <header className="assessment-head">
          <p className="illustrative-label">{pathway.label}</p>
          <h1>{pathway.title}</h1>
          <p className="assessment-sub">Assessment complete. Nothing here is a diagnosis.</p>
        </header>
        <div className="assessment-summary">
          <h2>What was recorded</h2>
          <ul>
            {state.answers.map((answer, index) => (
              <li key={`${answer.stepId}-${index}`}>
                <span>{answer.question}</span>
                <strong>{answer.answer}</strong>
              </li>
            ))}
            {state.unknowns.map((unknown) => (
              <li key={unknown} className="unknown-row">
                <span>Unknown</span>
                <strong>{unknown}</strong>
              </li>
            ))}
          </ul>
          <h2>Actions</h2>
          <ul>
            {state.actions.map((action) => (
              <li key={action.at}>
                <span>{action.text}</span>
                <strong>
                  {new Date(action.at).toLocaleTimeString("en-GB", {
                    timeZone: "UTC",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  UTC
                </strong>
              </li>
            ))}
          </ul>
          <p className="disclaimer-line">
            {state.incomplete
              ? "This assessment is incomplete: something could not be measured or assessed."
              : "All steps were answered."}{" "}
            Outcomes are prompts for the crew, not diagnoses.
          </p>
          {drill && (
            <div className="drill-result">
              <h2>Drill result</h2>
              <p>
                {state.answers.length} answers, {state.unknowns.length} unknowns, {
                  elapsed(state.startedAt, now)
                }{" "}
                elapsed. This scores completeness and speed only — never health.
              </p>
            </div>
          )}
          <div className="sheet-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() =>
                router.push(
                  `/reports?encounter=${encodeURIComponent(savedEncounter?.id ?? "")}${
                    drill ? "&drill=1" : ""
                  }`,
                )
              }
            >
              Generate handoff
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => router.push(`/crew/${crewId}`)}
            >
              Back to readings
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (state.mode === "emergency") {
    return (
      <section className="assessment emergency">
        <header className="assessment-head">
          <p className="illustrative-label">{pathway.label}</p>
          <h1>Escalate now</h1>
          <p className="assessment-sub">
            An answer on this step says: get the crew medical officer. This is a prompt, not
            a diagnosis.
          </p>
        </header>
        <div className="urgent-banner" role="alert">
          <ShieldAlert aria-hidden="true" />
          <div>
            <strong>Alert the crew and contact the medical officer.</strong>
            <p>Keep the person company. Record what you see and when it started.</p>
            <div className="urgent-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => notify("Crew alert sent on the local channel.", "attention")}
              >
                Alert the crew
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => router.push("/reports")}
              >
                Prepare handoff
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => router.push(`/crew/${crewId}`)}
        >
          <CornerUpLeft aria-hidden="true" /> Back
        </button>
      </section>
    );
  }

  return (
    <section className="assessment">
      <header className="assessment-head">
        <p className="illustrative-label">{pathway.label}</p>
        <h1>{pathway.title}</h1>
        <div className="assessment-meta">
          <span>
            <Clock aria-hidden="true" /> {elapsed(state.startedAt, now)} elapsed
          </span>
          {currentStepIndex(state, pathway) !== null && (
            <span>
              Step {(currentStepIndex(state, pathway) ?? 0) + 1} of {pathway.steps.length}
            </span>
          )}
          {encounterId && <span>Encounter {encounterId.slice(0, 8)}</span>}
        </div>
      </header>

      {state.mode === "reassess" && pathway.reassess ? (
        <div className="step-card">
          <p className="reassess-timer" role="timer" aria-live="off">
            {between > 0
              ? `Reassess in ${Math.ceil(between / 60000)} min`
              : "Reassessment is due now"}
          </p>
          <h2>{pathway.reassess.question}</h2>
          <div className="step-options">
            {pathway.reassess.options.map((option) => (
              <button
                key={option}
                type="button"
                className="step-option"
                onClick={() => dispatch({ type: "reassess", option, at: new Date().toISOString() })}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : step ? (
        <div className="step-card">
          <div className="step-title-row">
            <h2>{step.text}</h2>
            <button
              type="button"
              className="icon-button"
              aria-label="Read this step aloud"
              onClick={() => speak(step.text)}
            >
              <Volume2 aria-hidden="true" />
            </button>
          </div>

          {step.type === "question" || step.type === "urgent_check" ? (
            <div className="step-options">
              {optionsFor(step).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`step-option ${step.type === "urgent_check" && option === "Yes" ? "danger" : ""}`}
                  onClick={() =>
                    dispatch({ type: "answer", option, at: new Date().toISOString() })
                  }
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}

          {step.type === "measure" && (
            <div className="step-options">
              {missing ? (
                <>
                  <p className="field-error">
                    Equipment unavailable: {step.needs?.replace(/_/g, " ")}. This assessment
                    will be marked incomplete.
                  </p>
                  <button
                    type="button"
                    className="step-option"
                    onClick={() =>
                      dispatch({ type: "equipment_unavailable", at: new Date().toISOString() })
                    }
                  >
                    Continue without it
                  </button>
                  {step.alt && (
                    <button
                      type="button"
                      className="step-option"
                      onClick={() =>
                        dispatch({ type: "equipment_unavailable", at: new Date().toISOString() })
                      }
                    >
                      Go to alternative step
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="step-option"
                    onClick={() => setManualOpen(true)}
                  >
                    Enter a reading
                  </button>
                  <button
                    type="button"
                    className="step-option muted"
                    onClick={() =>
                      dispatch({
                        type: "measurement",
                        observation: null,
                        at: new Date().toISOString(),
                      })
                    }
                  >
                    Unable to measure
                  </button>
                </>
              )}
            </div>
          )}

          {step.type === "note" && (
            <div className="step-options">
              <button
                type="button"
                className="step-option"
                onClick={() =>
                  dispatch({
                    type: "measurement",
                    observation: null,
                    at: new Date().toISOString(),
                  })
                }
              >
                Continue
              </button>
            </div>
          )}

          {step.type === "action" && (
            <div className="step-options">
              <button
                type="button"
                className="step-option"
                onClick={() =>
                  dispatch({ type: "action_complete", at: new Date().toISOString() })
                }
              >
                Done — start {step.timer_minutes ?? 0} min timer
              </button>
            </div>
          )}
        </div>
      ) : null}

      <section className="action-log" aria-label="Action log">
        <h2>Action log</h2>
        <p className="form-hint">Tap an earlier answer to change it. Nothing is hidden.</p>
        <ol>
          {state.answers.map((answer, index) => (
            <li key={`${answer.stepId}-${index}`}>
              <span>{answer.question}</span>
              <strong>{answer.answer}</strong>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setState({
                    ...state,
                    mode: "step",
                    stepId: answer.stepId,
                    answers: state.answers.slice(0, index),
                  })
                }
              >
                Change
              </button>
            </li>
          ))}
        </ol>
      </section>

      {manualOpen && (
        <ManualEntry
          crewId={crewId}
          onClose={() => setManualOpen(false)}
          onSaved={(observations) => {
            const first = observations[0];
            if (!first) return;
            dispatch({
              type: "measurement",
              observation: first,
              at: new Date().toISOString(),
            });
          }}
        />
      )}
    </section>
  );
}

function currentStepIndex(
  state: RunnerState,
  pathway: { steps: Array<{ id: string }> },
): number | null {
  if (!state.stepId) return null;
  const index = pathway.steps.findIndex((entry) => entry.id === state.stepId);
  return index >= 0 ? index : null;
}
