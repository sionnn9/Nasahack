"use client";

import { create } from "zustand";
import { repository, syncedRepository } from "@/lib/repo/client";
import type { Repository } from "@/lib/repo/repository";
import {
  apiConfigured,
  fetchPackets,
  packetToOutbox,
  postPacket,
  sendLink,
  type ServerPacket,
} from "@/lib/outbox/http-transport";
import { environmentFor, missionConfig } from "@/lib/mission-config";
import { hashPin } from "@/lib/privacy";
import { seedObservations } from "@/lib/demo/seed";
import type {
  CheckIn,
  Encounter,
  EnvironmentKey,
  LinkState,
  Observation,
  OutboxItem,
  OutboxState,
} from "@/lib/types";

type Toast = { message: string; tone: "neutral" | "attention" | "ok" };

type State = {
  hydrated: boolean;
  storageError: string | null;
  theme: "dark" | "light";
  largeText: boolean;
  nightWatch: boolean;
  environment: EnvironmentKey;
  link: LinkState;
  observations: Observation[];
  checkIns: CheckIn[];
  encounters: Encounter[];
  outbox: OutboxItem[];
  toast: Toast | null;
  pinHash: string | null;
  privateUnlocked: boolean;
  serverConfigured: boolean;
  serverReachable: boolean | null;
  serverDelayScale: number;
};

type Actions = {
  hydrate: (repo?: Repository) => Promise<void>;
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;
  setLargeText: (value: boolean) => void;
  setNightWatch: (value: boolean) => void;
  setEnvironment: (value: EnvironmentKey) => Promise<void>;
  setLink: (value: LinkState) => Promise<void>;
  addObservations: (items: Observation[]) => Promise<void>;
  saveCheckIn: (checkIn: CheckIn) => Promise<void>;
  saveEncounter: (encounter: Encounter) => Promise<void>;
  enqueue: (item: OutboxItem) => Promise<void>;
  cancelOutbox: (id: string) => Promise<void>;
  acknowledge: (id: string) => Promise<void>;
  advanceOutbox: (now?: Date) => Promise<void>;
  refreshOutbox: () => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  unlockPrivate: (pin: string) => Promise<boolean>;
  lockPrivate: () => void;
  notify: (message: string, tone?: Toast["tone"]) => void;
  clearToast: () => void;
  setServerStatus: (reachable: boolean, delayScale?: number) => void;
  applyServerPacket: (packet: ServerPacket) => Promise<void>;
  reconcileOutbox: (crewId: string) => Promise<void>;
};

const THEME_KEY = "crewsignal-theme";
/** In-flight packet ids, so the 2 s tick cannot post the same packet twice. */
const posting = new Set<string>();

function readTheme(): "dark" | "light" {
  if (typeof localStorage === "undefined") return "dark";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }
  return "dark";
}

/** Pure, so the outbox timeline is testable and never fakes a receipt. */
export function nextOutboxState(
  item: OutboxItem,
  link: LinkState,
  now: Date,
): OutboxState | null {
  if (item.state !== "queued") return null;
  if (link === "blackout") return null;
  if (link === "live") return "sent";
  const created = new Date(item.createdAt).getTime();
  return now.getTime() - created >= item.delaySeconds * 1000 ? "sent" : null;
}

