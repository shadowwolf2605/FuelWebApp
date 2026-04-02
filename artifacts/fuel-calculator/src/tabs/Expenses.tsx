import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Wrench, Droplets, Tag, AlertTriangle, TrendingDown, TrendingUp,
  Calculator, Plus, Trash2, X, Check, Calendar, DollarSign, Car,
} from "lucide-react";
import { Card, Field, Divider, ActionButton, EmptyState } from "../components/ui";
import { parseNum, todayISO } from "../utils/helpers";
import type { Expense, CarProfile, CompletedTrip } from "../types";
import { tripConsumption } from "../types";

// ─── Expense categories ───────────────────────────────────────────────────────

const EXPENSE_CATS = [
  { value: "repair", label: "Ремонт", color: "text-orange-500", bg: "bg-orange-500", icon: <Wrench size={13} /> },
  { value: "wash", label: "Миене", color: "text-blue-500", bg: "bg-blue-500", icon: <Droplets size={13} /> },
  { value: "parking", label: "Паркинг", color: "text-gray-500", bg: "bg-gray-500", icon: <Tag size={13} /> },
  { value: "toll", label: "Магистрала", color: "text-yellow-600", bg: "bg-yellow-500", icon: <Tag size={13} /> },
  { value: "fine", label: "Глоба", color: "text-red-500", bg: "bg-red-500", icon: <AlertTriangle size={13} /> },
  { value: "other", label: "Друго", color: "text-purple-500", bg: "bg-purple-500", icon: <Tag size={13} /> },
] as const;

type ExpenseCat = typeof EXPENSE_CATS[number]["value"];

function catInfo(cat: string) {
  return EXPENSE_CATS.find((c) => c.value === cat) ?? EXPENSE_CATS[5];
}

// ─── Add Expense Form ─────────────────────────────────────────────────────────

