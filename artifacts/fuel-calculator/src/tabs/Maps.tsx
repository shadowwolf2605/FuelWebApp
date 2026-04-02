import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crosshair, MapPin, Navigation, AlertTriangle, RefreshCw, Trash2,
  CheckSquare, Plus, X, Clock, Fuel, Star, ExternalLink, Check,
} from "lucide-react";
import { Card, EmptyState } from "../components/ui";
import { haversineM } from "../utils/geo";
import { daysUntil } from "../utils/helpers";
import type { SavedLocation, ChecklistItem } from "../types";

// ─── Default checklist items ──────────────────────────────────────────────────

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "cl1", text: "Документи (КТ, свидетелство за регистрация)", checked: false },
  { id: "cl2", text: "Застраховка и виньетка", checked: false },
  { id: "cl3", text: "Зарядно за телефон", checked: false },
  { id: "cl4", text: "Вода и закуски", checked: false },
  { id: "cl5", text: "Аптечка", checked: false },
  { id: "cl6", text: "Светлоотразителен жилет", checked: false },
  { id: "cl7", text: "Триъгълник за опасност", checked: false },
  { id: "cl8", text: "Горивото заредено", checked: false },
  { id: "cl9", text: "Музика / подкаст", checked: false },
  { id: "cl10", text: "Навигация (онлайн/офлайн)", checked: false },
  { id: "cl11", text: "Стъкломиещ флуид", checked: false },
  { id: "cl12", text: "Резервна гума / компресор", checked: false },
];

// ─── Find My Car ──────────────────────────────────────────────────────────────

