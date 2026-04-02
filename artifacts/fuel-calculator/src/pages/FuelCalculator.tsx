import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fuel,
  Clock,
  Droplets,
  Banknote,
  CreditCard,
  Gauge,
  Calendar,
  Inbox,
  Sun,
  Moon,
  MapPin,
  Flag,
  ArrowRight,
  AlertTriangle,
  Navigation,
  Play,
  Square,
  Trash2,
  CheckCircle2,
  MessageSquare,
  Timer,
  ChevronRight,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveTrip {
  id: string;
  startedAt: Date;
  startKm: number;
  liters: number;
  pricePerLiter: number;
}

interface CompletedTrip {
  id: string;
  startedAt: Date;
  endedAt: Date;
  startKm: number;
  endKm: number;
  liters: number;
  pricePerLiter: number;
  note: string;
}

function tripDistance(t: CompletedTrip) { return t.endKm - t.startKm; }
function tripConsumption(t: CompletedTrip) { return (t.liters / tripDistance(t)) * 100; }
function tripTotalCost(t: CompletedTrip) { return t.liters * t.pricePerLiter; }

function formatDate(d: Date) {
  return d.toLocaleString("bg-BG", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatElapsed(start: Date, now: Date) {
  const s = Math.floor((now.getTime() - start.getTime()) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}ч ${m.toString().padStart(2, "0")}м`;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? null : n;
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/5 dark:border-white/8 ${className}`}
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      {children}
    </div>
  );
}

// ─── Input Field ──────────────────────────────────────────────────────────────

