import type { Db } from "./db.js";
import type { Config } from "./config.js";
import type { Role } from "./types.js";

export type SseEvent =
  | { type: "link.changed"; data: unknown }
  | { type: "packet.delivered"; data: unknown }
  | { type: "packet.acknowledged"; data: unknown }
  | { type: "sample"; data: unknown };

export type Listener = (event: SseEvent) => void;

export function createBus() {
  const listeners = new Set<Listener>();
  return {
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(event: SseEvent) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch {
          listeners.delete(listener);
        }
      }
    },
    size() {
      return listeners.size;
    },
  };
}

export type Bus = ReturnType<typeof createBus>;

export type Ctx = {
  db: Db;
  config: Config;
  bus: Bus;
  /** Injectable clock so tests can move time without sleeping. */
  now: () => Date;
};

export type RoleSet = Role[];
