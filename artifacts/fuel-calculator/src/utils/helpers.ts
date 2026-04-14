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
  const ms = new Date(dateStr).getTime();
  if (isNaN(ms)) return 9999;
  return Math.floor((ms - Date.now()) / (1000 * 60 * 60 * 24));
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Compress an image file to max 900px wide/tall at 70% JPEG quality before storing in localStorage */
export async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        const maxW = 900;
        const ratio = Math.min(maxW / img.width, maxW / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
