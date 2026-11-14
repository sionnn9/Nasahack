"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PhoneCall, ShieldAlert } from "lucide-react";

/**
 * Persistent action bar. It never diagnoses and never asks for typing first.
 */
export function EmergencyBar() {
  const pathname = usePathname();
  if (pathname === "/emergency" || pathname === "/emergency/drill") return null;

  return (
    <div className="emergency-bar" role="region" aria-label="Emergency actions">
      <span className="emergency-bar-label">If someone needs help now</span>
      <Link className="emergency-bar-primary" href="/emergency">
        <ShieldAlert aria-hidden="true" /> Alert the crew
      </Link>
      <Link className="emergency-bar-secondary" href="/reports">
        <PhoneCall aria-hidden="true" /> Contact medical officer
      </Link>
    </div>
  );
}
