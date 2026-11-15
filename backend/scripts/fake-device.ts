/**
 * Fake wrist/finger pulse device: one sample per second, with eight seconds of
 * lost contact every minute. It only posts what a sensor could observe; the
 * server decides quality.
 */
const API_URL = process.env.API_URL ?? "http://127.0.0.1:4000";
const DEVICE_KEY = process.env.DEVICE_KEY ?? "device-demo-key";
const DEVICE_ID = process.env.DEVICE_ID ?? "pulse-01";
const CREW_ID = process.env.CREW_ID ?? "alex-morgan";

const started = Date.now();
let contactLostUntil = 0;
let nextLossAt = started + 60_000;

function sample(): { value: number; contact: "good" | "none" } {
  const now = Date.now();
  if (now < contactLostUntil) {
    return { value: 0, contact: "none" };
  }
  // Simulated contact loss: 8 s once a minute.
  if (now >= nextLossAt) {
    contactLostUntil = now + 8000;
    nextLossAt = now + 68_000;
    console.log("simulating 8 s of contact loss");
    return { value: 0, contact: "none" };
  }
  const elapsed = (now - started) / 1000;
  const drift = Math.sin(elapsed / 7) * 4;
  const value = Math.round(72 + drift + (Math.random() - 0.5) * 4);
  return { value, contact: "good" };
}

async function postHeartRate() {
  const next = sample();
  const body = {
    deviceId: DEVICE_ID,
    crewId: CREW_ID,
    metric: "heart_rate",
    value: next.value,
    observedAt: new Date().toISOString(),
    contact: next.contact,
  };
  try {
    const response = await fetch(`${API_URL}/v1/ingest/sample`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${DEVICE_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      console.error(`sample rejected ${response.status}: ${text}`);
    } else if (next.contact === "none") {
      console.log("contact lost sample sent");
    }
  } catch (error) {
    console.error(`cannot reach backend at ${API_URL}`, error instanceof Error ? error.message : error);
  }
}

console.log(`fake device ${DEVICE_ID} -> ${API_URL} as ${CREW_ID}`);
setInterval(() => {
  void postHeartRate();
}, 1000);
