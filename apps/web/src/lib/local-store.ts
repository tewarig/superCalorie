"use client";

import { LOCAL_ONLY, emptySnapshot, parseJSON, type Connection, type Snapshot } from "@supercalorie/core";

/**
 * On-device storage for the web app. This is the source of truth — the app
 * is fully usable with no account and no server, and the backend is an
 * optional backup target rather than a dependency.
 *
 * The snapshot document lives in localStorage: it's small (a few hundred KB
 * even after years of logging), synchronous, and trivial to export. Photos
 * go to IndexedDB instead, because a handful of images would blow through
 * localStorage's ~5 MB quota immediately.
 */

const SNAPSHOT_KEY = "supercalorie.snapshot.v1";
const CONNECTION_KEY = "supercalorie.connection.v1";
const DB_NAME = "supercalorie";
const PHOTO_STORE = "photos";

export function loadSnapshot(): Snapshot {
  if (typeof window === "undefined") return emptySnapshot();

  const stored = window.localStorage.getItem(SNAPSHOT_KEY);
  if (!stored) return emptySnapshot();

  try {
    return parseJSON(stored);
  } catch {
    // A corrupt document must not brick the app. Keep the damaged copy
    // aside so nothing is silently destroyed, and carry on empty.
    window.localStorage.setItem(`${SNAPSHOT_KEY}.corrupt.${Date.now()}`, stored);
    return emptySnapshot();
  }
}

export function saveSnapshot(snapshot: Snapshot): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

/* -------------------------------------------------------------------------
 * External store plumbing for useSyncExternalStore.
 *
 * localStorage is state that lives outside React, which is precisely what
 * useSyncExternalStore exists for. Reading it in an effect instead would
 * mean a setState on every mount, and React's compiler rightly flags that
 * as a cascading render.
 * ---------------------------------------------------------------------- */

let cached: Snapshot | null = null;
const listeners = new Set<() => void>();

/** Must return a referentially stable value or React re-renders forever. */
export function getSnapshot(): Snapshot {
  return (cached ??= loadSnapshot());
}

/**
 * The server has no localStorage, so it renders the empty document and the
 * real one arrives on hydration. Returning a constant (rather than building
 * a fresh object each call) is what keeps that from looping.
 */
const SERVER_SNAPSHOT = emptySnapshot();
export function getServerSnapshot(): Snapshot {
  return SERVER_SNAPSHOT;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function commit(next: Snapshot): void {
  cached = next;
  saveSnapshot(next);
  for (const listener of listeners) listener();
}

/* ---------------------------------------------------------------------- */

function openPhotoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(PHOTO_STORE)) {
        request.result.createObjectStore(PHOTO_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withPhotos<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openPhotoDb();
  return new Promise<T>((resolve, reject) => {
    const request = run(db.transaction(PHOTO_STORE, mode).objectStore(PHOTO_STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

export async function savePhoto(id: string, blob: Blob): Promise<void> {
  await withPhotos("readwrite", (store) => store.put(blob, id));
}

export async function readPhoto(id: string): Promise<Blob | null> {
  try {
    return (await withPhotos<Blob | undefined>("readonly", (store) => store.get(id))) ?? null;
  } catch {
    return null;
  }
}

export async function deletePhoto(id: string): Promise<void> {
  await withPhotos("readwrite", (store) => store.delete(id)).catch(() => {});
}

/* -------------------------------------------------------------------------
 * Where this device syncs, if anywhere. Stored separately from the snapshot
 * so it never travels in an export — a backup restored onto another machine
 * should not silently point it at someone else's server.
 * ---------------------------------------------------------------------- */

export function loadConnection(): Connection | null {
  if (typeof window === "undefined") return null;

  const stored = window.localStorage.getItem(CONNECTION_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as Connection;
    const valid = ["local", "hosted", "self-hosted"].includes(parsed?.mode);
    return valid ? { mode: parsed.mode, serverUrl: parsed.serverUrl ?? "" } : LOCAL_ONLY;
  } catch {
    return LOCAL_ONLY;
  }
}

export function saveConnection(connection: Connection): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONNECTION_KEY, JSON.stringify(connection));
}

/**
 * The same external-store plumbing as the snapshot above, for the same
 * reason: reading localStorage in an effect means a setState on every mount,
 * which React's compiler flags as a cascading render.
 *
 * `undefined` is "not read yet" and null is "never chosen" — the distinction
 * is what stops the onboarding screen flashing before the stored choice is
 * known. The server snapshot is undefined, so nothing renders until hydration.
 */
let cachedConnection: Connection | null | undefined;
const connectionListeners = new Set<() => void>();

export function getConnection(): Connection | null {
  if (cachedConnection === undefined) cachedConnection = loadConnection();
  return cachedConnection;
}

export function getServerConnection(): Connection | null {
  return null;
}

export function subscribeToConnection(listener: () => void): () => void {
  connectionListeners.add(listener);
  return () => connectionListeners.delete(listener);
}

export function commitConnection(connection: Connection): void {
  cachedConnection = connection;
  saveConnection(connection);
  for (const listener of connectionListeners) listener();
}
