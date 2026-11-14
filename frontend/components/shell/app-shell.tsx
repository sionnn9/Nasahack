"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Particles } from "@/components/health/particles";
import { LinkRibbon } from "@/components/shell/link-ribbon";
import { EmergencyBar } from "@/components/shell/emergency-bar";
import { useStore } from "@/lib/store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const theme = useStore((state) => state.theme);
  const largeText = useStore((state) => state.largeText);
  const nightWatch = useStore((state) => state.nightWatch);
  const toast = useStore((state) => state.toast);
  const storageError = useStore((state) => state.storageError);
  const hydrate = useStore((state) => state.hydrate);
  const advanceOutbox = useStore((state) => state.advanceOutbox);
  const refreshOutbox = useStore((state) => state.refreshOutbox);
  const clearToast = useStore((state) => state.clearToast);
  const pathname = usePathname();
  const emergencyMode = pathname.startsWith("/emergency");

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void advanceOutbox();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [advanceOutbox]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(clearToast, 5000);
    return () => window.clearTimeout(timer);
  }, [toast, clearToast]);

  // The mock ground console lives in another tab; keep the outbox honest.
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel("crewsignal-outbox");
      channel.onmessage = () => void refreshOutbox();
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key?.startsWith("crewsignal:repo:")) void refreshOutbox();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      channel?.close();
    };
  }, [refreshOutbox]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return (
    <div
      className={`app-shell ${theme} ${largeText ? "large-text" : ""} ${
        nightWatch ? "night-watch" : ""
      } ${emergencyMode ? "emergency-mode" : ""}`}
    >
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      {!emergencyMode && <Particles />}
      <LinkRibbon />
      <div id="main-content">{children}</div>
      <EmergencyBar />
      <div className="sr-only" aria-live="polite" role="status">
        {toast?.message ?? ""}
      </div>
      {toast && (
        <div className={`app-toast toast-${toast.tone}`} role="status">
          {toast.message}
        </div>
      )}
      {storageError && (
        <div className="storage-warning" role="alert">
          {storageError}
        </div>
      )}
    </div>
  );
}
