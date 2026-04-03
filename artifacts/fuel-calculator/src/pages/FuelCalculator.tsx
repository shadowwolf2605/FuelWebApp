import { Home, Wrench, Map, BarChart2, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { ActiveTrip, CompletedTrip, MaintenanceItem, CarDocument, ChecklistItem, Expense, SavedLocation } from "../types";
import Dashboard from "../tabs/Dashboard";
import Maintenance from "../tabs/Maintenance";
import Maps, { DEFAULT_CHECKLIST } from "../tabs/Maps";
import Expenses from "../tabs/Expenses";
import Reports from "../tabs/Reports";

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = "dashboard" | "maintenance" | "maps" | "expenses" | "reports";

const TABS: { id: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  { id: "dashboard",   label: "Начало",    icon: (a) => <Home     size={20} strokeWidth={a ? 2.5 : 1.8} /> },
  { id: "maintenance", label: "Поддръжка", icon: (a) => <Wrench   size={20} strokeWidth={a ? 2.5 : 1.8} /> },
  { id: "maps",        label: "Карта",     icon: (a) => <Map      size={20} strokeWidth={a ? 2.5 : 1.8} /> },
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

// ─── Tab Bar Component ────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex-shrink-0 border-t border-gray-100 dark:border-white/8 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-sm">
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
                  className="absolute top-0 inset-x-2 h-0.5 bg-blue-500 rounded-b-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className={`transition-colors ${isActive ? "text-blue-500" : "text-gray-400 dark:text-gray-500"}`}>
                {tab.icon(isActive)}
              </span>
              <span className={`text-[9px] font-medium transition-colors leading-none ${isActive ? "text-blue-500" : "text-gray-400 dark:text-gray-500"}`}>
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

  const [activeTrip, setActiveTrip] = useLocalStorage<ActiveTrip | null>("fa_active_trip", null);
  const [tripHistory, setTripHistory] = useLocalStorage<CompletedTrip[]>("fa_trip_history", []);

  const [maintItems, setMaintItems] = useLocalStorage<MaintenanceItem[]>("fa_maintenance", []);
  const [documents, setDocuments] = useLocalStorage<CarDocument[]>("fa_documents", []);

  const [savedLocation, setSavedLocation] = useLocalStorage<SavedLocation | null>("fa_saved_location", null);
  const [checklistItems, setChecklistItems] = useLocalStorage<ChecklistItem[]>("fa_checklist", DEFAULT_CHECKLIST);

  const [expenses, setExpenses] = useLocalStorage<Expense[]>("fa_expenses", []);

  function addTrip(t: CompletedTrip)      { setTripHistory((h) => [t, ...h]); }
  function deleteTrip(id: string)          { setTripHistory((h) => h.filter((t) => t.id !== id)); }
  function addMaintItem(item: MaintenanceItem) { setMaintItems((m) => [item, ...m]); }
  function deleteMaintItem(id: string)     { setMaintItems((m) => m.filter((i) => i.id !== id)); }
  function addDocument(doc: CarDocument)   { setDocuments((d) => [doc, ...d]); }
  function deleteDocument(id: string)      { setDocuments((d) => d.filter((doc) => doc.id !== id)); }
  function addExpense(e: Expense)          { setExpenses((ex) => [e, ...ex]); }
  function deleteExpense(id: string)       { setExpenses((ex) => ex.filter((e) => e.id !== id)); }

  const tabContent: Record<Tab, React.ReactNode> = {
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
    reports: (
      <Reports
        tripHistory={tripHistory}
        expenses={expenses}
        maintenanceItems={maintItems}
      />
    ),
  };

  return (
    <div className={dark ? "dark" : ""} style={{ height: "100dvh" }}>
      <div className="h-full bg-[#f2f2f7] dark:bg-[#111113] flex flex-col transition-colors duration-300">
        {/* Nav bar */}
        <div className="px-5 pt-4 pb-3 flex-shrink-0 border-b border-black/5 dark:border-white/6 bg-[#f2f2f7]/80 dark:bg-[#111113]/80 backdrop-blur-sm">
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
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
  );
}
