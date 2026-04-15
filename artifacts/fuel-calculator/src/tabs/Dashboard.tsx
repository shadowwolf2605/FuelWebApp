import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fuel, Droplets, Banknote, CreditCard, Gauge, Calendar, Inbox, Sun, Moon,
  MapPin, Flag, ArrowRight, AlertTriangle, Navigation, Play, Square, Trash2,
  CheckCircle2, MessageSquare, Timer, ChevronRight, X, Route, Users, Loader2,
  Search, Split, Pencil, BarChart2, Clock, Camera, Car, Trophy, Plus, Share2, Copy,
  Lightbulb, TrendingUp, Mic, MicOff,
} from "lucide-react";
import { Card, Field, StatPill, PulsingDot, Divider, ActionButton, EmptyState } from "../components/ui";
import { parseNum, formatDate, formatShortDate, formatElapsed, todayISO, compressImage } from "../utils/helpers";
import { haversineM, geocodeAddress, routeDistanceKm } from "../utils/geo";
import type { ActiveTrip, CompletedTrip, Expense, CarProfile, FuelType, FuelFillUp } from "../types";
import { tripConsumption, tripDistance, tripTotalCost, FUEL_TYPE_LABELS, FUEL_TYPE_COLORS } from "../types";

// ─── Fuel Price Card ──────────────────────────────────────────────────────────

