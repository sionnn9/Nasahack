"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { RefreshCw, Trash2 } from "lucide-react";
import { CrewNav } from "@/components/health/crew-nav";
import { environmentFor, formatDelay } from "@/lib/mission-config";
import { useStore } from "@/lib/store";
import type { OutboxItem, OutboxState } from "@/lib/types";

const stateCopy: Record<OutboxState, string> = {
  queued: "Queued on board",
  sent: "Sent",
  delivered: "Delivered",
  acknowledged: "Acknowledged by the flight surgeon",
};

const stateOrder: OutboxState[] = ["queued", "sent", "delivered", "acknowledged"];

export function OutboxPage() {
  const outbox = useStore((state) => state.outbox);
  const link = useStore((state) => state.link);
  const environment = useStore((state) => state.environment);
  const advanceOutbox = useStore((state) => state.advanceOutbox);
  const cancelOutbox = useStore((state) => state.cancelOutbox);
  const notify = useStore((state) => state.notify);
  const hydrated = useStore((state) => state.hydrated);
  const serverConfigured = useStore((state) => state.serverConfigured);
  const serverReachable = useStore((state) => state.serverReachable);
  const reconcileOutbox = useStore((state) => state.reconcileOutbox);

  const crewIds = useMemo(
    () => [...new Set(outbox.map((item) => item.crewId))].join(","),
    [outbox],
  );

  useEffect(() => {
    if (!serverConfigured || !hydrated || !crewIds) return;
    for (const crewId of crewIds.split(",")) void reconcileOutbox(crewId);
  }, [crewIds, hydrated, reconcileOutbox, serverConfigured]);

  const preset = environmentFor(environment);
  const ordered = useMemo(
    () =>
      [...outbox].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [outbox],
  );

  return (
    <section className="reports-page outbox-page">
      <CrewNav />
      <header className="reports-head">
        <div>
          <p className="illustrative-label">HONEST DELIVERY STATES</p>
          <h1>Outbox</h1>
          <p className="assessment-sub">
            The state shown here is exactly the state stored on this device. Nothing is
            marked delivered or acknowledged unless that actually happened.
          </p>
        </div>
        <div className="reports-actions">
          <span className={`link-pill ${link}`}>{link}</span>
          {serverConfigured && (
            <span className={`server-pill ${serverReachable ? "up" : "down"}`}>
              Ground server {serverReachable ? "reachable" : "unreachable"}
            </span>
          )}
          <button
            type="button"
            className="secondary-button"
            onClick={() => void advanceOutbox()}
          >
            <RefreshCw aria-hidden="true" /> Check link
          </button>
        </div>
      </header>

      <p className="outbox-note">
        {serverConfigured
          ? serverReachable
            ? "The ground server owns delivery states. Sent, delivered and acknowledged appear only when the server reports them."
            : "Ground server unreachable. Packets stay queued; the same-device BroadcastChannel fallback only syncs this browser."
          : link === "blackout"
            ? "Blackout: packets stay queued on board until the link returns."
            : link === "live"
              ? "Link is live. Queued packets move to Sent immediately."
              : `Delayed link: queued packets move to Sent after the configured one-way delay of ${formatDelay(preset.delaySeconds)}.`}
      </p>

      {ordered.length === 0 ? (
        <div className="empty-state">
          <h2>Nothing queued</h2>
          <p>Handoffs and private support requests will appear here.</p>
          <Link className="primary-button" href="/reports">
            Prepare a handoff
          </Link>
        </div>
      ) : (
        <ul className="outbox-list">
          {ordered.map((item) => (
            <OutboxRow
              key={item.id}
              item={item}
              onCancel={() => void cancelOutbox(item.id)}
              onAcknowledge={() => {
                void useStore.getState().acknowledge(item.id);
                notify("Acknowledged locally. This is a demo receipt.", "ok");
              }}
              allowLocalAck={!serverConfigured}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function OutboxRow({
  item,
  onCancel,
  onAcknowledge,
  allowLocalAck,
}: {
  item: OutboxItem;
  onCancel: () => void;
  onAcknowledge: () => void;
  allowLocalAck: boolean;
}) {
  const reached = stateOrder.indexOf(item.state);
  return (
    <li className="outbox-item">
      <header>
        <div>
          <h2>{item.title}</h2>
          <p>
            Created{" "}
            {new Date(item.createdAt).toLocaleString("en-GB", {
              timeZone: "UTC",
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            UTC · one-way delay {mathDelay(item.delaySeconds)}
          </p>
        </div>
        <span className={`outbox-state state-${item.state}`}>{stateCopy[item.state]}</span>
      </header>

      <ol className="state-timeline">
        {stateOrder.map((state, index) => (
          <li
            key={state}
            className={index <= reached ? "reached" : ""}
            aria-current={state === item.state ? "step" : undefined}
          >
            <span className="state-dot" aria-hidden="true" />
            {stateCopy[state]}
          </li>
        ))}
      </ol>

      <ul className="state-history">
        {item.history.map((entry) => (
          <li key={`${entry.state}-${entry.at}`}>
            <time dateTime={entry.at}>
              {new Date(entry.at).toLocaleTimeString("en-GB", {
                timeZone: "UTC",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>{" "}
            — {entry.note}
          </li>
        ))}
      </ul>

      <div className="outbox-actions">
        {item.private && <span className="private-flag">Private</span>}
        {item.state === "queued" && (
          <button type="button" className="text-button" onClick={onCancel}>
            <Trash2 aria-hidden="true" /> Cancel before send
          </button>
        )}
        {item.state === "sent" && allowLocalAck && (
          <button type="button" className="secondary-button" onClick={onAcknowledge}>
            Mark acknowledged (demo)
          </button>
        )}
      </div>
    </li>
  );
}

function mathDelay(seconds: number): string {
  return seconds >= 60 ? `${Math.round(seconds / 60)} min` : `${seconds} s`;
}
