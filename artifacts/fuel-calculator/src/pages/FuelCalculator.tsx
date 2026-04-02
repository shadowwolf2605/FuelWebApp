import { Home, Wrench, Map, BarChart2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { ActiveTrip, CompletedTrip, MaintenanceItem, CarDocument, ChecklistItem, Expense, SavedLocation } from "../types";
import Dashboard from "../tabs/Dashboard";
import Maintenance from "../tabs/Maintenance";
import Maps, { DEFAULT_CHECKLIST } from "../tabs/Maps";
import Expenses from "../tabs/Expenses";

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = "dashboard" | "maintenance" | "maps" | "expenses";

const TABS: { id: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  { id: "dashboard", label: "Начало", icon: (a) => <Home size={20} strokeWidth={a ? 2.5 : 1.8} /> },
  { id: "maintenance", label: "Поддръжка", icon: (a) => <Wrench size={20} strokeWidth={a ? 2.5 : 1.8} /> },
  { id: "maps", label: "Карта", icon: (a) => <Map size={20} strokeWidth={a ? 2.5 : 1.8} /> },
  { id: "expenses", label: "Разходи", icon: (a) => <BarChart2 size={20} strokeWidth={a ? 2.5 : 1.8} /> },
];

const TAB_TITLES: Record<Tab, string> = {
  dashboard: "Разход на гориво",
  maintenance: "Поддръжка",
  maps: "Карта & Инструменти",
  expenses: "Разходи & Анализ",
};

// ─── Status Bar ───────────────────────────────────────────────────────────────

function StatusBar() {
  const now = new Date();
  return (
    <div className="flex items-center justify-between px-6 pt-4 pb-1 flex-shrink-0">
      <span className="text-[13px] font-semibold text-gray-900 dark:text-white">
        {now.getHours()}:{String(now.getMinutes()).padStart(2, "0")}
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
  );
}

// ─── Tab Bar Component ────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex-shrink-0 border-t border-gray-100 dark:border-white/8 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-sm">
      <div className="flex items-stretch px-2">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button key={tab.id} onClick={() => onChange(tab.id)}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all relative">
              {isActive && (
                <motion.div layoutId="tab-indicator" className="absolute top-0 inset-x-3 h-0.5 bg-blue-500 rounded-b-full" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
              )}
              <span className={`transition-colors ${isActive ? "text-blue-500" : "text-gray-400 dark:text-gray-500"}`}>
                {tab.icon(isActive)}
              </span>
              <span className={`text-[10px] font-medium transition-colors ${isActive ? "text-blue-500" : "text-gray-400 dark:text-gray-500"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
      {/* Home indicator */}
      <div className="flex justify-center pb-2 pt-1">
        <div className="w-28 h-1 bg-gray-900 dark:bg-white opacity-20 rounded-full" />
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function FuelCalculator() {
  const [dark, setDark] = useLocalStorage("fa_dark", false);
  const [activeTab, setActiveTab] = useLocalStorage<Tab>("fa_tab", "dashboard");

  // Trip state
  const [activeTrip, setActiveTrip] = useLocalStorage<ActiveTrip | null>("fa_active_trip", null);
  const [tripHistory, setTripHistory] = useLocalStorage<CompletedTrip[]>("fa_trip_history", []);

  // Maintenance state
  const [maintItems, setMaintItems] = useLocalStorage<MaintenanceItem[]>("fa_maintenance", []);
  const [documents, setDocuments] = useLocalStorage<CarDocument[]>("fa_documents", []);

  // Maps state
  const [savedLocation, setSavedLocation] = useLocalStorage<SavedLocation | null>("fa_saved_location", null);
  const [checklistItems, setChecklistItems] = useLocalStorage<ChecklistItem[]>("fa_checklist", DEFAULT_CHECKLIST);

  // Expenses state
  const [expenses, setExpenses] = useLocalStorage<Expense[]>("fa_expenses", []);

  function addTrip(t: CompletedTrip) { setTripHistory((h) => [t, ...h]); }
  function deleteTrip(id: string) { setTripHistory((h) => h.filter((t) => t.id !== id)); }
  function addMaintItem(item: MaintenanceItem) { setMaintItems((m) => [item, ...m]); }
  function deleteMaintItem(id: string) { setMaintItems((m) => m.filter((i) => i.id !== id)); }
  function addDocument(doc: CarDocument) { setDocuments((d) => [doc, ...d]); }
  function deleteDocument(id: string) { setDocuments((d) => d.filter((doc) => doc.id !== id)); }
  function addExpense(e: Expense) { setExpenses((ex) => [e, ...ex]); }
  function deleteExpense(id: string) { setExpenses((ex) => ex.filter((e) => e.id !== id)); }

  const tabContent = {
    dashboard: (
      <Dashboard
        dark={dark} setDark={setDark}
        activeTrip={activeTrip} setActiveTrip={setActiveTrip}
        tripHistory={tripHistory} addTrip={addTrip} deleteTrip={deleteTrip}
      />
    ),
    maintenance: (
      <Maintenance
        items={maintItems} addItem={addMaintItem} deleteItem={deleteMaintItem}
        documents={documents} addDocument={addDocument} deleteDocument={deleteDocument}
      />
    ),
    maps: (
      <Maps
        savedLocation={savedLocation} setSavedLocation={setSavedLocation}
        checklistItems={checklistItems} setChecklistItems={setChecklistItems}
      />
    ),
    expenses: (
      <Expenses
        expenses={expenses} addExpense={addExpense} deleteExpense={deleteExpense}
        tripHistory={tripHistory}
      />
    ),
  };

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-gray-200 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
        <div
          className="w-full max-w-sm bg-[#f2f2f7] dark:bg-[#111113] rounded-[2.5rem] overflow-hidden relative flex flex-col"
          style={{
            boxShadow: "0 0 0 1.5px rgba(0,0,0,0.18), 0 20px 60px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.15)",
            minHeight: "844px",
            maxHeight: "844px",
          }}
        >
          {/* Status bar */}
          <StatusBar />

          {/* Nav bar */}
          <div className="px-6 pt-2 pb-3 flex-shrink-0">
            <h1 className="text-[26px] font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
              {TAB_TITLES[activeTab]}
            </h1>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-none">
            {tabContent[activeTab]}
          </div>

          {/* Tab bar */}
          <TabBar active={activeTab} onChange={setActiveTab} />
        </div>
      </div>
    </div>
  );
}
