import { Home, Wrench, Map as MapIcon, BarChart2, BarChart3, ArrowLeft, Palette, Bell, X, AlertTriangle, ChevronRight, Download, Share } from "lucide-react";
import { useState, useEffect, useRef, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { ActiveTrip, CompletedTrip, MaintenanceItem, CarDocument, ChecklistItem, Expense, SavedLocation, CarProfile, ExpiryDates, AppTheme, RecurringExpense, CarDamage, ParkingTimer, FuelFillUp } from "../types";
import Dashboard from "../tabs/Dashboard";
import Maintenance from "../tabs/Maintenance";
import Maps, { DEFAULT_CHECKLIST } from "../tabs/Maps";
import Expenses from "../tabs/Expenses";
import Reports from "../tabs/Reports";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = "dashboard" | "maintenance" | "maps" | "expenses" | "reports";

const TABS: { id: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  { id: "dashboard",   label: "Начало",    icon: (a) => <Home     size={20} strokeWidth={a ? 2.5 : 1.8} /> },
  { id: "maintenance", label: "Поддръжка", icon: (a) => <Wrench   size={20} strokeWidth={a ? 2.5 : 1.8} /> },
  { id: "maps",        label: "Карта",     icon: (a) => <MapIcon  size={20} strokeWidth={a ? 2.5 : 1.8} /> },
  { id: "expenses",    label: "Разходи",   icon: (a) => <BarChart2 size={20} strokeWidth={a ? 2.5 : 1.8} /> },
  { id: "reports",     label: "Отчети",    icon: (a) => <BarChart3 size={20} strokeWidth={a ? 2.5 : 1.8} /> },
];

const TAB_TITLES: Record<Tab, string> = {
  dashboard:   "Разход на гориво",
  maintenance: "Поддръжка",
  maps:        "Карта & Инструменти",
  expenses:    "Разходи & Анализ",
  reports:     "Отчети",
};

// ─── Themes ───────────────────────────────────────────────────────────────────

const THEMES: Record<AppTheme, { primary: string; light: string; name: string }> = {
  blue:   { primary: "#3b82f6", light: "#eff6ff", name: "Синьо" },
  purple: { primary: "#a855f7", light: "#faf5ff", name: "Лилаво" },
  green:  { primary: "#22c55e", light: "#f0fdf4", name: "Зелено" },
  orange: { primary: "#f97316", light: "#fff7ed", name: "Оранжево" },
  rose:   { primary: "#f43f5e", light: "#fff1f2", name: "Розово" },
};
const THEME_ORDER: AppTheme[] = ["blue", "purple", "green", "orange", "rose"];

// ─── Achievements ─────────────────────────────────────────────────────────────

interface Achievement {
  id: string;
  title: string;
  desc: string;
  emoji: string;
  check: (km: number, trips: number) => boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: "km_1000",   title: "Пътешественик",   desc: "Изминал 1 000 км",          emoji: "🚗", check: (km) => km >= 1000 },
  { id: "km_5000",   title: "Дългопробежен",    desc: "Изминал 5 000 км",          emoji: "🛣️", check: (km) => km >= 5000 },
  { id: "km_10000",  title: "Ветеран на пътя",  desc: "Изминал 10 000 км",         emoji: "🏆", check: (km) => km >= 10000 },
  { id: "km_50000",  title: "Легенда",           desc: "Изминал 50 000 км",         emoji: "⭐", check: (km) => km >= 50000 },
  { id: "trips_10",  title: "Редовен шофьор",    desc: "10 завършени пътувания",    emoji: "🎯", check: (_km, t) => t >= 10 },
  { id: "trips_50",  title: "Опитен шофьор",     desc: "50 завършени пътувания",    emoji: "🌟", check: (_km, t) => t >= 50 },
  { id: "trips_100", title: "Мастър шофьор",     desc: "100 завършени пътувания",   emoji: "💎", check: (_km, t) => t >= 100 },
];

// ─── Achievement Modal ────────────────────────────────────────────────────────

