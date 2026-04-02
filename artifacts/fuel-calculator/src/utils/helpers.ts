export function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? null : n;
}

export function formatDate(d: string | Date) {
  return new Date(d).toLocaleString("bg-BG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatShortDate(d: string | Date) {
  return new Date(d).toLocaleDateString("bg-BG", {
    day: "numeric",
    month: "short",
  });
}

export function formatElapsed(startIso: string, now: Date) {
  const s = Math.floor((now.getTime() - new Date(startIso).getTime()) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}ч ${m.toString().padStart(2, "0")}м`;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export function daysUntil(dateStr: string): number {
  if (!dateStr) return 9999;
  return Math.floor(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
