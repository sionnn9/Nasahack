import { createHash } from "node:crypto";
import type { Db } from "./db.js";

/**
 * Append-only audit chain. Each row hashes the previous hash plus the row's
 * canonical JSON, so editing any earlier row breaks every later hash.
 */
export type AuditRow = {
  id: number;
  at: string;
  actor: string;
  action: string;
  ref: string;
  detail_json: string;
  prev_hash: string;
  hash: string;
};

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
}

function hashFor(prevHash: string, row: Omit<AuditRow, "id" | "hash" | "prev_hash">): string {
  return createHash("sha256")
    .update(prevHash + canonicalJson(row))
    .digest("hex");
}

export function appendAudit(
  db: Db,
  actor: string,
  action: string,
  ref: string,
  detail: unknown = {},
  at: string = new Date().toISOString(),
): void {
  const last = db
    .prepare("SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1")
    .get() as { hash: string } | undefined;
  const prevHash = last?.hash ?? "";
  const row = {
    at,
    actor,
    action,
    ref,
    detail_json: canonicalJson(detail),
  };
  const hash = hashFor(prevHash, row);
  db.prepare(
    `INSERT INTO audit_log (at, actor, action, ref, detail_json, prev_hash, hash)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(row.at, row.actor, row.action, row.ref, row.detail_json, prevHash, hash);
}

export type VerifyResult = {
  ok: boolean;
  checked: number;
  firstBrokenId: number | null;
  expected: string | null;
  actual: string | null;
};

export function verifyAudit(db: Db): VerifyResult {
  const rows = db.prepare("SELECT * FROM audit_log ORDER BY id ASC").all() as AuditRow[];
  let prev = "";
  for (const row of rows) {
    const expected = hashFor(prev, {
      at: row.at,
      actor: row.actor,
      action: row.action,
      ref: row.ref,
      detail_json: row.detail_json,
    });
    if (row.prev_hash !== prev || row.hash !== expected) {
      return {
        ok: false,
        checked: rows.length,
        firstBrokenId: row.id,
        expected,
        actual: row.hash,
      };
    }
    prev = row.hash;
  }
  return { ok: true, checked: rows.length, firstBrokenId: null, expected: null, actual: null };
}