function Field({ label, placeholder, unit, icon, iconColorClass, value, onChange, type = "number" }: {
  label: string; placeholder: string; unit?: string;
  icon: React.ReactNode; iconColorClass: string;
  value: string; onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-7 flex-shrink-0 flex items-center justify-center ${iconColorClass}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-0.5 leading-none">{label}</p>
        <div className="flex items-center gap-2">
          <input
            type={type}
            inputMode={type === "number" ? "decimal" : "text"}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-[15px] font-medium text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 outline-none border-none focus:ring-0"
          />
          {unit && (
            <span className="text-[13px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/8 px-2 py-[3px] rounded-md flex-shrink-0">
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({ icon, colorClass, label, value, unit }: {
  icon: React.ReactNode; colorClass: string; label: string; value: string; unit: string;
}) {
  return (
    <div className="flex-1 bg-gray-50 dark:bg-white/5 rounded-xl p-3 flex flex-col gap-1">
      <div className={`${colorClass}`}>{icon}</div>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-none">{label}</p>
      <div className="flex items-baseline gap-0.5">
        <span className="text-[15px] font-bold text-gray-900 dark:text-white tabular-nums">{value}</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">{unit}</span>
      </div>
    </div>
  );
}

// ─── Pulsing Dot ──────────────────────────────────────────────────────────────

function PulsingDot() {
  return (
    <div className="relative flex items-center justify-center w-12 h-12">
      <motion.div className="absolute rounded-full bg-blue-500/25" style={{ width: 48, height: 48 }}
        animate={{ scale: [1, 1.6], opacity: [1, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }} />
      <motion.div className="absolute rounded-full bg-blue-500/40" style={{ width: 30, height: 30 }}
        animate={{ scale: [1, 1.3], opacity: [0.8, 0.1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }} />
      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center z-10">
        <Navigation size={10} className="text-white fill-white" />
      </div>
    </div>
  );
}

// ─── GPS Card ─────────────────────────────────────────────────────────────────

function GpsCard({ onDistanceReady }: { onDistanceReady: (km: number) => void }) {
  const [tracking, setTracking] = useState(false);
  const [distanceM, setDistanceM] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);
  const lastRef = useRef<GeolocationPosition | null>(null);
  const available = "geolocation" in navigator;
  const km = distanceM / 1000;

  useEffect(() => () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); }, []);

  function start() {
    if (!available) return;
    setDistanceM(0); lastRef.current = null; setError(null); setTracking(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (pos.coords.accuracy > 65) return;
        if (lastRef.current) {
          const d = haversineM(lastRef.current.coords.latitude, lastRef.current.coords.longitude, pos.coords.latitude, pos.coords.longitude);
          if (d > 0) setDistanceM((prev) => prev + d);
        }
        lastRef.current = pos;
      },
      (e) => setError(e.message),
      { enableHighAccuracy: true } as PositionOptions,
    );
  }

  function stop() {
    if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    setTracking(false);
    if (km > 0.01) onDistanceReady(Math.round(km * 10) / 10);
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Navigation size={15} className="text-gray-900 dark:text-white" />
          <span className="text-[14px] font-semibold text-gray-900 dark:text-white">GPS Проследяване</span>
        </div>
        <AnimatePresence>
          {tracking && (
            <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              className="text-[9px] font-bold text-white bg-green-500 px-2 py-0.5 rounded-full tracking-wide">
              АКТИВНО
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">Изминато разстояние</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-[32px] font-bold tabular-nums leading-none ${tracking ? "text-blue-500" : "text-gray-900 dark:text-white"}`}>
              {km.toFixed(3)}
            </span>
            <span className="text-[17px] text-gray-400 dark:text-gray-500">км</span>
          </div>
        </div>
        {tracking ? <PulsingDot /> : <Navigation size={40} className="text-gray-200 dark:text-gray-700" />}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-orange-500 bg-orange-500/10 rounded-lg px-3 py-2 mb-3 text-[12px]">
          <AlertTriangle size={12} />{error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {!available ? (
          <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold bg-gray-100 dark:bg-white/6 text-gray-400">
            <Navigation size={15} />GPS не е наличен
          </div>
        ) : tracking ? (
          <motion.button key="stop" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            whileTap={{ scale: 0.97 }} onClick={stop}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold bg-red-500 text-white">
            <Square size={14} className="fill-white" />Спри пътуването
          </motion.button>
        ) : (
          <motion.button key="start" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            whileTap={{ scale: 0.97 }} onClick={start}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold bg-green-500 text-white">
            <Play size={14} className="fill-white" />Стартирай GPS
          </motion.button>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ─── Start Trip Form ──────────────────────────────────────────────────────────

function StartTripForm({ onStart }: { onStart: (trip: ActiveTrip) => void }) {
  const [startKm, setStartKm] = useState("");
  const [liters, setLiters] = useState("");
  const [price, setPrice] = useState("");

  const km = parseNum(startKm);
  const lt = parseNum(liters);
  const pr = parseNum(price);
  const canStart = km !== null && km > 0 && lt !== null && lt > 0 && pr !== null && pr > 0;

  function handleStart() {
    if (!canStart || !km || !lt || !pr) return;
    onStart({ id: crypto.randomUUID(), startedAt: new Date(), startKm: km, liters: lt, pricePerLiter: pr });
    setStartKm(""); setLiters(""); setPrice("");
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/6">
        <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center">
          <Fuel size={15} className="text-white" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white leading-tight">Ново пътуване</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Въведи начални данни</p>
        </div>
      </div>

      {/* Fields */}
      <div className="px-4 py-3 space-y-3">
        <Field label="Начален километраж" placeholder="напр. 45 000" unit="км"
          icon={<Flag size={17} />} iconColorClass="text-green-500"
          value={startKm} onChange={setStartKm} />
        <div className="h-px bg-gray-100 dark:bg-white/6" />
        <Field label="Заредени литри" placeholder="напр. 40.5" unit="л"
          icon={<Droplets size={17} />} iconColorClass="text-cyan-500"
          value={liters} onChange={setLiters} />
        <div className="h-px bg-gray-100 dark:bg-white/6" />
        <Field label="Цена за литър" placeholder="напр. 1.79" unit="€"
          icon={<Banknote size={17} />} iconColorClass="text-green-500"
          value={price} onChange={setPrice} />
      </div>

      {/* Start button */}
      <div className="px-4 pb-4">
        <motion.button
          onClick={handleStart}
          disabled={!canStart}
          whileTap={canStart ? { scale: 0.97 } : {}}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[15px] font-semibold transition-all duration-200 ${
            canStart
              ? "bg-blue-500 text-white shadow-sm shadow-blue-500/25"
              : "bg-gray-100 dark:bg-white/6 text-gray-300 dark:text-gray-600 cursor-not-allowed"
          }`}
        >
          <Play size={15} className={canStart ? "fill-white" : ""} />
          Стартирай пътуването
        </motion.button>
      </div>
    </Card>
  );
}

// ─── Current Trip Card ────────────────────────────────────────────────────────

function CurrentTripCard({
  trip, onEnd, onGpsDistance,
}: {
  trip: ActiveTrip;
  onEnd: (endKm: number, note: string) => void;
  onGpsDistance: (km: number) => void;
}) {
  const [showEndForm, setShowEndForm] = useState(false);
  const [endKmText, setEndKmText] = useState("");
  const [note, setNote] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const endKm = parseNum(endKmText);
  const dist = endKm !== null && endKm > trip.startKm ? endKm - trip.startKm : null;
  const distError = endKm !== null && endKm <= trip.startKm;
  const cons = dist ? (trip.liters / dist) * 100 : null;
  const cost = trip.liters * trip.pricePerLiter;
  const canEnd = dist !== null && dist > 0;

  function handleGps(km: number) {
    onGpsDistance(km);
    setEndKmText((trip.startKm + km).toFixed(1));
  }

  function handleEnd() {
    if (!canEnd || !endKm) return;
    onEnd(endKm, note.trim());
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden">
        {/* Active header */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center">
              <Navigation size={15} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[15px] font-semibold text-gray-900 dark:text-white leading-tight">Текущо пътуване</p>
                <span className="text-[9px] font-bold text-white bg-orange-500 px-1.5 py-0.5 rounded-full tracking-wide">АКТИВНО</span>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Започнато {formatDate(trip.startedAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <Timer size={12} />
            <span className="text-[12px] font-semibold tabular-nums">{formatElapsed(trip.startedAt, now)}</span>
          </div>
        </div>

        {/* Trip stats summary */}
        <div className="px-4 py-3 flex gap-2">
          <StatPill icon={<Flag size={13} />} colorClass="text-green-500"
            label="Начало" value={trip.startKm.toFixed(0)} unit=" км" />
          <StatPill icon={<Droplets size={13} />} colorClass="text-cyan-500"
            label="Гориво" value={trip.liters.toFixed(1)} unit=" л" />
          <StatPill icon={<Banknote size={13} />} colorClass="text-green-500"
            label="Цена/л" value={trip.pricePerLiter.toFixed(2)} unit=" €" />
          <StatPill icon={<CreditCard size={13} />} colorClass="text-orange-500"
            label="Сума" value={cost.toFixed(2)} unit=" €" />
        </div>

        {/* End Trip toggle */}
        <AnimatePresence>
          {!showEndForm ? (
            <motion.div key="end-btn" className="px-4 pb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button
                onClick={() => setShowEndForm(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[15px] font-semibold bg-orange-500 text-white"
              >
                <CheckCircle2 size={16} />
                Завърши пътуването
                <ChevronRight size={15} className="ml-auto opacity-70" />
              </button>
            </motion.div>
          ) : (
            <motion.div key="end-form"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden">

              {/* GPS inside current trip */}
              <div className="px-4 pb-3 border-t border-gray-100 dark:border-white/6 pt-3">
                <GpsCard onDistanceReady={handleGps} />
              </div>

              {/* End form */}
              <div className="px-4 pb-3 space-y-3 border-t border-gray-100 dark:border-white/6 pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-gray-900 dark:text-white">Въведи края на пътуването</p>
                  <button onClick={() => setShowEndForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <X size={16} />
                  </button>
                </div>

                <Field label="Краен километраж" placeholder="напр. 45 450" unit="км"
                  icon={<MapPin size={17} />} iconColorClass="text-red-500"
                  value={endKmText} onChange={setEndKmText} />

                {/* Distance badge / error */}
                <AnimatePresence>
                  {dist !== null && (
                    <motion.div key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-blue-500 bg-blue-500/10 rounded-lg px-2.5 py-1.5 text-[12px] font-medium">
                        <ArrowRight size={11} />
                        {dist.toFixed(1)} км
                      </div>
                      {cons !== null && (
                        <div className={`flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg ${
                          cons < 6 ? "text-green-600 bg-green-500/10" : cons < 9 ? "text-orange-500 bg-orange-500/10" : "text-red-500 bg-red-500/10"
                        }`}>
                          <Gauge size={11} />
                          {cons.toFixed(2)} л/100км
                        </div>
                      )}
                    </motion.div>
                  )}
                  {distError && (
                    <motion.div key="err" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 text-orange-500 bg-orange-500/10 rounded-lg px-2.5 py-1.5 text-[12px]">
                      <AlertTriangle size={12} />
                      Крайният км трябва да е по-голям от {trip.startKm}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="h-px bg-gray-100 dark:bg-white/6" />

                <Field label="Бележка (по желание)" placeholder="напр. Градско шофиране, До Гърция…" type="text"
                  icon={<MessageSquare size={17} />} iconColorClass="text-purple-500"
                  value={note} onChange={setNote} />
              </div>

              <div className="px-4 pb-4">
                <motion.button
                  onClick={handleEnd}
                  disabled={!canEnd}
                  whileTap={canEnd ? { scale: 0.97 } : {}}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[15px] font-semibold transition-all duration-200 ${
                    canEnd
                      ? "bg-orange-500 text-white shadow-sm shadow-orange-500/25"
                      : "bg-gray-100 dark:bg-white/6 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                  }`}
                >
                  <CheckCircle2 size={16} />
                  Запази пътуването
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ─── History Row ──────────────────────────────────────────────────────────────

function HistoryRow({ trip, onDelete }: { trip: CompletedTrip; onDelete: () => void }) {
  const cons = tripConsumption(trip);
  const cost = tripTotalCost(trip);
  const dist = tripDistance(trip);
  const consColor = cons < 6 ? "text-green-600 bg-green-500/12"
    : cons < 9 ? "text-orange-500 bg-orange-500/12"
    : "text-red-500 bg-red-500/12";

  return (
    <motion.div layout
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}>
      <Card className="p-4">
        {/* Top */}
        <div className="flex items-start justify-between mb-2.5">
          <div>
            <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 mb-0.5">
              <Calendar size={11} />
              <span className="text-[11px]">{formatDate(trip.endedAt)}</span>
            </div>
            {trip.note ? (
              <div className="flex items-center gap-1 text-purple-500">
                <MessageSquare size={11} />
                <span className="text-[12px] font-medium">{trip.note}</span>
              </div>
            ) : (
              <span className="text-[11px] text-gray-300 dark:text-gray-600 italic">Без бележка</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${consColor}`}>
              <Gauge size={10} />{cons.toFixed(2)} л/100км
            </span>
            <button onClick={onDelete} className="text-red-400 hover:text-red-500 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div className="h-px bg-gray-100 dark:bg-white/8 mb-2.5" />

        {/* Odometer strip */}
        <div className="flex items-center gap-1.5 mb-2.5 bg-gray-50 dark:bg-white/4 rounded-lg px-3 py-2">
          <Flag size={11} className="text-green-500 flex-shrink-0" />
          <span className="text-[12px] font-semibold text-gray-900 dark:text-white tabular-nums">{trip.startKm.toFixed(0)}</span>
          <div className="flex-1 flex items-center justify-center">
            <div className="h-px bg-gray-200 dark:bg-white/15 flex-1" />
            <span className="mx-2 text-[11px] font-semibold text-blue-500 tabular-nums whitespace-nowrap">{dist.toFixed(1)} км</span>
            <div className="h-px bg-gray-200 dark:bg-white/15 flex-1" />
          </div>
          <MapPin size={11} className="text-red-500 flex-shrink-0" />
          <span className="text-[12px] font-semibold text-gray-900 dark:text-white tabular-nums">{trip.endKm.toFixed(0)}</span>
        </div>

        {/* Stats row */}
        <div className="flex gap-2">
          <div className="flex-1 text-center">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">Гориво</p>
            <p className="text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">{trip.liters.toFixed(1)} <span className="text-[10px] font-normal text-gray-400">л</span></p>
          </div>
          <div className="w-px bg-gray-100 dark:bg-white/8" />
          <div className="flex-1 text-center">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">Цена/л</p>
            <p className="text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">{trip.pricePerLiter.toFixed(2)} <span className="text-[10px] font-normal text-gray-400">€</span></p>
          </div>
          <div className="w-px bg-gray-100 dark:bg-white/8" />
          <div className="flex-1 text-center">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">Общо</p>
            <p className="text-[13px] font-bold text-orange-500 tabular-nums">{cost.toFixed(2)} <span className="text-[10px] font-normal">€</span></p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Empty History ────────────────────────────────────────────────────────────

function EmptyHistory() {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/5 dark:border-white/8">
      <div className="text-gray-200 dark:text-gray-700"><Inbox size={42} /></div>
      <p className="text-[15px] text-gray-400 dark:text-gray-500">Няма завършени пътувания</p>
      <p className="text-[12px] text-gray-300 dark:text-gray-600 text-center px-8">
        Стартирай пътуване и го завърши, за да се появи тук
      </p>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function FuelCalculator() {
  const [dark, setDark] = useState(false);
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [history, setHistory] = useState<CompletedTrip[]>([]);

  function startTrip(trip: ActiveTrip) {
    setActiveTrip(trip);
  }

  function endTrip(endKm: number, note: string) {
    if (!activeTrip) return;
    const completed: CompletedTrip = {
      id: activeTrip.id,
      startedAt: activeTrip.startedAt,
      endedAt: new Date(),
      startKm: activeTrip.startKm,
      endKm,
      liters: activeTrip.liters,
      pricePerLiter: activeTrip.pricePerLiter,
      note,
    };
    setHistory((h) => [completed, ...h]);
    setActiveTrip(null);
  }

  function deleteTrip(id: string) {
    setHistory((h) => h.filter((t) => t.id !== id));
  }

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-gray-200 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
        <div
          className="w-full max-w-sm bg-[#f2f2f7] dark:bg-[#111113] rounded-[2.5rem] overflow-hidden relative"
          style={{
            boxShadow: "0 0 0 1.5px rgba(0,0,0,0.18), 0 20px 60px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.15)",
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

          {/* Nav bar */}
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

            {/* Trip section */}
            <AnimatePresence mode="wait">
              {activeTrip ? (
                <CurrentTripCard
                  key="active"
                  trip={activeTrip}
                  onEnd={endTrip}
                  onGpsDistance={() => {}}
                />
              ) : (
                <motion.div key="start-form" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                  {/* GPS card only when no active trip */}
                  <div className="space-y-4">
                    <GpsCard onDistanceReady={() => {}} />
                    <StartTripForm onStart={startTrip} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* History section */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-gray-900 dark:text-white" />
                  <span className="text-[15px] font-semibold text-gray-900 dark:text-white">История</span>
                </div>
                {history.length > 0 && (
                  <span className="text-[12px] text-gray-400 dark:text-gray-500">
                    {history.length} {history.length === 1 ? "пътуване" : "пътувания"}
                  </span>
                )}
              </div>

              {history.length === 0 ? (
                <EmptyHistory />
              ) : (
                <div className="space-y-2.5">
                  <AnimatePresence mode="popLayout">
                    {history.map((t) => (
                      <HistoryRow key={t.id} trip={t} onDelete={() => deleteTrip(t.id)} />
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
