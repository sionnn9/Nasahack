"use client";

import { ChevronRight, Moon, ShieldAlert, Sun } from "lucide-react";
import StarBorder from "../StarBorder";
import { crew, type CrewMember } from "./health-data";

const starColors: Record<string, string> = {
  mint: "#5CF2C0",
  blue: "#7AB0FF",
  amber: "#FFB65C",
  rose: "#FF9FBA",
};

function HomePage({
  dark,
  time,
  onToggleTheme,
  onOpenPerson,
  onEmergency,
}: {
  dark: boolean;
  time: Date;
  onToggleTheme: () => void;
  onOpenPerson: (person: CrewMember) => void;
  onEmergency: () => void;
}) {
  const earthTime =
    time.getTime() === 0
      ? "--:--:--"
      : time.toLocaleTimeString("en-GB", {
          timeZone: "UTC",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

  return (
    <section className="home-page">
      <div className="home-top">
        <div className="earth-time">
          <span className="live-dot" /> EARTH · UTC <b>{earthTime}</b>
        </div>
        <button
          className="icon-button theme-button"
          onClick={onToggleTheme}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun /> : <Moon />}
        </button>
      </div>

      <div className="home-content">
        <div className="eyebrow">
          <span className="eyebrow-line" /> MARS TRANSIT · CREW HEALTH
        </div>
        <h1>Who are you?</h1>
        <p className="home-subtitle">
          Choose your profile to begin today&apos;s check-in.
        </p>

        <div className="crew-grid">
          {crew.map((person, index) => (
            <StarBorder
              key={person.name}
              className={`crew-card ${person.color}`}
              onClick={() => onOpenPerson(person)}
              style={{ animationDelay: `${index * 80}ms` }}
              color={starColors[person.color] ?? (dark ? "#ffffff" : "#334155")}
              trailColor={
                starColors[person.color] ?? (dark ? "#ffffff" : "#334155")
              }
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
              theme={dark ? "dark" : "light"}
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

        <button className="emergency-cta" onClick={onEmergency}>
          <ShieldAlert />
          <span>EMERGENCY</span>
          <span className="emergency-sub">Get help now</span>
        </button>
      </div>

      <div className="home-footer">
        <span className="orbit-mark" /> CREW SIGNAL{" "}
        <span className="footer-sep">/</span> MISSION DAY 184
      </div>
    </section>
  );
}

export { HomePage };
