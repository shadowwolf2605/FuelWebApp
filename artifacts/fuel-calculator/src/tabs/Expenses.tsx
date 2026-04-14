import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Wrench, Droplets, Tag, AlertTriangle, TrendingDown, TrendingUp,
  Calculator, Plus, Trash2, X, Check, Calendar, DollarSign, Car, Clock, Camera,
  Shield, FileCheck,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, Field, Divider, ActionButton, EmptyState } from "../components/ui";
import { parseNum, todayISO, compressImage } from "../utils/helpers";
import type { Expense, CarProfile, CompletedTrip, RecurringExpense } from "../types";
import { tripConsumption } from "../types";

// ─── Expense categories ───────────────────────────────────────────────────────

const EXPENSE_CATS = [
  { value: "repair",     label: "Ремонт",       color: "text-orange-500",  bg: "bg-orange-500",  icon: <Wrench size={13} /> },
  { value: "wash",       label: "Автомивка",     color: "text-cyan-500",    bg: "bg-cyan-500",    icon: <Droplets size={13} /> },
  { value: "parking",    label: "Паркинг",       color: "text-gray-500",    bg: "bg-gray-500",    icon: <Tag size={13} /> },
  { value: "toll",       label: "Магистрала",    color: "text-yellow-600",  bg: "bg-yellow-500",  icon: <Tag size={13} /> },
  { value: "fine",       label: "Глоба",         color: "text-red-500",     bg: "bg-red-500",     icon: <AlertTriangle size={13} /> },
  { value: "vignette",   label: "Винетка",       color: "text-blue-500",    bg: "bg-blue-500",    icon: <Car size={13} /> },
  { value: "insurance",  label: "Застраховка",   color: "text-green-600",   bg: "bg-green-600",   icon: <Shield size={13} /> },
  { value: "inspection", label: "Техн. преглед", color: "text-indigo-500",  bg: "bg-indigo-500",  icon: <FileCheck size={13} /> },
  { value: "other",      label: "Друго",         color: "text-purple-500",  bg: "bg-purple-500",  icon: <Tag size={13} /> },
] as const;

type ExpenseCat = typeof EXPENSE_CATS[number]["value"];

function catInfo(cat: string) {
  return EXPENSE_CATS.find((c) => c.value === cat) ?? EXPENSE_CATS[5];
}

// ─── Add Expense Form ─────────────────────────────────────────────────────────