function FindMyCar({ saved, onSave, onClear }: {
  saved: SavedLocation | null;
  onSave: (loc: SavedLocation) => void;
  onClear: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function saveLocation() {
    if (!("geolocation" in navigator)) { setError("GPS не е наличен в този браузър"); return; }
    setLoading(true); setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSave({ lat: pos.coords.lat ?? pos.coords.latitude, lon: pos.coords.lon ?? pos.coords.longitude, timestamp: new Date().toISOString() });
        setLoading(false);
      },
      (e) => { setError(e.message); setLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function mapsUrl() {
    if (!saved) return "#";
    return `https://maps.google.com/?q=${saved.lat},${saved.lon}`;
  }

  const savedAgo = saved ? Math.floor((Date.now() - new Date(saved.timestamp).getTime()) / 60000) : 0;

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/6">
        <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center"><Crosshair size={15} className="text-white" /></div>
        <div>
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Намери колата ми</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Запази паркинг локацията</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {saved ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-blue-500/8 dark:bg-blue-500/15 border border-blue-500/20 rounded-xl p-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin size={13} className="text-blue-500" />
                  <span className="text-[13px] font-semibold text-gray-900 dark:text-white">Запазена локация</span>
                </div>
                <p className="text-[12px] text-gray-500 dark:text-gray-400 tabular-nums">{saved.lat.toFixed(5)}, {saved.lon.toFixed(5)}</p>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-400">
                  <Clock size={10} />
                  {savedAgo < 60 ? `преди ${savedAgo} мин.` : `преди ${Math.floor(savedAgo / 60)}ч ${savedAgo % 60}м`}
                </div>
              </div>
              <button onClick={onClear} className="text-red-400 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
            <a href={mapsUrl()} target="_blank" rel="noreferrer"
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold bg-blue-500 text-white">
              <Navigation size={14} />Навигирай до колата<ExternalLink size={12} className="opacity-70" />
            </a>
          </motion.div>
        ) : (
          <EmptyState icon={<Crosshair size={36} />} title="Няма запазена локация" subtitle="Натисни бутона, за да запазиш текущата позиция" />
        )}

        {error && <div className="flex items-center gap-1.5 text-orange-500 bg-orange-500/10 rounded-lg px-3 py-2 text-[12px]"><AlertTriangle size={12} />{error}</div>}

        <motion.button onClick={saveLocation} disabled={loading} whileTap={!loading ? { scale: 0.97 } : {}}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold transition-all ${loading ? "bg-gray-100 dark:bg-white/6 text-gray-400" : "bg-blue-500 text-white"}`}>
          {loading ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><RefreshCw size={15} /></motion.div>Локализиране…</> : <><Crosshair size={15} />Запази позицията</>}
        </motion.button>
      </div>
    </Card>
  );
}

// ─── Gas Station Finder ───────────────────────────────────────────────────────

interface GasStation {
  id: number;
  name: string;
  brand?: string;
  lat: number;
  lon: number;
  distM: number;
}

function GasStationFinder() {
  const [stations, setStations] = useState<GasStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lon: number } | null>(null);

  async function findStations() {
    if (!("geolocation" in navigator)) { setError("GPS не е наличен"); return; }
    setLoading(true); setError(null); setStations([]);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setUserPos({ lat, lon });
        try {
          const query = `[out:json];node["amenity"="fuel"](around:5000,${lat},${lon});out 15;`;
          const r = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: query,
          });
          const data = await r.json();
          const list: GasStation[] = (data.elements ?? []).map((el: Record<string, unknown>) => ({
            id: el.id as number,
            name: ((el.tags as Record<string, string>)?.name) || ((el.tags as Record<string, string>)?.brand) || "Бензиностанция",
            brand: (el.tags as Record<string, string>)?.brand,
            lat: el.lat as number,
            lon: el.lon as number,
            distM: haversineM(lat, lon, el.lat as number, el.lon as number),
          })).sort((a: GasStation, b: GasStation) => a.distM - b.distM);
          setStations(list);
          if (list.length === 0) setError("Не са намерени бензиностанции в радиус 5 км");
        } catch { setError("Грешка при търсенето. Провери интернет връзката."); }
        setLoading(false);
      },
      (e) => { setError(e.message); setLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/6">
        <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center"><Fuel size={15} className="text-white" /></div>
        <div>
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Бензиностанции</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Намери най-близките</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {error && <div className="flex items-center gap-1.5 text-orange-500 bg-orange-500/10 rounded-lg px-3 py-2 text-[12px]"><AlertTriangle size={12} />{error}</div>}

        <motion.button onClick={findStations} disabled={loading} whileTap={!loading ? { scale: 0.97 } : {}}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold transition-all ${loading ? "bg-gray-100 dark:bg-white/6 text-gray-400" : "bg-green-500 text-white"}`}>
          {loading ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><RefreshCw size={15} /></motion.div>Търсене…</> : <><Fuel size={15} />Намери в близост</>}
        </motion.button>

        <AnimatePresence>
          {stations.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              {stations.map((s, i) => (
                <motion.a key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  href={userPos ? `https://maps.google.com/maps?saddr=${userPos.lat},${userPos.lon}&daddr=${s.lat},${s.lon}` : `https://maps.google.com/?q=${s.lat},${s.lon}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0">
                    <Star size={14} className="text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">{s.name}</p>
                    {s.brand && s.brand !== s.name && <p className="text-[11px] text-gray-400 truncate">{s.brand}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[13px] font-semibold text-green-500 tabular-nums">
                      {s.distM < 1000 ? `${Math.round(s.distM)} м` : `${(s.distM / 1000).toFixed(1)} км`}
                    </p>
                    <ExternalLink size={10} className="text-gray-400 ml-auto mt-0.5" />
                  </div>
                </motion.a>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

// ─── Road Trip Checklist ──────────────────────────────────────────────────────

function Checklist({ items, setItems }: { items: ChecklistItem[]; setItems: (v: ChecklistItem[]) => void }) {
  const [newText, setNewText] = useState("");
  const checkedCount = items.filter((i) => i.checked).length;

  function toggle(id: string) {
    setItems(items.map((i) => i.id === id ? { ...i, checked: !i.checked } : i));
  }
  function remove(id: string) { setItems(items.filter((i) => i.id !== id)); }
  function addItem() {
    if (!newText.trim()) return;
    setItems([...items, { id: crypto.randomUUID(), text: newText.trim(), checked: false }]);
    setNewText("");
  }
  function reset() { setItems(items.map((i) => ({ ...i, checked: false }))); }

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500 flex items-center justify-center"><CheckSquare size={15} className="text-white" /></div>
          <div>
            <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Чеклист за пътуване</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">{checkedCount}/{items.length} готово</p>
          </div>
        </div>
        <button onClick={reset} className="text-[12px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1">
          <RefreshCw size={12} />Нулирай
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-3">
        <div className="h-1.5 bg-gray-100 dark:bg-white/8 rounded-full overflow-hidden">
          <motion.div className="h-full bg-purple-500 rounded-full"
            animate={{ width: items.length > 0 ? `${(checkedCount / items.length) * 100}%` : "0%" }}
            transition={{ type: "spring", damping: 20 }} />
        </div>
      </div>

      {/* Items */}
      <div className="px-4 pt-2 pb-2 space-y-0.5">
        {items.map((item) => (
          <motion.div key={item.id} layout className="flex items-center gap-3 py-2">
            <button onClick={() => toggle(item.id)}
              className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${item.checked ? "bg-purple-500 border-purple-500" : "border-gray-300 dark:border-gray-600"}`}>
              {item.checked && <Check size={11} className="text-white" />}
            </button>
            <span className={`flex-1 text-[14px] transition-all ${item.checked ? "line-through text-gray-300 dark:text-gray-600" : "text-gray-900 dark:text-white"}`}>{item.text}</span>
            <button onClick={() => remove(item.id)} className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors"><X size={13} /></button>
          </motion.div>
        ))}
      </div>

      {/* Add custom item */}
      <div className="px-4 pb-4 border-t border-gray-100 dark:border-white/6 pt-3 flex gap-2">
        <input type="text" placeholder="Добави нов елемент…" value={newText} onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          className="flex-1 bg-gray-100 dark:bg-white/8 rounded-xl px-3 py-2 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 outline-none" />
        <button onClick={addItem} disabled={!newText.trim()}
          className={`px-3 py-2 rounded-xl text-[14px] font-semibold transition-all ${newText.trim() ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-white/6 text-gray-300"}`}>
          <Plus size={16} />
        </button>
      </div>
    </Card>
  );
}

// ─── Maps Tab ─────────────────────────────────────────────────────────────────

interface MapsProps {
  savedLocation: SavedLocation | null;
  setSavedLocation: (loc: SavedLocation | null) => void;
  checklistItems: ChecklistItem[];
  setChecklistItems: (items: ChecklistItem[]) => void;
}

export default function Maps({ savedLocation, setSavedLocation, checklistItems, setChecklistItems }: MapsProps) {
  return (
    <div className="space-y-4 px-4 pb-8 pt-2">
      <FindMyCar saved={savedLocation} onSave={setSavedLocation} onClear={() => setSavedLocation(null)} />
      <GasStationFinder />
      <Checklist items={checklistItems} setItems={setChecklistItems} />
    </div>
  );
}
