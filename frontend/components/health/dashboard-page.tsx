"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarCheck,
  ClipboardList,
  Plus,
  Radio,
} from "lucide-react";
import { CrewNav } from "@/components/health/crew-nav";
import { BodyMap, type BodyMapMode } from "@/components/health/visualizations";
import { ReadingDetails } from "@/components/health/reading-details";
import { AllReadings } from "@/components/health/all-readings";
import { WellbeingTile } from "@/components/health/wellbeing-tile";
import { ConcernCard } from "@/components/health/concern-card";
import { HazardStrip } from "@/components/health/hazard-strip";
import { FormDrawer } from "@/components/health/form-drawer";
import { ManualEntry } from "@/components/health/manual-entry";
import { MeasureGuide } from "@/components/health/measure-guide";
import type { ChartPoint } from "@/components/health/metric-chart";
import { useHealthSimulation } from "@/components/health/use-health-simulation";
import { missionConfig } from "@/lib/mission-config";
import { readings, readingFor } from "@/lib/readings";
import { buildConcerns } from "@/lib/concerns/build";
import { checkInStreak, tasksFor } from "@/lib/tasks";
import { makeObservation, observationsFromCheckIn, statusByArea } from "@/lib/observations/derived";
import { parseBedRestCsv, replayObservations } from "@/lib/replay/csv";
import { SimulatedAdapter, WebSerialAdapter } from "@/lib/sensors/adapter";
import { RemoteSensorAdapter, apiConfigured } from "@/lib/outbox/http-transport";
import { useStore } from "@/lib/store";
import { pathwayForSymptoms } from "@/lib/pathways";
import type { BodyArea, Metric, Observation } from "@/lib/types";

