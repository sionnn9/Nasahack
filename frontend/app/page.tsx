"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { DashboardPage } from "@/components/health/dashboard-page";
import { EmergencyScreen } from "@/components/health/emergency-screen";
import { FormDrawer } from "@/components/health/form-drawer";
import { HomePage } from "@/components/health/home-page";
import { ReportsPage } from "@/components/health/reports-page";
import { Particles } from "@/components/health/visualizations";
import {
  createEmptyCheckIn,
  crew,
  formatUtcTime,
  getWellbeingHistory,
  type BodyArea,
  type CrewMember,
  type DailyCheckIn,
  type PageName,
  type TimelineEvent,
} from "@/components/health/health-data";
import { useHealthSimulation } from "@/components/health/use-health-simulation";

type PrivateSupportRequest = {
  crewId: string;
  requestedAt: string;
};

const checkInStorageKey = `crewsignal-daily-checkins-v2:${new Date().toISOString().slice(0, 10)}`;
const supportOutboxStorageKey = "crewsignal-private-outbox-v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseCheckIn(value: unknown): DailyCheckIn | null {
  if (!isRecord(value)) return null;

  const stringValue = (key: string) =>
    typeof value[key] === "string" ? value[key] : "";
  const optionalString = (key: string) =>
    typeof value[key] === "string" ? value[key] : null;

  return {
    sleepHours: stringValue("sleepHours"),
    sleepMinutes: stringValue("sleepMinutes"),
    bloodSugar: stringValue("bloodSugar"),
    bloodSugarUnavailable: value.bloodSugarUnavailable === true,
    mood: stringValue("mood"),
    stress: stringValue("stress"),
    rested: stringValue("rested"),
    connected: stringValue("connected"),
    symptoms: Array.isArray(value.symptoms)
      ? value.symptoms.filter(
          (symptom): symptom is string => typeof symptom === "string",
        )
      : [],
    details: stringValue("details"),
    enteredAt: optionalString("enteredAt"),
    savedAt: optionalString("savedAt"),
  };
}

function parseCheckIns(raw: string | null): Record<string, DailyCheckIn> {
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) {
    throw new Error("Stored check-in data has an invalid shape.");
  }

  const entries = Object.entries(parsed).map(([crewId, value]) => {
    const checkIn = parseCheckIn(value);
    if (!checkIn) throw new Error("Stored check-in data has an invalid entry.");
    return [crewId, checkIn];
  });
  return Object.fromEntries(entries);
}

function parseSupportOutbox(raw: string | null): PrivateSupportRequest[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Stored private outbox data has an invalid shape.");
  }
  return parsed.map((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.crewId !== "string" ||
      typeof entry.requestedAt !== "string"
    ) {
      throw new Error("Stored private outbox data has an invalid entry.");
    }
    return { crewId: entry.crewId, requestedAt: entry.requestedAt };
  });
}

