"use client";

import { useEffect } from "react";

/**
 * Registers the offline worker that caches language models and the app shell.
 * Renders nothing; failure is silent because voice is optional.
 */
export function VoiceServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // No offline cache means the status pill simply never says "offline".
    });
  }, []);

  return null;
}