function AchievementModal({ achievement, onClose }: { achievement: Achievement; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center pb-24 px-4 pointer-events-none"
    >
      <motion.div
        initial={{ y: 60, scale: 0.85, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 40, scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="pointer-events-auto bg-white dark:bg-[#1c1c1e] rounded-3xl px-6 py-5 flex items-center gap-4 border border-yellow-500/30 shadow-2xl max-w-sm w-full"
        style={{ boxShadow: "0 8px 40px rgba(234,179,8,0.25)" }}
        onClick={onClose}
      >
        <div className="text-[44px] leading-none flex-shrink-0">{achievement.emoji}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-yellow-500 uppercase tracking-widest mb-0.5">Постижение!</p>
          <p className="text-[17px] font-bold text-gray-900 dark:text-white leading-tight">{achievement.title}</p>
          <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">{achievement.desc}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Tab Bar Component ────────────────────────────────────────────────────────

function TabBar({ active, onChange, themeColor }: { active: Tab; onChange: (t: Tab) => void; themeColor: string }) {
  return (
    <div className="flex-shrink-0 border-t border-gray-100 dark:border-white/[0.07] bg-white/90 dark:bg-[#161618]/95 backdrop-blur-md" style={{ boxShadow: "0 -1px 0 rgba(0,0,0,0.04)" }}>
      <div className="flex items-stretch px-1">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all relative"
            >
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute top-0 inset-x-2 h-0.5 rounded-b-full"
                  style={{ background: themeColor }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className={`transition-colors ${!isActive ? "text-gray-400 dark:text-gray-500" : ""}`}
                style={isActive ? { color: themeColor } : undefined}>
                {tab.icon(isActive)}
              </span>
              <span className={`text-[9px] font-medium transition-colors leading-none ${!isActive ? "text-gray-400 dark:text-gray-500" : ""}`}
                style={isActive ? { color: themeColor } : undefined}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function FuelCalculator() {
  const [dark, setDark] = useLocalStorage("fa_dark", false);
  const [activeTab, setActiveTab] = useLocalStorage<Tab>("fa_tab", "dashboard");
  const [currency, setCurrency] = useLocalStorage<string>("fa_currency", "€");
  const [tabHistory, setTabHistory] = useState<Tab[]>([]);
  const [theme, setTheme] = useLocalStorage<AppTheme>("fa_theme", "blue");
  const [seenAchievements, setSeenAchievements] = useLocalStorage<string[]>("fa_achievements", []);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const [expiries, setExpiries] = useLocalStorage<ExpiryDates>("fa_expiries", {
    vignette: "", civil: "", kasko: "", inspection: "", driverLicense: "",
  });
  const notifCheckedRef = useRef(false);

  // PWA Install banner
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useLocalStorage("fa_install_dismissed", true);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    (installPrompt as BeforeInstallPromptEvent).prompt();
    await (installPrompt as BeforeInstallPromptEvent).userChoice;
    setInstallPrompt(null);
    setShowInstallBanner(false);
  }

  function navigateTo(tab: Tab) {
    setTabHistory((h) => [...h, activeTab]);
    setActiveTab(tab);
  }

  function goBack() {
    const prev = tabHistory[tabHistory.length - 1];
    if (prev) {
      setTabHistory((h) => h.slice(0, -1));
      setActiveTab(prev);
    } else {
      setActiveTab("dashboard");
    }
  }

  const [activeTrip, setActiveTrip] = useLocalStorage<ActiveTrip | null>("fa_active_trip", null);
  const [tripHistory, setTripHistory] = useLocalStorage<CompletedTrip[]>("fa_trip_history", []);

  const [maintItems, setMaintItems] = useLocalStorage<MaintenanceItem[]>("fa_maintenance", []);
  const [documents, setDocuments] = useLocalStorage<CarDocument[]>("fa_documents", []);

  const [savedLocation, setSavedLocation] = useLocalStorage<SavedLocation | null>("fa_saved_location", null);
  const [parkingTimer, setParkingTimer] = useLocalStorage<ParkingTimer | null>("fa_parking_timer", null);
  const [, setParkingTick] = useState(0);
  useEffect(() => {
    if (!parkingTimer) return;
    const id = setInterval(() => setParkingTick(t => t + 1), 10000);
    return () => clearInterval(id);
  }, [parkingTimer]);
  const [checklistItems, setChecklistItems] = useLocalStorage<ChecklistItem[]>("fa_checklist", DEFAULT_CHECKLIST);

  const [expenses, setExpenses] = useLocalStorage<Expense[]>("fa_expenses", []);
  const [recurringExpenses, setRecurringExpenses] = useLocalStorage<RecurringExpense[]>("fa_recurring_expenses", []);
  const [carDamages, setCarDamages] = useLocalStorage<CarDamage[]>("fa_car_damages", []);
  const [cars, setCars] = useLocalStorage<CarProfile[]>("fa_cars", []);
  const [activeCarId, setActiveCarId] = useLocalStorage<string>("fa_active_car", "");
  const [fillUps, setFillUps] = useLocalStorage<FuelFillUp[]>("fa_fillups", []);

  const activeCar = cars.find(c => c.id === activeCarId) ?? cars[0] ?? null;
  const effectiveCarId = activeCar?.id ?? "";

  // ── Per-car filtering (strict: only show data belonging to the active car) ──
  const carTripHistory       = effectiveCarId ? tripHistory.filter(t => t.carId === effectiveCarId) : tripHistory;
  const carMaintItems        = effectiveCarId ? maintItems.filter(i => i.carId === effectiveCarId) : maintItems;
  const carDocuments         = effectiveCarId ? documents.filter(d => d.carId === effectiveCarId) : documents;
  const carExpenses          = effectiveCarId ? expenses.filter(e => e.carId === effectiveCarId) : expenses;
  const carRecurringExpenses = effectiveCarId ? recurringExpenses.filter(r => r.carId === effectiveCarId) : recurringExpenses;
  const carDamageItems       = effectiveCarId ? carDamages.filter(d => d.carId === effectiveCarId) : carDamages;
  const carFillUps           = effectiveCarId ? fillUps.filter(f => f.carId === effectiveCarId) : fillUps;

  // ── Unassigned data migration ───────────────────────────────────────────────
  const [migrationDismissed, setMigrationDismissed] = useLocalStorage("fa_migration_dismissed", false);
  const unassignedCount = effectiveCarId ? (
    tripHistory.filter(t => !t.carId).length +
    expenses.filter(e => !e.carId).length +
    maintItems.filter(i => !i.carId).length +
    carDamages.filter(d => !d.carId).length +
    fillUps.filter(f => !f.carId).length +
    recurringExpenses.filter(r => !r.carId).length +
    documents.filter(d => !d.carId).length
  ) : 0;

  function migrateUnassignedToActiveCar() {
    const cid = effectiveCarId;
    if (!cid) return;
    setTripHistory(h => h.map(t => t.carId ? t : { ...t, carId: cid }));
    setExpenses(ex => ex.map(e => e.carId ? e : { ...e, carId: cid }));
    setMaintItems(m => m.map(i => i.carId ? i : { ...i, carId: cid }));
    setCarDamages(ds => ds.map(d => d.carId ? d : { ...d, carId: cid }));
    setFillUps(fs => fs.map(f => f.carId ? f : { ...f, carId: cid }));
    setRecurringExpenses(rs => rs.map(r => r.carId ? r : { ...r, carId: cid }));
    setDocuments(ds => ds.map(d => d.carId ? d : { ...d, carId: cid }));
    setMigrationDismissed(true);
  }

  // ── Per-car expiry dates ─────────────────────────────────────────────────────
  // If a car is active use its own expiries (default empty). Only use global fa_expiries
  // when there is no active car at all (legacy / no-car mode).
  const EMPTY_EXPIRIES: ExpiryDates = { vignette: "", civil: "", kasko: "", inspection: "", driverLicense: "" };
  const carExpiries: ExpiryDates = activeCar ? (activeCar.expiries ?? EMPTY_EXPIRIES) : (expiries ?? EMPTY_EXPIRIES);
  function setCarExpiries(e: ExpiryDates) {
    if (activeCar) {
      updateCar({ ...activeCar, expiries: e });
    } else {
      setExpiries(e);
    }
  }

  function addTrip(t: CompletedTrip) {
    setTripHistory((h) => [t, ...h]);
    // Auto-create a fill-up from the trip so the user doesn't have to enter it manually
    const fillUpId = `trip_${t.id}`;
    setFillUps(fs => {
      if (fs.some(f => f.id === fillUpId)) return fs; // already exists
      return [{ id: fillUpId, date: (t.endedAt ?? t.startedAt).slice(0, 10), liters: t.liters, pricePerLiter: t.pricePerLiter, photo: t.photo, carId: t.carId }, ...fs];
    });
  }
  function deleteTrip(id: string) {
    setTripHistory((h) => h.filter((t) => t.id !== id));
    // Also remove the auto-generated fill-up so it doesn't become an orphan
    setFillUps((fs) => fs.filter((f) => f.id !== `trip_${id}`));
  }
  function updateTripPhoto(id: string, photo: string) { setTripHistory((h) => h.map((t) => t.id === id ? { ...t, photo: photo || undefined } : t)); }
  function updateTripDate(id: string, iso: string) {
    setTripHistory((h) => h.map((t) => t.id === id ? { ...t, endedAt: iso } : t));
    // Keep the auto-created fill-up's date in sync with the trip date
    const fillUpId = `trip_${id}`;
    setFillUps((fs) => fs.map((f) => f.id === fillUpId ? { ...f, date: iso.slice(0, 10) } : f));
  }
  function addMaintItem(item: MaintenanceItem) { setMaintItems((m) => [{ ...item, carId: effectiveCarId || undefined }, ...m]); }
  function deleteMaintItem(id: string)     { setMaintItems((m) => m.filter((i) => i.id !== id)); }
  function addDocument(doc: CarDocument)   { setDocuments((d) => [{ ...doc, carId: effectiveCarId || undefined }, ...d]); }
  function deleteDocument(id: string)      { setDocuments((d) => d.filter((doc) => doc.id !== id)); }
  function addExpense(e: Expense)          { setExpenses((ex) => [{ ...e, carId: effectiveCarId || undefined }, ...ex]); }
  function deleteExpense(id: string)       { setExpenses((ex) => ex.filter((e) => e.id !== id)); }
  function updateExpense(e: Expense)       { setExpenses((ex) => ex.map(x => x.id === e.id ? e : x)); }

  function addRecurringExpense(r: RecurringExpense) { setRecurringExpenses(rs => [...rs, { ...r, carId: effectiveCarId || undefined }]); }
  function deleteRecurringExpense(id: string) { setRecurringExpenses(rs => rs.filter(r => r.id !== id)); }
  function addCarDamage(d: CarDamage) { setCarDamages(ds => [{ ...d, carId: effectiveCarId || undefined }, ...ds]); }
  function deleteCarDamage(id: string) { setCarDamages(ds => ds.filter(d => d.id !== id)); }
  function toggleCarDamageRepaired(id: string) { setCarDamages(ds => ds.map(d => d.id === id ? { ...d, repaired: !d.repaired } : d)); }
  function payRecurringExpense(id: string) {
    setRecurringExpenses(rs => rs.map(r => {
      if (r.id !== id) return r;
      const next = new Date(r.nextDueDate);
      next.setMonth(next.getMonth() + r.intervalMonths);
      return { ...r, nextDueDate: next.toISOString().slice(0, 10) };
    }));
  }

  function addFillUp(f: FuelFillUp) { setFillUps(fs => [{ ...f, carId: effectiveCarId || undefined }, ...fs]); }

  function deleteFillUp(id: string) { setFillUps(fs => fs.filter(f => f.id !== id)); }

  function addCar(car: CarProfile)         { setCars(cs => [...cs, car]); setActiveCarId(car.id); }
  function updateCar(car: CarProfile)      { setCars(cs => cs.map(c => c.id === car.id ? car : c)); }
  function deleteCar(id: string) {
    setCars(cs => { const next = cs.filter(c => c.id !== id); if (activeCarId === id) setActiveCarId(next[0]?.id ?? ""); return next; });
    // Clear active trip if it belongs to the deleted car (prevents orphaned trip state)
    if (activeTrip?.carId === id) setActiveTrip(null);
    // Unassign data instead of permanently deleting (trips/expenses become unassigned, not lost)
    setTripHistory(h => h.map(t => t.carId === id ? { ...t, carId: undefined } : t));
    setExpenses(ex => ex.map(e => e.carId === id ? { ...e, carId: undefined } : e));
    setMaintItems(m => m.map(i => i.carId === id ? { ...i, carId: undefined } : i));
    setDocuments(ds => ds.map(d => d.carId === id ? { ...d, carId: undefined } : d));
    setRecurringExpenses(rs => rs.map(r => r.carId === id ? { ...r, carId: undefined } : r));
    setCarDamages(ds => ds.map(d => d.carId === id ? { ...d, carId: undefined } : d));
    setFillUps(fs => fs.map(f => f.carId === id ? { ...f, carId: undefined } : f));
  }

  // ── Fill-up heal: keep auto fill-ups in sync with trips ──────────────────────
  // Runs whenever trips change. Fixes three things:
  //  1. Orphan fill-ups (trip was deleted but fill-up survived)
  //  2. Missing fill-ups (trip exists but auto fill-up was never created)
  //  3. Date mismatch (trip date was edited before the sync fix was deployed)
  useEffect(() => {
    if (!tripHistory.length) return;
    const tripMap = new Map(tripHistory.map(t => [t.id, t]));
    setFillUps(fs => {
      let changed = false;
      // 1. Remove orphan auto fill-ups
      let result = fs.filter(f => {
        if (f.id.startsWith("trip_") && !tripMap.has(f.id.slice(5))) { changed = true; return false; }
        return true;
      });
      const existingIds = new Set(result.map(f => f.id));
      // 2 & 3. Ensure each trip has a correctly-dated fill-up
      for (const t of tripHistory) {
        const fid = `trip_${t.id}`;
        const correctDate = (t.endedAt ?? t.startedAt).slice(0, 10);
        if (!existingIds.has(fid)) {
          result = [{ id: fid, date: correctDate, liters: t.liters, pricePerLiter: t.pricePerLiter, carId: t.carId }, ...result];
          changed = true;
        } else {
          const cur = result.find(f => f.id === fid);
          if (cur && cur.date !== correctDate) {
            result = result.map(f => f.id === fid ? { ...f, date: correctDate } : f);
            changed = true;
          }
        }
      }
      return changed ? result : fs; // same reference = no re-render loop
    });
  }, [tripHistory]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function checkNotifications() {
      if (!("Notification" in window)) return;
      let permission = Notification.permission;
      // Deduplicate: track which notifications were already shown today
      const shownKey = `fa_notif_shown_${new Date().toISOString().slice(0, 10)}_${effectiveCarId}`;
      const alreadyShown = new Set<string>(JSON.parse(sessionStorage.getItem(shownKey) ?? "[]"));
      function sendOnce(id: string, title: string, body: string) {
        if (alreadyShown.has(id)) return;
        alreadyShown.add(id);
        sessionStorage.setItem(shownKey, JSON.stringify([...alreadyShown]));
        new Notification(title, { body, icon: "/icon.svg" });
      }
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") return;

      const today = Date.now();
      const items = [
        { label: "Винетка", date: carExpiries.vignette },
        { label: "Гражданска застраховка", date: carExpiries.civil },
        { label: "Каско", date: carExpiries.kasko },
        { label: "Технически преглед", date: carExpiries.inspection },
        { label: "Шофьорска книжка", date: carExpiries.driverLicense },
      ];
      for (const item of items) {
        if (!item.date) continue;
        const days = Math.floor((new Date(item.date).getTime() - today) / (1000 * 60 * 60 * 24));
        if (days < 0) {
          sendOnce(`doc_expired_${item.label}`, "🚨 Изтекъл документ", `${item.label} е изтекл(а) преди ${Math.abs(days)} дни!`);
        } else if (days <= 30) {
          sendOnce(`doc_expiring_${item.label}`, "⚠️ Изтичащ документ", `${item.label} изтича след ${days} дни (${item.date})`);
        }
      }

      // Check unpaid fines with approaching deadlines (active car only)
      for (const expense of carExpenses) {
        if (expense.category === "fine" && !expense.finePaid && expense.fineDeadline) {
          const days = Math.floor((new Date(expense.fineDeadline).getTime() - today) / (1000 * 60 * 60 * 24));
          if (days >= 0 && days <= 3) {
            sendOnce(`fine_${expense.id}`, "⚠️ Краен срок за глоба", `Имаш неплатена глоба от ${expense.amount} ${currency} — краен срок след ${days} дни!`);
          }
        }
      }

      // Check recurring expenses (active car only)
      for (const r of carRecurringExpenses) {
        const days = Math.floor((new Date(r.nextDueDate).getTime() - today) / (1000 * 60 * 60 * 24));
        if (days >= 0 && days <= 7) {
          sendOnce(`rec_${r.id}`, "📅 Предстоящ разход", `${r.label} — ${r.amount} ${currency} се дължи след ${days} дни`);
        }
      }
    }
    checkNotifications();
  }, [carExpiries, carExpenses, carRecurringExpenses, effectiveCarId]);

  useEffect(() => {
    if (carTripHistory.length === 0) return;
    const totalKm = carTripHistory.reduce((s, t) => s + (t.endKm - t.startKm), 0);
    const totalTrips = carTripHistory.length;
    for (const ach of ACHIEVEMENTS) {
      if (!seenAchievements.includes(ach.id) && ach.check(totalKm, totalTrips)) {
        setSeenAchievements(prev => [...prev, ach.id]);
        setCurrentAchievement(ach);
        break;
      }
    }
  }, [carTripHistory]);

  const tabContent: Record<Tab, React.ReactNode> = {
    dashboard: (
      <Dashboard
        dark={dark} setDark={setDark}
        activeTrip={activeTrip} setActiveTrip={setActiveTrip}
        tripHistory={carTripHistory} allTrips={tripHistory} addTrip={addTrip} deleteTrip={deleteTrip} updateTripPhoto={updateTripPhoto} updateTripDate={updateTripDate}
        currency={currency}
        expenses={carExpenses}
        allExpenses={expenses}
        allMaintItems={maintItems}
        allDamages={carDamages}
        allFillUps={fillUps}
        cars={cars} activeCar={activeCar} activeCarId={activeCarId}
        setActiveCarId={setActiveCarId} addCar={addCar} updateCar={updateCar} deleteCar={deleteCar}
        fillUps={carFillUps} addFillUp={addFillUp} deleteFillUp={deleteFillUp}
      />
    ),
    maintenance: (
      <Maintenance
        items={carMaintItems} addItem={addMaintItem} deleteItem={deleteMaintItem}
        documents={carDocuments} addDocument={addDocument} deleteDocument={deleteDocument}
        currency={currency}
        expiries={carExpiries}
        setExpiries={setCarExpiries}
        activeCar={activeCar}
        onUpdateActiveCar={updateCar}
        damages={carDamageItems}
        addDamage={addCarDamage}
        deleteDamage={deleteCarDamage}
        toggleDamageRepaired={toggleCarDamageRepaired}
        addExpense={addExpense}
        updateExpense={updateExpense}
        expenses={carExpenses}
      />
    ),
    maps: (
      <Maps
        savedLocation={savedLocation} setSavedLocation={setSavedLocation}
        checklistItems={checklistItems} setChecklistItems={setChecklistItems}
        parkingTimer={parkingTimer} setParkingTimer={setParkingTimer}
      />
    ),
    expenses: (
      <Expenses
        expenses={carExpenses} addExpense={addExpense} deleteExpense={deleteExpense} updateExpense={updateExpense}
        tripHistory={carTripHistory}
        currency={currency}
        recurringExpenses={carRecurringExpenses}
        addRecurringExpense={addRecurringExpense}
        payRecurringExpense={payRecurringExpense}
        deleteRecurringExpense={deleteRecurringExpense}
      />
    ),
    reports: (
      <Reports
        tripHistory={carTripHistory}
        expenses={carExpenses}
        maintenanceItems={carMaintItems}
        currency={currency}
        activeCarId={activeCarId}
        activeTrip={activeTrip}
        onUpdateExpense={updateExpense}
        cars={cars}
        carDamages={carDamageItems}
        fillUps={carFillUps}
        documents={carDocuments}
        checklistItems={checklistItems}
        savedLocation={savedLocation}
        expiries={carExpiries}
        recurringExpenses={carRecurringExpenses}
        onImport={(data) => {
          // Replace arrays entirely — merging by ID causes duplicates when the same
          // record was created on a different device and therefore has a different ID.
          if (data.trips?.length)            setTripHistory(data.trips);
          if (data.expenses?.length)         setExpenses(data.expenses);
          if (data.maintenance?.length)      setMaintItems(data.maintenance);
          if (data.cars?.length)             setCars(data.cars);
          if (data.carDamages?.length)       setCarDamages(data.carDamages);
          if (data.documents?.length)        setDocuments(data.documents);
          if (data.recurringExpenses?.length) setRecurringExpenses(data.recurringExpenses);
          if (data.checklistItems?.length)   setChecklistItems(data.checklistItems!);
          if (data.savedLocation !== undefined) setSavedLocation(data.savedLocation ?? null);
          if (data.expiries)    setExpiries(data.expiries);
          if (data.currency)    setCurrency(data.currency);
          if (data.activeCarId) setActiveCarId(data.activeCarId);
          if (data.activeTrip !== undefined) setActiveTrip(data.activeTrip ?? null);
          // Restore fill-ups: merge manually-added ones from backup with auto-generated
          // ones rebuilt from trips (v5 backups omit auto fill-ups to save space)
          const manualFillUps = (data.fillUps ?? []).filter(f => !f.id.startsWith("trip_"));
          const autoFillUps = (data.trips ?? []).map(t => ({
            id: `trip_${t.id}`,
            date: (t.endedAt ?? t.startedAt).slice(0, 10),
            liters: t.liters,
            pricePerLiter: t.pricePerLiter,
            carId: t.carId,
          }));
          setFillUps([...autoFillUps, ...manualFillUps]);
        }}
      />
    ),
  };

  // ─── In-app alerts ──────────────────────────────────────────────────────────
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const alerts = (() => {
    const today = Date.now();
    const result: { id: string; text: string; color: string; tab?: Tab }[] = [];

    // Document expiries (per active car)
    const docItems = [
      { key: "vignette", label: "Винетка", date: carExpiries.vignette },
      { key: "civil",    label: "Гражданска застраховка", date: carExpiries.civil },
      { key: "kasko",    label: "Каско", date: carExpiries.kasko },
      { key: "inspection", label: "Технически преглед", date: carExpiries.inspection },
      { key: "driverLicense", label: "Шофьорска книжка", date: carExpiries.driverLicense },
    ];
    for (const d of docItems) {
      if (!d.date) continue;
      const ms = new Date(d.date).getTime();
      if (isNaN(ms)) continue;
      const days = Math.floor((ms - today) / 86400000);
      if (days < 0) result.push({ id: `doc_${d.key}`, text: `${d.label} е изтекл(а)!`, color: "bg-red-500", tab: "maintenance" });
      else if (days <= 30) result.push({ id: `doc_${d.key}`, text: `${d.label} изтича след ${days} дни`, color: "bg-orange-500", tab: "maintenance" });
    }

    // Unpaid fines with deadline soon
    for (const e of carExpenses) {
      if (e.category === "fine" && !e.finePaid && e.fineDeadline) {
        const fineMs = new Date(e.fineDeadline).getTime();
        if (isNaN(fineMs)) continue;
        const days = Math.floor((fineMs - today) / 86400000);
        if (days < 0) result.push({ id: `fine_${e.id}`, text: `Просрочена глоба ${e.amount} ${currency}!`, color: "bg-red-500", tab: "expenses" });
        else if (days <= 30) result.push({ id: `fine_${e.id}`, text: `Неплатена глоба — ${days} дни до краен срок`, color: "bg-orange-500", tab: "expenses" });
      }
    }

    // Recurring expenses due soon
    for (const r of carRecurringExpenses) {
      const recMs = new Date(r.nextDueDate).getTime();
      if (isNaN(recMs)) continue;
      const days = Math.floor((recMs - today) / 86400000);
      if (days < 0) result.push({ id: `rec_${r.id}`, text: `Просрочено: ${r.label}`, color: "bg-red-500", tab: "expenses" });
      else if (days <= 7) result.push({ id: `rec_${r.id}`, text: `${r.label} — след ${days} дни`, color: "bg-purple-500", tab: "expenses" });
    }

    // Parking timer
    if (parkingTimer) {
      const elapsedMs = today - new Date(parkingTimer.startedAt).getTime();
      const remainMs  = parkingTimer.durationMinutes * 60 * 1000 - elapsedMs;
      if (remainMs < 0) {
        result.push({ id: "parking_expired", text: "Паркингът е изтекъл!", color: "bg-red-500", tab: "maps" });
      } else if (remainMs <= 10 * 60 * 1000) {
        const remMin = Math.ceil(remainMs / 60000);
        result.push({ id: "parking_warn", text: `Паркингът изтича след ${remMin} мин!`, color: "bg-orange-500", tab: "maps" });
      }
    }

    return result.filter(a => !dismissedAlerts.includes(a.id));
  })();

  const [alertIndex, setAlertIndex] = useState(0);
  const visibleAlert = alerts[alertIndex % Math.max(alerts.length, 1)];

  return (
    <div className={dark ? "dark" : ""} style={{ height: "100dvh" }}>
      <div className="h-full bg-[#f2f2f7] dark:bg-[#0d0d10] flex flex-col transition-colors duration-300">
        {/* Nav bar */}
        <div className="px-4 pt-4 pb-3 flex-shrink-0 border-b border-black/5 dark:border-white/[0.06] bg-[#f2f2f7]/90 dark:bg-[#0d0d10]/90 backdrop-blur-md">
          <div className="flex items-center gap-2">
            {/* Back button — visible on all tabs except dashboard */}
            {activeTab !== "dashboard" && (
              <motion.button
                key="back"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                onClick={goBack}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-[#2c2c30] text-gray-700 dark:text-gray-300 flex-shrink-0 active:scale-95 transition-transform"
              >
                <ArrowLeft size={18} />
              </motion.button>
            )}
            <h1 className="flex-1 text-[22px] font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
              {TAB_TITLES[activeTab]}
            </h1>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setTheme(t => THEME_ORDER[(THEME_ORDER.indexOf(t) + 1) % THEME_ORDER.length])}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-[#2c2c30] transition-all active:scale-95"
                title={THEMES[theme].name}
              >
                <div className="w-4 h-4 rounded-full" style={{ background: THEMES[theme].primary }} />
              </button>
              <button
                onClick={() => setCurrency((c) => c === "€" ? "$" : "€")}
                className="px-3 py-1.5 rounded-xl text-[14px] font-bold transition-all active:scale-95 select-none"
                style={{ background: THEMES[theme].primary + "1a", color: THEMES[theme].primary }}
              >
                {currency}
              </button>
            </div>
          </div>
        </div>

        {/* In-app alert banner */}
        <AnimatePresence>
          {alerts.length > 0 && visibleAlert && (
            <motion.div
              key={visibleAlert.id}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`flex-shrink-0 ${visibleAlert.color} overflow-hidden`}
            >
              <div className="flex items-center gap-2 px-4 py-2">
                <Bell size={13} className="text-white flex-shrink-0" />
                <button
                  className="flex-1 flex items-center gap-1 min-w-0"
                  onClick={() => { if (visibleAlert.tab) navigateTo(visibleAlert.tab); }}
                >
                  <span className="text-[12px] font-semibold text-white truncate">{visibleAlert.text}</span>
                  {visibleAlert.tab && <ChevronRight size={12} className="text-white/70 flex-shrink-0" />}
                </button>
                {alerts.length > 1 && (
                  <span className="text-[10px] text-white/70 flex-shrink-0">{alertIndex % alerts.length + 1}/{alerts.length}</span>
                )}
                {alerts.length > 1 && (
                  <button onClick={() => setAlertIndex(i => i + 1)} className="text-white/80 px-1 text-[11px] font-bold">›</button>
                )}
                <button onClick={() => setDismissedAlerts(d => [...d, visibleAlert.id])} className="text-white/80 flex-shrink-0">
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Migration banner — unassigned data */}
        <AnimatePresence>
          {unassignedCount > 0 && !migrationDismissed && activeCar && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="flex-shrink-0 bg-amber-500 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5">
                <AlertTriangle size={14} className="text-white flex-shrink-0" />
                <p className="flex-1 text-[12px] font-semibold text-white leading-tight">
                  Имаш {unassignedCount} запис{unassignedCount === 1 ? "" : "а"} без кола. Прехвърли ги към <span className="font-extrabold">{activeCar.make} {activeCar.model}</span>?
                </p>
                <button
                  onClick={migrateUnassignedToActiveCar}
                  className="text-[12px] font-bold text-amber-700 bg-white px-2.5 py-1 rounded-lg flex-shrink-0 active:scale-95">
                  Прехвърли
                </button>
                <button onClick={() => setMigrationDismissed(true)} className="text-white/80 flex-shrink-0 ml-1">
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PWA Install banner */}
        {showInstallBanner && !isInStandaloneMode && (installPrompt || isIOS) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 bg-indigo-600 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2">
              {isIOS ? <Share size={13} className="text-white flex-shrink-0" /> : <Download size={13} className="text-white flex-shrink-0" />}
              <p className="flex-1 text-[12px] font-semibold text-white">
                {isIOS ? "Добави на началния екран: Сподели → Добави към начален екран" : "Инсталирай приложението за офлайн достъп"}
              </p>
              {!isIOS && (
                <button onClick={handleInstall} className="text-[12px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-lg flex-shrink-0">
                  Инсталирай
                </button>
              )}
              <button onClick={() => setShowInstallBanner(false)} className="text-white/80 flex-shrink-0 ml-1">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-none">
          {tabContent[activeTab]}
        </div>

        {/* Tab bar */}
        <TabBar active={activeTab} onChange={navigateTo} themeColor={THEMES[theme].primary} />

        <AnimatePresence>
          {currentAchievement && (
            <AchievementModal
              achievement={currentAchievement}
              onClose={() => setCurrentAchievement(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Error Boundary ───────────────────────────────────────────────────────────

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) {}
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-white">
          <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <p className="text-[18px] font-bold text-gray-900">Нещо се счупи</p>
          <p className="text-[12px] text-gray-400 text-center max-w-xs font-mono break-all">{this.state.error.message}</p>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <button
              onClick={() => this.setState({ error: null })}
              className="w-full px-5 py-2.5 rounded-xl bg-blue-500 text-white text-[14px] font-semibold"
            >
              Опитай пак
            </button>
            <button
              onClick={() => {
                if (window.confirm("Това ще изтрие ВСИЧКИ данни и ще презареди приложението. Продължи?")) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="w-full px-5 py-2.5 rounded-xl bg-red-100 text-red-600 text-[14px] font-semibold"
            >
              Изчисти данните и презареди
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function WrappedFuelCalculator() {
  return (
    <AppErrorBoundary>
      <FuelCalculator />
    </AppErrorBoundary>
  );
}
