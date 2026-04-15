import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench, ShieldCheck, Zap, FileText, Plus, Trash2, Camera, AlertTriangle,
  Check, ChevronDown, ChevronUp, Calendar, DollarSign, Clock, X, Image,
  Shield, FileCheck, Car, BookOpen, Pencil, ShieldAlert, CheckCircle2,
} from "lucide-react";
import { Card, Field, Divider, ActionButton, EmptyState } from "../components/ui";
import { parseNum, daysUntil, todayISO, compressImage } from "../utils/helpers";
import type { MaintenanceItem, CarDocument, ExpiryDates, CarProfile, CarDamage, Expense } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAINT_CATEGORIES = [
  { value: "oil", label: "Смяна на масло", color: "text-orange-500", bg: "bg-orange-500", icon: <Zap size={14} /> },
  { value: "insurance", label: "Застраховка", color: "text-blue-500", bg: "bg-blue-500", icon: <ShieldCheck size={14} /> },
  { value: "tires", label: "Гуми", color: "text-gray-500", bg: "bg-gray-500", icon: <Wrench size={14} /> },
  { value: "inspection", label: "Технически преглед", color: "text-green-500", bg: "bg-green-500", icon: <Check size={14} /> },
  { value: "other", label: "Друго", color: "text-purple-500", bg: "bg-purple-500", icon: <Wrench size={14} /> },
] as const;

type MaintCat = typeof MAINT_CATEGORIES[number]["value"];

function catInfo(cat: string) {
  return MAINT_CATEGORIES.find((c) => c.value === cat) ?? MAINT_CATEGORIES[4];
}

function urgencyBadge(nextDate: string) {
  if (!nextDate) return null;
  const days = daysUntil(nextDate);
  if (days < 0) return { label: `Изтекло преди ${Math.abs(days)}д`, color: "text-red-500 bg-red-500/12" };
  if (days <= 30) return { label: `Остават ${days}д`, color: "text-orange-500 bg-orange-500/12" };
  if (days <= 90) return { label: `Остават ${days}д`, color: "text-yellow-600 bg-yellow-500/12" };
  return { label: `Остават ${days}д`, color: "text-green-600 bg-green-500/12" };
}

// ─── Add Maintenance Form ─────────────────────────────────────────────────────

