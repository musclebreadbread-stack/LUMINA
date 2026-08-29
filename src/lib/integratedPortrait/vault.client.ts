import type { ResultSnapshotV1 } from "./contracts";
import { validateSnapshot, type SnapshotValidationFailureReason } from "./validation";

const DATABASE_NAME = "lumina-integrated-portrait-v1";
const DATABASE_VERSION = 1;
const SNAPSHOTS_STORE = "snapshots";
const EXCLUSIONS_STORE = "exclusions";

export type PortraitPersistence = "indexeddb" | "memory";
export type PortraitVaultError = "indexeddb-unavailable" | "indexeddb-failed";

export interface PortraitVaultStatus {
  readonly persistence: PortraitPersistence;
  readonly lastError: PortraitVaultError | null;
  readonly revision: number;
}

export interface PortraitVaultReadResult {
  readonly snapshots: readonly ResultSnapshotV1[];
  readonly status: PortraitVaultStatus;
}

export type PortraitVaultFailureReason = SnapshotValidationFailureReason | "invalid-id" | "storage-failed";

export type PortraitVaultOperationResult =
  | Readonly<{ ok: true; status: PortraitVaultStatus }>
  | Readonly<{ ok: false; status: PortraitVaultStatus; reason: PortraitVaultFailureReason }>;

interface ExclusionRecord {
  readonly id: string;
  readonly excludedAt: string;
}

interface IndexedDbRows {
  readonly snapshots: readonly unknown[];
  readonly exclusions: readonly unknown[];
}

const listeners = new Set<() => void>();
const memorySnapshots = new Map<string, ResultSnapshotV1>();
const memoryExclusions = new Set<string>();
const serverStatus = Object.freeze({
  persistence: "memory" as const,
  lastError: null,
  revision: 0,
});

let status: PortraitVaultStatus = serverStatus;
let databasePromise: Promise<IDBDatabase | null> | null = null;
let memoryOnly = false;

function notify(): void {
  for (const listener of listeners) listener();
}

function setStatus(persistence: PortraitPersistence, lastError: PortraitVaultError | null): void {
  status = Object.freeze({
    persistence,
    lastError,
    revision: status.revision + 1,
  });
  notify();
}

function enterMemoryMode(error: PortraitVaultError): void {
  memoryOnly = true;
  setStatus("memory", error);
}

function canUseIndexedDb(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
  } catch {
    return false;
  }
}

function configureDatabase(database: IDBDatabase): void {
  if (!database.objectStoreNames.contains(SNAPSHOTS_STORE)) {
    const snapshots = database.createObjectStore(SNAPSHOTS_STORE, { keyPath: "id" });
    snapshots.createIndex("analysisKey", "analysisKey", { unique: false });
    snapshots.createIndex("completedAt", "completedAt", { unique: false });
  }
  if (!database.objectStoreNames.contains(EXCLUSIONS_STORE)) {
    database.createObjectStore(EXCLUSIONS_STORE, { keyPath: "id" });
  }
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (memoryOnly || !canUseIndexedDb()) {
    if (!memoryOnly) enterMemoryMode("indexeddb-unavailable");
    return Promise.resolve(null);
  }
  if (databasePromise) return databasePromise;

  databasePromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => configureDatabase(request.result);
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => database.close();
        setStatus("indexeddb", null);
        resolve(database);
      };
      request.onerror = () => {
        enterMemoryMode("indexeddb-failed");
        resolve(null);
      };
      request.onblocked = () => {
        enterMemoryMode("indexeddb-failed");
        resolve(null);
      };
    } catch {
      enterMemoryMode("indexeddb-failed");
      resolve(null);
    }
  });

  return databasePromise;
}

function readIndexedDb(database: IDBDatabase): Promise<IndexedDbRows> {
  return new Promise((resolve, reject) => {
    let snapshots: readonly unknown[] = [];
    let exclusions: readonly unknown[] = [];
    let transaction: IDBTransaction;

    try {
      transaction = database.transaction([SNAPSHOTS_STORE, EXCLUSIONS_STORE], "readonly");
      const snapshotRequest = transaction.objectStore(SNAPSHOTS_STORE).getAll() as IDBRequest<unknown[]>;
      const exclusionRequest = transaction.objectStore(EXCLUSIONS_STORE).getAll() as IDBRequest<unknown[]>;
      snapshotRequest.onsuccess = () => {
        snapshots = snapshotRequest.result;
      };
      exclusionRequest.onsuccess = () => {
        exclusions = exclusionRequest.result;
      };
      transaction.oncomplete = () => resolve({ snapshots, exclusions });
      transaction.onerror = () => reject(transaction.error ?? new Error("indexeddb read failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("indexeddb read aborted"));
    } catch (error) {
      reject(error instanceof Error ? error : new Error("indexeddb read failed"));
    }
  });
}

function putIndexedDb(database: IDBDatabase, snapshot: ResultSnapshotV1): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const transaction = database.transaction(SNAPSHOTS_STORE, "readwrite");
      transaction.objectStore(SNAPSHOTS_STORE).put(snapshot);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("indexeddb write failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("indexeddb write aborted"));
    } catch (error) {
      reject(error instanceof Error ? error : new Error("indexeddb write failed"));
    }
  });
}

