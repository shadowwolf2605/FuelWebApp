import { useState, useCallback } from "react";

// ─── Keys that contain photo/image data ──────────────────────────────────────
// When storage is full we strip photos from these keys first, then retry.
const PHOTO_ARRAY_KEYS = [
  "fa_trip_history",
  "fa_expenses",
  "fa_fillups",
  "fa_car_damages",
  "fa_cars",
];
const DOCUMENT_ARRAY_KEYS = ["fa_documents"];

/**
 * Auto-frees space by stripping base64 photos from all known keys.
 * Called as a last resort when QuotaExceededError is thrown.
 * Returns true if anything was removed.
 */
function autoFreePhotos(): boolean {
  let freed = false;
  for (const k of PHOTO_ARRAY_KEYS) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) continue;
      // Only rewrite if at least one item actually has a photo
      if (!arr.some((item: Record<string, unknown>) => item.photo)) continue;
      const stripped = arr.map((item: Record<string, unknown>) => {
        if (!item.photo) return item;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { photo: _p, ...rest } = item as Record<string, unknown> & { photo: unknown };
        return rest;
      });
      localStorage.setItem(k, JSON.stringify(stripped));
      freed = true;
    } catch {
      // ignore errors while freeing
    }
  }
  for (const k of DOCUMENT_ARRAY_KEYS) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) continue;
      if (!arr.some((item: Record<string, unknown>) => item.dataUrl)) continue;
      const stripped = arr.map((item: Record<string, unknown>) => ({ ...item, dataUrl: "" }));
      localStorage.setItem(k, JSON.stringify(stripped));
      freed = true;
    } catch {
      // ignore errors while freeing
    }
  }
  return freed;
}

export function useLocalStorage<T>(
  key: string,
  initial: T,
): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? (JSON.parse(s) as T) : initial;
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        try {
          localStorage.setItem(key, JSON.stringify(next));
          return next; // success
        } catch (err) {
          const isQuota =
            err instanceof DOMException &&
            (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED");

          if (isQuota) {
            console.warn(`[useLocalStorage] Quota exceeded for "${key}" — attempting auto photo-clear…`);

            // ── Auto-free photos, then retry ──────────────────────────────
            const freed = autoFreePhotos();
            if (freed) {
              try {
                localStorage.setItem(key, JSON.stringify(next));
                // Notify user once that photos were auto-removed
                if (!sessionStorage.getItem("fa_auto_cleared")) {
                  sessionStorage.setItem("fa_auto_cleared", "1");
                  setTimeout(() => {
                    alert("ℹ️ Паметта беше почти пълна.\n\nСнимките бяха изтрити автоматично за да се запазят данните ти.\n\nВсички пътувания, разходи и километри са запазени.");
                  }, 100);
                }
                return next; // retry succeeded — data IS saved
              } catch {
                // still full even after clearing photos
              }
            }

            // ── Still full — warn user ────────────────────────────────────
            if (!sessionStorage.getItem("fa_quota_warned")) {
              sessionStorage.setItem("fa_quota_warned", "1");
              setTimeout(() => {
                alert("⚠️ Паметта на браузъра е пълна!\n\nДанните НЕ са запазени.\n\nПрепоръка: Направи резервно копие от таб Отчети и изтрий някои стари данни.");
              }, 100);
            }
          } else {
            console.error(`[useLocalStorage] Failed to save key "${key}":`, err);
          }

          return prev; // revert state to last saved value
        }
      });
    },
    [key],
  );

  return [value, set];
}