function AddExpenseForm({ onAdd, onClose }: { onAdd: (e: Expense) => void; onClose: () => void }) {
  const [cat, setCat] = useState<ExpenseCat>("repair");
  const [amountText, setAmountText] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");

  const amount = parseNum(amountText);
  const canAdd = amount !== null && amount > 0 && date.length > 0;

  function submit() {
    if (!canAdd || !amount) return;
    onAdd({ id: crypto.randomUUID(), category: cat, amount, date, note: note.trim() });
    setAmountText(""); setNote(""); setDate(todayISO()); onClose();
  }

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <div className="border-t border-gray-100 dark:border-white/6 px-4 pt-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-gray-900 dark:text-white">Нов разход</p>
          <button onClick={onClose} className="text-gray-400"><X size={16} /></button>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5">
          {EXPENSE_CATS.map((c) => (
            <button key={c.value} onClick={() => setCat(c.value)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${cat === c.value ? `${c.bg} text-white` : "bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400"}`}>
              {c.icon}{c.label}
            </button>
          ))}
        </div>

        <Field label="Сума" placeholder="напр. 45.00" unit="€"
          icon={<DollarSign size={17} />} iconColorClass="text-green-500"
          value={amountText} onChange={setAmountText} />
        <Divider />
        <Field label="Дата" placeholder="" type="date"
          icon={<Calendar size={17} />} iconColorClass="text-blue-500"
          value={date} onChange={setDate} />
        <Divider />
        <Field label="Бележка (по желание)" placeholder="Детайли…" type="text"
          icon={<Tag size={17} />} iconColorClass="text-purple-500"
          value={note} onChange={setNote} />

        <ActionButton onClick={submit} disabled={!canAdd} color="green">
          <Check size={16} />Запази разход
        </ActionButton>
      </div>
    </motion.div>
  );
}

// ─── Expense Row ──────────────────────────────────────────────────────────────

function ExpenseRow({ expense, onDelete }: { expense: Expense; onDelete: () => void }) {
  const info = catInfo(expense.category);
  return (
    <motion.div layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 50 }}>
      <div className="flex items-center gap-3 py-2.5 px-4">
        <div className={`w-8 h-8 rounded-xl ${info.bg} flex items-center justify-center flex-shrink-0`}>
          <span className="text-white">{info.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-gray-900 dark:text-white">{info.label}</p>
          <p className="text-[11px] text-gray-400">{expense.date}{expense.note && ` · ${expense.note}`}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[14px] font-bold text-orange-500 tabular-nums">{expense.amount.toFixed(2)} €</p>
        </div>
        <button onClick={onDelete} className="text-red-400 hover:text-red-500 flex-shrink-0"><Trash2 size={13} /></button>
      </div>
    </motion.div>
  );
}

// ─── Category Summary ─────────────────────────────────────────────────────────

function CategorySummary({ expenses }: { expenses: Expense[] }) {
  const totals = EXPENSE_CATS.map((c) => ({
    ...c,
    total: expenses.filter((e) => e.category === c.value).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);

  if (totals.length === 0) return null;
  const grandTotal = totals.reduce((s, c) => s + c.total, 0);

  return (
    <div className="space-y-2">
      {totals.map((c) => (
        <div key={c.value} className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
            <span className="text-white text-[10px]">{c.icon}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[12px] text-gray-600 dark:text-gray-400">{c.label}</span>
              <span className="text-[12px] font-semibold text-gray-900 dark:text-white tabular-nums">{c.total.toFixed(2)} €</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-white/8 rounded-full overflow-hidden">
              <div className={`h-full ${c.bg} rounded-full`} style={{ width: `${(c.total / grandTotal) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Sell or Keep Calculator ──────────────────────────────────────────────────

function SellKeepCalc({ expenses, avgConsumption }: { expenses: Expense[]; avgConsumption: number | null }) {
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
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/6">
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
        <Field label="Пазарна стойност" placeholder="напр. 15 000" unit="€"
          icon={<DollarSign size={17} />} iconColorClass="text-green-500"
          value={profile.currentValue} onChange={(v) => set("currentValue", v)} />
        <Divider />
        <Field label="Годишен пробег" placeholder="напр. 20 000" unit="км"
          icon={<TrendingUp size={17} />} iconColorClass="text-blue-500"
          value={profile.annualKm} onChange={(v) => set("annualKm", v)} />
        <Divider />
        <Field label="Застраховка (годишно)" placeholder="напр. 450" unit="€"
          icon={<Tag size={17} />} iconColorClass="text-orange-500"
          value={profile.insuranceCost} onChange={(v) => set("insuranceCost", v)} />
        <Divider />
        <Field label="Бюджет за поддръжка (месечно)" placeholder="напр. 80" unit="€"
          icon={<Wrench size={17} />} iconColorClass="text-red-500"
          value={profile.maintenanceBudget} onChange={(v) => set("maintenanceBudget", v)} />

        <AnimatePresence>
          {totalAnnual > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="bg-gray-50 dark:bg-white/4 rounded-xl p-3 space-y-2 mt-1">
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Годишни разходи</p>
                {annualFuelCost && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-gray-500">Гориво ({avgConsumption?.toFixed(1)} л/100км)</span>
                    <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{annualFuelCost.toFixed(0)} €</span>
                  </div>
                )}
                {insuranceCost && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-gray-500">Застраховка</span>
                    <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{insuranceCost.toFixed(0)} €</span>
                  </div>
                )}
                {maintenanceBudget && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-gray-500">Поддръжка (×12)</span>
                    <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{(maintenanceBudget * 12).toFixed(0)} €</span>
                  </div>
                )}
                <div className="h-px bg-gray-200 dark:bg-white/10" />
                <div className="flex justify-between text-[13px]">
                  <span className="font-semibold text-gray-900 dark:text-white">Общо годишно</span>
                  <span className="font-bold text-indigo-500 tabular-nums">{totalAnnual.toFixed(0)} €</span>
                </div>
                {annualKm && annualKm > 0 && (
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>На километър</span>
                    <span className="tabular-nums">{(totalAnnual / (annualKm as number)).toFixed(2)} €/км</span>
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

// ─── Expenses Tab ─────────────────────────────────────────────────────────────

interface ExpensesProps {
  expenses: Expense[];
  addExpense: (e: Expense) => void;
  deleteExpense: (id: string) => void;
  tripHistory: CompletedTrip[];
}

export default function Expenses({ expenses, addExpense, deleteExpense, tripHistory }: ExpensesProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const avgConsumption = tripHistory.length > 0
    ? tripHistory.reduce((s, t) => s + tripConsumption(t), 0) / tripHistory.length
    : null;

  return (
    <div className="space-y-4 px-4 pb-8 pt-2">
      {/* Expense Log */}
      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center"><Wallet size={15} className="text-white" /></div>
            <div>
              <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Разходи</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Общо: <span className="font-semibold text-orange-500">{totalSpent.toFixed(2)} €</span></p>
            </div>
          </div>
          <button onClick={() => setShowAddForm((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all ${showAddForm ? "bg-gray-100 dark:bg-white/8 text-gray-500" : "bg-orange-500 text-white"}`}>
            <Plus size={14} />{showAddForm ? "Затвори" : "Добави"}
          </button>
        </div>

        <AnimatePresence>
          {showAddForm && <AddExpenseForm onAdd={addExpense} onClose={() => setShowAddForm(false)} />}
        </AnimatePresence>

        {expenses.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={<Wallet size={36} />} title="Няма записани разходи" subtitle="Добави ремонти, миене, паркинг и др." />
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/6">
            <AnimatePresence>
              {expenses.map((e) => (
                <ExpenseRow key={e.id} expense={e} onDelete={() => deleteExpense(e.id)} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>

      {/* Category summary */}
      {expenses.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={15} className="text-gray-900 dark:text-white" />
            <span className="text-[14px] font-semibold text-gray-900 dark:text-white">По категория</span>
          </div>
          <CategorySummary expenses={expenses} />
        </Card>
      )}

      {/* Sell or Keep */}
      <SellKeepCalc expenses={expenses} avgConsumption={avgConsumption} />
    </div>
  );
}
