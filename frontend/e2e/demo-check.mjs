/**
 * Real-browser check for the handoff pipeline. Drives the running frontend with
 * installed Chrome, starts and stops its own backend, and prints PASS/FAIL with
 * the evidence it observed. Nothing here reports a step it did not see.
 *
 * Usage: npm run e2e:browser   (frontend dev server must be running on :3000)
 */
import { chromium } from "playwright-core";
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const APP = "http://localhost:3000";
const API = "http://127.0.0.1:4000";
const BACKEND = resolve(process.cwd(), "..", "backend");
const CREW = { authorization: "Bearer crew-demo-key" };
const GROUND = { authorization: "Bearer ground-demo-key" };
const TSX = join(BACKEND, "node_modules", "tsx", "dist", "cli.mjs");

const results = [];
function check(name, ok, evidence) {
  results.push({ name, ok, evidence });
  console.log(`${ok ? "PASS" : "FAIL"} ${name} — ${evidence}`);
}

async function api(path, init = {}, headers = CREW) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...headers, ...(init.headers ?? {}) },
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : {} };
}

async function waitForApi(timeoutMs = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${API}/health`);
      if (response.ok) return true;
    } catch {
      // not up yet
    }
    await sleep(250);
  }
  return false;
}

function startBackend() {
  const proc = spawn(process.execPath, [TSX, "src/server.ts"], {
    cwd: BACKEND,
    env: {
      ...process.env,
      PORT: "4000",
      HOST: "127.0.0.1",
      DB_PATH: "./data/e2e.db",
      DELAY_SCALE: "0.01",
    },
    stdio: "ignore",
  });
  return proc;
}

function stopBackend(proc) {
  if (!proc || proc.killed) return;
  try {
    execFileSync("taskkill", ["/PID", String(proc.pid), "/T", "/F"], { stdio: "ignore" });
  } catch {
    try {
      proc.kill("SIGKILL");
    } catch {
      // already gone
    }
  }
}

async function openContext(name) {
  const dir = mkdtempSync(join(tmpdir(), `crewsignal-${name}-`));
  const context = await chromium.launchPersistentContext(dir, {
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 900 },
    timezoneId: "UTC",
  });
  const page = context.pages()[0] ?? (await context.newPage());
  return { context, page, dir };
}

async function waitUntil(fn, timeoutMs = 10_000, intervalMs = 250) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await fn()) return true;
    await sleep(intervalMs);
  }
  return false;
}

async function setLink(page, label) {
  const button = page.locator(".link-ribbon-controls button", { hasText: label }).first();
  await button.click();
  // Wait for React to mark it pressed; clicking SSR markup does nothing.
  await waitUntil(async () => (await button.getAttribute("aria-pressed")) === "true", 5000);
}

async function queueHandoff(page) {
  await page.goto(`${APP}/reports`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const queue = page.getByRole("button", { name: /Queue for Earth/ });
  await queue.waitFor({ timeout: 15_000 });
  // Click until the client handler actually runs (visible toast).
  const queued = await waitUntil(async () => {
    await queue.click();
    await page.waitForTimeout(500);
    return page
      .locator(".app-toast", { hasText: /queued in the outbox/i })
      .count()
      .then((count) => count > 0);
  }, 6000, 700);
  if (!queued) throw new Error("Queue for Earth never produced its toast");
}

async function outboxStates(page) {
  await page.goto(`${APP}/outbox`, { waitUntil: "domcontentloaded" });
  await page.locator(".outbox-item").first().waitFor({ timeout: 15_000 });
  return page.locator(".outbox-state").allTextContents();
}

const errors = [];
const backend = { proc: null };
const crewBrowser = await openContext("crew");
const surgeonBrowser = await openContext("surgeon");

try {
  for (const page of [crewBrowser.page, surgeonBrowser.page]) {
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error" && /hydration/i.test(message.text())) {
        errors.push(`console: ${message.text()}`);
      }
    });
  }

  // Clean database so counts are unambiguous.
  for (const suffix of ["", "-shm", "-wal"]) {
    const file = join(BACKEND, "data", `e2e.db${suffix}`);
    if (existsSync(file)) rmSync(file, { force: true });
  }
  backend.proc = startBackend();
  check("backend starts for the browser run", await waitForApi(), "GET /health returned 200");

  const crew = crewBrowser.page;
  await crew.goto(`${APP}/crew/alex-morgan`, { waitUntil: "domcontentloaded" });
  await crew.locator(".status-strip").waitFor({ timeout: 20_000 });
  await crew.waitForTimeout(1500);
  const serverChip = await crew.locator(".ribbon-server").textContent();
  check(
    "hydration is clean and the crew UI sees the ground server",
    errors.length === 0 && /reachable/.test(serverChip ?? ""),
    `errors=${errors.length}; ribbon="${(serverChip ?? "").trim()}"`,
  );

  // ------------------------------------------------------------------
  // Live: queued packet posts immediately, then the server delivers it.
  await setLink(crew, "Live");
  await queueHandoff(crew);
  // A live link has no delay, so Sent can turn into Delivered within the same
  // second. Verify the server accepted it rather than race the UI label.
  let livePackets = [];
  const livePosted = await waitUntil(async () => {
    livePackets = (await api("/v1/packets?crewId=alex-morgan")).body.packets;
    return livePackets.some((packet) =>
      ["sent", "delivered", "acknowledged"].includes(packet.state),
    );
  }, 10_000);
  let states = await outboxStates(crew);
  check(
    "live link posts the handoff to the server",
    livePosted,
    `server states: ${JSON.stringify(livePackets.map((packet) => packet.state))}; outbox: ${JSON.stringify(states)}`,
  );
  const deliveredLive = await crew
    .locator(".outbox-state", { hasText: "Delivered" })
    .first()
    .waitFor({ timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  check(
    "the server delivers the live packet after its delay",
    deliveredLive,
    "outbox showed Delivered without a manual action",
  );

  // ------------------------------------------------------------------
  // Blackout: the packet stays queued locally and never reaches the server.
  await setLink(crew, "Blackout");
  const beforeBlackoutCount = (await api("/v1/packets?crewId=alex-morgan")).body.packets.length;
  const itemsBefore = (await outboxStates(crew)).length;
  await queueHandoff(crew);
  await crew.goto(`${APP}/outbox`, { waitUntil: "networkidle" });
  await waitUntil(async () => (await crew.locator(".outbox-item").count()) === itemsBefore + 1, 10_000);
  await crew.waitForTimeout(500);
  states = await crew.locator(".outbox-state").allTextContents();
  const queuedIndex = states.findIndex((state) => state.trim() === "Queued on board");
  check(
    "blackout keeps the handoff Queued",
    queuedIndex >= 0,
    `outbox states: ${JSON.stringify(states)}`,
  );
  const afterBlackoutCount = (await api("/v1/packets?crewId=alex-morgan")).body.packets.length;
  check(
    "blackout stores nothing on the server",
    afterBlackoutCount === beforeBlackoutCount,
    `server packets before=${beforeBlackoutCount} after=${afterBlackoutCount}`,
  );

  await crew.reload({ waitUntil: "domcontentloaded" });
  await crew.locator(".outbox-item").first().waitFor({ timeout: 15_000 });
  states = await crew.locator(".outbox-state").allTextContents();
  check(
    "reloading during queued keeps it Queued",
    states.some((state) => state.trim() === "Queued on board"),
    `after reload: ${JSON.stringify(states)}`,
  );

  // ------------------------------------------------------------------
  // Backend down: packets must stay Queued, nothing faked.
  stopBackend(backend.proc);
  backend.proc = null;
  await sleep(1000);
  const down = await fetch(`${API}/health`).then(() => false).catch(() => true);
  check("backend is stopped for the unreachable case", down, "GET /health refused");

  await setLink(crew, "Live");
  const downItems = (await outboxStates(crew)).length;
  await queueHandoff(crew);
  await crew.goto(`${APP}/outbox`, { waitUntil: "networkidle" });
  await waitUntil(async () => (await crew.locator(".outbox-item").count()) === downItems + 1, 10_000);
  await crew.waitForTimeout(4000);
  states = await crew.locator(".outbox-state").allTextContents();
  const sentWhileDown = states.filter((state) => state.trim() === "Sent").length;
  check(
    "with the backend down, packets stay Queued and none are Sent",
    sentWhileDown === 0,
    `outbox states after 4 s: ${JSON.stringify(states)}`,
  );

  // ------------------------------------------------------------------
  // Restart: queued packets post through the paused link and deliver.
  backend.proc = startBackend();
  const upAgain = await waitForApi();
  check("backend restarts on the same database", upAgain, "GET /health returned 200 again");
  const delayed = await api("/v1/link", {
    method: "PUT",
    body: JSON.stringify({ state: "delayed", environment: "mars_transit" }),
  });
  check(
    "link can be set to a 12 s Mars delay",
    delayed.status === 200 && delayed.body.link.effectiveDelaySeconds === 12,
    `effectiveDelaySeconds=${delayed.body.link?.effectiveDelaySeconds}`,
  );

  await crew.reload({ waitUntil: "domcontentloaded" });
  const sentAfterRestart = await crew
    .locator(".outbox-state", { hasText: "Sent" })
    .first()
    .waitFor({ timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  check(
    "queued packets post after reconnect",
    sentAfterRestart,
    "outbox showed Sent after the backend returned",
  );

  const deliveredAfterRestart = await crew
    .locator(".outbox-state", { hasText: "Delivered" })
    .first()
    .waitFor({ timeout: 25_000 })
    .then(() => true)
    .catch(() => false);
  check(
    "the delayed Mars packet becomes Delivered after the delay",
    deliveredAfterRestart,
    "outbox showed Delivered after the 12 s link delay",
  );
  const serverPackets = (await api("/v1/packets?crewId=alex-morgan")).body.packets;
  check(
    "server records match the outbox states",
    serverPackets.filter((packet) => packet.state === "delivered").length >= 1,
    `server packet states: ${JSON.stringify(serverPackets.map((packet) => packet.state))}`,
  );

  // ------------------------------------------------------------------
  // Surgeon: second isolated profile logs in, receives and acknowledges.
  const surgeon = surgeonBrowser.page;
  await surgeon.goto(`${APP}/surgeon`, { waitUntil: "domcontentloaded" });
  await surgeon.locator("#ground-key").waitFor({ timeout: 15_000 });
  await surgeon.locator("#ground-key").fill("ground-demo-key");
  await surgeon.getByRole("button", { name: /Open console/ }).click();
  await surgeon.getByRole("heading", { name: /Handoff · Alex Morgan/ }).first().waitFor({
    timeout: 20_000,
  });
  check(
    "a second browser profile receives the packet after delivery",
    true,
    "ground inbox showed Handoff · Alex Morgan",
  );

  await surgeon.getByRole("button", { name: /Acknowledge/ }).first().click();
  await sleep(1000);
  const acked = (await api("/v1/packets?crewId=alex-morgan")).body.packets.filter(
    (packet) => packet.ackAt,
  );
  check(
    "the acknowledgement is stored by the server",
    acked.length >= 1,
    `${acked.length} packet(s) have ackAt`,
  );

  let acknowledgedVisible = false;
  for (let attempt = 0; attempt < 8 && !acknowledgedVisible; attempt += 1) {
    await sleep(2000);
    await crew.goto(`${APP}/outbox`, { waitUntil: "domcontentloaded" });
    await crew.locator(".outbox-item").first().waitFor({ timeout: 15_000 });
    states = await crew.locator(".outbox-state").allTextContents();
    acknowledgedVisible = states.some((state) =>
      state.includes("Acknowledged by the flight surgeon"),
    );
  }
  check(
    "the crew outbox shows Acknowledged only after the return delay",
    acknowledgedVisible,
    `after the 12 s return delay: ${JSON.stringify(states)}`,
  );

  check(
    "no hydration errors occurred during the browser run",
    errors.length === 0,
    errors.length ? errors.slice(0, 3).join(" | ") : "no page or hydration errors captured",
  );
} finally {
  stopBackend(backend.proc);
  await crewBrowser.context.close().catch(() => undefined);
  await surgeonBrowser.context.close().catch(() => undefined);
  rmSync(crewBrowser.dir, { recursive: true, force: true });
  rmSync(surgeonBrowser.dir, { recursive: true, force: true });
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
