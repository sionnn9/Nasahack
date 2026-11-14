"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { DashboardPage } from "@/components/health/dashboard-page";
import { EmergencyScreen } from "@/components/health/emergency-screen";
import { FormDrawer } from "@/components/health/form-drawer";
import { HomePage } from "@/components/health/home-page";
import { ReportsPage } from "@/components/health/reports-page";
import { Particles } from "@/components/health/visualizations";
import type {
  BodyArea,
  CrewMember,
  PageName,
} from "@/components/health/health-data";

function App() {
  const [astronaut, setAstronaut] = useState<CrewMember | null>(null);
  const [page, setPage] = useState<PageName>("home");
  const [dark, setDark] = useState(true);
  const [selected, setSelected] = useState<BodyArea>("Heart");
  const [formOpen, setFormOpen] = useState(false);
  const [offline, setOffline] = useState(false);
  const [time, setTime] = useState(new Date());
  const [mood, setMood] = useState("");
  const [stress, setStress] = useState("2");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [who, setWho] = useState("");
  const [story, setStory] = useState("");
  const [step, setStep] = useState(0);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    try {
      const pref = localStorage.getItem("crewsignal-theme");
      if (pref) {
        setDark(pref === "dark");
      } else {
        setDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
      }

      const stored = localStorage.getItem("crewsignal-form");
      if (stored) {
        const data = JSON.parse(stored);
        setMood(data.mood || "");
        setStress(data.stress || "2");
        setSymptoms(data.symptoms || []);
      }
    } catch {
      // Ignore stored preference issues in preview mode.
    }

    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const changeTheme = () => {
    setDark((current) => {
      const next = !current;
      try {
        localStorage.setItem("crewsignal-theme", next ? "dark" : "light");
      } catch {
        // Ignore localStorage failures in restricted environments.
      }
      return next;
    });
  };

  const saveForm = () => {
    try {
      localStorage.setItem(
        "crewsignal-form",
        JSON.stringify({
          mood,
          stress,
          symptoms,
          savedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // Ignore localStorage failures in restricted environments.
    }

    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
    setFormOpen(false);
  };

  const openPerson = (person: CrewMember) => {
    setAstronaut(person);
    setPage("daily");
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
      setPage("daily");
      return;
    }

    setPage("home");
    setAstronaut(null);
  };

  const handleWhoSelect = (nextWho: string) => {
    setWho(nextWho);
  };

  const handleContinue = () => {
    setStep((current) => current + 1);
  };

  const handleReportView = () => {
    setPage("reports");
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
          onWhoSelect={handleWhoSelect}
          onStoryChange={setStory}
          onContinue={handleContinue}
          onReportView={handleReportView}
        />
      )}

      {page !== "home" && page !== "emergency" && (
        <>
          {page === "daily" && (
            <DashboardPage
              astronaut={astronaut}
              page={page}
              dark={dark}
              time={time}
              checking={checking}
              selected={selected}
              mood={mood}
              onThemeToggle={changeTheme}
              onSendEmergency={sendEmergency}
              onBack={back}
              onOpenForm={() => setFormOpen(true)}
              onBeginSensorCheck={beginSensorCheck}
              onSelectArea={(area) => setSelected(area)}
              onSetPage={setPage}
            />
          )}

          {page === "reports" && (
            <ReportsPage
              astronaut={astronaut}
              mood={mood}
              stress={stress}
              symptoms={symptoms}
              time={time}
              offline={offline}
              onEdit={() => setFormOpen(true)}
              onToggleOffline={setOffline}
              onSend={() => setSaved(true)}
            />
          )}
        </>
      )}

      {formOpen && (
        <FormDrawer
          mood={mood}
          stress={stress}
          symptoms={symptoms}
          onClose={() => setFormOpen(false)}
          onMoodSelect={setMood}
          onStressSelect={setStress}
          onSymptomsUpdate={setSymptoms}
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
            onClick={() => {
              setPage("reports");
            }}
          >
            Add to Reports <ChevronRight />
          </button>
        </div>
      )}
    </main>
  );
}

export default App;
