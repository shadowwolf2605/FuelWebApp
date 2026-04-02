import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fuel, Droplets, Banknote, CreditCard, Gauge, Calendar, Inbox, Sun, Moon,
  MapPin, Flag, ArrowRight, AlertTriangle, Navigation, Play, Square, Trash2,
  CheckCircle2, MessageSquare, Timer, ChevronRight, X, Route, Users, Loader2,
  Search, Split, Pencil, BarChart2, Clock,
} from "lucide-react";
import { Card, Field, StatPill, PulsingDot, Divider, ActionButton, EmptyState } from "../components/ui";
import { parseNum, formatDate, formatShortDate, formatElapsed } from "../utils/helpers";
import { haversineM, geocodeAddress, routeDistanceKm } from "../utils/geo";
import type { ActiveTrip, CompletedTrip } from "../types";
import { tripConsumption, tripDistance, tripTotalCost } from "../types";

// ─── Consumption Graph ────────────────────────────────────────────────────────

function ConsumptionGraph({ trips }: { trips: CompletedTrip[] }) {
  if (trips.length < 2) return null;
  const data = [...trips].slice(0, 8).reverse();
  const values = data.map((t) => tripConsumption(t));
  const maxV = Math.max(...values, 12);
  const barW = 28;
  const gap = 10;
  const graphH = 80;
  const total = data.length * (barW + gap) - gap;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const avgY = graphH - (avg / maxV) * graphH;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 size={15} className="text-gray-900 dark:text-white" />
        <span className="text-[14px] font-semibold text-gray-900 dark:text-white">График на разхода</span>
        <span className="ml-auto text-[11px] text-indigo-500 font-medium">avg {avg.toFixed(2)} л/100км</span>
      </div>
      <div className="overflow-x-auto pb-1">
        <svg width={total} height={graphH + 28} viewBox={`0 0 ${total} ${graphH + 28}`}>
          {data.map((t, i) => {
            const cons = values[i];
            const h = (cons / maxV) * graphH;
            const x = i * (barW + gap);
            const color = cons < 6 ? "#22c55e" : cons < 9 ? "#f97316" : "#ef4444";
            return (
              <g key={t.id}>
                <rect x={x} y={graphH - h} width={barW} height={h} rx={4} fill={color} opacity={0.8} />
                <text x={x + barW / 2} y={graphH - h - 4} textAnchor="middle" fontSize={9} fill={color} fontWeight="600">
                  {cons.toFixed(1)}
                </text>
                <text x={x + barW / 2} y={graphH + 14} textAnchor="middle" fontSize={8} fill="#9ca3af">
                  {formatShortDate(t.endedAt)}
                </text>
              </g>
            );
          })}
          <line x1={0} y1={avgY} x2={total} y2={avgY} stroke="#6366f1" strokeWidth={1} strokeDasharray="4,3" opacity={0.6} />
        </svg>
      </div>
    </Card>
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
          if (d > 0) setDistanceM((p) => p + d);
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
              className="text-[9px] font-bold text-white bg-green-500 px-2 py-0.5 rounded-full tracking-wide">АКТИВНО</motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">Изминато разстояние</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-[32px] font-bold tabular-nums leading-none ${tracking ? "text-blue-500" : "text-gray-900 dark:text-white"}`}>{km.toFixed(3)}</span>
            <span className="text-[17px] text-gray-400 dark:text-gray-500">км</span>
          </div>
        </div>
        {tracking ? <PulsingDot /> : <Navigation size={40} className="text-gray-200 dark:text-gray-700" />}
      </div>
      {error && <div className="flex items-center gap-2 text-orange-500 bg-orange-500/10 rounded-lg px-3 py-2 mb-3 text-[12px]"><AlertTriangle size={12} />{error}</div>}
      <AnimatePresence mode="wait">
        {!available ? (
          <div key="na" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] bg-gray-100 dark:bg-white/6 text-gray-400">
            <Navigation size={15} />GPS не е наличен
          </div>
        ) : tracking ? (
          <motion.button key="stop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            whileTap={{ scale: 0.97 }} onClick={stop}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold bg-red-500 text-white">
            <Square size={14} className="fill-white" />Спри пътуването
          </motion.button>
        ) : (
          <motion.button key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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

function StartTripForm({ onStart }: { onStart: (t: ActiveTrip) => void }) {
  const [startKm, setStartKm] = useState("");
  const [liters, setLiters] = useState("");
  const [price, setPrice] = useState("");
  const km = parseNum(startKm); const lt = parseNum(liters); const pr = parseNum(price);
  const ok = km !== null && km > 0 && lt !== null && lt > 0 && pr !== null && pr > 0;

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/6">
        <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center"><Fuel size={15} className="text-white" /></div>
        <div>
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white leading-tight">Ново пътуване</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Въведи начални данни</p>
        </div>
      </div>
      <div className="px-4 py-3 space-y-3">
        <Field label="Начален километраж" placeholder="напр. 45 000" unit="км" icon={<Flag size={17} />} iconColorClass="text-green-500" value={startKm} onChange={setStartKm} />
        <Divider />
        <Field label="Заредени литри" placeholder="напр. 40.5" unit="л" icon={<Droplets size={17} />} iconColorClass="text-cyan-500" value={liters} onChange={setLiters} />
        <Divider />
        <Field label="Цена за литър" placeholder="напр. 1.79" unit="€" icon={<Banknote size={17} />} iconColorClass="text-green-500" value={price} onChange={setPrice} />
      </div>
      <div className="px-4 pb-4">
        <ActionButton onClick={() => { if (!ok || !km || !lt || !pr) return; onStart({ id: crypto.randomUUID(), startedAt: new Date().toISOString(), startKm: km, liters: lt, pricePerLiter: pr }); setStartKm(""); setLiters(""); setPrice(""); }} disabled={!ok} color="blue">
          <Play size={15} className={ok ? "fill-white" : ""} />Стартирай пътуването
        </ActionButton>
      </div>
    </Card>
  );
}

// ─── Current Trip Card ────────────────────────────────────────────────────────

function CurrentTripCard({ trip, onEnd }: { trip: ActiveTrip; onEnd: (endKm: number, note: string) => void }) {
  const [showEndForm, setShowEndForm] = useState(false);
  const [endKmText, setEndKmText] = useState("");
  const [note, setNote] = useState("");
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);

  const endKm = parseNum(endKmText);
  const dist = endKm !== null && endKm > trip.startKm ? endKm - trip.startKm : null;
  const distError = endKm !== null && endKm <= trip.startKm;
  const cons = dist ? (trip.liters / dist) * 100 : null;
  const cost = trip.liters * trip.pricePerLiter;
  const canEnd = dist !== null && dist > 0;

  return (
    <motion.div layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center"><Navigation size={15} className="text-white" /></div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Текущо пътуване</p>
                <span className="text-[9px] font-bold text-white bg-orange-500 px-1.5 py-0.5 rounded-full">АКТИВНО</span>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Започнато {formatDate(trip.startedAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <Timer size={12} /><span className="text-[12px] font-semibold tabular-nums">{formatElapsed(trip.startedAt, now)}</span>
          </div>
        </div>

        <div className="px-4 py-3 flex gap-2">
          <StatPill icon={<Flag size={13} />} colorClass="text-green-500" label="Начало" value={trip.startKm.toFixed(0)} unit=" км" />
          <StatPill icon={<Droplets size={13} />} colorClass="text-cyan-500" label="Гориво" value={trip.liters.toFixed(1)} unit=" л" />
          <StatPill icon={<Banknote size={13} />} colorClass="text-green-500" label="Цена/л" value={trip.pricePerLiter.toFixed(2)} unit=" €" />
          <StatPill icon={<CreditCard size={13} />} colorClass="text-orange-500" label="Сума" value={cost.toFixed(2)} unit=" €" />
        </div>

        <AnimatePresence>
          {!showEndForm ? (
            <motion.div key="btn" className="px-4 pb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button onClick={() => setShowEndForm(true)} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[15px] font-semibold bg-orange-500 text-white">
                <CheckCircle2 size={16} />Завърши пътуването<ChevronRight size={15} className="ml-auto opacity-70" />
              </button>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="px-4 pb-3 border-t border-gray-100 dark:border-white/6 pt-3">
                <GpsCard onDistanceReady={(km) => setEndKmText((trip.startKm + km).toFixed(1))} />
              </div>
              <div className="px-4 space-y-3 border-t border-gray-100 dark:border-white/6 pt-3 pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-gray-900 dark:text-white">Край на пътуването</p>
                  <button onClick={() => setShowEndForm(false)} className="text-gray-400"><X size={16} /></button>
                </div>
                <Field label="Краен километраж" placeholder="напр. 45 450" unit="км" icon={<MapPin size={17} />} iconColorClass="text-red-500" value={endKmText} onChange={setEndKmText} />
                <AnimatePresence>
                  {dist !== null && (
                    <motion.div key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-blue-500 bg-blue-500/10 rounded-lg px-2.5 py-1.5 text-[12px] font-medium"><ArrowRight size={11} />{dist.toFixed(1)} км</div>
                      {cons !== null && (
                        <div className={`flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg ${cons < 6 ? "text-green-600 bg-green-500/10" : cons < 9 ? "text-orange-500 bg-orange-500/10" : "text-red-500 bg-red-500/10"}`}>
                          <Gauge size={11} />{cons.toFixed(2)} л/100км
                        </div>
                      )}
                    </motion.div>
                  )}
                  {distError && (
                    <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-orange-500 bg-orange-500/10 rounded-lg px-2.5 py-1.5 text-[12px]">
                      <AlertTriangle size={12} />Крайният км трябва да е по-голям от {trip.startKm}
                    </motion.div>
                  )}
                </AnimatePresence>
                <Divider />
                <Field label="Бележка (по желание)" placeholder="напр. До Гърция…" type="text" icon={<MessageSquare size={17} />} iconColorClass="text-purple-500" value={note} onChange={setNote} />
              </div>
              <div className="px-4 pb-4">
                <ActionButton onClick={() => { if (!canEnd || !endKm) return; onEnd(endKm, note.trim()); }} disabled={!canEnd} color="orange">
                  <CheckCircle2 size={16} />Запази пътуването
                </ActionButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ─── Smart Trip Planner ───────────────────────────────────────────────────────

type PlannerMode = "manual" | "auto";

function SmartTripPlanner({ avgConsumption }: { avgConsumption: number | null }) {
  const [mode, setMode] = useState<PlannerMode>("manual");
  const [manualKmText, setManualKmText] = useState("");
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [routeKm, setRouteKm] = useState<number | null>(null);
  const [routeLabels, setRouteLabels] = useState<{ from: string; to: string } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [priceText, setPriceText] = useState("");
  const [customConsText, setCustomConsText] = useState("");
  const [passengers, setPassengers] = useState(1);

  const distanceKm = mode === "manual" ? parseNum(manualKmText) : routeKm;
  const effectiveCons = avgConsumption !== null ? avgConsumption : parseNum(customConsText);
  const price = parseNum(priceText);
  const totalLiters = distanceKm && effectiveCons && distanceKm > 0 && effectiveCons > 0 ? (distanceKm * effectiveCons) / 100 : null;
  const totalCost = totalLiters && price && price > 0 ? totalLiters * price : null;
  const perPerson = totalCost ? totalCost / passengers : null;

  async function calcRoute() {
    if (!fromText.trim() || !toText.trim()) return;
    setRouteLoading(true); setRouteError(null); setRouteKm(null); setRouteLabels(null);
    try {
      const [a, b] = await Promise.all([geocodeAddress(fromText), geocodeAddress(toText)]);
      if (!a) throw new Error(`Не намерих "${fromText}"`);
      if (!b) throw new Error(`Не намерих "${toText}"`);
      const km = await routeDistanceKm(a, b);
      setRouteKm(Math.round(km * 10) / 10);
      setRouteLabels({ from: a.label, to: b.label });
    } catch (e) { setRouteError((e as Error).message); }
    finally { setRouteLoading(false); }
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/6">
        <div className="w-8 h-8 rounded-xl bg-purple-500 flex items-center justify-center"><Route size={15} className="text-white" /></div>
        <div>
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Умен планировчик</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Изчисли горивото за маршрут</p>
        </div>
      </div>

      <div className="px-4 pt-3">
        <div className="flex bg-gray-100 dark:bg-white/8 rounded-xl p-1 gap-1">
          {(["manual", "auto"] as PlannerMode[]).map((m) => (
            <button key={m} onClick={() => { setMode(m); setRouteKm(null); setRouteError(null); setRouteLabels(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all duration-200 ${mode === m ? "bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white shadow-sm" : "text-gray-400 dark:text-gray-500"}`}>
              {m === "manual" ? <><Pencil size={12} />Ръчно</> : <><Search size={12} />Авто</>}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3 pb-0 space-y-3">
        <AnimatePresence mode="wait">
          {mode === "manual" ? (
            <motion.div key="manual" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
              <Field label="Разстояние" placeholder="напр. 350" unit="км" icon={<Route size={17} />} iconColorClass="text-purple-500" value={manualKmText} onChange={setManualKmText} />
            </motion.div>
          ) : (
            <motion.div key="auto" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-3">
              <Field label="Начална точка" placeholder="напр. София" type="text" icon={<Flag size={17} />} iconColorClass="text-green-500" value={fromText} onChange={(v) => { setFromText(v); setRouteKm(null); setRouteLabels(null); }} />
              <Divider />
              <Field label="Дестинация" placeholder="напр. Варна" type="text" icon={<MapPin size={17} />} iconColorClass="text-red-500" value={toText} onChange={(v) => { setToText(v); setRouteKm(null); setRouteLabels(null); }} />
              <motion.button onClick={calcRoute} disabled={routeLoading || !fromText.trim() || !toText.trim()} whileTap={!routeLoading ? { scale: 0.97 } : {}}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${routeLoading || !fromText.trim() || !toText.trim() ? "bg-gray-100 dark:bg-white/6 text-gray-300 dark:text-gray-600 cursor-not-allowed" : "bg-purple-500 text-white"}`}>
                {routeLoading ? <><Loader2 size={14} className="animate-spin" />Изчислявам…</> : <><Search size={14} />Изчисли маршрут</>}
              </motion.button>
              <AnimatePresence>
                {routeError && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-1.5 text-orange-500 bg-orange-500/10 rounded-lg px-3 py-2 text-[12px]"><AlertTriangle size={12} />{routeError}</motion.div>}
                {routeKm !== null && routeLabels && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-purple-500/8 dark:bg-purple-500/15 border border-purple-500/20 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1 min-w-0">
                      <Flag size={10} className="text-green-500 flex-shrink-0" />
                      <span className="text-[11px] font-medium text-gray-900 dark:text-white truncate">{routeLabels.from}</span>
                      <ArrowRight size={10} className="text-gray-400 flex-shrink-0" />
                      <MapPin size={10} className="text-red-500 flex-shrink-0" />
                      <span className="text-[11px] font-medium text-gray-900 dark:text-white truncate">{routeLabels.to}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[22px] font-bold text-purple-500 tabular-nums">{routeKm.toFixed(1)}</span>
                      <span className="text-[13px] text-gray-400">км по пътя</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <Divider />

        {avgConsumption !== null ? (
          <div className="flex items-center gap-3 py-1">
            <div className="w-7 flex-shrink-0 flex items-center justify-center text-orange-500"><Gauge size={17} /></div>
            <div className="flex-1">
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-0.5">Среден разход (от история)</p>
              <div className="flex items-baseline gap-1">
                <span className="text-[15px] font-bold text-orange-500 tabular-nums">{avgConsumption.toFixed(2)}</span>
                <span className="text-[12px] text-gray-400">л/100км</span>
              </div>
            </div>
            <span className="text-[10px] text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full font-semibold">авто</span>
          </div>
        ) : (
          <Field label="Среден разход" placeholder="напр. 7.5" unit="л/100км" icon={<Gauge size={17} />} iconColorClass="text-orange-500" value={customConsText} onChange={setCustomConsText} />
        )}

        <Divider />
        <Field label="Цена за литър" placeholder="напр. 1.79" unit="€" icon={<Banknote size={17} />} iconColorClass="text-green-500" value={priceText} onChange={setPriceText} />
        <Divider />

        <div className="flex items-center gap-3">
          <div className="w-7 flex-shrink-0 flex items-center justify-center text-blue-500"><Users size={17} /></div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Пътници</p>
              <span className="text-[13px] font-bold text-blue-500 tabular-nums">{passengers}</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setPassengers(n)}
                  className={`flex-1 h-8 rounded-lg text-[12px] font-bold transition-all duration-150 ${passengers === n ? "bg-blue-500 text-white shadow-sm shadow-blue-500/30" : "bg-gray-100 dark:bg-white/8 text-gray-400 dark:text-gray-500"}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {totalLiters !== null && totalCost !== null ? (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mx-4 mb-4 mt-3 rounded-2xl overflow-hidden border border-purple-500/15 bg-gradient-to-br from-purple-500/6 to-blue-500/6 dark:from-purple-500/12 dark:to-blue-500/12">
              <div className="px-3 py-2 border-b border-purple-500/10">
                <p className="text-[11px] font-semibold text-purple-500 uppercase tracking-wide">Резултат</p>
              </div>
              <div className="p-3 flex gap-2">
                <div className="flex-1 text-center">
                  <Droplets size={14} className="text-cyan-500 mx-auto mb-1" />
                  <p className="text-[10px] text-gray-400 mb-0.5">Гориво</p>
                  <p className="text-[18px] font-bold text-gray-900 dark:text-white tabular-nums">{totalLiters.toFixed(1)}<span className="text-[10px] font-normal text-gray-400 ml-0.5">л</span></p>
                </div>
                <div className="w-px bg-purple-500/15" />
                <div className="flex-1 text-center">
                  <CreditCard size={14} className="text-green-500 mx-auto mb-1" />
                  <p className="text-[10px] text-gray-400 mb-0.5">Общо</p>
                  <p className="text-[18px] font-bold text-green-500 tabular-nums">{totalCost.toFixed(2)}<span className="text-[10px] font-normal text-gray-400 ml-0.5">€</span></p>
                </div>
                {passengers > 1 && perPerson && (
                  <>
                    <div className="w-px bg-purple-500/15" />
                    <div className="flex-1 text-center">
                      <Split size={14} className="text-blue-500 mx-auto mb-1" />
                      <p className="text-[10px] text-gray-400 mb-0.5">На човек</p>
                      <p className="text-[18px] font-bold text-blue-500 tabular-nums">{perPerson.toFixed(2)}<span className="text-[10px] font-normal text-gray-400 ml-0.5">€</span></p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="empty-plan" className="mx-4 mb-4 mt-3 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 py-5 flex flex-col items-center gap-1.5">
            <Route size={22} className="text-gray-200 dark:text-gray-700" />
            <p className="text-[12px] text-gray-300 dark:text-gray-600 text-center px-4">Въведи разстояние, разход и цена</p>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ─── History Row ──────────────────────────────────────────────────────────────

function HistoryRow({ trip, onDelete }: { trip: CompletedTrip; onDelete: () => void }) {
  const cons = tripConsumption(trip);
  const cost = tripTotalCost(trip);
  const dist = tripDistance(trip);
  const consColor = cons < 6 ? "text-green-600 bg-green-500/12" : cons < 9 ? "text-orange-500 bg-orange-500/12" : "text-red-500 bg-red-500/12";

  return (
    <motion.div layout initial={{ opacity: 0, y: -10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 50 }} transition={{ type: "spring", stiffness: 340, damping: 28 }}>
      <Card className="p-4">
        <div className="flex items-start justify-between mb-2.5">
          <div>
            <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 mb-0.5">
              <Calendar size={11} /><span className="text-[11px]">{formatDate(trip.endedAt)}</span>
            </div>
            {trip.note ? (
              <div className="flex items-center gap-1 text-purple-500"><MessageSquare size={11} /><span className="text-[12px] font-medium">{trip.note}</span></div>
            ) : (
              <span className="text-[11px] text-gray-300 dark:text-gray-600 italic">Без бележка</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${consColor}`}><Gauge size={10} />{cons.toFixed(2)} л/100км</span>
            <button onClick={onDelete} className="text-red-400 hover:text-red-500"><Trash2 size={13} /></button>
          </div>
        </div>
        <Divider />
        <div className="flex items-center gap-1.5 my-2.5 bg-gray-50 dark:bg-white/4 rounded-lg px-3 py-2">
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
        <div className="flex gap-2">
          <div className="flex-1 text-center"><p className="text-[10px] text-gray-400">Гориво</p><p className="text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">{trip.liters.toFixed(1)} <span className="text-[10px] text-gray-400">л</span></p></div>
          <div className="w-px bg-gray-100 dark:bg-white/8" />
          <div className="flex-1 text-center"><p className="text-[10px] text-gray-400">Цена/л</p><p className="text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">{trip.pricePerLiter.toFixed(2)} <span className="text-[10px] text-gray-400">€</span></p></div>
          <div className="w-px bg-gray-100 dark:bg-white/8" />
          <div className="flex-1 text-center"><p className="text-[10px] text-gray-400">Общо</p><p className="text-[13px] font-bold text-orange-500 tabular-nums">{cost.toFixed(2)} <span className="text-[10px] font-normal">€</span></p></div>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

interface DashboardProps {
  dark: boolean;
  setDark: (v: boolean) => void;
  activeTrip: ActiveTrip | null;
  setActiveTrip: (t: ActiveTrip | null) => void;
  tripHistory: CompletedTrip[];
  addTrip: (t: CompletedTrip) => void;
  deleteTrip: (id: string) => void;
}

export default function Dashboard({ dark, setDark, activeTrip, setActiveTrip, tripHistory, addTrip, deleteTrip }: DashboardProps) {
  const avgConsumption = tripHistory.length > 0
    ? tripHistory.reduce((sum, t) => sum + tripConsumption(t), 0) / tripHistory.length
    : null;

  function endTrip(endKm: number, note: string) {
    if (!activeTrip) return;
    addTrip({
      id: activeTrip.id,
      startedAt: activeTrip.startedAt,
      endedAt: new Date().toISOString(),
      startKm: activeTrip.startKm,
      endKm,
      liters: activeTrip.liters,
      pricePerLiter: activeTrip.pricePerLiter,
      note,
    });
    setActiveTrip(null);
  }

  return (
    <div className="space-y-4 px-4 pb-8 pt-2">
      {/* Dark mode toggle */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[13px] text-gray-400 dark:text-gray-500">Тема</p>
        <button onClick={() => setDark(!dark)} className="p-2 rounded-full transition-colors">
          {dark ? <Moon size={19} className="text-indigo-400" /> : <Sun size={19} className="text-orange-400" />}
        </button>
      </div>

      {/* Trip section */}
      <AnimatePresence mode="wait">
        {activeTrip ? (
          <CurrentTripCard key="active" trip={activeTrip} onEnd={endTrip} />
        ) : (
          <motion.div key="start" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-4">
            <GpsCard onDistanceReady={() => {}} />
            <StartTripForm onStart={setActiveTrip} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Planner */}
      <SmartTripPlanner avgConsumption={avgConsumption} />

      {/* Consumption graph */}
      <ConsumptionGraph trips={tripHistory} />

      {/* History */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-gray-900 dark:text-white" />
            <span className="text-[15px] font-semibold text-gray-900 dark:text-white">История</span>
          </div>
          {tripHistory.length > 0 && <span className="text-[12px] text-gray-400">{tripHistory.length} пътув.</span>}
        </div>
        {tripHistory.length === 0 ? (
          <EmptyState icon={<Inbox size={40} />} title="Няма завършени пътувания" subtitle="Стартирай пътуване и го завърши" />
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {tripHistory.map((t) => (
                <HistoryRow key={t.id} trip={t} onDelete={() => deleteTrip(t.id)} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
