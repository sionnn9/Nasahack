"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Moon, ShieldAlert, Sun } from "lucide-react";
import { useStore } from "@/lib/store";

export function CrewNav({ crewId }: { crewId?: string }) {
  const pathname = usePathname();
  const theme = useStore((state) => state.theme);
  const toggleTheme = useStore((state) => state.toggleTheme);

  const tabs = crewId
    ? [
        { href: `/crew/${crewId}`, label: "Daily" },
        { href: "/reports", label: "Handoff" },
        { href: "/outbox", label: "Outbox" },
      ]
    : [
        { href: "/reports", label: "Handoff" },
        { href: "/outbox", label: "Outbox" },
      ];

  return (
    <nav className="nav-bar" aria-label="Primary">
      <Link className="nav-back" href={crewId ? "/" : "/"}>
        <ChevronLeft aria-hidden="true" /> {crewId ? "Crew" : "Home"}
      </Link>
      <div className="nav-tabs">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={pathname === tab.href ? "active" : ""}
            aria-current={pathname === tab.href ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <div className="nav-actions">
        <button
          className="icon-button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </button>
        <Link className="nav-emergency" href="/emergency">
          <ShieldAlert aria-hidden="true" /> Emergency
        </Link>
      </div>
    </nav>
  );
}
