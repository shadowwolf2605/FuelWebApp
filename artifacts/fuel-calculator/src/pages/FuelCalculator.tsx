import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fuel,
  BarChart2,
  Clock,
  MapPin,
  Droplets,
  Banknote,
  CreditCard,
  Gauge,
  Calendar,
  Download,
  Inbox,
  Sun,
  Moon,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FuelRecord {
  id: string;
  date: Date;
  kilometers: number;
  liters: number;
  pricePerLiter: number;
}

function consumption(r: FuelRecord) {
  return (r.liters / r.kilometers) * 100;
}

function totalCost(r: FuelRecord) {
  return r.liters * r.pricePerLiter;
}

function formatDate(d: Date) {
  return d.toLocaleString("bg-BG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? null : n;
}

// ─── Card Container ───────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-black/5 dark:border-white/8 ${className}`}
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
    >
      {children}
    </div>
  );
}

// ─── Input Field ──────────────────────────────────────────────────────────────

function FuelInputField({
  label,
  placeholder,
  unit,
  icon,
  iconColorClass,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  unit: string;
  icon: React.ReactNode;
  iconColorClass: string;
  value: string;
  onChange: (v: string) => void;
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

function ResultTile({
  icon,
  iconColorClass,
  title,
  value,
  unit,
}: {
  icon: React.ReactNode;
  iconColorClass: string;
  title: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="flex-1 flex items-center gap-2.5 bg-gray-50 dark:bg-white/5 rounded-xl p-3">
      <div className={`flex-shrink-0 ${iconColorClass}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-none mb-0.5">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-[17px] font-bold text-gray-900 dark:text-white tabular-nums">
            {value}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">{unit}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Consumption Badge ────────────────────────────────────────────────────────

function ConsumptionBadge({ value }: { value: number }) {
  const color =
    value < 6
      ? "text-green-500 bg-green-500/12"
      : value < 9
      ? "text-orange-500 bg-orange-500/12"
      : "text-red-500 bg-red-500/12";

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${color}`}
    >
      <Gauge size={10} />
      {value.toFixed(2)} л/100км
    </span>
  );
}

// ─── Stat Item ────────────────────────────────────────────────────────────────

function StatItem({
  icon,
  colorClass,
  value,
  unit,
}: {
  icon: React.ReactNode;
  colorClass: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={`${colorClass}`}>{icon}</div>
      <span className="text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">
        {value}
      </span>
      <span className="text-[10px] text-gray-400 dark:text-gray-500">{unit}</span>
    </div>
  );
}

// ─── Empty History ────────────────────────────────────────────────────────────

function EmptyHistory() {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/5 dark:border-white/8">
      <div className="text-gray-300 dark:text-gray-600">
        <Inbox size={42} />
      </div>
      <p className="text-[15px] text-gray-400 dark:text-gray-500">Няма запазени записи</p>
      <p className="text-[12px] text-gray-300 dark:text-gray-600 text-center px-6">
        Въведи данни и натисни „Запази"
      </p>
    </div>
  );
}

// ─── History Row ──────────────────────────────────────────────────────────────

function HistoryRow({
  record,
  onDelete,
}: {
  record: FuelRecord;
  onDelete: () => void;
}) {
  const [swiped, setSwiped] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      className="relative overflow-hidden rounded-2xl"
    >
      {swiped && (
        <div className="absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-end pr-5 z-0">
          <button
            onClick={onDelete}
            className="text-white text-[13px] font-semibold"
          >
            Изтрий
          </button>
        </div>
      )}
      <div
        className="relative z-10"
        onClick={() => setSwiped((s) => !s)}
      >
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
              <Calendar size={12} />
              <span className="text-[12px]">{formatDate(record.date)}</span>
            </div>
            <ConsumptionBadge value={consumption(record)} />
          </div>
          <div className="h-px bg-gray-100 dark:bg-white/8 mb-3" />
          <div className="flex justify-between items-center">
            <StatItem
              icon={<MapPin size={12} />}
              colorClass="text-blue-500"
              value={record.kilometers.toFixed(0)}
              unit="км"
            />
            <StatItem
              icon={<Droplets size={12} />}
              colorClass="text-cyan-500"
              value={record.liters.toFixed(1)}
              unit="л"
            />
            <StatItem
              icon={<Banknote size={12} />}
              colorClass="text-green-500"
              value={record.pricePerLiter.toFixed(2)}
              unit="лв/л"
            />
            <StatItem
              icon={<CreditCard size={12} />}
              colorClass="text-orange-500"
              value={totalCost(record).toFixed(2)}
              unit="лв"
            />
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function FuelCalculator() {
  const [dark, setDark] = useState(false);
  const [kmText, setKmText] = useState("");
  const [litersText, setLitersText] = useState("");
  const [priceText, setPriceText] = useState("");
  const [history, setHistory] = useState<FuelRecord[]>([]);

  const km = parseNum(kmText);
  const liters = parseNum(litersText);
  const price = parseNum(priceText);

  const cons =
    km && liters && km > 0 && liters > 0 ? (liters / km) * 100 : null;
  const cost = liters && price && liters > 0 && price > 0 ? liters * price : null;
  const isValid = cons !== null && cost !== null;

  const save = useCallback(() => {
    if (!isValid || !km || !liters || !price) return;
    const record: FuelRecord = {
      id: crypto.randomUUID(),
      date: new Date(),
      kilometers: km,
      liters,
      pricePerLiter: price,
    };
    setHistory((h) => [record, ...h]);
    setKmText("");
    setLitersText("");
    setPriceText("");
  }, [isValid, km, liters, price]);

  const deleteRecord = useCallback((id: string) => {
    setHistory((h) => h.filter((r) => r.id !== id));
  }, []);

  return (
    <div className={dark ? "dark" : ""}>
      {/* iPhone-style outer shell */}
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
              {new Date().getHours()}:
              {String(new Date().getMinutes()).padStart(2, "0")}
            </span>
            <div className="w-24 h-6 bg-black dark:bg-[#1c1c1e] rounded-full mx-auto" />
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5 items-end">
                {[2, 3, 4, 5].map((h) => (
                  <div
                    key={h}
                    className="w-1 bg-gray-900 dark:bg-white rounded-[1px]"
                    style={{ height: h * 2 + "px" }}
                  />
                ))}
              </div>
              <svg
                width="15"
                height="12"
                viewBox="0 0 15 12"
                className="fill-gray-900 dark:fill-white"
              >
                <path d="M7.5 2.1C9.56 2.1 11.4 2.93 12.74 4.28L14.14 2.88C12.43 1.1 10.09 0 7.5 0C4.91 0 2.57 1.1 0.86 2.88L2.26 4.28C3.6 2.93 5.44 2.1 7.5 2.1Z" />
                <path d="M7.5 5.25C8.72 5.25 9.82 5.74 10.62 6.54L12.02 5.14C10.85 3.97 9.26 3.25 7.5 3.25C5.74 3.25 4.15 3.97 2.98 5.14L4.38 6.54C5.18 5.74 6.28 5.25 7.5 5.25Z" />
                <circle cx="7.5" cy="10" r="2" />
              </svg>
              <div className="flex items-center gap-0.5">
                <div
                  className="h-3 rounded-[2px] bg-gray-900 dark:bg-white"
                  style={{ width: "22px" }}
                />
                <div
                  className="h-1.5 rounded-r-[1px] bg-gray-900 dark:bg-white"
                  style={{ width: "2px" }}
                />
              </div>
            </div>
          </div>

          {/* Navigation bar */}
          <div className="px-6 pt-3 pb-2 flex items-end justify-between">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                Разход на гориво
              </h1>
            </div>
            <button
              onClick={() => setDark((d) => !d)}
              className="mb-1 p-1.5 rounded-full transition-colors"
            >
              {dark ? (
                <Moon size={20} className="text-indigo-400" />
              ) : (
                <Sun size={20} className="text-orange-400" />
              )}
            </button>
          </div>

          {/* Scrollable content */}
          <div
            className="overflow-y-auto px-4 pb-8 space-y-4"
            style={{ maxHeight: "calc(844px - 130px)" }}
          >
            {/* Input Card */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Fuel size={16} className="text-gray-900 dark:text-white" />
                <span className="text-[15px] font-semibold text-gray-900 dark:text-white">
                  Въведи данни
                </span>
              </div>

              <div className="space-y-4">
                <FuelInputField
                  label="Изминати километри"
                  placeholder="напр. 450"
                  unit="км"
                  icon={<MapPin size={18} />}
                  iconColorClass="text-blue-500"
                  value={kmText}
                  onChange={setKmText}
                />
                <div className="h-px bg-gray-100 dark:bg-white/8" />
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
                <span className="text-[15px] font-semibold text-gray-900 dark:text-white">
                  Резултат
                </span>
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
                  <span className="text-[15px] font-semibold text-gray-900 dark:text-white">
                    История
                  </span>
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
                      <HistoryRow
                        key={r.id}
                        record={r}
                        onDelete={() => deleteRecord(r.id)}
                      />
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