function AddMaintenanceForm({ onAdd, onClose, currency }: { onAdd: (item: MaintenanceItem) => void; onClose: () => void; currency: string }) {
  const [cat, setCat] = useState<MaintCat>("oil");
  const [title, setTitle] = useState("");
  const [doneDate, setDoneDate] = useState(todayISO());
  const [nextDate, setNextDate] = useState("");
  const [costText, setCostText] = useState("");
  const [mileageText, setMileageText] = useState("");
  const [note, setNote] = useState("");

  const cost = parseNum(costText);
  const catLabel = catInfo(cat).label;
  const canAdd = doneDate.length > 0;

  function submit() {
    if (!canAdd) return;
    onAdd({
      id: crypto.randomUUID(),
      category: cat,
      title: title.trim() || catLabel,
      doneDate,
      nextDate,
      cost: cost ?? 0,
      mileage: parseNum(mileageText) ?? 0,
      note: note.trim(),
    });
    onClose();
  }

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <div className="border-t border-gray-100 dark:border-white/[0.07] px-4 pt-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-gray-900 dark:text-white">Нов запис</p>
          <button onClick={onClose} className="text-gray-400"><X size={16} /></button>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5">
          {MAINT_CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCat(c.value)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${cat === c.value ? `${c.bg} text-white` : "bg-gray-100 dark:bg-[#2c2c30] text-gray-500 dark:text-gray-400"}`}>
              {c.icon}{c.label}
            </button>
          ))}
        </div>

        <Field label="Описание (по желание)" placeholder={catInfo(cat).label} type="text"
          icon={<FileText size={17} />} iconColorClass="text-gray-500"
          value={title} onChange={setTitle} />
        <Divider />
        <Field label="Дата на обслужване" placeholder="" type="date"
          icon={<Calendar size={17} />} iconColorClass="text-blue-500"
          value={doneDate} onChange={setDoneDate} />
        <Divider />
        <Field label="Следващо обслужване (дата)" placeholder="" type="date"
          icon={<Clock size={17} />} iconColorClass="text-orange-500"
          value={nextDate} onChange={setNextDate} />
        <Divider />
        <Field label="Цена" placeholder="напр. 85" unit={currency}
          icon={<DollarSign size={17} />} iconColorClass="text-green-500"
          value={costText} onChange={setCostText} />
        <Divider />
        <Field label="Километраж" placeholder="напр. 45 200" unit="км"
          icon={<Wrench size={17} />} iconColorClass="text-gray-500"
          value={mileageText} onChange={setMileageText} />
        <Divider />
        <Field label="Бележка" placeholder="Детайли…" type="text"
          icon={<FileText size={17} />} iconColorClass="text-purple-500"
          value={note} onChange={setNote} />

        <ActionButton onClick={submit} disabled={!canAdd} color="green">
          <Check size={16} />Запази запис
        </ActionButton>
      </div>
    </motion.div>
  );
}

// ─── Maintenance Item Row ─────────────────────────────────────────────────────

function MaintenanceRow({ item, onDelete, currency }: { item: MaintenanceItem; onDelete: () => void; currency: string }) {
  const info = catInfo(item.category);
  const badge = urgencyBadge(item.nextDate);

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 50 }} layout>
      <div className="flex items-start gap-3 py-3 px-4">
        <div className={`w-8 h-8 rounded-xl ${info.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <span className="text-white">{info.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[14px] font-semibold text-gray-900 dark:text-white leading-tight">{item.title}</p>
            <button onClick={onDelete} className="text-red-400 hover:text-red-500 flex-shrink-0 mt-0.5"><Trash2 size={13} /></button>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[11px] text-gray-400 dark:text-gray-500">{item.doneDate}</span>
            {item.cost > 0 && <span className="text-[11px] font-semibold text-green-500">{item.cost.toFixed(2)} {currency}</span>}
            {item.mileage > 0 && <span className="text-[11px] text-gray-400">{item.mileage.toLocaleString()} км</span>}
          </div>
          {badge && (
            <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.color}`}>
              <Clock size={9} />{badge.label}
            </span>
          )}
          {item.note && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{item.note}</p>}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Digital Glovebox ─────────────────────────────────────────────────────────

const DOC_CATS = [
  { value: "insurance", label: "Застраховка" },
  { value: "registration", label: "Регистрация" },
  { value: "inspection", label: "ТП" },
  { value: "other", label: "Друго" },
] as const;

function Glovebox({ docs, addDocument, deleteDocument }: {
  docs: CarDocument[];
  addDocument: (d: CarDocument) => void;
  deleteDocument: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [docName, setDocName] = useState("");
  const [docCat, setDocCat] = useState<CarDocument["category"]>("insurance");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<CarDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("Файлът е твърде голям (макс. 10 MB)"); return; }
    setError(null); setLoading(true);
    try {
      const dataUrl = await compressImage(file);
      addDocument({
        id: crypto.randomUUID(),
        name: docName.trim() || file.name,
        category: docCat,
        dataUrl,
        addedAt: new Date().toISOString(),
      });
      setDocName("");
    } catch { setError("Грешка при качване на файла"); }
    finally { setLoading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  const catLabel = (c: string) => DOC_CATS.find((d) => d.value === c)?.label ?? c;

  return (
    <div>
      {/* Upload section */}
      <div className="px-4 pt-3 pb-3 space-y-3 border-t border-gray-100 dark:border-white/[0.07]">
        <div className="flex gap-1.5 flex-wrap">
          {DOC_CATS.map((d) => (
            <button key={d.value} onClick={() => setDocCat(d.value)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${docCat === d.value ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-[#2c2c30] text-gray-400"}`}>
              {d.label}
            </button>
          ))}
        </div>
        <Field label="Наименование (по желание)" placeholder="напр. Гражданска застраховка" type="text"
          icon={<FileText size={17} />} iconColorClass="text-blue-500"
          value={docName} onChange={setDocName} />
        {error && <div className="flex items-center gap-1.5 text-red-500 text-[12px]"><AlertTriangle size={12} />{error}</div>}
        <button onClick={() => fileRef.current?.click()} disabled={loading}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold border-2 border-dashed transition-all ${loading ? "border-gray-200 dark:border-white/10 text-gray-300" : "border-blue-500/40 text-blue-500 hover:bg-blue-500/5"}`}>
          {loading ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><Camera size={16} /></motion.div>Обработва се…</> : <><Camera size={16} />Добави снимка / документ</>}
        </button>
        <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
      </div>

      {/* Documents grid */}
      {docs.length > 0 && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-2">
            {docs.map((doc) => (
              <motion.div key={doc.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} layout
                className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-[#28282c] cursor-pointer aspect-[4/3]"
                onClick={() => setPreview(doc)}>
                <img src={doc.dataUrl} alt={doc.name} className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-[10px] font-semibold text-white truncate">{doc.name}</p>
                  <p className="text-[9px] text-white/70">{catLabel(doc.category)}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteDocument(doc.id); }}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center text-white">
                  <X size={10} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Full-screen preview */}
      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setPreview(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <img src={preview.dataUrl} alt={preview.name} className="w-full rounded-2xl" />
              <div className="mt-3 text-center">
                <p className="text-white font-semibold">{preview.name}</p>
                <p className="text-white/60 text-[12px]">{catLabel(preview.category)}</p>
              </div>
              <button onClick={() => setPreview(null)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white">
                <X size={16} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Next Upcoming Banner ─────────────────────────────────────────────────────

function NextUpcomingBanner({ items }: { items: MaintenanceItem[] }) {
  const upcoming = items
    .filter(i => i.nextDate && daysUntil(i.nextDate) >= 0)
    .sort((a, b) => daysUntil(a.nextDate) - daysUntil(b.nextDate))[0];
  if (!upcoming) return null;
  const days = daysUntil(upcoming.nextDate);
  const isUrgent = days <= 30;
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${isUrgent ? "text-orange-500 bg-orange-500/10 border-orange-500/20" : "text-blue-500 bg-blue-500/10 border-blue-500/20"}`}>
      <Clock size={16} className="flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold truncate">{upcoming.title}</p>
        <p className="text-[11px] opacity-70">Следващо: {upcoming.nextDate}</p>
      </div>
      <span className="text-[13px] font-bold flex-shrink-0">{days} дни</span>
    </motion.div>
  );
}