function App() {
  const [astronaut, setAstronaut] = useState<CrewMember | null>(null);
  const [page, setPage] = useState<PageName>("home");
  const [dark, setDark] = useState(true);
  const [selected, setSelected] = useState<BodyArea>("Heart");
  const [headTab, setHeadTab] = useState<"mood" | "sleep">("mood");
  const [formOpen, setFormOpen] = useState(false);
  const [offline, setOffline] = useState(false);
  const [includePrivate, setIncludePrivate] = useState(false);
  const [time, setTime] = useState(() => new Date(0));
  const [checkIns, setCheckIns] = useState<Record<string, DailyCheckIn>>({});
  const [supportOutbox, setSupportOutbox] = useState<PrivateSupportRequest[]>(
    [],
  );
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState("");
  const [who, setWho] = useState("");
  const [story, setStory] = useState("");
  const [step, setStep] = useState(0);
  const [checking, setChecking] = useState(false);
  const simulation = useHealthSimulation(
    astronaut?.restingHeartRate ?? crew[0].restingHeartRate,
    astronaut?.id ?? crew[0].id,
  );
  const activeAstronaut = astronaut ?? crew[0];
  const checkIn = astronaut
    ? checkIns[astronaut.id] ?? createEmptyCheckIn()
    : createEmptyCheckIn();
  const wellbeingHistory = getWellbeingHistory(activeAstronaut.id);
  const supportRequested = supportOutbox.some(
    (request) => request.crewId === activeAstronaut.id,
  );
  const savedCheckInEvent: TimelineEvent | null = checkIn.savedAt
    ? {
        label: "Daily check-in saved",
        time: formatUtcTime(checkIn.savedAt),
        kind: "check-in",
      }
    : null;
  const timelineEvents: TimelineEvent[] = [
    { label: "Exercise session", time: "08:15", kind: "exercise" },
    { label: "Meal", time: "12:30", kind: "meal" },
    ...(savedCheckInEvent ? [savedCheckInEvent] : []),
  ];

  useEffect(() => {
    try {
      const preference = localStorage.getItem("crewsignal-theme");
      if (preference) {
        setDark(preference === "dark");
      } else {
        setDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
      }
      setCheckIns(parseCheckIns(localStorage.getItem(checkInStorageKey)));
      setSupportOutbox(
        parseSupportOutbox(localStorage.getItem(supportOutboxStorageKey)),
      );
    } catch {
      setToast("Saved data could not be loaded from this device.");
    } finally {
      setStorageLoaded(true);
    }

    setTime(new Date());
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!storageLoaded) return;
    try {
      localStorage.setItem(checkInStorageKey, JSON.stringify(checkIns));
      localStorage.setItem(
        supportOutboxStorageKey,
        JSON.stringify(supportOutbox),
      );
    } catch {
      setToast("Changes are available for this session but could not be saved.");
    }
  }, [checkIns, storageLoaded, supportOutbox]);

  const changeTheme = () => {
    setDark((current) => {
      const next = !current;
      try {
        localStorage.setItem("crewsignal-theme", next ? "dark" : "light");
      } catch {
        setToast("Theme preference could not be saved on this device.");
      }
      return next;
    });
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const saveForm = (draft: DailyCheckIn) => {
    const now = new Date();
    const savedCheckIn = {
      ...draft,
      enteredAt: formatUtcTime(now),
      savedAt: now.toISOString(),
    };
    if (astronaut) {
      setCheckIns((current) => ({
        ...current,
        [astronaut.id]: savedCheckIn,
      }));
    }
    setFormOpen(false);
    showToast("Saved");
  };

  const openPerson = (person: CrewMember) => {
    setAstronaut(person);
    setPage("daily");
    setSelected("Heart");
    setHeadTab("mood");
    window.dispatchEvent(new Event("start-tutorial"));
  };

  const beginSensorCheck = () => {
    setChecking(true);
    window.setTimeout(() => setChecking(false), 10000);
  };

  const sendEmergency = () => {
    setPage("emergency");
    setStep(0);
  };

  const back = () => {
    if (page === "emergency") {
      setPage(astronaut ? "daily" : "home");
      return;
    }
    if (page === "reports") {
      setPage(astronaut ? "daily" : "home");
      return;
    }
    setPage("home");
    setAstronaut(null);
  };

  const requestPrivateSupport = () => {
    const request = {
      crewId: activeAstronaut.id,
      requestedAt: new Date().toISOString(),
    };
    setSupportOutbox((current) => [...current, request]);
    showToast("Private support request saved to your outbox.");
  };

  return (
    <main
      className={`app-shell ${dark ? "dark" : "light"} ${page === "emergency" ? "emergency-mode" : ""}`}
    >
      {page !== "emergency" && <Particles />}

      {page === "home" && (
        <HomePage
          dark={dark}
          time={time}
          onToggleTheme={changeTheme}
          onOpenPerson={openPerson}
          onEmergency={sendEmergency}
        />
      )}

      {page === "emergency" && (
        <EmergencyScreen
          time={time}
          who={who}
          story={story}
          step={step}
          saveReport={() => {
            setStep(4);
            setSaved(true);
          }}
          onBack={back}
          onWhoSelect={setWho}
          onStoryChange={setStory}
          onContinue={() => setStep((current) => current + 1)}
          onReportView={() => setPage("reports")}
        />
      )}

      {page === "daily" && astronaut && (
        <DashboardPage
          astronaut={astronaut}
          page={page}
          dark={dark}
          time={time}
          checking={checking}
          selected={selected}
          headTab={headTab}
          checkIn={checkIn}
          vitals={simulation.vitals}
          histories={simulation.histories}
          quality={simulation.quality}
          qualityOverride={simulation.qualityOverride}
          wellbeingHistory={wellbeingHistory}
          supportRequested={supportRequested}
          timelineEvents={timelineEvents}
          onThemeToggle={changeTheme}
          onSendEmergency={sendEmergency}
          onBack={back}
          onOpenForm={() => setFormOpen(true)}
          onBeginSensorCheck={beginSensorCheck}
          onSelectArea={(area) => setSelected(area)}
          onSetPage={setPage}
          onHeadTabChange={setHeadTab}
          onQualityOverrideChange={simulation.onQualityOverrideChange}
          onRequestSupport={requestPrivateSupport}
        />
      )}

      {page === "reports" && (
        <ReportsPage
          astronaut={activeAstronaut}
          checkIn={checkIn}
          vitals={simulation.vitals}
          quality={simulation.quality}
          time={time}
          dark={dark}
          offline={offline}
          includePrivate={includePrivate}
          hasAstronaut={!!astronaut}
          onEdit={() => setFormOpen(true)}
          onBack={back}
          onSetPage={setPage}
          onThemeToggle={changeTheme}
          onSendEmergency={sendEmergency}
          onToggleOffline={setOffline}
          onTogglePrivate={setIncludePrivate}
          onSend={() => showToast("Report queued for Earth.")}
        />
      )}

      {formOpen && (
        <FormDrawer
          initialValue={checkIn}
          onClose={() => setFormOpen(false)}
          onSave={saveForm}
        />
      )}

      {saved && page === "emergency" && (
        <div className="situation-box">
          <strong>
            Situation report ·{" "}
            {time.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </strong>
          <p>
            {who || "Crew member"}: {story || "Emergency support requested."}
          </p>
          <button
            className="text-button"
            onClick={() => setPage("reports")}
          >
            Add to Reports <ChevronRight />
          </button>
        </div>
      )}

      {toast && (
        <div className="app-toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}

export default App;