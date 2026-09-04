import type { ResultSnapshotV1 } from "./contracts";
import { validateSnapshot, type SnapshotValidationFailureReason } from "./validation";

const DATABASE_NAME = "lumina-integrated-portrait-v1";
const DATABASE_VERSION = 1;
const SNAPSHOTS_STORE = "snapshots";
const EXCLUSIONS_STORE = "exclusions";
const SESSION_STORAGE_KEY = "lumina.integrated-portrait.v1";
const PENDING_CLEAR_STORAGE_KEY = "lumina.integrated-portrait.clear-pending";

export type PortraitPersistence = "indexeddb" | "session-storage" | "memory";
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

interface SessionVaultRows {
  readonly snapshots: readonly unknown[];
  readonly exclusions: readonly string[];
  /** IndexedDB clear가 실패했을 때 다음 탭에서 오래된 행을 다시 노출하지 않도록 한다. */
  readonly clearRequested?: boolean;
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
let sessionClearRequested = false;

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

function sessionStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function durableStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function persistPendingClear(): boolean {
  const storage = durableStorage();
  if (storage === null) return false;

  try {
    storage.setItem(PENDING_CLEAR_STORAGE_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

function clearPendingClear(): boolean {
  const storage = durableStorage();
  if (storage === null) return true;

  try {
    storage.removeItem(PENDING_CLEAR_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

function loadPendingClear(): void {
  const storage = durableStorage();
  if (storage === null) return;

  try {
    if (storage.getItem(PENDING_CLEAR_STORAGE_KEY) === "1") sessionClearRequested = true;
  } catch {
    // A durable marker is best effort; IndexedDB remains the source of truth when readable.
  }
}

function enterFallbackMode(error: PortraitVaultError): void {
  memoryOnly = true;
  loadSessionSnapshots();
  setStatus(sessionStorage() === null ? "memory" : "session-storage", error);
}

function canUseIndexedDb(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
  } catch {
    return false;
  }
}

function loadSessionSnapshots(): void {
  // 같은 실행에서 전체 삭제가 이미 요청된 경우, 이전 세션의 캐시를 다시
  // 읽어 삭제한 결과를 부활시키지 않는다.
  if (sessionClearRequested) return;
  const storage = sessionStorage();
  if (storage === null) return;

  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    if (raw === null) return;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return;
    const candidate = parsed as Readonly<Record<string, unknown>>;
    sessionClearRequested = candidate.clearRequested === true;
    if (sessionClearRequested) {
      memorySnapshots.clear();
      memoryExclusions.clear();
      return;
    }
    const snapshots = Array.isArray(candidate.snapshots) ? candidate.snapshots : [];
    const exclusions = Array.isArray(candidate.exclusions) ? candidate.exclusions : [];
    for (const row of snapshots) {
      const validated = validateSnapshot(row);
      if (validated.ok && !memorySnapshots.has(validated.value.id)) {
        memorySnapshots.set(validated.value.id, validated.value);
      }
    }
    for (const id of exclusions) {
      if (typeof id === "string") memoryExclusions.add(id);
    }
  } catch {
    // Session storage is an optional fallback; invalid data must not block the result view.
  }
}

function persistSessionSnapshots(): boolean {
  const storage = sessionStorage();
  if (storage === null) return true;

  const rows: SessionVaultRows = {
    snapshots: [...memorySnapshots.values()],
    exclusions: [...memoryExclusions],
    clearRequested: sessionClearRequested,
  };
  try {
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(rows));
    return true;
  } catch {
    setStatus("memory", "indexeddb-failed");
    return false;
  }
}

function clearSessionSnapshots(): boolean {
  const storage = sessionStorage();
  if (storage === null) return true;

  try {
    storage.removeItem(SESSION_STORAGE_KEY);
    return true;
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
  loadPendingClear();
  if (
    memoryOnly &&
    sessionClearRequested &&
    (status.lastError === "indexeddb-failed" || status.lastError === "indexeddb-unavailable")
  ) {
    // A pending clear must be retryable after a transient IndexedDB failure.
    memoryOnly = false;
    databasePromise = null;
  }
  if (memoryOnly || !canUseIndexedDb()) {
    if (!memoryOnly) enterFallbackMode("indexeddb-unavailable");
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
        // 이전 IndexedDB 오류 중 세션 fallback에만 남은 안전한 요약을 복원한다.
        loadSessionSnapshots();
        setStatus("indexeddb", null);
        resolve(database);
      };
      request.onerror = () => {
        enterFallbackMode("indexeddb-failed");
        resolve(null);
      };
      request.onblocked = () => {
        enterFallbackMode("indexeddb-failed");
        resolve(null);
      };
    } catch {
      enterFallbackMode("indexeddb-failed");
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

async function clearPendingData(database: IDBDatabase): Promise<boolean> {
  if (!sessionClearRequested) return true;

  try {
    await clearIndexedDb(database);
  } catch {
    persistPendingClear();
    persistSessionSnapshots();
    setStatus("indexeddb", "indexeddb-failed");
    return false;
  }

  sessionClearRequested = false;
  const sessionCleared = clearSessionSnapshots();
  const markerCleared = clearPendingClear();
  if (!sessionCleared || !markerCleared) {
    sessionClearRequested = true;
    persistPendingClear();
    persistSessionSnapshots();
    setStatus("indexeddb", "indexeddb-failed");
    return false;
  }
  return true;
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

function syncMemoryWithIndexedDb(rows: IndexedDbRows): readonly ResultSnapshotV1[] {
  if (sessionClearRequested) return memorySnapshotList();

  const excluded = new Set(
    rows.exclusions.flatMap((row) => {
      if (typeof row !== "object" || row === null || Array.isArray(row)) return [];
      const record = row as Record<string, unknown>;
      return typeof record.id === "string" ? [record.id] : [];
    }),
  );
  for (const row of rows.snapshots) {
    const result = validateSnapshot(row);
    // 세션에만 남아 있는 최신 upsert를 덮어쓰지 않고, 마지막 성공 읽기를 보존한다.
    if (result.ok && !memorySnapshots.has(result.value.id)) memorySnapshots.set(result.value.id, result.value);
  }
  for (const id of excluded) memoryExclusions.add(id);
  return memorySnapshotList();
}

export async function listPortraitSnapshots(): Promise<PortraitVaultReadResult> {
  const database = await openDatabase();
  if (!database) return { snapshots: memorySnapshotList(), status };

  try {
    if (!(await clearPendingData(database))) {
      return { snapshots: memorySnapshotList(), status };
    }
    const rows = await readIndexedDb(database);
    const snapshots = syncMemoryWithIndexedDb(rows);
    if (!sessionClearRequested) persistSessionSnapshots();
    return { snapshots, status };
  } catch {
    enterFallbackMode("indexeddb-failed");
    return { snapshots: memorySnapshotList(), status };
  }
}

export async function upsertPortraitSnapshot(input: unknown): Promise<PortraitVaultOperationResult> {
  const validated = validateSnapshot(input);
  if (!validated.ok) return { ok: false, status, reason: validated.reason };

  const snapshot = validated.value;
  const database = await openDatabase();
  if (!database) {
    if (sessionClearRequested) {
      return { ok: false, status, reason: "storage-failed" };
    }
    memorySnapshots.set(snapshot.id, snapshot);
    memoryExclusions.delete(snapshot.id);
    persistSessionSnapshots();
    notify();
    return { ok: true, status };
  }

  try {
    if (!(await clearPendingData(database))) {
      return { ok: false, status, reason: "storage-failed" };
    }
    memorySnapshots.set(snapshot.id, snapshot);
    memoryExclusions.delete(snapshot.id);
    await putIndexedDb(database, snapshot);
    persistSessionSnapshots();
    setStatus("indexeddb", null);
    return { ok: true, status };
  } catch {
    enterFallbackMode("indexeddb-failed");
    persistSessionSnapshots();
    return { ok: true, status };
  }
}

export async function excludePortraitSnapshot(id: string): Promise<PortraitVaultOperationResult> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(id)) {
    return { ok: false, status, reason: "invalid-id" };
  }

  const database = await openDatabase();
  if (!database) {
    if (sessionClearRequested) {
      return { ok: false, status, reason: "storage-failed" };
    }
    memoryExclusions.add(id);
    persistSessionSnapshots();
    notify();
    return { ok: true, status };
  }

  try {
    if (!(await clearPendingData(database))) {
      return { ok: false, status, reason: "storage-failed" };
    }
    memoryExclusions.add(id);
    await putExclusionIndexedDb(database, { id, excludedAt: new Date().toISOString() });
    persistSessionSnapshots();
    setStatus("indexeddb", null);
    return { ok: true, status };
  } catch {
    enterFallbackMode("indexeddb-failed");
    persistSessionSnapshots();
    return { ok: true, status };
  }
}

export async function deleteAllPortraitSnapshots(): Promise<PortraitVaultOperationResult> {
  memorySnapshots.clear();
  memoryExclusions.clear();
  sessionClearRequested = true;
  const pendingMarkerPersisted = persistPendingClear();
  const database = await openDatabase();
  if (!database) {
    const indexedDbFailed = status.lastError === "indexeddb-failed";
    if (!indexedDbFailed) {
      sessionClearRequested = false;
      clearPendingClear();
    }
    const persisted = persistSessionSnapshots();
    notify();
    return !indexedDbFailed && (pendingMarkerPersisted || status.lastError === "indexeddb-unavailable") && persisted
      ? { ok: true, status }
      : { ok: false, status, reason: "storage-failed" };
  }

  if (!(await clearPendingData(database))) {
    return { ok: false, status, reason: "storage-failed" };
  }

  const persisted = clearSessionSnapshots() || persistSessionSnapshots();
  if (!persisted) {
    sessionClearRequested = true;
    persistPendingClear();
    persistSessionSnapshots();
    setStatus("indexeddb", "indexeddb-failed");
    return { ok: false, status, reason: "storage-failed" };
  }
  setStatus("indexeddb", null);
  return { ok: true, status };
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
