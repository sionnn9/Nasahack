import type {
  CheckIn,
  Encounter,
  Observation,
  OutboxItem,
} from "@/lib/types";
import type { Repository } from "@/lib/repo/repository";
import { apiConfigured } from "@/lib/outbox/http-transport";

const SYNC_CURSOR_KEY = "syncCursor";
const BATCH = 200;

type Cursor = Record<string, number>;

/**
 * Local-first wrapper: every write lands in IndexedDB first, then goes to the
 * server in the background. A failed push never loses the local copy and never
 * invents a server state.
 */
export class SyncedRepository implements Repository {
  private local: Repository;
  private pushing = false;
  private pendingObservations: Observation[] = [];
  private pendingCheckIns: CheckIn[] = [];
  private pendingEncounters: Encounter[] = [];

  constructor(local: Repository) {
    this.local = local;
  }

  listObservations(crewId?: string) {
    return this.local.listObservations(crewId);
  }
  listCheckIns(crewId?: string) {
    return this.local.listCheckIns(crewId);
  }
  listEncounters(crewId?: string) {
    return this.local.listEncounters(crewId);
  }
  listOutbox() {
    return this.local.listOutbox();
  }
  putOutboxItem(item: OutboxItem) {
    return this.local.putOutboxItem(item);
  }
  deleteOutboxItem(id: string) {
    return this.local.deleteOutboxItem(id);
  }
  getConfig<T>(key: string) {
    return this.local.getConfig<T>(key);
  }
  setConfig<T>(key: string, value: T) {
    return this.local.setConfig<T>(key, value);
  }

  async putObservations(items: Observation[]) {
    await this.local.putObservations(items);
    if (!apiConfigured) return;
    this.pendingObservations.push(...items);
    void this.flush();
  }

  async putCheckIn(checkIn: CheckIn) {
    await this.local.putCheckIn(checkIn);
    if (!apiConfigured) return;
    this.pendingCheckIns.push(checkIn);
    void this.flush();
  }

  async putEncounter(encounter: Encounter) {
    await this.local.putEncounter(encounter);
    if (!apiConfigured) return;
    this.pendingEncounters.push(encounter);
    void this.flush();
  }

  private async flush() {
    if (this.pushing || !apiConfigured) return;
    this.pushing = true;
    try {
      await this.push("observations", this.pendingObservations.splice(0, BATCH));
      await this.push("checkins", this.pendingCheckIns.splice(0, BATCH));
      await this.push("encounters", this.pendingEncounters.splice(0, BATCH));
    } finally {
      this.pushing = false;
    }
  }

  private async push(collection: string, items: unknown[]) {
    if (items.length === 0) return;
    try {
      const response = await fetch(
        `${(process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "")}/v1/sync/${collection}`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${process.env.NEXT_PUBLIC_CREW_KEY ?? ""}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(items),
        },
      );
      if (!response.ok) throw new Error(`sync ${collection} failed: ${response.status}`);
    } catch {
      // Keep the items for the next flush instead of dropping them.
      if (collection === "observations") this.pendingObservations.push(...(items as Observation[]));
      if (collection === "checkins") this.pendingCheckIns.push(...(items as CheckIn[]));
      if (collection === "encounters") this.pendingEncounters.push(...(items as Encounter[]));
    }
  }

  /** Pull everything newer than the stored cursor. Returns how many rows landed. */
  async pull(): Promise<number> {
    if (!apiConfigured) return 0;
    const cursor = (await this.getConfig<Cursor>(SYNC_CURSOR_KEY)) ?? {
      observations: 0,
      checkins: 0,
      encounters: 0,
    };
    let landed = 0;
    for (const collection of ["observations", "checkins", "encounters"] as const) {
      try {
        const response = await fetch(
          `${(process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "")}/v1/sync/${collection}?since=${cursor[collection] ?? 0}`,
          {
            headers: {
              authorization: `Bearer ${process.env.NEXT_PUBLIC_CREW_KEY ?? ""}`,
            },
          },
        );
        if (!response.ok) continue;
        const body = (await response.json()) as {
          items: Array<Observation | CheckIn | Encounter>;
          cursor: number;
        };
        if (collection === "observations") {
          await this.local.putObservations(body.items as Observation[]);
        } else if (collection === "checkins") {
          for (const item of body.items as CheckIn[]) await this.local.putCheckIn(item);
        } else {
          for (const item of body.items as Encounter[]) await this.local.putEncounter(item);
        }
        cursor[collection] = body.cursor;
        landed += body.items.length;
      } catch {
        // Offline: keep the cursor and try again next start.
      }
    }
    await this.setConfig(SYNC_CURSOR_KEY, cursor);
    return landed;
  }
}
