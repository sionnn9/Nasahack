"use client";

import { useMemo, useState } from "react";
import { Lock, LockOpen, ShieldCheck } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useStore } from "@/lib/store";
import type { CheckIn } from "@/lib/types";

const answers = [
  { key: "mood", label: "Mood", low: "Very difficult", high: "At ease" },
  { key: "stress", label: "Stress", low: "Low", high: "High" },
  { key: "rested", label: "Rested", low: "Not rested", high: "Rested" },
  { key: "connected", label: "Connected", low: "Isolated", high: "Connected" },
] as const;

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** No composite score: the four answers and their trends are shown as-is. */
export function WellbeingTile({
  crewId,
  checkIns,
  onRequestSupport,
}: {
  crewId: string;
  checkIns: CheckIn[];
  onRequestSupport: () => void;
}) {
  const pinHash = useStore((state) => state.pinHash);
  const unlocked = useStore((state) => state.privateUnlocked);
  const setPin = useStore((state) => state.setPin);
  const unlockPrivate = useStore((state) => state.unlockPrivate);
  const lockPrivate = useStore((state) => state.lockPrivate);
  const notify = useStore((state) => state.notify);
  const privateSync = useStore((state) => state.privateSync[crewId] ?? false);
  const setPrivateSyncConsent = useStore((state) => state.setPrivateSyncConsent);
  const [pin, setPinValue] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState("");

  const mine = useMemo(
    () =>
      checkIns
        .filter((entry) => entry.crewId === crewId)
        .sort((a, b) => (a.observedAt < b.observedAt ? 1 : -1)),
    [checkIns, crewId],
  );
  const current = mine[0];
  const previous = mine.slice(1, 8);

  const submitPin = async () => {
    if (!/^\d{4}$/.test(pin)) {
      setError("Use four digits.");
      return;
    }
    if (pinHash) {
      const ok = await unlockPrivate(pin);
      if (!ok) {
        setError("That PIN does not match.");
        return;
      }
    } else {
      await setPin(pin);
      notify("Local PIN set. Private answers are unlocked on this device.", "ok");
    }
    setPinValue("");
    setError("");
  };

  if (!unlocked) {
    return (
      <section className="wellbeing-tile locked" aria-labelledby="wellbeing-title">
        <header>
          <h2 id="wellbeing-title">How you have been feeling</h2>
          <p>Private answers. Locked on this device.</p>
        </header>
        <div className="pin-row">
          <Lock aria-hidden="true" />
          <label htmlFor="wellbeing-pin">
            {pinHash ? "Enter your 4-digit PIN" : "Set a 4-digit PIN"}
          </label>
          <input
            id="wellbeing-pin"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={pin}
            onChange={(event) => setPinValue(event.target.value.replace(/\D/g, ""))}
            aria-invalid={!!error}
            aria-describedby={error ? "pin-error" : undefined}
          />
          <button type="button" className="primary-button" onClick={() => void submitPin()}>
            {pinHash ? "Unlock" : "Set PIN"}
          </button>
        </div>
        {error && (
          <p id="pin-error" role="alert" className="field-error">
            {error}
          </p>
        )}
        <p className="disclaimer-line">
          A local lock, not encryption. Private answers are never shared unless you tick
          them in a handoff.
        </p>
      </section>
    );
  }

  return (
    <section className="wellbeing-tile" aria-labelledby="wellbeing-title">
      <header className="wellbeing-head">
        <div>
          <h2 id="wellbeing-title">How you have been feeling</h2>
          <p>Self-reported. No combined score is calculated.</p>
        </div>
        <button type="button" className="text-button" onClick={lockPrivate}>
          <LockOpen aria-hidden="true" /> Lock
        </button>
      </header>

      <ul className="answer-bars">
        {answers.map((entry) => {
          const value = current ? current[entry.key] : null;
          const history = previous
            .map((checkIn) => checkIn[entry.key])
            .filter((item): item is number => item !== null);
          const avg = average(history);
          const change = value !== null && avg !== null ? value - avg : null;
          return (
            <li key={entry.key}>
              <div className="answer-label">
                <strong>{entry.label}</strong>
                <span>
                  {value === null ? "Not answered" : `${value} / 5`}
                  {change !== null && change !== 0 && (
                    <em>
                      {" "}
                      {change > 0 ? "up" : "down"} {Math.abs(change).toFixed(1)} vs recent
                    </em>
                  )}
                </span>
              </div>
              <div className="answer-track" aria-hidden="true">
                <span style={{ width: `${value === null ? 0 : (value / 5) * 100}%` }} />
              </div>
              <div className="answer-scale">
                <span>{entry.low}</span>
                <span>{entry.high}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="wellbeing-note">
        <ShieldCheck aria-hidden="true" />
        <p>
          Private answers stay on this device and appear in a handoff only when you tick
          them.
        </p>
      </div>

      <label className="private-sync-toggle">
        <input
          type="checkbox"
          checked={privateSync}
          onChange={(event) =>
            void setPrivateSyncConsent(crewId, event.target.checked)
          }
        />
        <span>
          Also sync my private answers to the ground server
          <em>
            Off by default. Mood, stress, rested, connected and free text otherwise stay
            on this device only.
          </em>
        </span>
      </label>

      <button type="button" className="secondary-button" onClick={() => setSheetOpen(true)}>
        Request private support
      </button>

      {sheetOpen && (
        <BottomSheet
          title="Request private support"
          subtitle="Queued in your outbox. Nothing is sent while the link is down."
          onClose={() => setSheetOpen(false)}
        >
          <p>
            This creates a private request in your outbox. It is not a diagnosis and it
            does not share your mood answers.
          </p>
          <div className="sheet-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                onRequestSupport();
                setSheetOpen(false);
              }}
            >
              Add private request to outbox
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSheetOpen(false)}
            >
              Cancel
            </button>
          </div>
        </BottomSheet>
      )}
    </section>
  );
}