export function DashboardPage({ crewId }: { crewId: string }) {
  const router = useRouter();
  const member = missionConfig.crew.find((entry) => entry.id === crewId);
  const observations = useStore((state) => state.observations);
  const checkIns = useStore((state) => state.checkIns);
  const link = useStore((state) => state.link);
  const addObservations = useStore((state) => state.addObservations);
  const enqueue = useStore((state) => state.enqueue);
  const notify = useStore((state) => state.notify);
  const environment = useStore((state) => state.environment);
  const hydrated = useStore((state) => state.hydrated);
  const pullForCrew = useStore((state) => state.pullForCrew);

  const simulation = useHealthSimulation(
    member?.restingHeartRate ?? 70,
    crewId,
    member?.id === "alex-morgan" ? 0 : 0,
  );

  const [area, setArea] = useState<BodyArea>("Heart");
  const [mode, setMode] = useState<BodyMapMode>("status");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [guideKey, setGuideKey] = useState<string | null>(null);
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [replayNote, setReplayNote] = useState("");
  const [reminderNote, setReminderNote] = useState("");
  // Live samples carry wall-clock times, which the server cannot know. Render
  // them only after hydration so the SSR HTML and first client render match.
  const [mounted, setMounted] = useState(false);
  // The vitals object changes every second; keep it in a ref so the 30 s
  // persistence timer is not torn down before it can fire.
  const vitalsRef = useRef(simulation.vitals);
  vitalsRef.current = simulation.vitals;
  const qualityRef = useRef(simulation.quality);
  qualityRef.current = simulation.quality;
  const remoteAdapter = useRef<RemoteSensorAdapter | null>(null);

  useEffect(
    () => () => {
      remoteAdapter.current?.disconnect();
      remoteAdapter.current = null;
    },
    [],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !member) return;
    void pullForCrew(crewId);
  }, [crewId, hydrated, member, pullForCrew]);

  useEffect(() => {
    setIsDemo(new URLSearchParams(window.location.search).get("demo") === "1");
  }, []);

  useEffect(() => {
    if (!member) return;
    const timer = window.setInterval(() => {
      if (qualityRef.current !== "Usable") return;
      const nowIso = new Date().toISOString();
      const rows: Observation[] = [
        makeObservation({
          crewId,
          metric: "heart_rate",
          value: vitalsRef.current.heartRate,
          observedAt: nowIso,
          lane: "live",
          method: "ppg_wrist",
          context: "rest",
        }),
        makeObservation({
          crewId,
          metric: "skin_temp",
          value: vitalsRef.current.skinTemperature,
          observedAt: nowIso,
          lane: "live",
          method: "thermometer_skin",
          context: "rest",
        }),
      ];
      void addObservations(rows);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [addObservations, crewId, member]);

  const liveToday = useMemo<Partial<Record<Metric, ChartPoint[]>>>(() => {
    if (!mounted) return {};
    const stamp = (index: number) =>
      new Date(Date.now() - (59 - index) * 1000).toISOString();
    const usable = simulation.quality === "Usable";
    const build = (values: Array<number | null>) =>
      values.map((value, index) => ({
        value,
        at: stamp(index),
        lane: "live" as const,
        quality: usable && value !== null ? ("ok" as const) : ("no_contact" as const),
      }));
    return {
      heart_rate: build(simulation.histories.heartRate),
      skin_temp: build(simulation.histories.skinTemperature),
      bp_systolic: build(simulation.histories.bloodPressure),
      motion: build(simulation.histories.motion),
    };
  }, [mounted, simulation.histories, simulation.quality]);

  const crewObservations = useMemo(
    () => observations.filter((entry) => entry.crewId === crewId),
    [observations, crewId],
  );
  const crewCheckIns = useMemo(
    () => checkIns.filter((entry) => entry.crewId === crewId),
    [checkIns, crewId],
  );

  const statuses = useMemo(
    () => statusByArea(observations, crewId),
    [observations, crewId],
  );
  const concerns = useMemo(
    () => buildConcerns(crewObservations, crewCheckIns),
    [crewObservations, crewCheckIns],
  );
  const tasks = useMemo(() => tasksFor(crewId, crewCheckIns), [crewCheckIns, crewId]);
  const streak = useMemo(() => checkInStreak(crewId, crewCheckIns), [crewCheckIns, crewId]);
  const latestCheckIn = crewCheckIns
    .slice()
    .sort((a, b) => (a.observedAt < b.observedAt ? 1 : -1))[0];
  const today = new Date().toISOString().slice(0, 10);
  const todayCheckIn = latestCheckIn?.observedAt.slice(0, 10) === today ? latestCheckIn : null;

  const urgentSymptoms = (todayCheckIn?.symptoms ?? []).filter((symptom) => symptom.urgent);
  const attentionCount = Object.values(statuses).filter((state) => state === "attention").length;
  const noValidCount = Object.values(statuses).filter(
    (state) => state === "no_valid_reading",
  ).length;
  const withinCount = Object.values(statuses).filter((state) => state === "within_range").length;

  const guideReading = guideKey ? readings.find((entry) => entry.key === guideKey) : null;

  const repeatMeasurement = () => {
    setManualOpen(true);
    notify("Add a repeat reading. The previous value stays in the log.", "neutral");
  };

  const requestSupport = async () => {
    const now = new Date().toISOString();
    await enqueue({
      id: `support-${crewId}-${Date.now()}`,
      crewId,
      kind: "support",
      createdAt: now,
      sentAt: null,
      acknowledgedAt: null,
      state: "queued",
      delaySeconds: 20 * 60,
      title: "Private support request",
      payload: { crewId, requestedAt: now },
      private: true,
      history: [
        {
          state: "queued",
          at: now,
          note:
            link === "blackout"
              ? "Link is in blackout. Held on board."
              : "Waiting for the configured one-way delay.",
        },
      ],
    });
    notify("Private request saved to the outbox. Nothing is sent yet.", "ok");
  };

  const applyScenario = (scenario: "shift" | "unplug" | "sleep" | "lightheaded") => {
    if (scenario === "unplug") {
      simulation.onQualityOverrideChange("Poor contact");
      notify("Scenario: sensor unplugged. Values will stop entering comparisons.", "attention");
      return;
    }
    if (scenario === "shift") {
      const now = new Date().toISOString();
      void addObservations([
        makeObservation({
          crewId,
          metric: "heart_rate",
          value: 96,
          observedAt: now,
          lane: "live",
          method: "ppg_wrist",
          context: "rest",
        }),
      ]);
      notify("Scenario: baseline shift applied to resting heart rate.", "attention");
      return;
    }
    if (scenario === "sleep") {
      const now = new Date().toISOString();
      void addObservations(
        [1, 2, 3].map((offset) =>
          makeObservation({
            crewId,
            metric: "sleep_minutes",
            value: 250,
            observedAt: new Date(Date.now() - offset * 86_400_000).toISOString(),
            lane: "manual",
            method: "self_report",
            context: "unknown",
          }),
        ),
      );
      notify("Scenario: poor-sleep week added. Expect a concern, not a diagnosis.", "attention");
      return;
    }
    const now = new Date();
    const checkIn = {
      id: `checkin-${crewId}-${now.toISOString().slice(0, 10)}`,
      crewId,
      observedAt: now.toISOString(),
      enteredAt: now.toISOString(),
      sleepMinutes: 300,
      mood: 2,
      stress: 4,
      rested: 2,
      connected: 3,
      symptoms: [
        {
          id: "scenario-dizziness",
          name: "Dizziness",
          onset: "today" as const,
          trend: "worse" as const,
          urgent: false,
        },
      ],
      details: "Scenario: light-headedness after standing.",
    };
    void useStore.getState().saveCheckIn(checkIn);
    void addObservations(observationsFromCheckIn(checkIn));
    notify("Scenario: light-headedness recorded. A concern should appear.", "attention");
  };

  if (!member) {
    return (
      <section className="dashboard">
        <CrewNav />
        <div className="empty-state">
          <h1>Crew member not found</h1>
          <Link className="primary-button" href="/">
            Back to crew
          </Link>
        </div>
      </section>
    );
  }

  const pathway = pathwayForSymptoms(
    (todayCheckIn?.symptoms ?? []).map((symptom) => symptom.name),
  );

  return (
    <section className="dashboard">
      <CrewNav crewId={crewId} />

      <header className="welcome">
        <div className="welcome-person">
          <span className={`avatar ${member.color}`}>{member.initials}</span>
          <div>
            <h1>{member.name}</h1>
            <p>
              {member.role} · {missionConfig.missionName} · Day {missionConfig.missionDay}
            </p>
          </div>
        </div>
        <div className="welcome-actions">
          <span className="link-inline">
            <Radio aria-hidden="true" /> {link}
          </span>
          <button type="button" className="primary-button" onClick={() => setCheckInOpen(true)}>
            <ClipboardList aria-hidden="true" /> Daily check-in
          </button>
        </div>
      </header>

      <div className="status-strip" role="region" aria-label="Today at a glance">
        <div className="status-strip-counts">
          <span className="status-count attention">
            <AlertTriangle aria-hidden="true" /> {attentionCount} need attention
          </span>
          <span className="status-count neutral">{withinCount} within your range</span>
          <span className="status-count muted">{noValidCount} no valid reading</span>
        </div>
        <div className="status-strip-tasks">
          <span>
            <CalendarCheck aria-hidden="true" /> {streak} checks completed in a row
          </span>
          <ul>
            {tasks.map((task) => (
              <li key={task.id} className={`task-${task.state}`}>
                <span className="task-dot" aria-hidden="true" />
                {task.label}
                <em>
                  {task.state === "done"
                    ? "done"
                    : task.state === "overdue"
                      ? "overdue"
                      : task.state === "due"
                        ? "due now"
                        : `due ${String(task.dueHourUtc).padStart(2, "0")}:00 UTC`}
                </em>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {urgentSymptoms.length > 0 && (
        <div className="urgent-banner" role="alert">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>Reported symptom needs attention now.</strong>
            <p>
              {urgentSymptoms.map((symptom) => symptom.name).join(", ")}. A reported symptom
              outranks any reassuring number.
            </p>
            <div className="urgent-actions">
              <Link className="primary-button" href="/emergency">
                Start emergency help
              </Link>
              <Link className="secondary-button" href={`/crew/${crewId}/assess/${pathway.id}`}>
                Start guided assessment
              </Link>
            </div>
          </div>
        </div>
      )}

      {concerns.map((concern) => (
        <ConcernCard
          key={concern.id}
          concern={concern}
          crewId={crewId}
          onRepeat={repeatMeasurement}
          onHandoff={() => router.push("/reports")}
          onAssessment={() => router.push(`/crew/${crewId}/assess/${pathway.id}`)}
        />
      ))}

      <div className="dashboard-grid">
        <div className="body-card body-card-map">
          <div className="section-head">
            <h2>Body map</h2>
            <div className="segmented" role="group" aria-label="Body map mode">
              <button
                type="button"
                className={mode === "status" ? "active" : ""}
                aria-pressed={mode === "status"}
                onClick={() => setMode("status")}
              >
                Status
              </button>
              <button
                type="button"
                className={mode === "coverage" ? "active" : ""}
                aria-pressed={mode === "coverage"}
                onClick={() => setMode("coverage")}
              >
                Coverage
              </button>
            </div>
          </div>
          <BodyMap
            selected={area}
            mode={mode}
            statuses={statuses}
            labels={{}}
            onSelect={setArea}
          />
          <p className="body-map-note">
            {mode === "coverage"
              ? "Hatched areas have not been assessed. Not assessed is never shown as green."
              : "Colour shows how this reading compares with your own recent range."}
          </p>
          <div className="map-chips">
            {(Object.keys(statuses) as BodyArea[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`map-chip ${area === key ? "selected" : ""} status-${statuses[key]}`}
                onClick={() => setArea(key)}
              >
                {key}
              </button>
            ))}
            <button
              type="button"
              className={`map-chip ${area === "Radiation" ? "selected" : ""}`}
              onClick={() => setArea("Radiation")}
            >
              Radiation
            </button>
          </div>
        </div>

        <ReadingDetails
          crewId={crewId}
          area={area}
          observations={observations}
          liveToday={liveToday}
          sensorUnplugged={simulation.quality !== "Usable"}
          onOpenGuide={(key) => key && setGuideKey(key)}
        />
      </div>

      <div className="dashboard-actions">
        <button type="button" className="secondary-button" onClick={() => setManualOpen(true)}>
          <Plus aria-hidden="true" /> Add manual reading
        </button>
        <Link className="secondary-button" href={`/crew/${crewId}/assess/${pathway.id}`}>
          Guided assessment
        </Link>
        <Link className="secondary-button" href="/reports">
          Prepare handoff
        </Link>
        <Link className="secondary-button" href="/outbox">
          Outbox
        </Link>
      </div>

      <AllReadings
        crewId={crewId}
        observations={observations}
        onManualEntry={() => setManualOpen(true)}
        onOpenGuide={setGuideKey}
      />

      <WellbeingTile
        crewId={crewId}
        checkIns={checkIns}
        onRequestSupport={() => void requestSupport()}
      />

      <HazardStrip
        highlight={concerns.flatMap((concern) => concern.hazards)}
      />

      <section className="scenario-panel" aria-label="Data tools">
        <div className="section-head">
          <h2>Data tools</h2>
          <span className="lane-hint">Ground replay is never mixed with live data.</span>
        </div>
        <div className="scenario-actions">
          <label className="replay-upload">
            Import bed-rest CSV (replay lane)
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const { rows } = parseBedRestCsv(text);
                if (rows.length === 0) {
                  setReplayNote("No rows recognised. Expected Subject, Day, Phase and a sleep or heart-rate column.");
                  return;
                }
                const observations = replayObservations(rows, crewId);
                await addObservations(observations);
                const participants = new Set(rows.map((row) => row.participant)).size;
                setReplayNote(
                  `Imported ${observations.length} replay observations from ${participants} participants. Ground analog from three participants.`,
                );
              }}
            />
          </label>
          <a className="text-button" href="/sample-bed-rest.csv" download>
            Sample CSV
          </a>
          <button
            type="button"
            onClick={() => {
              const simulated = new SimulatedAdapter();
              void simulated.connect();
              notify("Simulated sensor adapter connected. Lanes stay separate.", "ok");
            }}
          >
            Connect simulated sensor
          </button>
          {apiConfigured && (
            <button
              type="button"
              onClick={async () => {
                remoteAdapter.current?.disconnect();
                const adapter = new RemoteSensorAdapter(crewId);
                remoteAdapter.current = adapter;
                try {
                  await adapter.connect();
                  adapter.onSample((sample) => {
                    void addObservations([sample]);
                  });
                  adapter.onQuality((quality) => {
                    setReplayNote(
                      quality === "ok"
                        ? "Remote sensor is reporting usable samples."
                        : "Remote sensor lost contact. Values stop entering comparisons.",
                    );
                  });
                  notify("Remote sensor connected to the ground stream.", "ok");
                } catch (error) {
                  notify(
                    error instanceof Error ? error.message : "Remote sensor failed.",
                    "attention",
                  );
                }
              }}
            >
              Connect remote sensor (SSE)
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              const serial = new WebSerialAdapter();
              try {
                await serial.connect();
              } catch (error) {
                notify(
                  error instanceof Error ? error.message : "Web Serial is unavailable.",
                  "attention",
                );
              }
            }}
          >
            Web Serial pulse sensor (stub)
          </button>
          <button
            type="button"
            onClick={async () => {
              if (typeof Notification === "undefined") {
                setReminderNote("This browser has no notification support. In-app reminder only.");
                return;
              }
              const permission = await Notification.requestPermission();
              if (permission !== "granted") {
                setReminderNote("Notifications are blocked. Reminders stay in the app.");
                return;
              }
              const overdue = tasks.find((task) => task.state === "overdue") ?? tasks[0];
              new Notification("CrewSignal reminder", {
                body: `${overdue.label}: ${overdue.detail}`,
              });
              setReminderNote(`Reminder sent for ${overdue.label}.`);
            }}
          >
            Remind me about tasks
          </button>
          {replayNote && <p>{replayNote}</p>}
          {reminderNote && <p>{reminderNote}</p>}
        </div>
      </section>

      {isDemo && (
        <section className="scenario-panel" aria-label="Scenario panel">
          <div className="section-head">
            <h2>Scenario panel (demo)</h2>
            <button
              type="button"
              className="text-button"
              onClick={() => setScenarioOpen((value) => !value)}
            >
              {scenarioOpen ? "Hide" : "Show"}
            </button>
          </div>
          {scenarioOpen && (
            <div className="scenario-actions">
              <button type="button" onClick={() => applyScenario("shift")}>
                Baseline shift
              </button>
              <button type="button" onClick={() => applyScenario("unplug")}>
                Sensor unplugged
              </button>
              <button type="button" onClick={() => applyScenario("sleep")}>
                Poor-sleep week
              </button>
              <button type="button" onClick={() => applyScenario("lightheaded")}>
                Light-headedness
              </button>
              <p>
                Environment: {environment}. Scenarios change data, never status rules.
              </p>
            </div>
          )}
        </section>
      )}

      {checkInOpen && (
        <FormDrawer crewId={crewId} initial={todayCheckIn} onClose={() => setCheckInOpen(false)} />
      )}
      {manualOpen && <ManualEntry crewId={crewId} onClose={() => setManualOpen(false)} />}
      {guideReading && (
        <MeasureGuide
          reading={guideReading}
          onClose={() => setGuideKey(null)}
          onUnable={async () => {
            if (!guideReading.metric) return;
            await addObservations([
              makeObservation({
                crewId,
                metric: guideReading.metric,
                value: null,
                observedAt: new Date().toISOString(),
                lane: "manual",
                method: "manual_entry",
                context: "unknown",
                quality: "not_measured",
              }),
            ]);
            setGuideKey(null);
            notify("Recorded as unable to measure. No value was invented.", "neutral");
          }}
        />
      )}
      <p className="disclaimer-line">
        Demo software. {readingFor("heart_rate")?.guide.whyInSpaceflight}
      </p>
    </section>
  );
}
