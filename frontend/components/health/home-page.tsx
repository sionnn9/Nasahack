"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Moon, Radio, ShieldAlert, Sun } from "lucide-react";
import StarBorder from "../StarBorder";
import { crew, missionConfig } from "@/lib/mission-config";
import { useStore } from "@/lib/store";
import type { CrewMember } from "@/lib/types";

const starColors: Record<string, string> = {
  mint: "#5CF2C0",
  blue: "#7AB0FF",
  amber: "#FFB65C",
  rose: "#FF9FBA",
};

export function HomePage() {
  const router = useRouter();
  const theme = useStore((state) => state.theme);
  const toggleTheme = useStore((state) => state.toggleTheme);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const earthTime = now
    ? now.toLocaleTimeString("en-GB", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--:--:--";

  const openPerson = (person: CrewMember) => router.push(`/crew/${person.id}`);

  return (
    <section className="home-page">
      <div className="home-top">
        <div className="earth-time">
          <span className="live-dot" /> EARTH · UTC <b>{earthTime}</b>
        </div>
        <button
          className="icon-button theme-button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </button>
      </div>

      <div className="home-content">
        <div className="eyebrow">
          <span className="eyebrow-line" /> {missionConfig.missionName.toUpperCase()} · CREW HEALTH
        </div>
        <h1>Who are you?</h1>
        <p className="home-subtitle">
          Choose your profile to see today&apos;s readings and check-in.
        </p>

        <div className="crew-grid">
          {crew.map((person, index) => (
            <StarBorder
              key={person.id}
              className={`crew-card ${person.color}`}
              onClick={() => openPerson(person)}
              style={{ animationDelay: `${index * 80}ms` }}
              color={starColors[person.color] ?? (theme === "dark" ? "#ffffff" : "#334155")}
              trailColor={starColors[person.color] ?? (theme === "dark" ? "#ffffff" : "#334155")}
              duration={4}
              direction="clockwise"
              stars={1}
              trailLength={0.3}
              thickness={1}
              radius={20}
              glow={0.6}
              hover="lap"
              sparkle={false}
              clickPulse
              theme={theme}
              backgroundColor="var(--surface)"
              textColor="var(--text)"
              borderColor="var(--border)"
            >
              <span className="avatar">{person.initials}</span>
              <span className="crew-copy">
                <strong>{person.name}</strong>
                <small>{person.role}</small>
              </span>
              <ChevronRight className="crew-chevron" />
            </StarBorder>
          ))}
        </div>

        <Link className="emergency-cta" href="/emergency">
          <ShieldAlert />
          <span>HELP A CREWMATE</span>
          <span className="emergency-sub">Opens instantly, no typing needed</span>
        </Link>

        <div className="home-links">
          <Link className="text-button" href="/outbox">
            <Radio aria-hidden="true" /> Outbox &amp; link
          </Link>
          <Link className="text-button" href="/reports">
            Handoff &amp; reports
          </Link>
          <Link className="text-button" href="/surgeon">
            Ground console (demo)
          </Link>
        </div>
      </div>

      <div className="home-footer">
        <span className="orbit-mark" /> CREW SIGNAL <span className="footer-sep">/</span> MISSION DAY{" "}
        {missionConfig.missionDay}
      </div>
    </section>
  );
}
