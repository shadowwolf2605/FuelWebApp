import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fuel,
  BarChart2,
  Clock,
  Droplets,
  Banknote,
  CreditCard,
  Gauge,
  Calendar,
  Download,
  Inbox,
  Sun,
  Moon,
  MapPin,
  Flag,
  CheckSquare,
  ArrowRight,
  ArrowLeftRight,
  AlertTriangle,
  Navigation,
  Play,
  Square,
  Trash2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FuelRecord {
  id: string;
  date: Date;
  startKm: number;
  endKm: number;
  liters: number;
  pricePerLiter: number;
}

function distance(r: FuelRecord) { return r.endKm - r.startKm; }
function consumption(r: FuelRecord) { return (r.liters / distance(r)) * 100; }
function totalCost(r: FuelRecord) { return r.liters * r.pricePerLiter; }

function formatDate(d: Date) {
  return d.toLocaleString("bg-BG", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? null : n;
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/5 dark:border-white/8 ${className}`}
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
    >
      {children}
    </div>
  );
}

// ─── Input Field ──────────────────────────────────────────────────────────────

function FuelInputField({
  label, placeholder, unit, icon, iconColorClass, value, onChange,
}: {
  label: string; placeholder: string; unit: string;
  icon: React.ReactNode; iconColorClass: string;
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-7 flex-shrink-0 flex items-center justify-center ${iconColorClass}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1 leading-none">{label}</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-[15px] font-medium text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 outline-none border-none focus:ring-0"
          />
          <span className="text-[13px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/8 px-2 py-[3px] rounded-md flex-shrink-0">
            {unit}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Result Tile ──────────────────────────────────────────────────────────────

function ResultTile({ icon, iconColorClass, title, value, unit }: {
  icon: React.ReactNode; iconColorClass: string;
  title: string; value: string; unit: string;
}) {
  return (
    <div className="flex-1 flex items-center gap-2.5 bg-gray-50 dark:bg-white/5 rounded-xl p-3">
      <div className={`flex-shrink-0 ${iconColorClass}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-none mb-0.5">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-[17px] font-bold text-gray-900 dark:text-white tabular-nums">{value}</span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">{unit}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Consumption Badge ────────────────────────────────────────────────────────

function ConsumptionBadge({ value }: { value: number }) {
  const color = value < 6
    ? "text-green-500 bg-green-500/12"
    : value < 9
    ? "text-orange-500 bg-orange-500/12"
    : "text-red-500 bg-red-500/12";
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${color}`}>
      <Gauge size={10} />
      {value.toFixed(2)} л/100км
    </span>
  );
}

// ─── Stat Item ────────────────────────────────────────────────────────────────

function StatItem({ icon, colorClass, value, unit }: {
  icon: React.ReactNode; colorClass: string; value: string; unit: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={colorClass}>{icon}</div>
      <span className="text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">{value}</span>
      <span className="text-[10px] text-gray-400 dark:text-gray-500">{unit}</span>
    </div>
  );
}

// ─── Pulsing Dot ──────────────────────────────────────────────────────────────

function PulsingDot() {
  return (
    <div className="relative flex items-center justify-center w-14 h-14">
      <motion.div
        className="absolute rounded-full bg-blue-500/25"
        style={{ width: 56, height: 56 }}
        animate={{ scale: [1, 1.6], opacity: [1, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.div
        className="absolute rounded-full bg-blue-500/45"
        style={{ width: 36, height: 36 }}
        animate={{ scale: [1, 1.25], opacity: [0.8, 0.2] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
      />
      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center z-10">
        <Navigation size={12} className="text-white fill-white" />
      </div>
    </div>
  );
}

// ─── GPS Trip Card ────────────────────────────────────────────────────────────

type GpsStatus = "idle" | "tracking" | "denied" | "unavailable";

function GpsTripCard({
  startKmText, onEndKmSet,
}: {
  startKmText: string;
  onEndKmSet: (v: string) => void;
}) {
  const [status, setStatus] = useState<GpsStatus>("idle");
  const [distanceM, setDistanceM] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<GeolocationPosition | null>(null);

  const distanceKm = distanceM / 1000;

  const isAvailable = "geolocation" in navigator;

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  function startTrip() {
    if (!isAvailable) { setStatus("unavailable"); return; }
    setDistanceM(0);
    lastPosRef.current = null;
    setErrorMsg(null);
    setStatus("tracking");

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (pos.coords.accuracy > 65) return;
        if (lastPosRef.current) {
          const delta = haversineM(
            lastPosRef.current.coords.latitude,
            lastPosRef.current.coords.longitude,
            pos.coords.latitude,
            pos.coords.longitude,
          );
          if (delta > 0) setDistanceM((d) => d + delta);
        }
        lastPosRef.current = pos;
      },
      (err) => { setErrorMsg(err.message); },
      { enableHighAccuracy: true, distanceFilter: 5 } as PositionOptions,
    );
  }

  function stopTrip() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setStatus("idle");
    const km = distanceKm;
    if (km < 0.01) return;
    const rounded = Math.round(km * 10) / 10;
    const start = parseNum(startKmText);
    if (start !== null) {
      onEndKmSet((start + rounded).toFixed(1));
    } else {
      onEndKmSet(rounded.toFixed(1));
    }
  }

  const isTracking = status === "tracking";

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Navigation size={16} className="text-gray-900 dark:text-white" />
          <span className="text-[15px] font-semibold text-gray-900 dark:text-white">
            GPS Проследяване
          </span>
        </div>
        <AnimatePresence>
          {isTracking && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-[10px] font-bold text-white bg-green-500 px-2 py-0.5 rounded-full"
            >
              АКТИВНО
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Distance display */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">Изминато разстояние</p>
          <div className="flex items-baseline gap-1.5">
            <motion.span
              key={Math.floor(distanceKm * 100)}
              className={`text-[38px] font-bold tabular-nums leading-none ${
                isTracking ? "text-blue-500" : "text-gray-900 dark:text-white"
              }`}
            >
              {distanceKm.toFixed(3)}
            </motion.span>
            <span className="text-[20px] text-gray-400 dark:text-gray-500 font-normal">км</span>
          </div>
        </div>
        {isTracking ? (
          <PulsingDot />
        ) : (
          <Navigation size={48} className="text-gray-300 dark:text-gray-600" />
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 text-orange-500 bg-orange-500/10 rounded-lg px-3 py-2 mb-3 text-[12px]"
          >
            <AlertTriangle size={13} />
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button */}
      <AnimatePresence mode="wait">
        {!isAvailable ? (
          <motion.div
            key="unavailable"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[15px] font-semibold bg-gray-100 dark:bg-white/6 text-gray-400 dark:text-gray-500"
          >
            <Navigation size={16} />
            GPS не е наличен
          </motion.div>
        ) : isTracking ? (
          <motion.button
            key="stop"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            whileTap={{ scale: 0.97 }}
            onClick={stopTrip}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[15px] font-semibold bg-red-500 text-white"
          >
            <Square size={16} className="fill-white" />
            Спри пътуването
          </motion.button>
        ) : (
          <motion.button
            key="start"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            whileTap={{ scale: 0.97 }}
            onClick={startTrip}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[15px] font-semibold bg-green-500 text-white"
          >
            <Play size={16} className="fill-white" />
            Стартирай пътуването
          </motion.button>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ─── Empty History ────────────────────────────────────────────────────────────

function EmptyHistory() {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/5 dark:border-white/8">
      <div className="text-gray-300 dark:text-gray-600"><Inbox size={42} /></div>
      <p className="text-[15px] text-gray-400 dark:text-gray-500">Няма запазени записи</p>
      <p className="text-[12px] text-gray-300 dark:text-gray-600 text-center px-6">
        Въведи данни и натисни „Запази"
      </p>
    </div>
  );
}

// ─── History Row ──────────────────────────────────────────────────────────────

function HistoryRow({ record, onDelete }: { record: FuelRecord; onDelete: () => void }) {
  const cons = consumption(record);
  const color = cons < 6 ? "text-green-500 bg-green-500/12"
    : cons < 9 ? "text-orange-500 bg-orange-500/12"
    : "text-red-500 bg-red-500/12";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
    >
      <Card className="p-4">
        {/* Top row: date + badge + delete */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
            <Calendar size={12} />
            <span className="text-[12px]">{formatDate(record.date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${color}`}>
              <Gauge size={10} />
              {cons.toFixed(2)} л/100км
            </span>
            <button
              onClick={onDelete}
              className="text-red-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div className="h-px bg-gray-100 dark:bg-white/8 mb-3" />

        {/* Odometer range */}
        <div className="flex items-center gap-1.5 mb-3 text-[12px]">
          <Flag size={11} className="text-green-500" />
          <span className="font-medium text-gray-900 dark:text-white tabular-nums">
            {record.startKm.toFixed(0)}
          </span>
          <ArrowRight size={11} className="text-gray-400 dark:text-gray-500" />
          <CheckSquare size={11} className="text-red-500" />
          <span className="font-medium text-gray-900 dark:text-white tabular-nums">
            {record.endKm.toFixed(0)}
          </span>
          <span className="text-gray-400 dark:text-gray-500">км</span>
          <div className="flex-1" />
          <span className="font-semibold text-blue-500 tabular-nums">
            {distance(record).toFixed(1)} км
          </span>
        </div>

        {/* Stats */}
        <div className="flex justify-between items-center">
          <StatItem icon={<Droplets size={12} />} colorClass="text-cyan-500"
            value={record.liters.toFixed(1)} unit="л" />
          <StatItem icon={<Banknote size={12} />} colorClass="text-green-500"
            value={record.pricePerLiter.toFixed(2)} unit="лв/л" />
          <StatItem icon={<CreditCard size={12} />} colorClass="text-orange-500"
            value={totalCost(record).toFixed(2)} unit="лв" />
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Haversine helper (metres between two lat/lng) ────────────────────────────

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function FuelCalculator() {
  const [dark, setDark] = useState(false);
  const [startKmText, setStartKmText] = useState("");
  const [endKmText, setEndKmText] = useState("");
  const [litersText, setLitersText] = useState("");
  const [priceText, setPriceText] = useState("");
  const [history, setHistory] = useState<FuelRecord[]>([]);

  const startKm = parseNum(startKmText);
  const endKm = parseNum(endKmText);
  const liters = parseNum(litersText);
  const price = parseNum(priceText);

  const dist =
    startKm !== null && endKm !== null && endKm > startKm
      ? endKm - startKm
      : null;
  const distanceError =
    startKm !== null && endKm !== null && endKm <= startKm;

  const cons = dist && liters && dist > 0 && liters > 0 ? (liters / dist) * 100 : null;
  const cost = liters && price && liters > 0 && price > 0 ? liters * price : null;
  const isValid = cons !== null && cost !== null;

  const save = useCallback(() => {
    if (!isValid || !startKm || !endKm || !liters || !price) return;
    const record: FuelRecord = {
      id: crypto.randomUUID(),
      date: new Date(),
      startKm,
      endKm,
      liters,
      pricePerLiter: price,
    };
    setHistory((h) => [record, ...h]);
    setStartKmText(""); setEndKmText(""); setLitersText(""); setPriceText("");
  }, [isValid, startKm, endKm, liters, price]);

  const deleteRecord = useCallback((id: string) => {
    setHistory((h) => h.filter((r) => r.id !== id));
  }, []);

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-gray-200 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
        <div
          className="w-full max-w-sm bg-[#f2f2f7] dark:bg-[#111113] rounded-[2.5rem] overflow-hidden relative"
          style={{
            boxShadow:
              "0 0 0 1.5px rgba(0,0,0,0.18), 0 20px 60px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.15)",
            minHeight: "844px",
          }}
        >
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 pt-4 pb-1">
            <span className="text-[13px] font-semibold text-gray-900 dark:text-white">
              {new Date().getHours()}:{String(new Date().getMinutes()).padStart(2, "0")}
            </span>
            <div className="w-24 h-6 bg-black dark:bg-[#1c1c1e] rounded-full mx-auto" />
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5 items-end">
                {[2, 3, 4, 5].map((h) => (
                  <div key={h} className="w-1 bg-gray-900 dark:bg-white rounded-[1px]" style={{ height: h * 2 + "px" }} />
                ))}
              </div>
              <svg width="15" height="12" viewBox="0 0 15 12" className="fill-gray-900 dark:fill-white">
                <path d="M7.5 2.1C9.56 2.1 11.4 2.93 12.74 4.28L14.14 2.88C12.43 1.1 10.09 0 7.5 0C4.91 0 2.57 1.1 0.86 2.88L2.26 4.28C3.6 2.93 5.44 2.1 7.5 2.1Z" />
                <path d="M7.5 5.25C8.72 5.25 9.82 5.74 10.62 6.54L12.02 5.14C10.85 3.97 9.26 3.25 7.5 3.25C5.74 3.25 4.15 3.97 2.98 5.14L4.38 6.54C5.18 5.74 6.28 5.25 7.5 5.25Z" />
                <circle cx="7.5" cy="10" r="2" />
              </svg>
              <div className="flex items-center gap-0.5">
                <div className="h-3 rounded-[2px] bg-gray-900 dark:bg-white" style={{ width: "22px" }} />
                <div className="h-1.5 rounded-r-[1px] bg-gray-900 dark:bg-white" style={{ width: "2px" }} />
              </div>
            </div>
          </div>

          {/* Navigation bar */}
          <div className="px-6 pt-3 pb-2 flex items-end justify-between">
            <h1 className="text-[28px] font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
              Разход на гориво
            </h1>
            <button onClick={() => setDark((d) => !d)} className="mb-1 p-1.5 rounded-full transition-colors">
              {dark ? <Moon size={20} className="text-indigo-400" /> : <Sun size={20} className="text-orange-400" />}
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto px-4 pb-8 space-y-4" style={{ maxHeight: "calc(844px - 130px)" }}>

            {/* GPS Card */}
            <GpsTripCard startKmText={startKmText} onEndKmSet={setEndKmText} />

            {/* Input Card */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Fuel size={16} className="text-gray-900 dark:text-white" />
                <span className="text-[15px] font-semibold text-gray-900 dark:text-white">Въведи данни</span>
              </div>

              <div className="space-y-4">
                {/* Start odometer */}
                <FuelInputField
                  label="Начален километраж"
                  placeholder="напр. 45000"
                  unit="км"
                  icon={<Flag size={18} />}
                  iconColorClass="text-green-500"
                  value={startKmText}
                  onChange={setStartKmText}
                />
                <div className="h-px bg-gray-100 dark:bg-white/8" />

                {/* End odometer */}
                <FuelInputField
                  label="Краен километраж"
                  placeholder="напр. 45450"
                  unit="км"
                  icon={<MapPin size={18} />}
                  iconColorClass="text-red-500"
                  value={endKmText}
                  onChange={setEndKmText}
                />

                {/* Distance badge / error */}
                <AnimatePresence>
                  {dist !== null && (
                    <motion.div
                      key="dist-ok"
                      initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ type: "spring", stiffness: 320, damping: 26 }}
                      className="inline-flex items-center gap-1.5 text-blue-500 bg-blue-500/10 rounded-lg px-2.5 py-1.5 text-[12px] font-medium"
                    >
                      <ArrowLeftRight size={12} />
                      Изминати: {dist.toFixed(1)} км
                    </motion.div>
                  )}
                  {distanceError && (
                    <motion.div
                      key="dist-err"
                      initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ type: "spring", stiffness: 320, damping: 26 }}
                      className="inline-flex items-center gap-1.5 text-orange-500 bg-orange-500/10 rounded-lg px-2.5 py-1.5 text-[12px]"
                    >
                      <AlertTriangle size={12} />
                      Крайният км трябва да е по-голям от началния
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="h-px bg-gray-100 dark:bg-white/8" />

                {/* Liters */}
                <FuelInputField
                  label="Заредени литри"
                  placeholder="напр. 40.5"
                  unit="л"
                  icon={<Droplets size={18} />}
                  iconColorClass="text-cyan-500"
                  value={litersText}
                  onChange={setLitersText}
                />
                <div className="h-px bg-gray-100 dark:bg-white/8" />

                {/* Price */}
                <FuelInputField
                  label="Цена за литър"
                  placeholder="напр. 2.89"
                  unit="лв"
                  icon={<Banknote size={18} />}
                  iconColorClass="text-green-500"
                  value={priceText}
                  onChange={setPriceText}
                />
              </div>
            </Card>

            {/* Result Card */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={16} className="text-gray-900 dark:text-white" />
                <span className="text-[15px] font-semibold text-gray-900 dark:text-white">Резултат</span>
              </div>

              <div className="flex gap-3 mb-4">
                <ResultTile
                  icon={<Gauge size={22} />}
                  iconColorClass="text-orange-500"
                  title="Разход"
                  value={cons !== null ? cons.toFixed(2) : "—"}
                  unit="л/100км"
                />
                <ResultTile
                  icon={<CreditCard size={22} />}
                  iconColorClass="text-green-500"
                  title="Обща сума"
                  value={cost !== null ? cost.toFixed(2) : "—"}
                  unit="лв"
                />
              </div>

              <motion.button
                onClick={save}
                disabled={!isValid}
                whileTap={isValid ? { scale: 0.97 } : {}}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[15px] font-semibold transition-all duration-200 ${
                  isValid
                    ? "bg-blue-500 text-white shadow-sm shadow-blue-500/25"
                    : "bg-gray-100 dark:bg-white/6 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                }`}
              >
                <Download size={16} />
                Запази
              </motion.button>
            </Card>

            {/* History */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-900 dark:text-white" />
                  <span className="text-[15px] font-semibold text-gray-900 dark:text-white">История</span>
                </div>
                {history.length > 0 && (
                  <span className="text-[12px] text-gray-400 dark:text-gray-500">
                    {history.length} {history.length === 1 ? "запис" : "записа"}
                  </span>
                )}
              </div>

              {history.length === 0 ? (
                <EmptyHistory />
              ) : (
                <div className="space-y-2.5">
                  <AnimatePresence mode="popLayout">
                    {history.map((r) => (
                      <HistoryRow key={r.id} record={r} onDelete={() => deleteRecord(r.id)} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Home indicator */}
          <div className="flex justify-center pt-2 pb-4">
            <div className="w-32 h-1 bg-gray-900 dark:bg-white opacity-25 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
