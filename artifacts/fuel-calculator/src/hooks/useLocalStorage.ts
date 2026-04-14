/**
 * useLocalStorage — same public API, now backed by IndexedDB.
 *
 * Why IndexedDB instead of localStorage?
 *  • localStorage: hard 5 MB browser limit — fills up with photos.
 *  • IndexedDB:    uses device disk space (hundreds of MB / GB) — no practical limit.
 *
 * Strategy:
 *  1. Read from localStorage synchronously so the first render is instant (no flash).
 *  2. On mount, wait for one-time migration (localStorage → IndexedDB), then load the
 *     authoritative value from IndexedDB and update state.
 *  3. Every write goes to IndexedDB asynchronously (fire-and-forget).
 *     If the write fails it is logged but the React state still updates (optimistic UI).
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ─── IndexedDB plumbing ───────────────────────────────────────────────────────

const DB_NAME    = "fuel_app";
const DB_VERSION = 1;
const STORE      = "kv";

let _dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror   = (e) => {
      _dbPromise = null; // allow retry on next call
      reject((e.target as IDBOpenDBRequest).error);
    };
  });
  return _dbPromise;
}

function dbGet<T>(key: string): Promise<T | undefined> {
  return openDB().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const r = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
        r.onsuccess = () => resolve(r.result as T | undefined);
        r.onerror   = () => reject(r.error);
      }),
  );
}

function dbSet(key: string, value: unknown): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const r = db
          .transaction(STORE, "readwrite")
          .objectStore(STORE)
          .put(value, key);
        r.onsuccess = () => resolve();
        r.onerror   = () => reject(r.error);
      }),
  );
}

// ─── One-time migration: localStorage → IndexedDB ────────────────────────────
// Runs immediately when this module is first imported (before any component mounts).

const LS_MIGRATED = "fa_idb_v1";

const migrationDone: Promise<void> = (() => {
  if (typeof localStorage === "undefined") return Promise.resolve();
  if (localStorage.getItem(LS_MIGRATED)) return Promise.resolve();

  const fa_keys = Object.keys(localStorage).filter(
    (k) => k.startsWith("fa_") && k !== LS_MIGRATED,
  );

  return Promise.all(
    fa_keys.map(async (key) => {
      try {
        const raw = localStorage.getItem(key);
        if (raw != null) await dbSet(key, JSON.parse(raw));
      } catch {
        /* skip corrupted entries */
      }
    }),
  ).then(() => {
    localStorage.setItem(LS_MIGRATED, "1");
  });
})();

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLocalStorage<T>(
  key: string,
  initial: T,
): [T, (v: T | ((prev: T) => T)) => void] {
  // ── Synchronous initial value from localStorage (instant render, no flash) ──
  const [state, setState] = useState<T>(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? (JSON.parse(s) as T) : initial;
    } catch {
      return initial;
    }
  });

  // Prevent async IndexedDB load from overwriting a write the user already made
  const hasWritten = useRef(false);

  // ── After mount: load authoritative value from IndexedDB ──────────────────
  useEffect(() => {
    migrationDone
      .then(() => dbGet<T>(key))
      .then((stored) => {
        if (stored !== undefined && !hasWritten.current) {
          setState(stored);
        }
      })
      .catch(() => {
        /* keep localStorage fallback value — IndexedDB unavailable */
      });
  }, [key]);

  // ── Write to IndexedDB on every state change ──────────────────────────────
  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      hasWritten.current = true;
      setState((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        // Async write — no size limit, no QuotaExceededError
        dbSet(key, next).catch((err) =>
          console.error(`[storage] Failed to save "${key}":`, err),
        );
        return next;
      });
    },
    [key],
  );

  return [state, set];
}
