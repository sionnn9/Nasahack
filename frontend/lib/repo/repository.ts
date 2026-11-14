import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  CheckIn,
  Encounter,
  Observation,
  OutboxItem,
} from "@/lib/types";

/**
 * The UI only talks to this interface. Swapping in a network-backed
 * implementation later must not require UI changes.
 */
export interface Repository {
  listObservations(crewId?: string): Promise<Observation[]>;
  putObservations(items: Observation[]): Promise<void>;
  listCheckIns(crewId?: string): Promise<CheckIn[]>;
  putCheckIn(checkIn: CheckIn): Promise<void>;
  listEncounters(crewId?: string): Promise<Encounter[]>;
  putEncounter(encounter: Encounter): Promise<void>;
  listOutbox(): Promise<OutboxItem[]>;
  putOutboxItem(item: OutboxItem): Promise<void>;
  deleteOutboxItem(id: string): Promise<void>;
  getConfig<T>(key: string): Promise<T | null>;
  setConfig<T>(key: string, value: T): Promise<void>;
}

interface CrewSignalDB extends DBSchema {
  observations: {
    key: string;
    value: Observation;
    indexes: { crewId: string };
  };
  checkIns: { key: string; value: CheckIn; indexes: { crewId: string } };
  encounters: { key: string; value: Encounter; indexes: { crewId: string } };
  outbox: { key: string; value: OutboxItem };
  config: { key: string; value: unknown };
}

const DB_NAME = "crewsignal";
const DB_VERSION = 1;
const LS_PREFIX = "crewsignal:repo:";

type StoreName = "observations" | "checkIns" | "encounters" | "outbox";

function hasIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

/** localStorage fallback keeps the same contract for private-mode browsers. */
class LocalStorageShim {
  read<T>(store: StoreName): T[] {
    if (typeof localStorage === "undefined") return [];
    try {
      const raw = localStorage.getItem(`${LS_PREFIX}${store}`);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  write<T>(store: StoreName, rows: T[]): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(`${LS_PREFIX}${store}`, JSON.stringify(rows));
  }
}

export class LocalRepository implements Repository {
  private dbPromise: Promise<IDBPDatabase<CrewSignalDB> | null> | null = null;
  private shim = new LocalStorageShim();

  private db() {
    if (!hasIndexedDb()) return Promise.resolve(null);
    this.dbPromise ??= openDB<CrewSignalDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("observations")) {
          const store = db.createObjectStore("observations", { keyPath: "id" });
          store.createIndex("crewId", "crewId");
        }
        if (!db.objectStoreNames.contains("checkIns")) {
          const store = db.createObjectStore("checkIns", { keyPath: "id" });
          store.createIndex("crewId", "crewId");
        }
        if (!db.objectStoreNames.contains("encounters")) {
          const store = db.createObjectStore("encounters", { keyPath: "id" });
          store.createIndex("crewId", "crewId");
        }
        if (!db.objectStoreNames.contains("outbox")) {
          db.createObjectStore("outbox", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("config")) {
          db.createObjectStore("config");
        }
      },
    }).catch(() => null);
    return this.dbPromise;
  }

  private async all<T>(store: StoreName): Promise<T[]> {
    const db = await this.db();
    if (!db) return this.shim.read<T>(store as never);
    return (await db.getAll(store)) as T[];
  }

  private async byCrew<T>(
    store: "observations" | "checkIns" | "encounters",
    crewId?: string,
  ): Promise<T[]> {
    if (!crewId) return this.all<T>(store);
    const db = await this.db();
    if (!db) {
      return (this.shim.read<T>(store) as Array<{ crewId?: string }>).filter(
        (row) => row.crewId === crewId,
      ) as T[];
    }
    return (await db.getAllFromIndex(store, "crewId", crewId)) as T[];
  }

  async listObservations(crewId?: string) {
    return this.byCrew<Observation>("observations", crewId);
  }

  async putObservations(items: Observation[]) {
    const db = await this.db();
    if (!db) {
      const existing = this.shim.read<Observation>("observations");
      const map = new Map(existing.map((row) => [row.id, row]));
      for (const item of items) map.set(item.id, item);
      this.shim.write("observations", [...map.values()]);
      return;
    }
    const tx = db.transaction("observations", "readwrite");
    await Promise.all([...items.map((item) => tx.store.put(item)), tx.done]);
  }

  async listCheckIns(crewId?: string) {
    return this.byCrew<CheckIn>("checkIns", crewId);
  }

  async putCheckIn(checkIn: CheckIn) {
    const db = await this.db();
    if (!db) {
      const existing = this.shim.read<CheckIn>("checkIns");
      this.shim.write("checkIns", [
        ...existing.filter((row) => row.id !== checkIn.id),
        checkIn,
      ]);
      return;
    }
    await db.put("checkIns", checkIn);
  }

  async listEncounters(crewId?: string) {
    return this.byCrew<Encounter>("encounters", crewId);
  }

  async putEncounter(encounter: Encounter) {
    const db = await this.db();
    if (!db) {
      const existing = this.shim.read<Encounter>("encounters");
      this.shim.write("encounters", [
        ...existing.filter((row) => row.id !== encounter.id),
        encounter,
      ]);
      return;
    }
    await db.put("encounters", encounter);
  }

  async listOutbox() {
    return this.all<OutboxItem>("outbox");
  }

  async putOutboxItem(item: OutboxItem) {
    const db = await this.db();
    if (!db) {
      const existing = this.shim.read<OutboxItem>("outbox");
      this.shim.write("outbox", [
        ...existing.filter((row) => row.id !== item.id),
        item,
      ]);
      return;
    }
    await db.put("outbox", item);
  }

  async deleteOutboxItem(id: string) {
    const db = await this.db();
    if (!db) {
      this.shim.write(
        "outbox",
        this.shim.read<OutboxItem>("outbox").filter((row) => row.id !== id),
      );
      return;
    }
    await db.delete("outbox", id);
  }

  async getConfig<T>(key: string): Promise<T | null> {
    const db = await this.db();
    if (!db) {
      if (typeof localStorage === "undefined") return null;
      const raw = localStorage.getItem(`${LS_PREFIX}config:${key}`);
      return raw ? (JSON.parse(raw) as T) : null;
    }
    const value = await db.get("config", key);
    return (value as T) ?? null;
  }

  async setConfig<T>(key: string, value: T): Promise<void> {
    const db = await this.db();
    if (!db) {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(`${LS_PREFIX}config:${key}`, JSON.stringify(value));
      return;
    }
    await db.put("config", value, key);
  }
}

export const repository: Repository = new LocalRepository();