function FuelPriceCard({ trips, currency }: { trips: CompletedTrip[]; currency: string }) {
  const priced = [...trips]
    .filter(t => t.pricePerLiter > 0)
    .sort((a, b) => new Date(a.endedAt).getTime() - new Date(b.endedAt).getTime())
    .slice(-12); // last 12 refuels

  const hasData = priced.length >= 2;
  const prices = hasData ? priced.map(t => t.pricePerLiter) : [];
  const latest = hasData ? prices[prices.length - 1] : 0;
  const prev   = hasData ? prices[prices.length - 2] : 0;
  const minP   = hasData ? Math.min(...prices) : 0;
  const maxP   = hasData ? Math.max(...prices) : 0;
  const avgP   = hasData ? prices.reduce((s, p) => s + p, 0) / prices.length : 0;
  const diff   = latest - prev;
  const up     = diff > 0;

  // SVG sparkline
  const W = 220, H = 48, pad = 4;
  const xStep = hasData && priced.length > 1 ? (W - pad * 2) / (priced.length - 1) : W;
  const range = maxP - minP || 0.1;
  const points = priced.map((t, i) => {
    const x = pad + i * xStep;
    const y = H - pad - ((t.pricePerLiter - minP) / range) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const lastX = pad + Math.max(0, priced.length - 1) * xStep;
  const lastY = hasData ? H - pad - ((latest - minP) / range) * (H - pad * 2) : H / 2;

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/[0.07]">
        <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center">
          <Fuel size={15} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Цени на горивото</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">{hasData ? "От твоите зареждания" : "Въведи цена при зареждане"}</p>
        </div>
      </div>

      {!hasData ? (
        <div className="px-4 py-6 flex flex-col items-center gap-2 text-center">
          <Fuel size={32} className="text-orange-300 dark:text-orange-800" />
          <p className="text-[13px] text-gray-400 dark:text-gray-500">Няма данни за цени още</p>
          <p className="text-[11px] text-gray-300 dark:text-gray-600">Попълни "Цена/л" при следващото зареждане и тук ще се появи графика</p>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="px-4 pt-3 flex items-end gap-2">
            <div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-0.5">Последна цена</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[26px] font-extrabold tabular-nums text-gray-900 dark:text-white leading-none">
                  {latest.toFixed(2)}
                </span>
                <span className="text-[13px] text-gray-400">{currency}/л</span>
                <span className={`text-[12px] font-semibold flex items-center gap-0.5 ${up ? "text-red-500" : "text-green-500"}`}>
                  {up ? "▲" : "▼"}{Math.abs(diff).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="ml-auto flex gap-3 text-right">
              {[
                { label: "Мин", value: minP.toFixed(2), color: "text-green-500" },
                { label: "Средна", value: avgP.toFixed(2), color: "text-gray-500 dark:text-gray-400" },
                { label: "Макс", value: maxP.toFixed(2), color: "text-red-500" },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-[10px] text-gray-400 leading-none mb-0.5">{s.label}</p>
                  <p className={`text-[13px] font-bold tabular-nums ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sparkline */}
          <div className="px-4 pb-4 pt-2">
            <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="overflow-visible">
              <defs>
                <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline points={`${pad},${H} ${points} ${lastX},${H}`} fill="url(#fuelGrad)" stroke="none" />
              <motion.polyline
                points={points}
                fill="none"
                stroke="#f97316"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
              <circle cx={lastX} cy={lastY} r={4} fill="#f97316" />
              <circle cx={lastX} cy={lastY} r={7} fill="#f97316" fillOpacity={0.2} />
            </svg>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-gray-300 dark:text-gray-600">{formatShortDate(priced[0].endedAt)}</span>
              <span className="text-[9px] text-gray-400 dark:text-gray-500">{priced.length} зареждания</span>
              <span className="text-[9px] text-gray-300 dark:text-gray-600">{formatShortDate(priced[priced.length - 1].endedAt)}</span>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

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

function GpsCard({ onDistanceReady }: { onDistanceReady: (km: number, points: { lat: number; lon: number }[]) => void }) {
  const [tracking, setTracking] = useState(false);
  const [distanceM, setDistanceM] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);
  const lastRef = useRef<GeolocationPosition | null>(null);
  const routePointsRef = useRef<{ lat: number; lon: number }[]>([]);
  const available = "geolocation" in navigator;
  const km = distanceM / 1000;

  useEffect(() => () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); }, []);

  function start() {
    if (!available) return;
    setDistanceM(0); lastRef.current = null; setError(null); setTracking(true);
    routePointsRef.current = [];
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (pos.coords.accuracy > 65) return;
        if (lastRef.current) {
          const d = haversineM(lastRef.current.coords.latitude, lastRef.current.coords.longitude, pos.coords.latitude, pos.coords.longitude);
          if (d > 0) setDistanceM((p) => p + d);
        }
        routePointsRef.current.push({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        lastRef.current = pos;
      },
      (e) => setError(e.message),
      { enableHighAccuracy: true } as PositionOptions,
    );
  }

  function stop() {
    if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    setTracking(false);
    if (km > 0.01) onDistanceReady(Math.round(km * 10) / 10, routePointsRef.current);
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
          <div key="na" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] bg-gray-100 dark:bg-[#28282c] text-gray-400">
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

function StartTripForm({ onStart, currency, defaultFuelType }: { onStart: (t: ActiveTrip) => void; currency: string; defaultFuelType?: string }) {
  const [startKm, setStartKm] = useState("");
  const [liters, setLiters] = useState("");
  const [price, setPrice] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>((defaultFuelType as FuelType) ?? "petrol");
  const [receiptPhoto, setReceiptPhoto] = useState<string | undefined>(undefined);
  const [passengers, setPassengers] = useState(1);
  const [odometerPhoto, setOdometerPhoto] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const odometerRef = useRef<HTMLInputElement>(null);
  const km = parseNum(startKm); const lt = parseNum(liters); const pr = parseNum(price);
  const ok = km !== null && km > 0 && lt !== null && lt > 0 && pr !== null && pr > 0;

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setReceiptPhoto(compressed);
    } catch {
      alert("Грешка при зареждане на снимката. Опитай отново.");
    }
  }

  async function handleOdometerPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setOdometerPhoto(compressed);
    } catch {
      alert("Грешка при зареждане на снимката. Опитай отново.");
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/[0.07]">
        <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center"><Fuel size={15} className="text-white" /></div>
        <div>
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white leading-tight">Ново пътуване</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Въведи начални данни</p>
        </div>
      </div>
      <div className="px-4 py-3 space-y-3">
        {/* Odometer with camera */}
        <div className="flex items-center gap-3">
          <div className="w-7 flex-shrink-0 flex items-center justify-center text-green-500"><Flag size={17} /></div>
          <div className="flex-1">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">Начален километраж</p>
            <div className="flex gap-2 items-center">
              <input type="text" inputMode="decimal" value={startKm} onChange={e => setStartKm(e.target.value.replace(",","."))} placeholder="напр. 45 000"
                className="flex-1 bg-transparent text-[16px] font-semibold text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 outline-none" />
              <span className="text-[13px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#2c2c30] px-2 py-[3px] rounded-md">км</span>
              <button type="button" onClick={() => odometerRef.current?.click()}
                className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl transition-all ${odometerPhoto ? "bg-green-500" : "bg-gray-100 dark:bg-[#2c2c30]"}`}>
                <Camera size={14} className={odometerPhoto ? "text-white" : "text-gray-400"} />
              </button>
            </div>
            {odometerPhoto && (
              <div className="relative mt-1">
                <img src={odometerPhoto} className="w-full h-24 object-cover rounded-xl" />
                <button onClick={() => setOdometerPhoto(null)} className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center">
                  <X size={10} className="text-white" />
                </button>
              </div>
            )}
          </div>
        </div>
        <input ref={odometerRef} type="file" accept="image/*" className="hidden" onChange={handleOdometerPhoto} />
        <Divider />
        <Field label="Заредени литри" placeholder="напр. 40.5" unit="л" icon={<Droplets size={17} />} iconColorClass="text-cyan-500" value={liters} onChange={setLiters} />
        <Divider />
        <Field label="Цена за литър" placeholder="напр. 1.79" unit={currency} icon={<Banknote size={17} />} iconColorClass="text-green-500" value={price} onChange={setPrice} />
        <Divider />
        <div className="flex items-center gap-3">
          <div className="w-7 flex-shrink-0 flex items-center justify-center text-blue-500"><Fuel size={17} /></div>
          <div className="flex-1">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">Тип гориво</p>
            <div className="flex gap-1.5 flex-wrap">
              {(["petrol","diesel","gas","electric","hybrid"] as FuelType[]).map(ft => (
                <button key={ft} onClick={() => setFuelType(ft)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${fuelType === ft ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-[#2c2c30] text-gray-500"}`}>
                  {FUEL_TYPE_LABELS[ft]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Divider />
        {/* Passengers */}
        <div className="flex items-center gap-3">
          <div className="w-7 flex-shrink-0 flex items-center justify-center text-purple-500"><Users size={17} /></div>
          <div className="flex-1">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">Пътници (за споделяне на разходи)</p>
            <div className="flex gap-1.5">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setPassengers(n)}
                  className={`w-9 h-9 rounded-xl text-[14px] font-bold transition-all ${passengers === n ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-[#2c2c30] text-gray-500"}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Divider />
        {/* Receipt photo */}
        <div className="flex items-center gap-3">
          <div className="w-7 flex-shrink-0 flex items-center justify-center text-orange-500"><Camera size={17} /></div>
          <div className="flex-1 flex items-center gap-2">
            <button type="button" onClick={() => photoRef.current?.click()}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all flex-1 justify-center ${receiptPhoto ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-[#2c2c30] text-gray-500"}`}>
              <Camera size={13} />{receiptPhoto ? "Касов бон добавен ✓" : "Снимай касов бон"}
            </button>
            {receiptPhoto && <button type="button" onClick={() => setReceiptPhoto(undefined)} className="text-red-400 flex-shrink-0"><X size={14} /></button>}
          </div>
        </div>
        {receiptPhoto && <img src={receiptPhoto} className="w-full h-28 object-cover rounded-xl border border-gray-200 dark:border-white/10" />}
        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
      </div>
      <div className="px-4 pb-4">
        <ActionButton onClick={() => {
          if (!ok || !km || !lt || !pr) return;
          onStart({ id: crypto.randomUUID(), startedAt: new Date().toISOString(), startKm: km, liters: lt, pricePerLiter: pr, fuelType, receiptPhoto, passengers });
          setStartKm(""); setLiters(""); setPrice(""); setReceiptPhoto(undefined); setPassengers(1); setOdometerPhoto(null);
        }} disabled={!ok} color="blue">
          <Play size={15} className={ok ? "fill-white" : ""} />Стартирай пътуването
        </ActionButton>
      </div>
    </Card>
  );
}

// ─── Current Trip Card ────────────────────────────────────────────────────────

function CurrentTripCard({ trip, onEnd, currency }: { trip: ActiveTrip; onEnd: (endKm: number, note: string, routePoints: { lat: number; lon: number }[], photo?: string) => void; currency: string }) {
  const [showEndForm, setShowEndForm] = useState(false);
  const [endKmText, setEndKmText] = useState("");
  const [note, setNote] = useState("");
  const [now, setNow] = useState(new Date());
  const [routePoints, setRoutePoints] = useState<{ lat: number; lon: number }[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const photoRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setPhoto(compressed);
    } catch {
      alert("Грешка при зареждане на снимката. Опитай отново.");
    }
  }

  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recog = new SR();
    recog.lang = "bg-BG";
    recog.continuous = false;
    recog.interimResults = false;
    recog.onresult = (e: any) => {
      const text = Array.from(e.results as any[]).map((r: any) => r[0].transcript).join(" ");
      setNote(prev => (prev ? prev + " " : "") + text);
      setIsListening(false);
    };
    recog.onend = () => setIsListening(false);
    recog.onerror = () => setIsListening(false);
    recog.start();
    setIsListening(true);
  }

  const endKm = parseNum(endKmText);
  const dist = endKm !== null && endKm > trip.startKm ? endKm - trip.startKm : null;
  const distError = endKm !== null && endKm <= trip.startKm;
  const cons = dist ? (trip.liters / dist) * 100 : null;
  const cost = trip.liters * trip.pricePerLiter;
  const canEnd = dist !== null && dist > 0;

  return (
    <motion.div layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/[0.07]">
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
          <StatPill icon={<Banknote size={13} />} colorClass="text-green-500" label="Цена/л" value={trip.pricePerLiter.toFixed(2)} unit={" " + currency} />
          <StatPill icon={<CreditCard size={13} />} colorClass="text-orange-500" label="Сума" value={cost.toFixed(2)} unit={" " + currency} />
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
              <div className="px-4 pb-3 border-t border-gray-100 dark:border-white/[0.07] pt-3">
                <GpsCard onDistanceReady={(km, pts) => { setEndKmText((trip.startKm + km).toFixed(1)); setRoutePoints(pts); }} />
              </div>
              <div className="px-4 space-y-3 border-t border-gray-100 dark:border-white/[0.07] pt-3 pb-3">
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
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Field label="Бележка (по желание)" placeholder="напр. До Гърция…" type="text" icon={<MessageSquare size={17} />} iconColorClass="text-purple-500" value={note} onChange={setNote} />
                  </div>
                  <button onClick={startVoice} className={`p-2 rounded-xl transition-all flex-shrink-0 ${isListening ? "bg-red-500 text-white animate-pulse" : "bg-gray-100 dark:bg-[#2c2c30] text-gray-500"}`}>
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                </div>
                {/* Photo capture */}
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => photoRef.current?.click()}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all ${photo ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-[#2c2c30] text-gray-500"}`}>
                    <Camera size={14} />{photo ? "Снимката е добавена ✓" : "Снимка (бон/километраж)"}
                  </button>
                  {photo && <button type="button" onClick={() => setPhoto(undefined)} className="text-red-400"><X size={14} /></button>}
                </div>
                {photo && <img src={photo} className="w-full h-28 object-cover rounded-xl border border-gray-200 dark:border-white/10" />}
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </div>
              <div className="px-4 pb-4">
                <ActionButton onClick={() => { if (!canEnd || !endKm) return; onEnd(endKm, note.trim(), routePoints, photo); }} disabled={!canEnd} color="orange">
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

function SmartTripPlanner({ avgConsumption, currency }: { avgConsumption: number | null; currency: string }) {
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
    } catch (e) { setRouteError(e instanceof Error ? e.message : String(e)); }
    finally { setRouteLoading(false); }
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/[0.07]">
        <div className="w-8 h-8 rounded-xl bg-purple-500 flex items-center justify-center"><Route size={15} className="text-white" /></div>
        <div>
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Умен планировчик</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Изчисли горивото за маршрут</p>
        </div>
      </div>

      <div className="px-4 pt-3">
        <div className="flex bg-gray-100 dark:bg-[#2c2c30] rounded-xl p-1 gap-1">
          {(["manual", "auto"] as PlannerMode[]).map((m) => (
            <button key={m} onClick={() => { setMode(m); setRouteKm(null); setRouteError(null); setRouteLabels(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all duration-200 ${mode === m ? "bg-white dark:bg-[#32323a] text-gray-900 dark:text-white shadow-sm" : "text-gray-400 dark:text-gray-500"}`}>
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
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${routeLoading || !fromText.trim() || !toText.trim() ? "bg-gray-100 dark:bg-[#28282c] text-gray-300 dark:text-gray-600 cursor-not-allowed" : "bg-purple-500 text-white"}`}>
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
        <Field label="Цена за литър" placeholder="напр. 1.79" unit={currency} icon={<Banknote size={17} />} iconColorClass="text-green-500" value={priceText} onChange={setPriceText} />
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
                  className={`flex-1 h-8 rounded-lg text-[12px] font-bold transition-all duration-150 ${passengers === n ? "bg-blue-500 text-white shadow-sm shadow-blue-500/30" : "bg-gray-100 dark:bg-[#2c2c30] text-gray-400 dark:text-gray-500"}`}>
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
                  <p className="text-[18px] font-bold text-green-500 tabular-nums">{totalCost.toFixed(2)}<span className="text-[10px] font-normal text-gray-400 ml-0.5">{currency}</span></p>
                </div>
                {passengers > 1 && perPerson && (
                  <>
                    <div className="w-px bg-purple-500/15" />
                    <div className="flex-1 text-center">
                      <Split size={14} className="text-blue-500 mx-auto mb-1" />
                      <p className="text-[10px] text-gray-400 mb-0.5">На човек</p>
                      <p className="text-[18px] font-bold text-blue-500 tabular-nums">{perPerson.toFixed(2)}<span className="text-[10px] font-normal text-gray-400 ml-0.5">{currency}</span></p>
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

// ─── Driver Score Card ────────────────────────────────────────────────────────

function DriverScoreCard({ trips }: { trips: CompletedTrip[] }) {
  if (trips.length < 3) return null;

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const monthTrips = (key: string) => trips.filter(t => t.endedAt.startsWith(key));
  const currentTrips = monthTrips(thisMonth);
  const prevTrips = monthTrips(lastMonth);

  if (currentTrips.length === 0) return null;

  function calcScore(ts: CompletedTrip[]): number {
    const valid = ts.filter(t => tripDistance(t) > 0);
    if (valid.length === 0) return 0;
    const avg = valid.reduce((s, t) => s + tripConsumption(t), 0) / valid.length;
    let base = avg <= 5 ? 100 : avg <= 6 ? 90 : avg <= 7 ? 78 : avg <= 8 ? 65 : avg <= 9 ? 52 : avg <= 11 ? 38 : 25;
    if (valid.length >= 3) {
      const mean = avg;
      const stdDev = Math.sqrt(valid.reduce((s, t) => s + Math.pow(tripConsumption(t) - mean, 2), 0) / valid.length);
      if (stdDev < 0.5) base = Math.min(100, base + 8);
      else if (stdDev < 1) base = Math.min(100, base + 4);
    }
    return Math.round(base);
  }

  const score = calcScore(currentTrips);
  const prevScore = calcScore(prevTrips);
  const diff = prevTrips.length > 0 ? score - prevScore : null;

  const grade = score >= 85 ? { label: "Еко шофьор", color: "#22c55e" }
    : score >= 65 ? { label: "Добър шофьор", color: "#3b82f6" }
    : score >= 45 ? { label: "Среден", color: "#f97316" }
    : { label: "Газовия крак", color: "#ef4444" };

  const R = 40, cx = 55, circumference = Math.PI * R;
  const dashOffset = circumference * (1 - score / 100);

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/[0.07]">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: grade.color }}>
          <Trophy size={15} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Driver Score</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Оценка за този месец</p>
        </div>
        {diff !== null && (
          <span className={`text-[12px] font-bold ${diff >= 0 ? "text-green-500" : "text-red-500"}`}>
            {diff >= 0 ? "▲" : "▼"}{Math.abs(diff)} vs миналия
          </span>
        )}
      </div>
      <div className="px-4 py-4 flex items-center gap-4">
        <svg width={110} height={72} viewBox="0 0 110 72">
          <path d={`M 15,60 A ${R},${R} 0 0,1 95,60`} fill="none" stroke="currentColor" strokeWidth={8} strokeLinecap="round" className="text-gray-200 dark:text-white/10" />
          <motion.path
            d={`M 15,60 A ${R},${R} 0 0,1 95,60`}
            fill="none"
            stroke={grade.color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
          <text x={cx} y={52} textAnchor="middle" fontSize={20} fontWeight="800" fill={grade.color}>{score}</text>
          <text x={cx} y={66} textAnchor="middle" fontSize={8} fill="#9ca3af">/ 100</text>
        </svg>
        <div className="flex-1 space-y-2">
          <div>
            <span className="text-[13px] font-bold" style={{ color: grade.color }}>{grade.label}</span>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{currentTrips.length} пътувания този месец</p>
          </div>
          <div className="flex gap-2">
            {[
              { label: "Разход", value: currentTrips.length > 0 ? `${(currentTrips.reduce((s,t)=>s+tripConsumption(t),0)/currentTrips.length).toFixed(1)} л` : "—" },
              { label: "Пътувания", value: String(currentTrips.length) },
            ].map(s => (
              <div key={s.label} className="flex-1 bg-gray-50 dark:bg-[#2c2c30] rounded-xl p-2 text-center">
                <p className="text-[10px] text-gray-400">{s.label}</p>
                <p className="text-[13px] font-bold text-gray-900 dark:text-white tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── History Row ──────────────────────────────────────────────────────────────

function HistoryRow({ trip, onDelete, onUpdatePhoto, onDeletePhoto, onUpdateDate, currency, allTrips }: { trip: CompletedTrip; onDelete: () => void; onUpdatePhoto: (photo: string) => void; onDeletePhoto: () => void; onUpdateDate: (iso: string) => void; currency: string; allTrips: CompletedTrip[] }) {
  const cons = tripConsumption(trip);
  const cost = tripTotalCost(trip);
  const dist = tripDistance(trip);
  const consColor = cons < 6 ? "text-green-600 bg-green-500/12" : cons < 9 ? "text-orange-500 bg-orange-500/12" : "text-red-500 bg-red-500/12";
  const [shared, setShared] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");

  function openDateEditor() {
    const d = new Date(trip.endedAt);
    setDateValue(d.toISOString().slice(0, 10));
    setTimeValue(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    setEditingDate(true);
  }
  const photoInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try { onUpdatePhoto(await compressImage(file)); } catch { /* ignore */ }
    e.target.value = "";
  }

  function saveDate() {
    if (!dateValue) return;
    const [y, m, d] = dateValue.split("-").map(Number);
    const [h, min] = (timeValue || "00:00").split(":").map(Number);
    const updated = new Date(trip.endedAt);
    updated.setFullYear(y, m - 1, d);
    updated.setHours(h, min, 0, 0);
    onUpdateDate(updated.toISOString());
    setEditingDate(false);
  }
  const similar = dist > 0 ? allTrips.filter(t => t.id !== trip.id && tripDistance(t) > 5 && Math.abs(tripDistance(t) - dist) / dist <= 0.2) : [];

  function shareTrip() {
    const fuelLabel = trip.fuelType ? ` (${FUEL_TYPE_LABELS[trip.fuelType]})` : "";
    const text = `🚗 Пътуване${trip.note ? ` — ${trip.note}` : ""}\n📏 ${dist.toFixed(1)} км\n⛽ ${cons.toFixed(2)} л/100км${fuelLabel}\n💰 ${cost.toFixed(2)} ${currency}\n📅 ${formatDate(trip.endedAt)}\n\n— FuelPlus`;
    if (navigator.share) {
      navigator.share({ title: "Моето пътуване", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => { setShared(true); setTimeout(() => setShared(false), 2000); });
    }
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: -10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 50 }} transition={{ type: "spring", stiffness: 340, damping: 28 }}>
      <Card className="p-4">
        <div className="flex items-start justify-between mb-2.5">
          <div>
            <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 mb-0.5">
              <Calendar size={11} />
              {editingDate ? (
                <div className="flex items-center gap-1 flex-wrap">
                  <input
                    type="date"
                    value={dateValue}
                    onChange={e => setDateValue(e.target.value)}
                    className="text-[11px] bg-gray-100 dark:bg-[#2c2c30] text-gray-900 dark:text-white rounded-lg px-2 py-0.5 border-0 outline-none"
                  />
                  <input
                    type="time"
                    value={timeValue}
                    onChange={e => setTimeValue(e.target.value)}
                    className="text-[11px] bg-gray-100 dark:bg-[#2c2c30] text-gray-900 dark:text-white rounded-lg px-2 py-0.5 border-0 outline-none"
                  />
                  <button onClick={saveDate} className="text-[11px] font-semibold text-green-500 hover:text-green-600 px-1">✓</button>
                  <button onClick={() => setEditingDate(false)} className="text-[11px] text-gray-400 hover:text-gray-500 px-1">✕</button>
                </div>
              ) : (
                <span className="text-[11px] flex items-center gap-1">
                  {formatDate(trip.endedAt)}
                  <button onClick={openDateEditor} className="text-gray-300 dark:text-gray-600 hover:text-blue-400 transition-colors ml-0.5">
                    <Pencil size={10} />
                  </button>
                </span>
              )}
            </div>
            {trip.note ? (
              <div className="flex items-center gap-1 text-purple-500"><MessageSquare size={11} /><span className="text-[12px] font-medium">{trip.note}</span></div>
            ) : (
              <span className="text-[11px] text-gray-300 dark:text-gray-600 italic">Без бележка</span>
            )}
            {trip.fuelType && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${FUEL_TYPE_COLORS[trip.fuelType]}`}>
                {FUEL_TYPE_LABELS[trip.fuelType]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${consColor}`}><Gauge size={10} />{cons.toFixed(2)} л/100км</span>
            <button onClick={shareTrip} className={`transition-colors ${shared ? "text-green-500" : "text-blue-400 hover:text-blue-500"}`}>
              {shared ? <Copy size={13} /> : <Share2 size={13} />}
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            <button
              onClick={() => photoInputRef.current?.click()}
              title={trip.photo ? "Замени снимката" : "Добави касова бележка"}
              className={`transition-colors ${trip.photo ? "text-green-500" : "text-gray-300 dark:text-gray-600 hover:text-green-500"}`}
            >
              <Camera size={13} />
            </button>
            {trip.photo && (
              <button
                onClick={() => { if (window.confirm("Изтрий снимката от това пътуване?")) onDeletePhoto(); }}
                title="Изтрий снимката"
                className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors"
              >
                <X size={13} />
              </button>
            )}
            <button onClick={onDelete} className="text-red-400 hover:text-red-500"><Trash2 size={13} /></button>
          </div>
        </div>
        <Divider />
        <div className="flex items-center gap-1.5 my-2.5 bg-gray-50 dark:bg-[#2c2c30] rounded-lg px-3 py-2">
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
          <div className="w-px bg-gray-100 dark:bg-[#2c2c30]" />
          <div className="flex-1 text-center"><p className="text-[10px] text-gray-400">Цена/л</p><p className="text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">{trip.pricePerLiter.toFixed(2)} <span className="text-[10px] text-gray-400">{currency}</span></p></div>
          <div className="w-px bg-gray-100 dark:bg-[#2c2c30]" />
          <div className="flex-1 text-center"><p className="text-[10px] text-gray-400">Общо</p><p className="text-[13px] font-bold text-orange-500 tabular-nums">{cost.toFixed(2)} <span className="text-[10px] font-normal">{currency}</span></p></div>
        </div>
        {trip.passengers && trip.passengers > 1 && (
          <div className="mt-2 flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2">
            <Users size={12} className="text-purple-500 flex-shrink-0" />
            <span className="text-[12px] text-purple-600 dark:text-purple-400">
              <span className="font-bold">{trip.passengers} пътници</span> — по <span className="font-bold tabular-nums">{(tripTotalCost(trip) / trip.passengers).toFixed(2)} {currency}</span> на човек
            </span>
          </div>
        )}
        {((trip.routePoints && trip.routePoints.length > 3) || trip.photo || similar.length > 0) ? (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {trip.routePoints && trip.routePoints.length > 3 && (
              <button onClick={() => setShowMap(v => !v)}
                className="text-[12px] font-semibold text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full">
                {showMap ? "Скрий маршрут" : "Маршрут"}
              </button>
            )}
            {trip.photo && (
              <button onClick={() => setShowMap(v => !v)}
                className="text-[12px] font-semibold text-green-600 bg-green-500/10 px-3 py-1 rounded-full">
                Снимка
              </button>
            )}
            {similar.length > 0 && (
              <button onClick={() => setShowCompare(v => !v)}
                className="text-[12px] font-semibold text-purple-500 bg-purple-500/10 px-3 py-1 rounded-full">
                {showCompare ? "Скрий сравнение" : `Сравни с ${similar.length} подобни`}
              </button>
            )}
          </div>
        ) : null}
        {showCompare && similar.length > 0 && (() => {
          const avgSimilarCons = similar.reduce((s, t) => s + tripConsumption(t), 0) / similar.length;
          const thisCons = tripConsumption(trip);
          const diff = thisCons - avgSimilarCons;
          return (
            <div className="mt-2 bg-gray-50 dark:bg-[#252528] rounded-xl p-3 space-y-1.5">
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Сравнение с подобни маршрути (±20% разстояние)</p>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-gray-600 dark:text-gray-300">Средно (подобни)</span>
                <span className="text-[12px] font-bold tabular-nums text-gray-900 dark:text-white">{avgSimilarCons.toFixed(2)} л/100км</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-gray-600 dark:text-gray-300">Това пътуване</span>
                <span className={`text-[12px] font-bold tabular-nums ${diff <= 0 ? "text-green-600" : "text-orange-500"}`}>{thisCons.toFixed(2)} л/100км {diff <= 0 ? "▼" : "▲"}</span>
              </div>
              <div className={`text-center text-[11px] font-semibold px-2 py-1 rounded-lg ${diff <= 0 ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-orange-500/10 text-orange-500"}`}>
                {diff <= 0 ? `${Math.abs(diff).toFixed(2)} л/100км по-икономично от средното` : `${diff.toFixed(2)} л/100км над средното`}
              </div>
            </div>
          );
        })()}
        {showMap && trip.routePoints && trip.routePoints.length > 3 && (() => {
          const lats = trip.routePoints!.map(p => p.lat);
          const lons = trip.routePoints!.map(p => p.lon);
          return (
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${Math.min(...lons)},${Math.min(...lats)},${Math.max(...lons)},${Math.max(...lats)}&layer=mapnik`}
              className="w-full rounded-xl border-0 mt-2"
              style={{ height: 160 }}
              loading="lazy"
            />
          );
        })()}
        {showMap && trip.photo && !trip.routePoints?.length && (
          <img src={trip.photo} className="w-full rounded-xl mt-2 object-cover border border-gray-200 dark:border-white/10" style={{ maxHeight: 180 }} />
        )}
        {trip.photo && trip.routePoints && trip.routePoints.length > 3 && showMap && (
          <img src={trip.photo} className="w-full rounded-xl mt-2 object-cover border border-gray-200 dark:border-white/10" style={{ maxHeight: 180 }} />
        )}
      </Card>
    </motion.div>
  );
}

// ─── Cars Section ─────────────────────────────────────────────────────────────

const FUEL_TYPES: FuelType[] = ["petrol", "diesel", "gas", "electric", "hybrid"];

function CarsSection({ cars, activeCar, activeCarId, setActiveCarId, addCar, updateCar, deleteCar, tripHistory, allExpenses, allMaintItems, allDamages, allFillUps }: {
  cars: CarProfile[];
  activeCar: CarProfile | null;
  activeCarId: string;
  setActiveCarId: (id: string) => void;
  addCar: (car: CarProfile) => void;
  updateCar: (car: CarProfile) => void;
  deleteCar: (id: string) => void;
  tripHistory: CompletedTrip[];
  allExpenses?: Expense[];
  allMaintItems?: import("../types").MaintenanceItem[];
  allDamages?: import("../types").CarDamage[];
  allFillUps?: import("../types").FuelFillUp[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingCar, setEditingCar] = useState<CarProfile | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CarProfile>({
    id: "", make: "", model: "", year: "", fuelType: "petrol",
    currentValue: "", annualKm: "", insuranceCost: "", maintenanceBudget: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  function openNew() {
    setDraft({ id: crypto.randomUUID(), make: "", model: "", year: "", fuelType: "petrol", currentValue: "", annualKm: "", insuranceCost: "", maintenanceBudget: "" });
    setEditingCar(null);
    setShowForm(true);
  }

  function openEdit(car: CarProfile) {
    setDraft({ ...car });
    setEditingCar(car);
    setShowForm(true);
  }

  function save() {
    if (!draft.make && !draft.model) return;
    if (editingCar) {
      updateCar(draft);
    } else {
      addCar(draft);
    }
    setShowForm(false);
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setDraft(d => ({ ...d, photo: compressed }));
    } catch {
      alert("Грешка при зареждане на снимката. Опитай отново.");
    }
  }

  if (showForm) {
    return (
      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold text-gray-900 dark:text-white">
              {editingCar ? "Редактирай кола" : "Нова кола"}
            </p>
            <button onClick={() => setShowForm(false)} className="text-gray-400"><X size={16} /></button>
          </div>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-3">
            {draft.photo ? (
              <img src={draft.photo} className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-[#2c2c30] flex items-center justify-center">
                <Camera size={20} className="text-gray-400" />
              </div>
            )}
            <span className="text-[13px] text-blue-500 font-medium">Добави снимка</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          <div className="flex gap-2">
            <div className="flex-1">
              <Field label="Марка" placeholder="BMW" type="text" icon={<Car size={17} />} iconColorClass="text-indigo-500" value={draft.make} onChange={v => setDraft(d => ({...d, make: v}))} />
            </div>
            <div className="flex-1">
              <Field label="Модел" placeholder="320i" type="text" icon={<Car size={17} />} iconColorClass="text-gray-400" value={draft.model} onChange={v => setDraft(d => ({...d, model: v}))} />
            </div>
          </div>
          <Field label="Година" placeholder="2020" type="text" icon={<Calendar size={17} />} iconColorClass="text-blue-500" value={draft.year} onChange={v => setDraft(d => ({...d, year: v}))} />
          <div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1.5">Тип гориво</p>
            <div className="flex flex-wrap gap-1.5">
              {FUEL_TYPES.map(ft => (
                <button key={ft} onClick={() => setDraft(d => ({...d, fuelType: ft}))}
                  className={`px-2.5 py-1 rounded-full text-[12px] font-semibold transition-all border ${draft.fuelType === ft ? "border-blue-500 bg-blue-500 text-white" : "border-gray-200 dark:border-white/10 text-gray-500"}`}>
                  {FUEL_TYPE_LABELS[ft]}
                </button>
              ))}
            </div>
          </div>
          <ActionButton onClick={save} disabled={!draft.make && !draft.model} color="blue">
            <Car size={15} />{editingCar ? "Запази промените" : "Добави колата"}
          </ActionButton>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/[0.07]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center">
            <Car size={15} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Моите коли</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">{cars.length === 0 ? "Добави първата си кола" : `${cars.length} кол${cars.length === 1 ? "а" : "и"}`}</p>
          </div>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[13px] font-semibold bg-indigo-500 text-white">
          <Plus size={14} />Добави
        </button>
      </div>

      {cars.length === 0 ? (
        <div className="p-4">
          <EmptyState icon={<Car size={36} />} title="Няма добавени коли" subtitle="Натисни Добави за да добавиш кола" />
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-white/6">
          {cars.map(car => (
            <div key={car.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${car.id === activeCarId ? "bg-indigo-500/5" : ""}`}>
              {car.photo ? (
                <img src={car.photo} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                  <Car size={17} className="text-indigo-500" />
                </div>
              )}
              <div className="flex-1 min-w-0" onClick={() => setActiveCarId(car.id)}>
                <div className="flex items-center gap-1.5">
                  <p className="text-[14px] font-semibold text-gray-900 dark:text-white truncate">{car.make} {car.model}</p>
                  {car.id === activeCarId && <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">Активна</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-gray-400">{car.year || "—"}</span>
                  {car.fuelType && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${FUEL_TYPE_COLORS[car.fuelType]}`}>
                      {FUEL_TYPE_LABELS[car.fuelType]}
                    </span>
                  )}
                </div>
                {(() => {
                  const carTrips = tripHistory.filter(t => t.carId === car.id);
                  const totalKm = carTrips.reduce((s, t) => s + (t.endKm - t.startKm), 0);
                  const validCarTrips = carTrips.filter(t => t.endKm - t.startKm > 0);
                  const avgCons = validCarTrips.length >= 2
                    ? validCarTrips.reduce((s, t) => s + (t.liters / (t.endKm - t.startKm)) * 100, 0) / validCarTrips.length
                    : null;
                  const expCount = allExpenses?.filter(e => e.carId === car.id).length ?? 0;
                  const maintCount = allMaintItems?.filter(m => m.carId === car.id).length ?? 0;
                  const dmgCount = allDamages?.filter(d => d.carId === car.id).length ?? 0;
                  const fillCount = allFillUps?.filter(f => f.carId === car.id).length ?? 0;
                  const hasAny = carTrips.length > 0 || expCount > 0 || maintCount > 0 || dmgCount > 0 || fillCount > 0;
                  if (!hasAny) return null;
                  return (
                    <div className="mt-1 space-y-0.5">
                      {carTrips.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400">{carTrips.length} пътув.</span>
                          <span className="text-[10px] text-gray-400">·</span>
                          <span className="text-[10px] text-gray-400">{totalKm.toFixed(0)} км</span>
                          {avgCons !== null && (
                            <>
                              <span className="text-[10px] text-gray-400">·</span>
                              <span className="text-[10px] text-gray-400">{avgCons.toFixed(1)} л/100км</span>
                            </>
                          )}
                        </div>
                      )}
                      {(expCount > 0 || maintCount > 0 || dmgCount > 0 || fillCount > 0) && (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          {expCount > 0 && <span className="text-[10px] text-gray-400">{expCount} разхода</span>}
                          {fillCount > 0 && <><span className="text-[10px] text-gray-400">·</span><span className="text-[10px] text-gray-400">{fillCount} зарежд.</span></>}
                          {maintCount > 0 && <><span className="text-[10px] text-gray-400">·</span><span className="text-[10px] text-gray-400">{maintCount} поддръжки</span></>}
                          {dmgCount > 0 && <><span className="text-[10px] text-gray-400">·</span><span className="text-[10px] text-orange-400">{dmgCount} щет{dmgCount === 1 ? "а" : "и"}</span></>}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => openEdit(car)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-[#2c2c30] flex items-center justify-center text-gray-500">
                  <Pencil size={12} />
                </button>
                {cars.length > 1 && (
                  confirmDeleteId === car.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { deleteCar(car.id); setConfirmDeleteId(null); }}
                        className="px-2 py-1 rounded-lg bg-red-500 text-white text-[10px] font-bold">
                        Изтрий
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-[#2c2c30] flex items-center justify-center text-gray-500">
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(car.id)} className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                      <Trash2 size={12} />
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Speedometer Dashboard ────────────────────────────────────────────────────

function SpeedometerGauge({
  value,
  max,
  label,
  color,
  unit,
  delay,
}: {
  value: number;
  max: number;
  label: string;
  color: string;
  unit: string;
  delay: number;
}) {
  const R = 48;
  const cx = 60;
  const circumference = Math.PI * R; // half circle = π*r
  const ratio = Math.min(Math.max(value / max, 0), 1);
  const dashOffset = circumference * (1 - ratio);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex flex-col items-center"
    >
      <svg width={120} height={72} viewBox="0 0 120 72">
        {/* Track arc */}
        <path
          d={`M 12,60 A ${R},${R} 0 0,1 108,60`}
          fill="none"
          stroke="currentColor"
          strokeWidth={8}
          strokeLinecap="round"
          className="text-gray-200 dark:text-white/10"
        />
        {/* Animated fill arc */}
        <motion.path
          d={`M 12,60 A ${R},${R} 0 0,1 108,60`}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, delay, ease: "easeOut" }}
        />
        {/* Value text */}
        <text
          x={cx}
          y={52}
          textAnchor="middle"
          fontSize={17}
          fontWeight="700"
          fill={color}
          className="tabular-nums"
        >
          {value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}
        </text>
        <text x={cx} y={65} textAnchor="middle" fontSize={8} fill="#9ca3af">
          {unit}
        </text>
      </svg>
      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 text-center mt-0.5">{label}</p>
    </motion.div>
  );
}

function SpeedometerDashboard({ trips }: { trips: CompletedTrip[] }) {
  if (trips.length === 0) return null;

  const totalKm = trips.reduce((s, t) => s + tripDistance(t), 0);
  const validTrips = trips.filter(t => tripDistance(t) > 0);
  const avgCons = validTrips.length > 0 ? validTrips.reduce((s, t) => s + tripConsumption(t), 0) / validTrips.length : 0;
  const efficiency = Math.max(0, 100 - avgCons * 7);

  const consColor = avgCons < 7 ? "#22c55e" : avgCons < 10 ? "#f97316" : "#ef4444";
  const kmMax = Math.max(20000, totalKm);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Gauge size={15} className="text-gray-900 dark:text-white" />
        <span className="text-[14px] font-semibold text-gray-900 dark:text-white">Табло</span>
      </div>
      <div className="flex justify-around">
        <SpeedometerGauge
          value={avgCons}
          max={15}
          label="Среден разход"
          color={consColor}
          unit="л/100км"
          delay={0}
        />
        <SpeedometerGauge
          value={totalKm}
          max={kmMax}
          label="Общо км"
          color="#6366f1"
          unit="км"
          delay={0.15}
        />
        <SpeedometerGauge
          value={efficiency}
          max={100}
          label="Ефективност"
          color="#22c55e"
          unit="/ 100"
          delay={0.3}
        />
      </div>
    </Card>
  );
}

// ─── AI Tips Card ─────────────────────────────────────────────────────────────

function AITipsCard({ trips, expenses }: { trips: CompletedTrip[]; expenses: Expense[] }) {
  const tips: string[] = [];

  if (trips.length < 3) {
    tips.push("Добави поне 3 пътувания за да получиш персонализирани съвети.");
  } else {
    const avgCons = trips.reduce((s, t) => s + tripConsumption(t), 0) / trips.length;

    if (avgCons > 8) {
      tips.push(`Средният ти разход е ${avgCons.toFixed(1)} л/100км. Опитай да шофираш по-плавно — избягвай рязко спиране и ускоряване.`);
    }

    if (trips.length >= 3) {
      const last3 = trips.filter(t => tripDistance(t) > 0).slice(0, 3);
      const last3Avg = last3.length > 0 ? last3.reduce((s, t) => s + tripConsumption(t), 0) / last3.length : 0;
      if (last3Avg > avgCons) {
        tips.push("Последните ти 3 пътувания показват по-висок разход. Провери налягането на гумите.");
      }
    }

    if (trips.length >= 5) {
      const validCons = trips.filter(t => tripDistance(t) > 0).map(t => tripConsumption(t));
      const bestCons = validCons.length > 0 ? Math.min(...validCons) : Infinity;
      if (isFinite(bestCons) && bestCons < avgCons * 0.8) {
        tips.push(`Най-ефективното ти пътуване беше ${bestCons.toFixed(1)} л/100км. Опитай да повториш стила на шофиране от тогава.`);
      }
    }
  }

  const unpaidFines = expenses.filter(e => e.category === "fine" && !e.finePaid);
  if (unpaidFines.length > 0) {
    tips.push(`Имаш ${unpaidFines.length} неплатена(и) глоба(и). Плати навреме за да избегнеш допълнителни такси.`);
  }

  // Always show fuel tip but only if we have room (max 3 tips)
  const fuelTip = "Зареждай горивото сутрин или вечер когато е по-студено — получаваш малко повече за парите си.";
  const finalTips = tips.slice(0, 2);
  if (finalTips.length < 3) finalTips.push(fuelTip);

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/[0.07]">
        <div className="w-8 h-8 rounded-xl bg-yellow-400 flex items-center justify-center">
          <Lightbulb size={15} className="text-white" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white leading-tight">Съвети за пестене</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Персонализирани препоръки</p>
        </div>
      </div>
      <div className="px-4 py-3 space-y-3">
        {finalTips.map((tip, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex gap-3 items-start bg-yellow-50 dark:bg-[#2a2414] rounded-xl p-3 border border-yellow-100 dark:border-yellow-500/15"
          >
            <Lightbulb size={15} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed">{tip}</p>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ trips, expenses, currency }: { trips: CompletedTrip[]; expenses: Expense[]; currency: string }) {
  if (trips.length === 0) return null;
  const totalKm = trips.reduce((s, t) => s + tripDistance(t), 0);
  const totalFuelCost = trips.reduce((s, t) => s + tripTotalCost(t), 0);
  const totalExpCost = expenses.reduce((s, e) => s + e.amount, 0);
  const avgCons = trips.reduce((s, t) => s + tripConsumption(t), 0) / trips.length;

  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: "Общо км", value: totalKm.toFixed(0), unit: "км", color: "text-blue-500" },
        { label: "Гориво", value: totalFuelCost.toFixed(0), unit: currency, color: "text-orange-500" },
        { label: "Ср. разход", value: avgCons.toFixed(1), unit: "л/100км", color: "text-green-500" },
      ].map((s) => (
        <div key={s.label} className="bg-white dark:bg-[#252528] rounded-2xl p-3 border border-black/5 dark:border-white/[0.07] card-shadow">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 leading-none">{s.label}</p>
          <p className={`text-[17px] font-bold tabular-nums leading-none ${s.color}`}>{s.value}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{s.unit}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Best Trip Card ───────────────────────────────────────────────────────────

function BestTripCard({ trips, currency }: { trips: CompletedTrip[]; currency: string }) {
  const valid = trips.filter(t => tripDistance(t) > 0);
  if (valid.length < 2) return null;
  const best = valid.reduce((min, t) => tripConsumption(t) < tripConsumption(min) ? t : min, valid[0]);
  const cons = tripConsumption(best);
  const dist = tripDistance(best);
  const cost = tripTotalCost(best);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={15} className="text-yellow-500" />
        <span className="text-[14px] font-semibold text-gray-900 dark:text-white">Най-ефективно пътуване</span>
        <span className="ml-auto text-[10px] font-bold text-yellow-600 bg-yellow-500/12 px-2 py-0.5 rounded-full">РЕКОРД</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Разход", value: cons.toFixed(2), unit: "л/100км", color: "text-green-500" },
          { label: "Разстояние", value: dist.toFixed(0), unit: "км", color: "text-blue-500" },
          { label: "Сума", value: cost.toFixed(2), unit: currency, color: "text-orange-500" },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 dark:bg-[#2c2c30] rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-gray-400 mb-0.5">{s.label}</p>
            <p className={`text-[16px] font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-400">{s.unit}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 text-center">{formatDate(best.endedAt)}</p>
    </Card>
  );
}

// ─── Car Comparison ──────────────────────────────────────────────────────────

function CarComparison({ cars, tripHistory, currency }: { cars: CarProfile[]; tripHistory: CompletedTrip[]; currency: string }) {
  if (cars.length < 2) return null;

  const carStats = cars.map(car => {
    const trips = tripHistory.filter(t => t.carId === car.id);
    const totalKm = trips.reduce((s, t) => s + tripDistance(t), 0);
    const totalCost = trips.reduce((s, t) => s + tripTotalCost(t), 0);
    const avgCons = trips.length > 0 ? trips.reduce((s, t) => s + tripConsumption(t), 0) / trips.length : null;
    const costPerKm = totalKm > 0 ? totalCost / totalKm : null;
    return { car, trips: trips.length, totalKm, totalCost, avgCons, costPerKm };
  }).filter(s => s.trips > 0);

  if (carStats.length < 2) return null;

  const best = carStats.reduce((a, b) => (a.avgCons !== null && b.avgCons !== null && a.avgCons < b.avgCons) ? a : b);

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/[0.07]">
        <div className="w-8 h-8 rounded-xl bg-cyan-500 flex items-center justify-center"><BarChart2 size={15} className="text-white" /></div>
        <div>
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Сравнение на колите</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">{carStats.length} коли с пътувания</p>
        </div>
      </div>
      <div className="px-4 py-3 space-y-3">
        {carStats.map(s => {
          const isBest = s === best;
          return (
            <div key={s.car.id} className={`rounded-2xl p-3 border ${isBest ? "border-green-500/20 bg-green-500/5" : "border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-[#2a2a2e]"}`}>
              <div className="flex items-center gap-2 mb-2">
                {s.car.photo ? (
                  <img src={s.car.photo} className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center"><Car size={14} className="text-indigo-500" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">{s.car.make} {s.car.model}</p>
                  <p className="text-[10px] text-gray-400">{s.trips} пътувания • {s.totalKm.toFixed(0)} км</p>
                </div>
                {isBest && <span className="text-[10px] font-bold text-green-600 bg-green-500/12 px-2 py-0.5 rounded-full">Най-ефективна</span>}
              </div>
              <div className="flex gap-2">
                <div className="flex-1 text-center bg-white dark:bg-[#2e2e34] rounded-xl py-2">
                  <p className="text-[10px] text-gray-400">Разход</p>
                  <p className={`text-[14px] font-bold tabular-nums ${s.avgCons !== null && s.avgCons < 7 ? "text-green-500" : s.avgCons !== null && s.avgCons < 10 ? "text-orange-500" : "text-red-500"}`}>
                    {s.avgCons?.toFixed(1) ?? "—"}
                  </p>
                  <p className="text-[9px] text-gray-400">л/100км</p>
                </div>
                <div className="flex-1 text-center bg-white dark:bg-[#2e2e34] rounded-xl py-2">
                  <p className="text-[10px] text-gray-400">Цена/км</p>
                  <p className="text-[14px] font-bold tabular-nums text-blue-500">{s.costPerKm?.toFixed(2) ?? "—"}</p>
                  <p className="text-[9px] text-gray-400">{currency}/км</p>
                </div>
                <div className="flex-1 text-center bg-white dark:bg-[#2e2e34] rounded-xl py-2">
                  <p className="text-[10px] text-gray-400">Общо</p>
                  <p className="text-[14px] font-bold tabular-nums text-orange-500">{s.totalCost.toFixed(0)}</p>
                  <p className="text-[9px] text-gray-400">{currency}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Fill-Ups Section ─────────────────────────────────────────────────────────

function FillUpsSection({ fillUps, onAdd, onDelete, currency }: {
  fillUps: FuelFillUp[];
  onAdd: (f: FuelFillUp) => void;
  onDelete: (id: string) => void;
  currency: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [liters, setLiters] = useState("");
  const [price, setPrice] = useState("");
  const [station, setStation] = useState("");
  const [date, setDate] = useState(todayISO());
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const photoRef = useRef<HTMLInputElement>(null);

  const monthlySpend = fillUps
    .filter(f => { const t = new Date(); return f.date.startsWith(`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}`); })
    .reduce((s, f) => s + f.liters * f.pricePerLiter, 0);

  function handleAdd() {
    const lt = parseNum(liters); const pr = parseNum(price);
    if (!lt || !pr) return;
    onAdd({ id: crypto.randomUUID(), date, station: station.trim() || undefined, liters: lt, pricePerLiter: pr, photo });
    setLiters(""); setPrice(""); setStation(""); setPhoto(undefined); setShowForm(false);
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setPhoto(compressed);
    } catch {
      alert("Грешка при зареждане на снимката. Опитай отново.");
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/[0.07]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center">
            <Fuel size={15} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Зареждания</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {fillUps.length} записа · {monthlySpend.toFixed(2)} {currency} този месец
            </p>
          </div>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all ${showForm ? "bg-gray-100 dark:bg-[#2c2c30] text-gray-500" : "bg-blue-500 text-white"}`}>
          <Plus size={14} />{showForm ? "Затвори" : "Добави"}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 py-3 space-y-2 border-b border-gray-100 dark:border-white/[0.07]">
              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="text-[11px] text-gray-400 mb-1">Литри</p>
                  <input type="text" inputMode="decimal" value={liters} onChange={e => setLiters(e.target.value.replace(",", "."))} placeholder="40.0"
                    className="w-full bg-gray-50 dark:bg-[#252528] rounded-xl px-3 py-2 text-[14px] text-gray-900 dark:text-white outline-none border border-gray-100 dark:border-white/[0.07]" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] text-gray-400 mb-1">Цена/л ({currency})</p>
                  <input type="text" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value.replace(",", "."))} placeholder="1.79"
                    className="w-full bg-gray-50 dark:bg-[#252528] rounded-xl px-3 py-2 text-[14px] text-gray-900 dark:text-white outline-none border border-gray-100 dark:border-white/[0.07]" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="text-[11px] text-gray-400 mb-1">Станция (по желание)</p>
                  <input type="text" value={station} onChange={e => setStation(e.target.value)} placeholder="напр. Лукойл"
                    className="w-full bg-gray-50 dark:bg-[#252528] rounded-xl px-3 py-2 text-[13px] text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 outline-none border border-gray-100 dark:border-white/[0.07]" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] text-gray-400 mb-1">Дата</p>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-[#252528] rounded-xl px-3 py-2 text-[13px] text-gray-900 dark:text-white outline-none border border-gray-100 dark:border-white/[0.07]" />
                </div>
              </div>
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              <button onClick={() => photoRef.current?.click()}
                className={`flex items-center justify-center gap-2 w-full py-2 rounded-xl text-[13px] transition-all ${photo ? "bg-green-500 text-white" : "bg-gray-50 dark:bg-[#252528] text-gray-400 border border-dashed border-gray-200 dark:border-white/[0.07]"}`}>
                <Camera size={14} />{photo ? "Снимка добавена ✓" : "Снимай касов бон"}
              </button>
              <button onClick={handleAdd} disabled={!liters || !price}
                className="w-full py-2.5 rounded-xl bg-blue-500 text-white text-[14px] font-semibold disabled:opacity-40">
                Запази зареждането
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {fillUps.length === 0 ? (
        <div className="p-4"><p className="text-center text-[13px] text-gray-400">Няма записани зареждания</p></div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-white/[0.07]">
          {fillUps.slice(0, 8).map(f => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Fuel size={12} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">{f.liters.toFixed(1)} л</span>
                  <span className="text-[11px] text-gray-400">@ {f.pricePerLiter.toFixed(2)} {currency}</span>
                  {f.station && <span className="text-[10px] text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-full">{f.station}</span>}
                </div>
                <p className="text-[11px] text-gray-400">{formatShortDate(f.date)} · {(f.liters * f.pricePerLiter).toFixed(2)} {currency}</p>
              </div>
              <button onClick={() => onDelete(f.id)} className="text-red-400 flex-shrink-0"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

interface DashboardProps {
  dark: boolean;
  setDark: (v: boolean) => void;
  activeTrip: ActiveTrip | null;
  setActiveTrip: (t: ActiveTrip | null) => void;
  tripHistory: CompletedTrip[];
  allTrips: CompletedTrip[];       // unfiltered — used by CarsSection for per-car stats
  allExpenses: Expense[];          // unfiltered
  allMaintItems: import("../types").MaintenanceItem[];  // unfiltered
  allDamages: import("../types").CarDamage[];           // unfiltered
  allFillUps: import("../types").FuelFillUp[];          // unfiltered
  addTrip: (t: CompletedTrip) => void;
  deleteTrip: (id: string) => void;
  updateTripPhoto: (id: string, photo: string) => void;
  updateTripDate: (id: string, iso: string) => void;
  currency: string;
  expenses: Expense[];
  cars: CarProfile[];
  activeCar: CarProfile | null;
  activeCarId: string;
  setActiveCarId: (id: string) => void;
  addCar: (car: CarProfile) => void;
  updateCar: (car: CarProfile) => void;
  deleteCar: (id: string) => void;
  fillUps: FuelFillUp[];
  addFillUp: (f: FuelFillUp) => void;
  deleteFillUp: (id: string) => void;
}

export default function Dashboard({ dark, setDark, activeTrip, setActiveTrip, tripHistory, allTrips, allExpenses, allMaintItems, allDamages, allFillUps, addTrip, deleteTrip, updateTripPhoto, updateTripDate, currency, expenses, cars, activeCar, activeCarId, setActiveCarId, addCar, updateCar, deleteCar, fillUps, addFillUp, deleteFillUp }: DashboardProps) {
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [historySort, setHistorySort] = useState<"date" | "dist" | "cons">("date");
  const sortedHistory = [...tripHistory].sort((a, b) => {
    if (historySort === "dist") return tripDistance(b) - tripDistance(a);
    if (historySort === "cons") return tripConsumption(b) - tripConsumption(a);
    return new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime();
  });
  const validTrips = tripHistory.filter(t => tripDistance(t) > 0);
  const avgConsumption = validTrips.length > 0
    ? validTrips.reduce((sum, t) => sum + tripConsumption(t), 0) / validTrips.length
    : null;

  function endTrip(endKm: number, note: string, routePoints?: { lat: number; lon: number }[], endPhoto?: string) {
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
      fuelType: activeTrip.fuelType,
      carId: activeTrip.carId,
      routePoints,
      photo: activeTrip.receiptPhoto ?? endPhoto,
      passengers: activeTrip.passengers,
    });
    setActiveTrip(null);
  }

  return (
    <div className="space-y-4 px-4 pb-8 pt-2">
      {/* Dark mode toggle */}
      <div className="flex justify-end">
        <button onClick={() => setDark(!dark)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-[#1e1e22] border border-black/5 dark:border-white/[0.07] card-shadow transition-colors active:scale-95">
          {dark ? <Moon size={17} className="text-indigo-400" /> : <Sun size={17} className="text-orange-400" />}
        </button>
      </div>

      <CarsSection cars={cars} activeCar={activeCar} activeCarId={activeCarId} setActiveCarId={setActiveCarId} addCar={addCar} updateCar={updateCar} deleteCar={deleteCar} tripHistory={allTrips} allExpenses={allExpenses} allMaintItems={allMaintItems} allDamages={allDamages} allFillUps={allFillUps} />
      <StatsBar trips={tripHistory} expenses={expenses} currency={currency} />

      {/* Speedometer gauges */}
      {tripHistory.length > 0 && <SpeedometerDashboard trips={tripHistory} />}

      {/* Driver Score */}
      <DriverScoreCard trips={tripHistory} />

      {/* Trip section */}
      <AnimatePresence mode="wait">
        {activeTrip ? (
          <CurrentTripCard key="active" trip={activeTrip} onEnd={endTrip} currency={currency} />
        ) : (
          <motion.div key="start" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-4">
            <GpsCard onDistanceReady={() => { /* standalone GPS — no active trip */ }} />
            <StartTripForm onStart={(t) => setActiveTrip({ ...t, carId: activeCar?.id || undefined })} currency={currency} defaultFuelType={activeCar?.fuelType} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Planner */}
      <SmartTripPlanner avgConsumption={avgConsumption} currency={currency} />

      {/* Fuel price trend */}
      <FuelPriceCard trips={tripHistory} currency={currency} />

      {/* Fill-ups log */}
      <FillUpsSection fillUps={fillUps} onAdd={addFillUp} onDelete={deleteFillUp} currency={currency} />

      {/* Consumption graph */}
      <ConsumptionGraph trips={tripHistory} />

      {/* AI Tips */}
      <AITipsCard trips={tripHistory} expenses={expenses} />

      <BestTripCard trips={tripHistory} currency={currency} />

      <CarComparison cars={cars} tripHistory={tripHistory} currency={currency} />

      {/* History */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-gray-900 dark:text-white" />
            <span className="text-[15px] font-semibold text-gray-900 dark:text-white">История</span>
          </div>
          {tripHistory.length > 0 && (
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#252528] rounded-xl p-0.5">
              {([
                { key: "date", label: "Дата" },
                { key: "dist", label: "км" },
                { key: "cons", label: "л/100" },
              ] as const).map(opt => (
                <button key={opt.key} onClick={() => setHistorySort(opt.key)}
                  className={`px-2.5 py-1 rounded-[9px] text-[11px] font-semibold transition-all ${historySort === opt.key ? "bg-blue-500 text-white shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {tripHistory.length === 0 ? (
          <EmptyState icon={<Inbox size={40} />} title="Няма завършени пътувания" subtitle="Стартирай пътуване и го завърши" />
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence>
              {(showAllHistory ? sortedHistory : sortedHistory.slice(0, 3)).map((t) => (
                <HistoryRow key={t.id} trip={t} onDelete={() => deleteTrip(t.id)} onUpdatePhoto={(photo) => updateTripPhoto(t.id, photo)} onDeletePhoto={() => updateTripPhoto(t.id, "")} onUpdateDate={(iso) => updateTripDate(t.id, iso)} currency={currency} allTrips={tripHistory} />
              ))}
            </AnimatePresence>
          </div>
        )}
        {tripHistory.length > 3 && (
          <button onClick={() => setShowAllHistory(v => !v)}
            className="w-full py-2.5 text-[13px] font-semibold text-blue-500 text-center">
            {showAllHistory ? "Скрий" : `Виж всички (${tripHistory.length})`}
          </button>
        )}
      </div>
    </div>
  );
}