function putExclusionIndexedDb(database: IDBDatabase, record: ExclusionRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const transaction = database.transaction(EXCLUSIONS_STORE, "readwrite");
      transaction.objectStore(EXCLUSIONS_STORE).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("indexeddb exclusion failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("indexeddb exclusion aborted"));
    } catch (error) {
      reject(error instanceof Error ? error : new Error("indexeddb exclusion failed"));
    }
  });
}

function clearIndexedDb(database: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const transaction = database.transaction([SNAPSHOTS_STORE, EXCLUSIONS_STORE], "readwrite");
      transaction.objectStore(SNAPSHOTS_STORE).clear();
      transaction.objectStore(EXCLUSIONS_STORE).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("indexeddb clear failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("indexeddb clear aborted"));
    } catch (error) {
      reject(error instanceof Error ? error : new Error("indexeddb clear failed"));
    }
  });
}

function sortedSnapshots(snapshots: Iterable<ResultSnapshotV1>): readonly ResultSnapshotV1[] {
  return Object.freeze(
    [...snapshots].sort((left, right) => {
      const completedAtOrder = right.completedAt.localeCompare(left.completedAt);
      return completedAtOrder !== 0 ? completedAtOrder : right.id.localeCompare(left.id);
    }),
  );
}

function memorySnapshotList(): readonly ResultSnapshotV1[] {
  return sortedSnapshots(
    [...memorySnapshots.values()].filter((snapshot) => !memoryExclusions.has(snapshot.id)),
  );
}

function validatedRows(rows: IndexedDbRows): readonly ResultSnapshotV1[] {
  const excluded = new Set(
    rows.exclusions.flatMap((row) => {
      if (typeof row !== "object" || row === null || Array.isArray(row)) return [];
      const record = row as Record<string, unknown>;
      return typeof record.id === "string" ? [record.id] : [];
    }),
  );
  const snapshots: ResultSnapshotV1[] = [];
  for (const row of rows.snapshots) {
    const result = validateSnapshot(row);
    if (result.ok && !excluded.has(result.value.id)) snapshots.push(result.value);
  }
  return sortedSnapshots(snapshots);
}

export async function listPortraitSnapshots(): Promise<PortraitVaultReadResult> {
  const database = await openDatabase();
  if (!database) return { snapshots: memorySnapshotList(), status };

  try {
    const rows = await readIndexedDb(database);
    return { snapshots: validatedRows(rows), status };
  } catch {
    enterMemoryMode("indexeddb-failed");
    return { snapshots: memorySnapshotList(), status };
  }
}

export async function upsertPortraitSnapshot(input: unknown): Promise<PortraitVaultOperationResult> {
  const validated = validateSnapshot(input);
  if (!validated.ok) return { ok: false, status, reason: validated.reason };

  const snapshot = validated.value;
  memorySnapshots.set(snapshot.id, snapshot);
  memoryExclusions.delete(snapshot.id);
  const database = await openDatabase();
  if (!database) {
    notify();
    return { ok: true, status };
  }

  try {
    await putIndexedDb(database, snapshot);
    setStatus("indexeddb", null);
    return { ok: true, status };
  } catch {
    enterMemoryMode("indexeddb-failed");
    return { ok: true, status };
  }
}

export async function excludePortraitSnapshot(id: string): Promise<PortraitVaultOperationResult> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(id)) {
    return { ok: false, status, reason: "invalid-id" };
  }

  memoryExclusions.add(id);
  const database = await openDatabase();
  if (!database) {
    notify();
    return { ok: true, status };
  }

  try {
    await putExclusionIndexedDb(database, { id, excludedAt: new Date().toISOString() });
    setStatus("indexeddb", null);
    return { ok: true, status };
  } catch {
    enterMemoryMode("indexeddb-failed");
    return { ok: true, status };
  }
}

export async function deleteAllPortraitSnapshots(): Promise<PortraitVaultOperationResult> {
  memorySnapshots.clear();
  memoryExclusions.clear();
  const database = await openDatabase();
  if (!database) {
    notify();
    return { ok: true, status };
  }

  try {
    await clearIndexedDb(database);
    setStatus("indexeddb", null);
    return { ok: true, status };
  } catch {
    enterMemoryMode("indexeddb-failed");
    return { ok: true, status };
  }
}

export async function exportPortraitSnapshots(): Promise<string> {
  const result = await listPortraitSnapshots();
  return JSON.stringify({ schemaVersion: 1, snapshots: result.snapshots });
}

export function getPortraitVaultSnapshot(): PortraitVaultStatus {
  return status;
}

export function getPortraitVaultServerSnapshot(): PortraitVaultStatus {
  return serverStatus;
}

export function subscribePortraitVault(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
