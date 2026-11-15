"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCheck, Monitor } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Handoff, OutboxItem } from "@/lib/types";
import {
  acknowledgeOnServer,
  fetchSurgeonInbox,
  packetToOutbox,
  type ServerPacket,
} from "@/lib/outbox/http-transport";

function isHandoff(payload: OutboxItem["payload"]): payload is Handoff {
  return typeof payload === "object" && payload !== null && "observations" in payload;
}

/** Ground console. Reads the real inbox when a backend is configured. */
export function SurgeonPage() {
  const outbox = useStore((state) => state.outbox);
  const acknowledge = useStore((state) => state.acknowledge);
  const serverConfigured = useStore((state) => state.serverConfigured);
  const serverReachable = useStore((state) => state.serverReachable);
  const setServerStatus = useStore((state) => state.setServerStatus);

  const [serverPackets, setServerPackets] = useState<ServerPacket[] | null>(null);
  const [streamNote, setStreamNote] = useState<string | null>(null);

  useEffect(() => {
    if (!serverConfigured) return;
    let cancelled = false;
    const load = async () => {
      const result = await fetchSurgeonInbox();
      if (cancelled) return;
      if (result.ok) {
        setServerPackets(result.packets);
        setStreamNote(null);
        setServerStatus(true);
      } else {
        setStreamNote(result.message);
        if (result.status === 0) setServerStatus(false);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [serverConfigured, setServerStatus]);

  const localReceived = outbox
    .filter((item) => item.state !== "queued")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const rows = (
    serverConfigured ? (serverPackets ?? []).map(packetToOutbox) : localReceived
  ).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const handleAcknowledge = async (item: OutboxItem) => {
    if (!serverConfigured) {
      await acknowledge(item.id);
      return;
    }
    const result = await acknowledgeOnServer(item.id);
    if (!result.ok) {
      setStreamNote(result.message);
      if (result.status === 0) setServerStatus(false);
      return;
    }
    setServerPackets((current) =>
      (current ?? []).map((packet) => (packet.id === item.id ? result.packet : packet)),
    );
  };

  return (
    <section className="surgeon-page">
      <header className="surgeon-head">
        <div>
          <p className="surgeon-kicker">
            <Monitor aria-hidden="true" /> GROUND CONSOLE · DEMO
          </p>
          <h1>Flight surgeon inbox</h1>
          <p>
            Packets appear here only after the configured link delay. Private entries are
            hidden unless the astronaut shared them.
          </p>
        </div>
        <Link className="secondary-button" href="/outbox">
          Astronaut outbox
        </Link>
      </header>

      {serverConfigured && (
        <p className={`surgeon-server ${serverReachable ? "up" : "down"}`}>
          Ground server: {serverReachable ? "reachable" : "unreachable"}
          {streamNote ? ` · ${streamNote}` : ""}
        </p>
      )}

      {rows.length === 0 ? (
        <div className="empty-state">
          <h2>No packets received</h2>
          <p>Queue a handoff or wait for the delay to elapse.</p>
        </div>
      ) : (
        <ul className="surgeon-list">
          {rows.map((item) => {
            const handoff = isHandoff(item.payload) ? item.payload : null;
            return (
              <li key={item.id} className="surgeon-card">
                <header>
                  <div>
                    <h2>{item.title}</h2>
                    <p>
                      Received{" "}
                      {new Date(item.sentAt ?? item.createdAt).toLocaleString("en-GB", {
                        timeZone: "UTC",
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      UTC · {item.state}
                    </p>
                  </div>
                  {item.state !== "acknowledged" ? (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void handleAcknowledge(item)}
                    >
                      <CheckCheck aria-hidden="true" /> Acknowledge
                    </button>
                  ) : (
                    <span className="ack-pill">
                      <CheckCheck aria-hidden="true" /> Acknowledged
                    </span>
                  )}
                </header>

                {handoff ? (
                  <>
                    <section>
                      <h3>Symptoms</h3>
                      {handoff.symptoms.length === 0 ? (
                        <p>None reported.</p>
                      ) : (
                        <ul>
                          {handoff.symptoms.map((symptom) => (
                            <li key={symptom.id}>
                              {symptom.name} · {symptom.onset} · {symptom.trend}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                    <section>
                      <h3>Measurements</h3>
                      <ul>
                        {handoff.observations.slice(0, 12).map((entry) => (
                          <li key={entry.id}>
                            {entry.metric.replace(/_/g, " ")}:{" "}
                            {entry.value === null ? "not measured" : entry.value} {entry.unit}{" "}
                            · {entry.lane} · {entry.quality}
                          </li>
                        ))}
                      </ul>
                    </section>
                    <section>
                      <h3>Timeline</h3>
                      <ol>
                        {handoff.actions.map((action) => (
                          <li key={`${action.at}-${action.text}`}>
                            {new Date(action.at).toLocaleTimeString("en-GB", {
                              timeZone: "UTC",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            UTC — {action.text}
                          </li>
                        ))}
                      </ol>
                      {handoff.unknowns.length > 0 && (
                        <p className="surgeon-unknown">
                          Unknowns: {handoff.unknowns.join("; ")}
                        </p>
                      )}
                    </section>
                    <p className="disclaimer-line">
                      Private answers: {handoff.includePrivate ? "shared" : "not shared"}.
                      Demo packet — not clinically reviewed.
                    </p>
                  </>
                ) : (
                  <p>
                    {item.kind === "support"
                      ? "Private support request. Contents withheld unless shared."
                      : "Packet payload not available in this demo."}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
