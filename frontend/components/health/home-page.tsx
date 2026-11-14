"use client";

import { ChevronRight, Moon, ShieldAlert, Sun } from "lucide-react";
import { crew, type CrewMember } from "./health-data";

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
  return (
    <section className="home-page">
      <div className="home-top">
        <div className="earth-time">
          <span className="live-dot" /> EARTH · UTC{" "}
          <b>
            {time.toLocaleTimeString("en-GB", {
              timeZone: "UTC",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </b>
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
            <button
              key={person.name}
              className={`crew-card ${person.color}`}
              onClick={() => onOpenPerson(person)}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <span className="avatar">{person.initials}</span>
              <span className="crew-copy">
                <strong>{person.name}</strong>
                <small>{person.role}</small>
              </span>
              <ChevronRight className="crew-chevron" />
            </button>
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
