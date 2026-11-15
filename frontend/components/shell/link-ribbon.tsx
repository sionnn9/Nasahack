"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radio, WifiOff } from "lucide-react";
import {
  environmentFor,
  environments,
  formatDelay,
  missionConfig,
} from "@/lib/mission-config";
import { useStore } from "@/lib/store";
import type { LinkState } from "@/lib/types";

const linkLabels: Record<LinkState, string> = {
  live: "Live",
  delayed: "Delayed",
  blackout: "Blackout",
};

export function LinkRibbon() {
  const environment = useStore((state) => state.environment);
  const link = useStore((state) => state.link);
  const setEnvironment = useStore((state) => state.setEnvironment);
  const setLink = useStore((state) => state.setLink);
  const serverConfigured = useStore((state) => state.serverConfigured);
  const serverReachable = useStore((state) => state.serverReachable);
  const serverDelayScale = useStore((state) => state.serverDelayScale);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const preset = environmentFor(environment);
  const effectiveLink: LinkState = !online && link !== "blackout" ? "blackout" : link;

  return (
    <div className="link-ribbon" role="region" aria-label="Link and environment">
      <div className="link-ribbon-main">
        <span className={`link-dot ${effectiveLink}`} aria-hidden="true" />
        <strong>{linkLabels[effectiveLink]}</strong>
        <span className="ribbon-sep">·</span>
        <label className="ribbon-field">
          <span className="sr-only">Environment</span>
          <select
            value={environment}
            onChange={(event) =>
              void setEnvironment(event.target.value as typeof environment)
            }
          >
            {environments.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <span className="ribbon-note">
          {effectiveLink === "blackout"
            ? "Packets stay queued on board."
            : `A reply from Earth would take about ${formatDelay(preset.delaySeconds)}.`}
          {serverConfigured && serverDelayScale !== 1 && (
            <>
              {" "}
              <span className="ribbon-compression">
                scenario delay {formatDelay(preset.delaySeconds)} · demo compressed ×
                {Math.round(1 / serverDelayScale)}
              </span>
            </>
          )}
        </span>
        {serverConfigured && (
          <span
            className={`ribbon-server ${
              serverReachable === null ? "checking" : serverReachable ? "up" : "down"
            }`}
            title="The simulated link state is separate from the ground server."
          >
            Ground server:{" "}
            {serverReachable === null ? "checking" : serverReachable ? "reachable" : "unreachable"}
          </span>
        )}
        {!online && (
          <span className="ribbon-offline">
            <WifiOff aria-hidden="true" /> Device offline
          </span>
        )}
      </div>
      <div className="link-ribbon-controls" role="group" aria-label="Link state">
        {(["live", "delayed", "blackout"] as LinkState[]).map((state) => (
          <button
            key={state}
            type="button"
            className={link === state ? "active" : ""}
            aria-pressed={link === state}
            onClick={() => void setLink(state)}
          >
            {linkLabels[state]}
          </button>
        ))}
        <Link className="ribbon-link" href="/outbox">
          <Radio aria-hidden="true" /> Outbox
        </Link>
        <span className="ribbon-day">Day {missionConfig.missionDay}</span>
      </div>
    </div>
  );
}