function AddExpenseForm({ onAdd, onClose, currency }: { onAdd: (e: Expense) => void; onClose: () => void; currency: string }) {
  const [cat, setCat] = useState<ExpenseCat>("repair");
  const [amountText, setAmountText] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [fineDeadline, setFineDeadline] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const photoRef = useRef<HTMLInputElement>(null);

  const amount = parseNum(amountText);
  const canAdd = amount !== null && amount > 0 && date.length > 0;

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

  function submit() {
    if (!canAdd || !amount) return;
    const expense: Expense = { id: crypto.randomUUID(), category: cat, amount, date, note: note.trim(), photo };
    if (cat === "fine") {
      expense.fineDeadline = fineDeadline || undefined;
      expense.finePaid = false;
    }
    onAdd(expense);
    setAmountText(""); setNote(""); setDate(todayISO()); setFineDeadline(""); setPhoto(undefined); onClose();
  }

  // Check if fine issued within 7 days (50% discount still applies)
  const issueDate = date ? new Date(date).getTime() : null;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const showDiscountHint = cat === "fine" && issueDate !== null && (Date.now() - issueDate) < sevenDaysMs;

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <div className="border-t border-gray-100 dark:border-white/[0.07] px-4 pt-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-gray-900 dark:text-white">Нов разход</p>
          <button onClick={onClose} className="text-gray-400"><X size={16} /></button>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5">
          {EXPENSE_CATS.map((c) => (
            <button key={c.value} onClick={() => setCat(c.value)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${cat === c.value ? `${c.bg} text-white` : "bg-gray-100 dark:bg-[#2c2c30] text-gray-500 dark:text-gray-400"}`}>
              {c.icon}{c.label}
            </button>
          ))}
        </div>

        <Field label="Сума" placeholder="напр. 45.00" unit={currency}
          icon={<DollarSign size={17} />} iconColorClass="text-green-500"
          value={amountText} onChange={setAmountText} />
        <Divider />
        <Field label="Дата" placeholder="" type="date"
          icon={<Calendar size={17} />} iconColorClass="text-blue-500"
          value={date} onChange={setDate} />
        <Divider />
        {cat === "fine" && (
          <>
            <Field label="Краен срок за плащане" placeholder="" type="date"
              icon={<Clock size={17} />} iconColorClass="text-red-500"
              value={fineDeadline} onChange={setFineDeadline} />
            <Divider />
          </>
        )}
        {showDiscountHint && (
          <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2.5">
            <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-[12px] text-green-600 font-medium">Плати в 7 дни от издаване → получаваш 50% отстъпка!</p>
          </div>
        )}
        <Field label="Бележка (по желание)" placeholder="Детайли…" type="text"
          icon={<Tag size={17} />} iconColorClass="text-purple-500"
          value={note} onChange={setNote} />

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => photoRef.current?.click()}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all ${photo ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-[#2c2c30] text-gray-500"}`}>
            <Camera size={14} />{photo ? "Снимката е добавена ✓" : "Добави снимка (касов бон)"}
          </button>
          {photo && <button type="button" onClick={() => setPhoto(undefined)} className="text-red-400"><X size={14} /></button>}
        </div>
        <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />

        <ActionButton onClick={submit} disabled={!canAdd} color="green">
          <Check size={16} />Запази разход
        </ActionButton>
      </div>
    </motion.div>
  );
}

// ─── Expense Row ──────────────────────────────────────────────────────────────

function FineStatusBadge({ expense, onTogglePaid }: { expense: Expense; onTogglePaid: () => void }) {
  const today = Date.now();
  const issueMs = expense.date ? new Date(expense.date).getTime() : null;
  const deadlineMs = expense.fineDeadline ? new Date(expense.fineDeadline).getTime() : null;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const showDiscount = issueMs !== null && (today - issueMs) < sevenDaysMs && !expense.finePaid;
  const daysUntilDeadline = deadlineMs !== null ? Math.floor((deadlineMs - today) / (1000 * 60 * 60 * 24)) : null;
  const deadlineOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0;

  return (
    <div className="flex flex-col gap-1 mt-1">
      {expense.fineDeadline && (
        <div className={`flex items-center gap-1 text-[11px] font-medium ${deadlineOverdue ? "text-red-500" : daysUntilDeadline !== null && daysUntilDeadline <= 3 ? "text-orange-500" : "text-gray-400"}`}>
          <Clock size={10} />
          {deadlineOverdue
            ? `Просрочено с ${Math.abs(daysUntilDeadline!)} дни`
            : daysUntilDeadline !== null
              ? `Плати до ${expense.fineDeadline} (${daysUntilDeadline} дни)`
              : `До ${expense.fineDeadline}`}
        </div>
      )}
      {showDiscount && (
        <div className="flex items-center gap-1 text-[11px] font-semibold text-green-600">
          <Check size={10} />
          -50% при плащане в 7 дни
        </div>
      )}
      <button
        onClick={onTogglePaid}
        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full transition-all w-fit mt-0.5 ${expense.finePaid ? "bg-green-500/12 text-green-600" : "bg-red-500/12 text-red-500"}`}
      >
        {expense.finePaid ? <><Check size={10} />Платена</> : <><AlertTriangle size={10} />Неплатена</>}
      </button>
    </div>
  );
}

function ExpenseRow({ expense, onDelete, onUpdate, currency }: { expense: Expense; onDelete: () => void; onUpdate?: (e: Expense) => void; currency: string }) {
  const info = catInfo(expense.category);
  const isFine = expense.category === "fine";
  const [showPhoto, setShowPhoto] = useState(false);
  return (
    <motion.div layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 50 }}>
      <div className="flex items-start gap-3 py-2.5 px-4">
        <div className={`w-8 h-8 rounded-xl ${info.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <span className="text-white">{info.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-gray-900 dark:text-white">{info.label}</p>
          <p className="text-[11px] text-gray-400">{expense.date}{expense.note && ` · ${expense.note}`}</p>
          {isFine && onUpdate && (
            <FineStatusBadge expense={expense} onTogglePaid={() => onUpdate({ ...expense, finePaid: !expense.finePaid })} />
          )}
          {expense.photo && (
            <button onClick={() => setShowPhoto(v => !v)} className="mt-1">
              <img src={expense.photo} className="h-12 rounded-lg object-cover border border-gray-200 dark:border-white/10" />
            </button>
          )}
          {expense.photo && showPhoto && (
            <img src={expense.photo} className="w-full rounded-xl mt-1 border border-gray-200 dark:border-white/10 object-contain" />
          )}
        </div>
        <div className="text-right flex-shrink-0 ml-1">
          <p className="text-[14px] font-bold text-orange-500 tabular-nums">{expense.amount.toFixed(2)} {currency}</p>
        </div>
        <button onClick={onDelete} className="text-red-400 hover:text-red-500 flex-shrink-0 mt-1"><Trash2 size={13} /></button>
      </div>
    </motion.div>
  );
}

// ─── Month Filter Helpers ─────────────────────────────────────────────────────

const BG_MONTH_NAMES: Record<string, string> = {
  "01":"Яну","02":"Фев","03":"Мар","04":"Апр","05":"Май","06":"Юни",
  "07":"Юли","08":"Авг","09":"Сеп","10":"Окт","11":"Ное","12":"Дек",
};
function getAvailableMonths(expenses: Expense[]): string[] {
  return Array.from(new Set(expenses.map(e => e.date.slice(0, 7)))).sort().reverse();
}

// ─── Expenses Analysis ────────────────────────────────────────────────────────

function ExpensesAnalysis({ expenses, currency }: { expenses: Expense[]; currency: string }) {
  if (expenses.length === 0) return null;
  const PIE_COLORS = ["#f97316", "#3b82f6", "#6b7280", "#eab308", "#ef4444", "#a855f7"];
  const data = EXPENSE_CATS.map((c, i) => ({
    name: c.label,
    value: +expenses.filter(e => e.category === c.value).reduce((s, e) => s + e.amount, 0).toFixed(2),
    color: PIE_COLORS[i],
  })).filter(d => d.value > 0);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingDown size={15} className="text-gray-900 dark:text-white" />
        <span className="text-[14px] font-semibold text-gray-900 dark:text-white">По категория</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={3}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip formatter={(v: number) => [`${v.toFixed(2)} ${currency}`]}
            contentStyle={{ borderRadius: 8, border: "none", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
          <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: "#6b7280" }}>{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ─── Sell or Keep Calculator ──────────────────────────────────────────────────

function SellKeepCalc({ expenses, avgConsumption, currency }: { expenses: Expense[]; avgConsumption: number | null; currency: string }) {
  const [profile, setProfile] = useState<CarProfile>({
    make: "", model: "", year: "", currentValue: "",
    annualKm: "", insuranceCost: "", maintenanceBudget: "",
  });

  function set(k: keyof CarProfile, v: string) { setProfile((p) => ({ ...p, [k]: v })); }

  const currentValue = parseNum(profile.currentValue);
  const annualKm = parseNum(profile.annualKm);
  const insuranceCost = parseNum(profile.insuranceCost);
  const maintenanceBudget = parseNum(profile.maintenanceBudget);
  const avgFuelPrice = 1.79; // fallback €/L

  const annualFuelCost = avgConsumption && annualKm
    ? (annualKm * avgConsumption / 100) * avgFuelPrice : null;

  const annualExpenses = expenses.length > 0
    ? expenses.reduce((s, e) => s + e.amount, 0) : null;

  const totalAnnual = (annualFuelCost ?? 0) + (insuranceCost ?? 0) + (maintenanceBudget ?? 0) * 12;

  const canCompute = currentValue && currentValue > 0 && totalAnnual > 0;

  let recommendation: { label: string; color: string; icon: React.ReactNode; detail: string } | null = null;

  if (canCompute && currentValue) {
    const ratio = totalAnnual / currentValue;
    if (ratio > 0.3) {
      recommendation = {
        label: "Помисли за продажба",
        color: "text-red-500 bg-red-500/10 border-red-500/20",
        icon: <TrendingDown size={18} />,
        detail: `Годишните разходи са ${(ratio * 100).toFixed(0)}% от стойността на колата`,
      };
    } else if (ratio > 0.18) {
      recommendation = {
        label: "Неутрално",
        color: "text-orange-500 bg-orange-500/10 border-orange-500/20",
        icon: <TrendingDown size={18} />,
        detail: `Годишните разходи са ${(ratio * 100).toFixed(0)}% от стойността на колата`,
      };
    } else {
      recommendation = {
        label: "Задръж колата",
        color: "text-green-600 bg-green-500/10 border-green-500/20",
        icon: <TrendingUp size={18} />,
        detail: `Годишните разходи са само ${(ratio * 100).toFixed(0)}% от стойността`,
      };
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/[0.07]">
        <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center"><Calculator size={15} className="text-white" /></div>
        <div>
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Продай или задръж?</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Обща цена на собственост</p>
        </div>
      </div>

      <div className="px-4 pt-3 pb-3 space-y-3">
        <div className="flex gap-2">
          <Field label="Марка" placeholder="BMW" type="text" icon={<Car size={17} />} iconColorClass="text-indigo-500" value={profile.make} onChange={(v) => set("make", v)} />
          <Field label="Модел" placeholder="320i" type="text" icon={<Car size={17} />} iconColorClass="text-gray-400" value={profile.model} onChange={(v) => set("model", v)} />
        </div>
        <Divider />
        <Field label="Пазарна стойност" placeholder="напр. 15 000" unit={currency}
          icon={<DollarSign size={17} />} iconColorClass="text-green-500"
          value={profile.currentValue} onChange={(v) => set("currentValue", v)} />
        <Divider />
        <Field label="Годишен пробег" placeholder="напр. 20 000" unit="км"
          icon={<TrendingUp size={17} />} iconColorClass="text-blue-500"
          value={profile.annualKm} onChange={(v) => set("annualKm", v)} />
        <Divider />
        <Field label="Застраховка (годишно)" placeholder="напр. 450" unit={currency}
          icon={<Tag size={17} />} iconColorClass="text-orange-500"
          value={profile.insuranceCost} onChange={(v) => set("insuranceCost", v)} />
        <Divider />
        <Field label="Бюджет за поддръжка (месечно)" placeholder="напр. 80" unit={currency}
          icon={<Wrench size={17} />} iconColorClass="text-red-500"
          value={profile.maintenanceBudget} onChange={(v) => set("maintenanceBudget", v)} />

        <AnimatePresence>
          {totalAnnual > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="bg-gray-50 dark:bg-[#2c2c30] rounded-xl p-3 space-y-2 mt-1">
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Годишни разходи</p>
                {annualFuelCost && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-gray-500">Гориво ({avgConsumption?.toFixed(1)} л/100км)</span>
                    <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{annualFuelCost.toFixed(0)} {currency}</span>
                  </div>
                )}
                {insuranceCost && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-gray-500">Застраховка</span>
                    <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{insuranceCost.toFixed(0)} {currency}</span>
                  </div>
                )}
                {maintenanceBudget && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-gray-500">Поддръжка (×12)</span>
                    <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{(maintenanceBudget * 12).toFixed(0)} {currency}</span>
                  </div>
                )}
                <div className="h-px bg-gray-200 dark:bg-white/10" />
                <div className="flex justify-between text-[13px]">
                  <span className="font-semibold text-gray-900 dark:text-white">Общо годишно</span>
                  <span className="font-bold text-indigo-500 tabular-nums">{totalAnnual.toFixed(0)} {currency}</span>
                </div>
                {annualKm && annualKm > 0 && (
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>На километър</span>
                    <span className="tabular-nums">{(totalAnnual / (annualKm as number)).toFixed(2)} {currency}/км</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {recommendation && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className={`flex items-center gap-3 p-3 rounded-xl border ${recommendation.color}`}>
              {recommendation.icon}
              <div>
                <p className="text-[14px] font-bold">{recommendation.label}</p>
                <p className="text-[11px] opacity-80">{recommendation.detail}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

// ─── Car Wash Card ────────────────────────────────────────────────────────────

function CarWashCard({ expenses, onAdd, onDelete, currency }: { expenses: Expense[]; onAdd: (e: Expense) => void; onDelete?: (id: string) => void; currency: string }) {
  const washes = expenses.filter(e => e.category === "wash").sort((a, b) => b.date.localeCompare(a.date));
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");

  const total = washes.reduce((s, e) => s + e.amount, 0);
  const avg = washes.length > 0 ? total / washes.length : 0;
  const lastWash = washes[0];
  const daysSince = lastWash ? Math.floor((Date.now() - new Date(lastWash.date).getTime()) / 86400000) : null;

  function handleAdd() {
    const amt = parseFloat(amount.replace(",", "."));
    if (!amt || amt <= 0) return;
    onAdd({ id: crypto.randomUUID(), category: "wash", amount: amt, date, note: note.trim() });
    setAmount(""); setNote(""); setShowAdd(false);
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/[0.07]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-500 flex items-center justify-center">
            <Droplets size={15} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Автомивка</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">{washes.length} бр. · {total.toFixed(2)} {currency}</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all ${showAdd ? "bg-gray-100 dark:bg-[#2c2c30] text-gray-500" : "bg-cyan-500 text-white"}`}>
          <Plus size={14} />{showAdd ? "Затвори" : "Добави"}
        </button>
      </div>

      {washes.length > 0 && (
        <div className="px-4 py-3 flex gap-3 border-b border-gray-100 dark:border-white/[0.07]">
          <div className="flex-1 text-center">
            <p className="text-[10px] text-gray-400 mb-0.5">Средно</p>
            <p className="text-[14px] font-bold text-cyan-500">{avg.toFixed(2)}<span className="text-[10px] font-normal"> {currency}</span></p>
          </div>
          <div className="w-px bg-gray-100 dark:bg-[#2c2c30]" />
          <div className="flex-1 text-center">
            <p className="text-[10px] text-gray-400 mb-0.5">Последна</p>
            <p className="text-[14px] font-bold text-gray-900 dark:text-white">{daysSince === 0 ? "днес" : `${daysSince} дни`}</p>
          </div>
          <div className="w-px bg-gray-100 dark:bg-[#2c2c30]" />
          <div className="flex-1 text-center">
            <p className="text-[10px] text-gray-400 mb-0.5">Общо</p>
            <p className="text-[14px] font-bold text-orange-500">{total.toFixed(0)}<span className="text-[10px] font-normal"> {currency}</span></p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 py-3 space-y-2 border-b border-gray-100 dark:border-white/[0.07]">
              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="text-[11px] text-gray-400 mb-1">Сума ({currency})</p>
                  <input type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(",", "."))} placeholder="0.00"
                    className="w-full bg-gray-50 dark:bg-[#252528] rounded-xl px-3 py-2 text-[14px] text-gray-900 dark:text-white outline-none border border-gray-100 dark:border-white/[0.07]" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] text-gray-400 mb-1">Дата</p>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-[#252528] rounded-xl px-3 py-2 text-[13px] text-gray-900 dark:text-white outline-none border border-gray-100 dark:border-white/[0.07]" />
                </div>
              </div>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Бележка (по желание)"
                className="w-full bg-gray-50 dark:bg-[#252528] rounded-xl px-3 py-2 text-[13px] text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 outline-none border border-gray-100 dark:border-white/[0.07]" />
              <button onClick={handleAdd} disabled={!amount.trim()}
                className="w-full py-2.5 rounded-xl bg-cyan-500 text-white text-[14px] font-semibold disabled:opacity-40">
                Добави
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {washes.length === 0 && !showAdd && (
        <div className="p-4">
          <p className="text-[13px] text-gray-400 text-center">Няма записани мойки</p>
        </div>
      )}

      {washes.length > 0 && (
        <div className="divide-y divide-gray-100 dark:divide-white/[0.07]">
          {washes.map(w => (
            <div key={w.id} className="flex items-center gap-3 px-4 py-2.5">
              <Droplets size={13} className="text-cyan-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-gray-900 dark:text-white">{w.amount.toFixed(2)} {currency}</p>
                {w.note && <p className="text-[11px] text-gray-400">{w.note}</p>}
              </div>
              <p className="text-[11px] text-gray-400 mr-1">{w.date}</p>
              {onDelete && (
                <button onClick={() => onDelete(w.id)} className="text-red-400 hover:text-red-500 flex-shrink-0">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Recurring Expenses ───────────────────────────────────────────────────────

function RecurringExpenses({ items, onAdd, onPay, onDelete, currency }: {
  items: RecurringExpense[];
  onAdd: (r: RecurringExpense) => void;
  onPay: (id: string) => void;
  onDelete: (id: string) => void;
  currency: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [amountText, setAmountText] = useState("");
  const [intervalMonths, setIntervalMonths] = useState(12);
  const [nextDueDate, setNextDueDate] = useState("");
  const [cat, setCat] = useState<ExpenseCat>("other");

  function submit() {
    const amount = parseNum(amountText);
    if (!label.trim() || !amount || !nextDueDate) return;
    onAdd({ id: crypto.randomUUID(), label: label.trim(), category: cat, amount, intervalMonths, nextDueDate });
    setLabel(""); setAmountText(""); setNextDueDate(""); setShowForm(false);
  }

  const sorted = [...items].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/[0.07]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500 flex items-center justify-center"><Calendar size={15} className="text-white" /></div>
          <div>
            <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Повтарящи се разходи</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">{items.length} активни</p>
          </div>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[13px] font-semibold ${showForm ? "bg-gray-100 dark:bg-[#2c2c30] text-gray-500" : "bg-purple-500 text-white"}`}>
          <Plus size={14} />{showForm ? "Затвори" : "Добави"}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-b border-gray-100 dark:border-white/[0.07]">
            <div className="px-4 py-3 space-y-3">
              <Field label="Описание" placeholder="напр. Гражданска застраховка" type="text" icon={<Tag size={17} />} iconColorClass="text-purple-500" value={label} onChange={setLabel} />
              <Divider />
              <div className="flex flex-wrap gap-1.5">
                {EXPENSE_CATS.map((c) => (
                  <button key={c.value} onClick={() => setCat(c.value)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${cat === c.value ? `${c.bg} text-white` : "bg-gray-100 dark:bg-[#2c2c30] text-gray-500"}`}>
                    {c.icon}{c.label}
                  </button>
                ))}
              </div>
              <Field label="Сума" placeholder="напр. 150.00" unit={currency} icon={<DollarSign size={17} />} iconColorClass="text-green-500" value={amountText} onChange={setAmountText} />
              <Divider />
              <div className="flex items-center gap-3">
                <div className="w-7 flex-shrink-0 flex items-center justify-center text-blue-500"><Calendar size={17} /></div>
                <div className="flex-1">
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">Повторение</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {[1, 3, 6, 12].map(n => (
                      <button key={n} onClick={() => setIntervalMonths(n)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${intervalMonths === n ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-[#2c2c30] text-gray-500"}`}>
                        {n === 1 ? "Месечно" : n === 3 ? "3 мес." : n === 6 ? "6 мес." : "Годишно"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <Field label="Следващо плащане" placeholder="" type="date" icon={<Calendar size={17} />} iconColorClass="text-red-500" value={nextDueDate} onChange={setNextDueDate} />
              <ActionButton onClick={submit} disabled={!label.trim() || !parseNum(amountText) || !nextDueDate} color="purple">
                <Check size={16} />Запази
              </ActionButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {sorted.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-[13px] text-gray-400 dark:text-gray-500">Няма добавени повтарящи се разходи</p>
          <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-1">Застраховка, данък, гаражна наемна — добави и ще те напомняме</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-white/6">
          {sorted.map(r => {
            const days = Math.floor((new Date(r.nextDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const urgent = days <= 7;
            const overdue = days < 0;
            const info = catInfo(r.category);
            return (
              <motion.div key={r.id} layout className="px-4 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl ${info.bg} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white">{info.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-gray-900 dark:text-white truncate">{r.label}</p>
                  <div className={`flex items-center gap-1 text-[11px] font-medium mt-0.5 ${overdue ? "text-red-500" : urgent ? "text-orange-500" : "text-gray-400"}`}>
                    <Clock size={10} />
                    {overdue ? `Просрочено с ${Math.abs(days)} дни` : days === 0 ? "Днес!" : `След ${days} дни · ${r.nextDueDate}`}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[13px] font-bold text-purple-500 tabular-nums">{r.amount.toFixed(2)} {currency}</p>
                  <p className="text-[10px] text-gray-400">{r.intervalMonths === 1 ? "месечно" : r.intervalMonths === 12 ? "годишно" : `/${r.intervalMonths}мес`}</p>
                </div>
                <div className="flex flex-col gap-1 ml-1">
                  <button onClick={() => onPay(r.id)} className="text-[11px] font-semibold text-green-500 bg-green-500/10 px-2 py-1 rounded-lg whitespace-nowrap">✓ Платено</button>
                  <button onClick={() => onDelete(r.id)} className="text-red-400"><Trash2 size={12} /></button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────

interface ExpensesProps {
  expenses: Expense[];
  addExpense: (e: Expense) => void;
  deleteExpense: (id: string) => void;
  updateExpense?: (e: Expense) => void;
  tripHistory: CompletedTrip[];
  currency: string;
  recurringExpenses: RecurringExpense[];
  addRecurringExpense: (r: RecurringExpense) => void;
  payRecurringExpense: (id: string) => void;
  deleteRecurringExpense: (id: string) => void;
}

export default function Expenses({ expenses, addExpense, deleteExpense, updateExpense, tripHistory, currency, recurringExpenses, addRecurringExpense, payRecurringExpense, deleteRecurringExpense }: ExpensesProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const months = getAvailableMonths(expenses);
  const filteredExpenses = selectedMonth ? expenses.filter(e => e.date.startsWith(selectedMonth)) : expenses;
  const totalSpent = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const validTripHistory = tripHistory.filter(t => t.endKm > t.startKm);
  const avgConsumption = validTripHistory.length > 0
    ? validTripHistory.reduce((s, t) => s + tripConsumption(t), 0) / validTripHistory.length
    : null;

  return (
    <div className="space-y-4 px-4 pb-8 pt-2">
      {/* Expense Log */}
      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/[0.07]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center"><Wallet size={15} className="text-white" /></div>
            <div>
              <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Разходи</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Общо: <span className="font-semibold text-orange-500">{totalSpent.toFixed(2)} {currency}</span></p>
            </div>
          </div>
          <button onClick={() => setShowAddForm((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all ${showAddForm ? "bg-gray-100 dark:bg-[#2c2c30] text-gray-500" : "bg-orange-500 text-white"}`}>
            <Plus size={14} />{showAddForm ? "Затвори" : "Добави"}
          </button>
        </div>

        {months.length > 1 && (
          <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto no-scrollbar">
            <button onClick={() => setSelectedMonth(null)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-[12px] font-semibold transition-all ${!selectedMonth ? "bg-orange-500 text-white" : "bg-gray-100 dark:bg-[#2c2c30] text-gray-500"}`}>
              Всички
            </button>
            {months.map(m => (
              <button key={m} onClick={() => setSelectedMonth(selectedMonth === m ? null : m)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-[12px] font-semibold transition-all ${selectedMonth === m ? "bg-orange-500 text-white" : "bg-gray-100 dark:bg-[#2c2c30] text-gray-500"}`}>
                {BG_MONTH_NAMES[m.slice(5)] ?? m.slice(5)} {m.slice(0, 4)}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence>
          {showAddForm && <AddExpenseForm onAdd={addExpense} onClose={() => setShowAddForm(false)} currency={currency} />}
        </AnimatePresence>

        {filteredExpenses.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={<Wallet size={36} />} title="Няма записани разходи" subtitle="Добави ремонти, миене, паркинг и др." />
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/6">
            <AnimatePresence>
              {filteredExpenses.map((e) => (
                <ExpenseRow key={e.id} expense={e} onDelete={() => deleteExpense(e.id)} onUpdate={updateExpense} currency={currency} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>

      {/* Car wash section */}
      <CarWashCard expenses={expenses} onAdd={addExpense} onDelete={deleteExpense} currency={currency} />

      {/* Recurring expenses */}
      <RecurringExpenses items={recurringExpenses} onAdd={addRecurringExpense} onPay={payRecurringExpense} onDelete={deleteRecurringExpense} currency={currency} />

      {/* Category analysis */}
      <ExpensesAnalysis expenses={filteredExpenses} currency={currency} />

      {/* Sell or Keep */}
      <SellKeepCalc expenses={expenses} avgConsumption={avgConsumption} currency={currency} />
    </div>
  );
}
