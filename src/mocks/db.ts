/**
 * In-browser mock backend.
 *
 * One store, persisted to localStorage, that every feature API reads and
 * writes. Because it is shared, actions cross-affect the way they would on a
 * real server: confirming a plan draws down SA quota, opens surat jalan on the
 * monitoring board, and raises invoices that finance later verifies.
 */

import { createSeedDatabase, DB_VERSION, isoDate, startOfToday } from "./seed";
import type { AuditEntry, Database } from "./types";

const STORAGE_KEY = "sidistrib:db:v1";

type Listener = () => void;

let db: Database | null = null;
const listeners = new Set<Listener>();

/* ── persistence ───────────────────────────────────────────────────────── */

function read(): Database | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Database;
    if (parsed.version !== DB_VERSION) return null;
    // The seed is anchored to a working day. Once the calendar rolls over the
    // stored day is history, so start the console on a fresh one.
    if (isoDate(new Date(parsed.seededAt)) !== isoDate(startOfToday())) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function write(next: Database) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked (private mode) — the session still works, it
    // just will not survive a reload.
  }
}

export function getDb(): Database {
  if (!db) {
    db = read() ?? createSeedDatabase();
    write(db);
  }
  return db;
}

/** Applies a change, persists it, and notifies subscribers. */
export function mutate<T>(fn: (db: Database) => T): T {
  const current = getDb();
  const result = fn(current);
  write(current);
  listeners.forEach((l) => l());
  return result;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Wipes local state and regenerates the demo day. */
export function resetDb(): Database {
  localStorage.removeItem(STORAGE_KEY);
  db = createSeedDatabase();
  write(db);
  listeners.forEach((l) => l());
  return db;
}

/* ── request simulation ────────────────────────────────────────────────── */

type RequestKind = "read" | "write" | "upload";

const LATENCY: Record<RequestKind, [number, number]> = {
  read: [140, 380],
  write: [420, 820],
  upload: [900, 1800],
};

export function latency(kind: RequestKind = "read"): Promise<void> {
  const [min, max] = LATENCY[kind];
  const ms = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Thrown by mock APIs so the UI can render a real error path. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/* ── helpers ───────────────────────────────────────────────────────────── */

let counter = 0;
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}`;
}

export function currentActor(): string {
  try {
    const raw = localStorage.getItem("auth-storage");
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.state?.user?.name ?? "Sistem";
    }
  } catch {
    /* fall through */
  }
  return "Sistem";
}

/** Appends to the audit trail. Every write in `rules.ts` goes through here. */
export function recordAudit(
  database: Database,
  entry: Omit<AuditEntry, "id" | "at" | "actor"> & { actor?: string },
) {
  const row: AuditEntry = {
    id: nextId("aud"),
    at: new Date().toISOString(),
    actor: entry.actor ?? currentActor(),
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    summary: entry.summary,
  };
  database.audit.unshift(row);
  if (database.audit.length > 500) database.audit.length = 500;
  return row;
}

export function notify(
  database: Database,
  n: {
    type: "Pengingat" | "Alert" | "Sistem";
    title: string;
    message: string;
    href?: string;
  },
) {
  database.notifications.unshift({
    id: nextId("ntf"),
    createdAt: new Date().toISOString(),
    isRead: false,
    ...n,
  });
}
