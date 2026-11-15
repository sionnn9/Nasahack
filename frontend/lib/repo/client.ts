import { LocalRepository, type Repository } from "@/lib/repo/repository";
import { SyncedRepository } from "@/lib/repo/synced-repository";
import { apiConfigured } from "@/lib/outbox/http-transport";

/**
 * One repository for the UI. With no API URL it is purely local; with one, the
 * synced wrapper writes locally first.
 */
const local = new LocalRepository();

export const repository: Repository = apiConfigured
  ? new SyncedRepository(local)
  : local;

export const syncedRepository =
  repository instanceof SyncedRepository ? repository : null;
