"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

type Step = {
  key: string;
  title: string;
  body: string;
  match?: RegExp;
  selector?: string;
  grow?: boolean;
};

type TutorialProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const BUTTONS = "button, a, [role='button']";

const steps: Step[] = [
  {
    key: "welcome",
    title: "Welcome aboard",
    body: "Let's take a quick tour. It takes under a minute.",
  },
  {
    key: "body",
    title: "Body view",
    body: "Tap a body area, like the heart or head, to see its live readings.",
    match: /^Heart$/,
    selector: "h1, h2, h3, h4, p, span, div",
    grow: true,
  },
  {
    key: "sensor",
    title: "Sensor check",
    body: "Press this to run a 10-second check of your sensors.",
    match: /sensor/i,
    selector: BUTTONS,
  },
  {
    key: "checkin",
    title: "Daily check-in",
    body: "Log your sleep, mood and symptoms here once a day.",
    match: /check-?in/i,
    selector: BUTTONS,
  },
  {
    key: "support",
    title: "Private support",
    body: "Need to talk to someone? Request help privately from here.",
    match: /support/i,
    selector: BUTTONS,
  },
  {
    key: "reports",
    title: "Reports",
    body: "View your report and queue it to be sent to Earth.",
    match: /report/i,
    selector: BUTTONS,
  },
  {
    key: "emergency",
    title: "Emergency",
    body: "Something urgent? Use this to send an emergency report.",
    match: /emergency/i,
    selector: BUTTONS,
  },
];

const CARD_W = 340;
const CARD_H = 200;
const ARROW = 18;

function findTarget(step: Step): Element | null {
  const tagged = document.querySelector(`[data-tour="${step.key}"]`);
  if (tagged) return tagged;

  const match = step.match;
  if (!match) return null;

  const nodes = Array.from(document.querySelectorAll(step.selector ?? BUTTONS));
  const element = nodes.find((node) => {
    if (node.closest('[aria-label="App tutorial"]')) return false;
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    return match.test((node.textContent || "").trim());
  });
  if (!element) return null;

  if (step.grow) {
    let current = element;
    while (current.parentElement && current.parentElement !== document.body) {
      const rect = current.getBoundingClientRect();
      if (rect.width >= 300 && rect.height >= 200) break;
      current = current.parentElement;
    }
    return current;
  }
  return element;
}

export default function Tutorial({ open, onOpenChange }: TutorialProps) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const current = steps[step];
    let scrolled = false;

    const update = () => {
      const element = findTarget(current);
      if (!element) {
        setRect(null);
        return;
      }
      if (!scrolled) {
        element.scrollIntoView({ block: "center", behavior: "smooth" });
        scrolled = true;
      }
      setRect(element.getBoundingClientRect());
    };

    update();
    const intervalId = window.setInterval(update, 250);
    window.addEventListener("resize", update);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("resize", update);
    };
  }, [open, step]);

  if (!open) return null;

  const isLast = step === steps.length - 1;
  const current = steps[step];
  const cardW = Math.min(CARD_W, window.innerWidth - 32);

  let cardStyle: CSSProperties;
  let below = true;
  let arrowLeft = 0;

  if (rect) {
    below = rect.bottom + 24 + CARD_H < window.innerHeight;
    const top = below ? rect.bottom + 24 : Math.max(16, rect.top - 24 - CARD_H);
    const left = Math.min(
      Math.max(16, rect.left),
      Math.max(16, window.innerWidth - cardW - 16),
    );
    cardStyle = { top, left };
    const targetCenter = rect.left + rect.width / 2;
    arrowLeft = Math.min(
      Math.max(16, targetCenter - left - ARROW / 2),
      cardW - ARROW - 16,
    );
  } else {
    cardStyle = {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App tutorial"
      style={{ position: "fixed", inset: 0, zIndex: 2147483647 }}
    >
      <style>{`
        @keyframes tour-bounce-down { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes tour-bounce-up { 0%,100% { transform: translateY(0); } 50% { transform: translateY(6px); } }
      `}</style>

      {rect ? (
        <div
          style={{
            position: "fixed",
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            borderRadius: 14,
            boxShadow:
              "0 0 0 9999px rgba(3,6,20,0.78), 0 0 0 2px #ff7a3d, 0 0 28px 4px rgba(255,122,61,0.55)",
            pointerEvents: "none",
            transition: "all 0.3s ease",
          }}
        />
      ) : (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3,6,20,0.78)",
            backdropFilter: "blur(6px)",
          }}
        />
      )}

      <div
        style={{
          position: "fixed",
          width: cardW,
          padding: 22,
          borderRadius: 16,
          color: "#f1f5f9",
          background: "linear-gradient(160deg, #111a3a 0%, #0a0f24 100%)",
          border: "1px solid rgba(255,140,80,0.35)",
          boxShadow: "0 10px 50px rgba(0,0,0,0.5)",
          transition: "top 0.3s ease, left 0.3s ease",
          ...cardStyle,
        }}
      >
        {rect && (
          <div
            style={{
              position: "absolute",
              left: arrowLeft,
              ...(below ? { top: -ARROW - 2 } : { bottom: -ARROW - 2 }),
              width: ARROW,
              height: ARROW,
              animation: `${below ? "tour-bounce-down" : "tour-bounce-up"} 1s ease-in-out infinite`,
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: `${ARROW / 2 + 2}px solid transparent`,
                borderRight: `${ARROW / 2 + 2}px solid transparent`,
                ...(below
                  ? { borderBottom: `${ARROW}px solid #ff7a3d` }
                  : { borderTop: `${ARROW}px solid #ff7a3d` }),
                marginLeft: -2,
              }}
            />
          </div>
        )}

        <p style={{ margin: "0 0 6px", fontSize: 12, color: "#ff7a3d" }}>
          Step {step + 1} of {steps.length}
        </p>
        <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 600 }}>
          {current.title}
        </h2>
        <p style={{ margin: 0, lineHeight: 1.55, color: "#94a3b8" }}>
          {current.body}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 18,
          }}
        >
          <button
            onClick={() => onOpenChange(false)}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Skip
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 10,
                  cursor: "pointer",
                  color: "#f1f5f9",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={() => (isLast ? onOpenChange(false) : setStep(step + 1))}
              style={{
                padding: "7px 18px",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 600,
                color: "#fff",
                background: "#ff7a3d",
                border: "none",
              }}
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