// ─── Expiry Dates Card ────────────────────────────────────────────────────────

const EXPIRY_ITEMS: { key: keyof ExpiryDates; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "vignette",      label: "Винетка",                icon: <Car size={14} />,       color: "text-blue-500 bg-blue-500/10" },
  { key: "civil",         label: "Гражданска отговорност", icon: <Shield size={14} />,    color: "text-green-500 bg-green-500/10" },
  { key: "kasko",         label: "Каско",                  icon: <Shield size={14} />,    color: "text-purple-500 bg-purple-500/10" },
  { key: "inspection",    label: "Технически преглед",     icon: <FileCheck size={14} />, color: "text-orange-500 bg-orange-500/10" },
  { key: "driverLicense", label: "Шофьорска книжка",       icon: <BookOpen size={14} />,  color: "text-indigo-500 bg-indigo-500/10" },
];

const PAID_KEYS: Partial<Record<keyof ExpiryDates, keyof ExpiryDates>> = {
  vignette: "vignettePaid",
  civil:    "civilPaid",
  kasko:    "kaskoPaid",
  inspection: "inspectionPaid",
};

const AMOUNT_KEYS: Partial<Record<keyof ExpiryDates, keyof ExpiryDates>> = {
  vignette:   "vignetteAmount",
  civil:      "civilAmount",
  kasko:      "kaskoAmount",
  inspection: "inspectionAmount",
};

// Map expiry key → expense category + note
const EXPIRY_EXPENSE_MAP: Partial<Record<keyof ExpiryDates, { category: Expense["category"]; note: string }>> = {
  vignette:   { category: "vignette",  note: "Винетка" },
  civil:      { category: "insurance", note: "Гражданска застраховка" },
  kasko:      { category: "insurance", note: "Каско" },
  inspection: { category: "inspection", note: "Технически преглед" },
};

