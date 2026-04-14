import { useState, useCallback } from "react";

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
          return next; // success — update state
        } catch (err) {
          if (err instanceof DOMException && (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
            console.error(`[useLocalStorage] Quota exceeded for key "${key}". Data NOT saved.`);
            if (!sessionStorage.getItem("fa_quota_warned")) {
              sessionStorage.setItem("fa_quota_warned", "1");
              setTimeout(() => {
                alert("⚠️ Паметта на браузъра е пълна! Данните НЕ са запазени.\n\nПрепоръка: Направи резервно копие от Настройки и изтрий стари снимки.");
              }, 100);
            }
          } else {
            console.error(`[useLocalStorage] Failed to save key "${key}":`, err);
          }
          return prev; // revert state — do NOT show data that wasn't actually saved
        }
      });
    },
    [key],
  );

  return [value, set];
}