export const useStore = create<State & Actions>((set, get) => ({
  hydrated: false,
  storageError: null,
  theme: "dark",
  largeText: false,
  nightWatch: false,
  environment: missionConfig.environment,
  link: "live",
  observations: [],
  checkIns: [],
  encounters: [],
  outbox: [],
  toast: null,
  pinHash: null,
  privateUnlocked: false,
  serverConfigured: apiConfigured,
  serverReachable: apiConfigured ? null : false,
  serverDelayScale: 1,

  hydrate: async (repo = repository) => {
    if (get().hydrated) return;
    set({ theme: readTheme() });
    try {
      let [observations, checkIns, encounters, outbox, prefs] =
        await Promise.all([
          repo.listObservations(),
          repo.listCheckIns(),
          repo.listEncounters(),
          repo.listOutbox(),
          repo.getConfig<{ environment?: EnvironmentKey; link?: LinkState }>(
            "prefs",
          ),
        ]);
      const pinHash = await repo.getConfig<string>("pin");
      if (observations.length === 0) {
        observations = seedObservations();
        await repo.putObservations(observations);
      }

      set({
        observations,
        checkIns,
        encounters,
        outbox,
        environment: prefs?.environment ?? missionConfig.environment,
        link: prefs?.link ?? "live",
        pinHash: pinHash ?? null,
        hydrated: true,
      });

      if (syncedRepository) {
        void syncedRepository
          .pull()
          .then(async (count) => {
            if (count === 0) return;
            const [nextObservations, nextCheckIns, nextEncounters] = await Promise.all([
              repo.listObservations(),
              repo.listCheckIns(),
              repo.listEncounters(),
            ]);
            set({
              observations: nextObservations,
              checkIns: nextCheckIns,
              encounters: nextEncounters,
            });
          })
          .catch(() => undefined);
      }
    } catch {
      set({
        hydrated: true,
        storageError:
          "Saved data could not be loaded from this device. New entries will stay in this session only.",
      });
    }
  },

  setTheme: (theme) => {
    set({ theme });
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      get().notify("Theme preference could not be saved on this device.");
    }
  },

  toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
  setLargeText: (largeText) => set({ largeText }),
  setNightWatch: (nightWatch) => set({ nightWatch }),

  setEnvironment: async (environment) => {
    set({ environment });
    await repository.setConfig("prefs", { environment, link: get().link });
  },

  setLink: async (link) => {
    const environment = get().environment;
    set({ link });
    await repository.setConfig("prefs", { environment, link });
    if (apiConfigured) {
      const result = await sendLink(link, environment);
      if (result.ok) {
        set({ serverReachable: true, serverDelayScale: result.link.delayScale });
      } else {
        set({ serverReachable: false });
      }
    }
    await get().advanceOutbox();
  },

  addObservations: async (items) => {
    if (items.length === 0) return;
    set({ observations: [...get().observations, ...items] });
    await repository.putObservations(items);
  },

  saveCheckIn: async (checkIn) => {
    set({
      checkIns: [
        ...get().checkIns.filter((entry) => entry.id !== checkIn.id),
        checkIn,
      ],
    });
    await repository.putCheckIn(checkIn);
  },

  saveEncounter: async (encounter) => {
    set({
      encounters: [
        ...get().encounters.filter((entry) => entry.id !== encounter.id),
        encounter,
      ],
    });
    await repository.putEncounter(encounter);
  },

  enqueue: async (item) => {
    set({ outbox: [...get().outbox.filter((row) => row.id !== item.id), item] });
    await repository.putOutboxItem(item);
    await get().advanceOutbox();
  },

  cancelOutbox: async (id) => {
    set({ outbox: get().outbox.filter((row) => row.id !== id) });
    await repository.deleteOutboxItem(id);
  },

  acknowledge: async (id) => {
    // With a ground server, only the server can say a packet was acknowledged.
    if (apiConfigured) return;
    const item = get().outbox.find((row) => row.id === id);
    if (!item || item.state === "acknowledged") return;
    const now = new Date().toISOString();
    const updated: OutboxItem = {
      ...item,
      state: "acknowledged",
      acknowledgedAt: now,
      history: [
        ...item.history,
        { state: "acknowledged", at: now, note: "Flight surgeon acknowledged the packet." },
      ],
    };
    set({
      outbox: get().outbox.map((row) => (row.id === id ? updated : row)),
    });
    await repository.putOutboxItem(updated);
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("crewsignal-outbox");
      channel.postMessage({ type: "acknowledged", id });
      channel.close();
    }
  },

  advanceOutbox: async (now = new Date()) => {
    const { outbox, link } = get();

    if (apiConfigured) {
      if (get().serverReachable === false) return;
      for (const item of outbox.filter((row) => row.state === "queued")) {
        if (posting.has(item.id)) continue;
        posting.add(item.id);
        try {
          const result = await postPacket(item);
          if (result.ok) {
            set({ serverReachable: true });
            await get().applyServerPacket(result.packet);
          } else {
            set({ serverReachable: result.status === 0 ? false : true });
          }
        } finally {
          posting.delete(item.id);
        }
      }
      return;
    }
    const updates: OutboxItem[] = [];
    for (const item of outbox) {
      const next = nextOutboxState(item, link, now);
      if (next === "sent") {
        updates.push({
          ...item,
          state: "sent",
          sentAt: now.toISOString(),
          history: [
            ...item.history,
            {
              state: "sent",
              at: now.toISOString(),
              note:
                link === "live"
                  ? "Link is live. Packet left the spacecraft."
                  : `Configured one-way delay (${environmentFor(get().environment).label}) elapsed. Packet left the spacecraft.`,
            },
          ],
        });
      }
    }
    if (updates.length === 0) return;
    set({
      outbox: get().outbox.map(
        (row) => updates.find((update) => update.id === row.id) ?? row,
      ),
    });
    for (const update of updates) await repository.putOutboxItem(update);
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("crewsignal-outbox");
      channel.postMessage({ type: "sent" });
      channel.close();
    }
  },

  refreshOutbox: async () => {
    set({ outbox: await repository.listOutbox() });
  },

  setPin: async (pin) => {
    const hash = await hashPin(pin);
    await repository.setConfig("pin", hash);
    set({ pinHash: hash, privateUnlocked: true });
  },

  unlockPrivate: async (pin) => {
    const hash = await hashPin(pin);
    if (hash !== get().pinHash) return false;
    set({ privateUnlocked: true });
    return true;
  },

  lockPrivate: () => set({ privateUnlocked: false }),

  notify: (message, tone = "neutral") => set({ toast: { message, tone } }),
  clearToast: () => set({ toast: null }),

  setServerStatus: (reachable, delayScale) =>
    set({
      serverReachable: reachable,
      ...(delayScale !== undefined ? { serverDelayScale: delayScale } : {}),
    }),

  applyServerPacket: async (packet) => {
    const item = packetToOutbox(packet);
    set({
      outbox: get().outbox.some((row) => row.id === item.id)
        ? get().outbox.map((row) => (row.id === item.id ? item : row))
        : [...get().outbox, item],
    });
    await repository.putOutboxItem(item);
  },

  reconcileOutbox: async (crewId) => {
    const result = await fetchPackets(crewId);
    if (!result.ok) {
      if (result.status === 0) set({ serverReachable: false });
      return;
    }
    set({ serverReachable: true });
    for (const packet of result.packets) await get().applyServerPacket(packet);
  },
}));

export function useCrew(id: string) {
  return missionConfig.crew.find((member) => member.id === id) ?? null;
}