function ExpiryCard({ expiries, onChange, onAddExpense, onUpdateExpense, expenses, currency }: {
  expiries: ExpiryDates;
  onChange: (e: ExpiryDates) => void;
  onAddExpense?: (e: Expense) => void;
  onUpdateExpense?: (e: Expense) => void;
  expenses?: Expense[];
  currency?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(expiries);
  // key of the item currently showing the pay/edit panel
  const [pendingPayKey, setPendingPayKey] = useState<keyof ExpiryDates | null>(null);
  const [payAmountText, setPayAmountText] = useState("");

  function save() { onChange(draft); setEditing(false); }

  function urgencyStyle(dateStr: string) {
    if (!dateStr) return { badge: null, rowClass: "" };
    const ms = new Date(dateStr).getTime();
    if (isNaN(ms)) return { badge: null, rowClass: "" };
    const days = Math.floor((ms - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0)   return { badge: { label: `Изтекло преди ${Math.abs(days)}д`, cls: "text-red-500 bg-red-500/12" }, rowClass: "bg-red-500/4" };
    if (days <= 30)  return { badge: { label: `${days} дни`, cls: "text-orange-500 bg-orange-500/12" }, rowClass: "bg-orange-500/4" };
    if (days <= 90)  return { badge: { label: `${days} дни`, cls: "text-yellow-600 bg-yellow-500/12" }, rowClass: "" };
    return { badge: { label: `${days} дни`, cls: "text-green-600 bg-green-500/12" }, rowClass: "" };
  }

  function handlePaidClick(key: keyof ExpiryDates, paidKey: keyof ExpiryDates) {
    // Always open the panel — pre-fill amount if already paid
    const amountKey = AMOUNT_KEYS[key];
    const existing = amountKey ? (expiries[amountKey] as number | undefined) : undefined;
    setPendingPayKey(key);
    setPayAmountText(existing ? String(existing) : "");
  }

  function confirmPay(key: keyof ExpiryDates, paidKey: keyof ExpiryDates) {
    const amount = parseFloat(payAmountText.replace(",", "."));
    const amountKey = AMOUNT_KEYS[key];
    const expMap = EXPIRY_EXPENSE_MAP[key];
    const alreadyPaid = !!expiries[paidKey as keyof ExpiryDates];

    if (amount > 0 && expMap) {
      if (alreadyPaid && onUpdateExpense && expenses) {
        // Already paid — find existing expense and update its amount
        const existing = expenses.find(e => e.category === expMap.category && e.note === expMap.note);
        if (existing) {
          onUpdateExpense({ ...existing, amount });
        } else if (onAddExpense) {
          // Not found (edge case) — create new
          onAddExpense({ id: crypto.randomUUID(), category: expMap.category, amount, date: new Date().toISOString().slice(0, 10), note: expMap.note });
        }
      } else if (!alreadyPaid && onAddExpense) {
        // First time paying — create new expense
        onAddExpense({ id: crypto.randomUUID(), category: expMap.category, amount, date: new Date().toISOString().slice(0, 10), note: expMap.note });
      }
    }

    onChange({
      ...expiries,
      [paidKey]: true,
      ...(amountKey ? { [amountKey]: amount > 0 ? amount : undefined } : {}),
    });
    setPendingPayKey(null);
    setPayAmountText("");
  }

  function unmarkPaid(paidKey: keyof ExpiryDates, key: keyof ExpiryDates) {
    const amountKey = AMOUNT_KEYS[key];
    onChange({
      ...expiries,
      [paidKey]: false,
      ...(amountKey ? { [amountKey]: undefined } : {}),
    });
    setPendingPayKey(null);
    setPayAmountText("");
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/[0.07]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center">
            <Shield size={15} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Важни дати</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">Изтичане на документи</p>
          </div>
        </div>
        <button onClick={() => { setDraft(expiries); setEditing(v => !v); setPendingPayKey(null); }}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all ${editing ? "bg-gray-100 dark:bg-[#2c2c30] text-gray-500" : "bg-red-500 text-white"}`}>
          <Pencil size={12} />{editing ? "Затвори" : "Редактирай"}
        </button>
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="px-4 pt-3 pb-4 space-y-3 border-b border-gray-100 dark:border-white/[0.07]">
              {EXPIRY_ITEMS.map(item => (
                <div key={item.key} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}>{item.icon}</div>
                  <div className="flex-1">
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-0.5">{item.label}</p>
                    <input type="date" value={draft[item.key]}
                      onChange={e => setDraft(d => ({ ...d, [item.key]: e.target.value }))}
                      className="w-full bg-transparent text-[14px] font-medium text-gray-900 dark:text-white outline-none" />
                  </div>
                </div>
              ))}
              <ActionButton onClick={save} color="green"><Check size={16} />Запази датите</ActionButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="divide-y divide-gray-100 dark:divide-white/6">
        {EXPIRY_ITEMS.map(item => {
          const { badge, rowClass } = urgencyStyle(expiries[item.key]);
          const paidKey = PAID_KEYS[item.key];
          const isPaid = paidKey ? !!expiries[paidKey as keyof ExpiryDates] : false;
          const isPending = pendingPayKey === item.key;
          return (
            <div key={item.key} className={`px-4 py-3 ${rowClass}`}>
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}>{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 dark:text-white">{item.label}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {(() => {
                      const v = expiries[item.key] as string | undefined;
                      if (!v) return "Не е въведена дата";
                      const d = new Date(v);
                      return isNaN(d.getTime()) ? "Невалидна дата" : d.toLocaleDateString("bg-BG", { day: "numeric", month: "long", year: "numeric" });
                    })()}
                  </p>
                </div>
                {badge && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badge.cls}`}>{badge.label}</span>
                )}
                {paidKey && (
                  <button
                    onClick={() => handlePaidClick(item.key, paidKey)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 transition-all flex items-center gap-1 ${
                      isPaid
                        ? "bg-green-500/15 text-green-600 dark:text-green-400"
                        : "bg-gray-100 dark:bg-white/8 text-gray-400 dark:text-gray-500"
                    }`}>
                    {isPaid ? (
                      <>
                        <CheckCircle2 size={10} />
                        Платена
                        {(() => { const ak = AMOUNT_KEYS[item.key]; const amt = ak ? (expiries[ak] as number | undefined) : undefined; return amt ? ` · ${amt} ${currency ?? "€"}` : ""; })()}
                      </>
                    ) : "Неплатена"}
                  </button>
                )}
              </div>
              {/* Inline pay / edit panel */}
              <AnimatePresence>
                {isPending && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-3 ml-10 space-y-2">
                      <div>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">Сума <span className="text-gray-300 dark:text-gray-600">(по избор)</span></p>
                        <input
                          type="text" inputMode="decimal"
                          value={payAmountText}
                          onChange={e => setPayAmountText(e.target.value.replace(",", "."))}
                          placeholder={`напр. 97.00 ${currency ?? "€"}`}
                          autoFocus
                          className="w-full bg-gray-50 dark:bg-[#252528] border border-gray-200 dark:border-white/20 rounded-xl px-3 py-2 text-[14px] font-semibold text-gray-900 dark:text-white outline-none"
                        />
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => confirmPay(item.key, paidKey!)}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-green-500 text-white text-[12px] font-semibold">
                          <Check size={13} />{isPaid ? "Обнови" : "Маркирай платена"}
                        </button>
                        {isPaid && (
                          <button
                            onClick={() => unmarkPaid(paidKey!, item.key)}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-500/10 text-red-500 text-[12px] font-semibold">
                            <X size={13} />Неплатена
                          </button>
                        )}
                        <button onClick={() => setPendingPayKey(null)}
                          className="ml-auto px-2 py-2 rounded-xl bg-gray-100 dark:bg-[#2c2c30] text-gray-500 text-[12px]">
                          <X size={13} />
                        </button>
                      </div>
                      {onAddExpense && !isPaid && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">Ако въведеш сума, тя ще се добави в Разходи</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Oil Change Reminder ──────────────────────────────────────────────────────

function OilReminderCard({ car, onUpdate }: { car: CarProfile; onUpdate: (car: CarProfile) => void }) {
  const [editing, setEditing] = useState(false);
  const [currentKmText, setCurrentKmText] = useState(String(car.currentKm ?? ""));
  const [lastOilKmText, setLastOilKmText] = useState(String(car.lastOilChangeKm ?? ""));
  const [intervalText, setIntervalText] = useState(String(car.oilChangeKm ?? 10000));

  const currentKm = parseNum(currentKmText);
  const lastOilKm = parseNum(lastOilKmText);
  const interval = parseNum(intervalText) ?? 10000;

  const kmSince = currentKm !== null && lastOilKm !== null ? currentKm - lastOilKm : null;
  const kmUntil = kmSince !== null ? interval - kmSince : null;
  const progress = kmSince !== null ? Math.min(kmSince / interval, 1) : 0;

  const progressColor = progress >= 1 ? "bg-red-500" : progress >= 0.8 ? "bg-orange-500" : progress >= 0.5 ? "bg-yellow-500" : "bg-green-500";
  const statusColor = progress >= 1 ? "text-red-500" : progress >= 0.8 ? "text-orange-500" : progress >= 0.5 ? "text-yellow-600" : "text-green-600";

  function save() {
    onUpdate({
      ...car,
      currentKm: currentKm ?? car.currentKm,
      lastOilChangeKm: lastOilKm ?? car.lastOilChangeKm,
      oilChangeKm: parseNum(intervalText) ?? car.oilChangeKm,
    });
    setEditing(false);
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/[0.07]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center">
            <Zap size={15} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Смяна на масло</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {car.make || car.model ? `${car.make} ${car.model}`.trim() : "Активна кола"}
            </p>
          </div>
        </div>
        <button onClick={() => { setEditing(v => !v); setCurrentKmText(String(car.currentKm ?? "")); setLastOilKmText(String(car.lastOilChangeKm ?? "")); setIntervalText(String(car.oilChangeKm ?? 10000)); }}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all ${editing ? "bg-gray-100 dark:bg-[#2c2c30] text-gray-500" : "bg-orange-500 text-white"}`}>
          <Pencil size={12} />{editing ? "Затвори" : "Обнови"}
        </button>
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="px-4 pt-3 pb-4 space-y-3 border-b border-gray-100 dark:border-white/[0.07]">
              <Field label="Текущ километраж" placeholder="напр. 85 400" unit="км"
                icon={<Wrench size={17} />} iconColorClass="text-orange-500"
                value={currentKmText} onChange={setCurrentKmText} />
              <Divider />
              <Field label="Км при последна смяна" placeholder="напр. 75 000" unit="км"
                icon={<Clock size={17} />} iconColorClass="text-blue-500"
                value={lastOilKmText} onChange={setLastOilKmText} />
              <Divider />
              <Field label="Интервал на смяна" placeholder="напр. 10 000" unit="км"
                icon={<Zap size={17} />} iconColorClass="text-green-500"
                value={intervalText} onChange={setIntervalText} />
              <ActionButton onClick={save} color="orange">
                <Check size={16} />Запази
              </ActionButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 py-4">
        {kmSince !== null && kmUntil !== null ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-gray-400">Изминати от последна смяна</span>
              <span className={`text-[13px] font-bold tabular-nums ${statusColor}`}>{kmSince.toLocaleString()} км</span>
            </div>
            <div className="w-full h-3 bg-gray-100 dark:bg-[#2c2c30] rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={`h-full rounded-full ${progressColor}`}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">0 км</span>
              {kmUntil > 0 ? (
                <span className={`text-[12px] font-semibold ${statusColor}`}>
                  Остават {kmUntil.toLocaleString()} км
                </span>
              ) : (
                <span className="text-[12px] font-bold text-red-500">Нужна е смяна!</span>
              )}
              <span className="text-[11px] text-gray-400">{interval.toLocaleString()} км</span>
            </div>
          </>
        ) : (
          <div className="text-center py-2">
            <p className="text-[13px] text-gray-400">Натисни Обнови за да въведеш данните</p>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Damage Tracker ───────────────────────────────────────────────────────────

const DAMAGE_LOCATIONS: { value: CarDamage["location"]; label: string; emoji: string }[] = [
  { value: "front", label: "Предна", emoji: "⬆️" },
  { value: "rear",  label: "Задна",  emoji: "⬇️" },
  { value: "left",  label: "Лява",   emoji: "⬅️" },
  { value: "right", label: "Дясна",  emoji: "➡️" },
  { value: "roof",  label: "Покрив", emoji: "🔝" },
  { value: "other", label: "Друго",  emoji: "•"  },
];

function locationLabel(loc: CarDamage["location"]) {
  return DAMAGE_LOCATIONS.find(l => l.value === loc)?.label ?? loc;
}

function AddDamageForm({ onAdd, onClose, currency }: { onAdd: (d: CarDamage) => void; onClose: () => void; currency: string }) {
  const [location, setLocation] = useState<CarDamage["location"]>("front");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [repaired, setRepaired] = useState(false);
  const [repairCost, setRepairCost] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const photoRef = useRef<HTMLInputElement>(null);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setPhoto(compressed);
  }

  function handleAdd() {
    if (!description.trim()) return;
    onAdd({
      id: Date.now().toString(),
      location,
      description: description.trim(),
      date,
      repaired,
      repairCost: repairCost ? parseNum(repairCost) : undefined,
      photo,
    });
    onClose();
  }

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className="mx-4 mb-4">
      <Card className="p-4 space-y-4">
        {/* Location picker */}
        <div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2">Местоположение</p>
          <div className="grid grid-cols-3 gap-2">
            {DAMAGE_LOCATIONS.map(loc => (
              <button key={loc.value} onClick={() => setLocation(loc.value)}
                className={`py-2 rounded-xl text-[12px] font-semibold transition-all border ${
                  location === loc.value
                    ? "bg-red-500 text-white border-red-500"
                    : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#272729]"
                }`}>
                {loc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">Описание</p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="напр. Вдлъбнатина от паркиране..."
            rows={2}
            className="w-full bg-gray-50 dark:bg-[#272729] rounded-xl px-3 py-2 text-[14px] text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 outline-none resize-none border border-gray-100 dark:border-white/[0.08] focus:border-red-400"
          />
        </div>

        {/* Date + repair cost */}
        <div className="flex gap-3">
          <div className="flex-1">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">Дата</p>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#272729] rounded-xl px-3 py-2 text-[13px] text-gray-900 dark:text-white outline-none border border-gray-100 dark:border-white/[0.08]" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">Разход ({currency})</p>
            <input type="text" inputMode="decimal" value={repairCost} onChange={e => setRepairCost(e.target.value.replace(",", "."))}
              placeholder="0.00"
              className="w-full bg-gray-50 dark:bg-[#272729] rounded-xl px-3 py-2 text-[13px] text-gray-900 dark:text-white placeholder-gray-300 outline-none border border-gray-100 dark:border-white/[0.08]" />
          </div>
        </div>

        {/* Repaired toggle */}
        <button onClick={() => setRepaired(v => !v)}
          className={`flex items-center gap-2 py-2 px-3 rounded-xl text-[13px] font-semibold transition-all border w-full justify-center ${
            repaired ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400" : "bg-gray-50 dark:bg-[#272729] border-gray-100 dark:border-white/[0.08] text-gray-500"
          }`}>
          {repaired ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {repaired ? "Поправено" : "Не е поправено"}
        </button>

        {/* Photo */}
        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        {photo ? (
          <div className="relative">
            <img src={photo} alt="Щета" className="w-full h-32 object-cover rounded-xl" />
            <button onClick={() => setPhoto(undefined)}
              className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center">
              <X size={12} className="text-white" />
            </button>
          </div>
        ) : (
          <button onClick={() => photoRef.current?.click()}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-gray-50 dark:bg-[#272729] border border-dashed border-gray-200 dark:border-white/10 text-[13px] text-gray-400">
            <Camera size={15} /> Снимка на щетата
          </button>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-[#2c2c30] text-[14px] font-semibold text-gray-500">Отказ</button>
          <button onClick={handleAdd} disabled={!description.trim()}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[14px] font-semibold disabled:opacity-40">
            Добави
          </button>
        </div>
      </Card>
    </motion.div>
  );
}

function DamageRow({ damage, onDelete, onToggleRepaired, currency }: {
  damage: CarDamage;
  onDelete: () => void;
  onToggleRepaired: () => void;
  currency: string;
}) {
  const [showPhoto, setShowPhoto] = useState(false);

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${damage.repaired ? "bg-green-500/10" : "bg-red-500/10"}`}>
          <ShieldAlert size={15} className={damage.repaired ? "text-green-500" : "text-red-500"} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${damage.repaired ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-500"}`}>
              {locationLabel(damage.location)}
            </span>
            {damage.repairCost ? (
              <span className="text-[11px] text-gray-400">{damage.repairCost} {currency}</span>
            ) : null}
          </div>
          <p className="text-[14px] font-medium text-gray-900 dark:text-white mt-0.5">{damage.description}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">{damage.date}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {damage.photo && (
            <button onClick={() => setShowPhoto(v => !v)}
              className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-[#2c2c30] flex items-center justify-center">
              <Image size={13} className="text-gray-400" />
            </button>
          )}
          <button onClick={onToggleRepaired}
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${damage.repaired ? "bg-green-500/10" : "bg-gray-100 dark:bg-[#2c2c30]"}`}>
            <Check size={13} className={damage.repaired ? "text-green-500" : "text-gray-400"} />
          </button>
          <button onClick={onDelete} className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
            <Trash2 size={13} className="text-red-500" />
          </button>
        </div>
      </div>
      {showPhoto && damage.photo && (
        <img src={damage.photo} alt="Щета" className="w-full h-40 object-cover rounded-xl" />
      )}
    </div>
  );
}

function DamageTracker({ damages, addDamage, deleteDamage, toggleRepaired, currency }: {
  damages: CarDamage[];
  addDamage: (d: CarDamage) => void;
  deleteDamage: (id: string) => void;
  toggleRepaired: (id: string) => void;
  currency: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [showList, setShowList] = useState(true);

  const unrepairedCount = damages.filter(d => !d.repaired).length;

  return (
    <Card className="overflow-hidden">
      <button onClick={() => setShowList(v => !v)} className="w-full px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/[0.07]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center">
            <ShieldAlert size={15} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Щети по колата</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {damages.length} записа{unrepairedCount > 0 ? ` · ${unrepairedCount} непоправени` : ""}
            </p>
          </div>
        </div>
        {showList ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>

      <AnimatePresence>
        {showList && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="px-4 pt-3 pb-2">
              <button onClick={() => setShowForm(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all ${showForm ? "bg-gray-100 dark:bg-[#2c2c30] text-gray-500" : "bg-red-500 text-white"}`}>
                <Plus size={14} />{showForm ? "Затвори" : "Добави щета"}
              </button>
            </div>

            <AnimatePresence>
              {showForm && (
                <AddDamageForm onAdd={addDamage} onClose={() => setShowForm(false)} currency={currency} />
              )}
            </AnimatePresence>

            {damages.length === 0 ? (
              <div className="pb-4">
                <EmptyState icon={<ShieldAlert size={36} />} title="Няма записани щети" subtitle="Добави снимки и описание на щети по колата" />
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/6">
                <AnimatePresence>
                  {damages.map(d => (
                    <motion.div key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}>
                      <DamageRow damage={d} onDelete={() => deleteDamage(d.id)} onToggleRepaired={() => toggleRepaired(d.id)} currency={currency} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ─── Maintenance Tab ──────────────────────────────────────────────────────────

interface MaintenanceProps {
  items: MaintenanceItem[];
  addItem: (item: MaintenanceItem) => void;
  deleteItem: (id: string) => void;
  documents: CarDocument[];
  addDocument: (doc: CarDocument) => void;
  deleteDocument: (id: string) => void;
  currency: string;
  expiries: ExpiryDates;
  setExpiries: (e: ExpiryDates) => void;
  activeCar?: CarProfile | null;
  onUpdateActiveCar?: (car: CarProfile) => void;
  damages: CarDamage[];
  addDamage: (d: CarDamage) => void;
  deleteDamage: (id: string) => void;
  toggleDamageRepaired: (id: string) => void;
  addExpense?: (e: Expense) => void;
  updateExpense?: (e: Expense) => void;
  expenses?: Expense[];
}

export default function Maintenance({ items, addItem, deleteItem, documents, addDocument, deleteDocument, currency, expiries, setExpiries, activeCar, onUpdateActiveCar, damages, addDamage, deleteDamage, toggleDamageRepaired, addExpense, updateExpense, expenses }: MaintenanceProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDocs, setShowDocs] = useState(true);

  const overdue = items.filter((i) => i.nextDate && daysUntil(i.nextDate) < 0);
  const soon = items.filter((i) => i.nextDate && daysUntil(i.nextDate) >= 0 && daysUntil(i.nextDate) <= 30);

  return (
    <div className="space-y-4 px-4 pb-8 pt-2">
      <NextUpcomingBanner items={items} />
      <ExpiryCard expiries={expiries} onChange={setExpiries} onAddExpense={addExpense} onUpdateExpense={updateExpense} expenses={expenses} currency={currency} />
      {activeCar && onUpdateActiveCar && (
        <OilReminderCard car={activeCar} onUpdate={onUpdateActiveCar} />
      )}
      {/* Alerts */}
      {overdue.length > 0 && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-[13px] text-red-500 font-medium">{overdue.length} изтекло(и) обслужвания</p>
        </div>
      )}
      {soon.length > 0 && (
        <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-2xl px-4 py-3">
          <Clock size={16} className="text-orange-500 flex-shrink-0" />
          <p className="text-[13px] text-orange-500 font-medium">{soon.length} предстоящо(и) в рамките на 30 дни</p>
        </div>
      )}

      {/* Maintenance Tracker */}
      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/[0.07]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center"><Wrench size={15} className="text-white" /></div>
            <div>
              <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Поддръжка</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">{items.length} записа</p>
            </div>
          </div>
          <button onClick={() => setShowAddForm((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all ${showAddForm ? "bg-gray-100 dark:bg-[#2c2c30] text-gray-500" : "bg-orange-500 text-white"}`}>
            <Plus size={14} />{showAddForm ? "Затвори" : "Добави"}
          </button>
        </div>

        <AnimatePresence>
          {showAddForm && <AddMaintenanceForm onAdd={addItem} onClose={() => setShowAddForm(false)} currency={currency} />}
        </AnimatePresence>

        {items.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={<Wrench size={36} />} title="Няма записи за поддръжка" subtitle="Добави смяна на масло, застраховка и др." />
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/6">
            <AnimatePresence>
              {items.map((item) => (
                <MaintenanceRow key={item.id} item={item} onDelete={() => deleteItem(item.id)} currency={currency} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>

      {/* Damage Tracker */}
      <DamageTracker damages={damages} addDamage={addDamage} deleteDamage={deleteDamage} toggleRepaired={toggleDamageRepaired} currency={currency} />

      {/* Digital Glovebox */}
      <Card className="overflow-hidden">
        <button onClick={() => setShowDocs((v) => !v)} className="w-full px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/[0.07]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center"><Image size={15} className="text-white" /></div>
            <div className="text-left">
              <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Дигитален ПС</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">{documents.length} документа</p>
            </div>
          </div>
          {showDocs ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>

        <AnimatePresence>
          {showDocs && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <Glovebox docs={documents} addDocument={addDocument} deleteDocument={deleteDocument} />
              {documents.length === 0 && (
                <div className="px-4 pb-4">
                  <EmptyState icon={<FileText size={36} />} title="Няма добавени документи" subtitle="Добави снимки на застраховка, регистрация и др." />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
