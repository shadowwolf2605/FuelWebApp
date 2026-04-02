import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench, ShieldCheck, Zap, FileText, Plus, Trash2, Camera, AlertTriangle,
  Check, ChevronDown, ChevronUp, Calendar, DollarSign, Clock, X, Image,
} from "lucide-react";
import { Card, Field, Divider, ActionButton, EmptyState } from "../components/ui";
import { parseNum, daysUntil, todayISO } from "../utils/helpers";
import type { MaintenanceItem, CarDocument } from "../types";

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

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const maxW = 900;
        const ratio = Math.min(maxW / img.width, maxW / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Add Maintenance Form ─────────────────────────────────────────────────────

function AddMaintenanceForm({ onAdd, onClose }: { onAdd: (item: MaintenanceItem) => void; onClose: () => void }) {
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
      <div className="border-t border-gray-100 dark:border-white/6 px-4 pt-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-gray-900 dark:text-white">Нов запис</p>
          <button onClick={onClose} className="text-gray-400"><X size={16} /></button>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5">
          {MAINT_CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCat(c.value)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${cat === c.value ? `${c.bg} text-white` : "bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400"}`}>
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
        <Field label="Цена" placeholder="напр. 85" unit="€"
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

function MaintenanceRow({ item, onDelete }: { item: MaintenanceItem; onDelete: () => void }) {
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
            {item.cost > 0 && <span className="text-[11px] font-semibold text-green-500">{item.cost.toFixed(2)} €</span>}
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
      <div className="px-4 pt-3 pb-3 space-y-3 border-t border-gray-100 dark:border-white/6">
        <div className="flex gap-1.5 flex-wrap">
          {DOC_CATS.map((d) => (
            <button key={d.value} onClick={() => setDocCat(d.value)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${docCat === d.value ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-white/8 text-gray-400"}`}>
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
                className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-white/6 cursor-pointer aspect-[4/3]"
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

// ─── Maintenance Tab ──────────────────────────────────────────────────────────

interface MaintenanceProps {
  items: MaintenanceItem[];
  addItem: (item: MaintenanceItem) => void;
  deleteItem: (id: string) => void;
  documents: CarDocument[];
  addDocument: (doc: CarDocument) => void;
  deleteDocument: (id: string) => void;
}

export default function Maintenance({ items, addItem, deleteItem, documents, addDocument, deleteDocument }: MaintenanceProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDocs, setShowDocs] = useState(true);

  const overdue = items.filter((i) => i.nextDate && daysUntil(i.nextDate) < 0);
  const soon = items.filter((i) => i.nextDate && daysUntil(i.nextDate) >= 0 && daysUntil(i.nextDate) <= 30);

  return (
    <div className="space-y-4 px-4 pb-8 pt-2">
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
        <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center"><Wrench size={15} className="text-white" /></div>
            <div>
              <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Поддръжка</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">{items.length} записа</p>
            </div>
          </div>
          <button onClick={() => setShowAddForm((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all ${showAddForm ? "bg-gray-100 dark:bg-white/8 text-gray-500" : "bg-orange-500 text-white"}`}>
            <Plus size={14} />{showAddForm ? "Затвори" : "Добави"}
          </button>
        </div>

        <AnimatePresence>
          {showAddForm && <AddMaintenanceForm onAdd={addItem} onClose={() => setShowAddForm(false)} />}
        </AnimatePresence>

        {items.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={<Wrench size={36} />} title="Няма записи за поддръжка" subtitle="Добави смяна на масло, застраховка и др." />
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/6">
            <AnimatePresence>
              {items.map((item) => (
                <MaintenanceRow key={item.id} item={item} onDelete={() => deleteItem(item.id)} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>

      {/* Digital Glovebox */}
      <Card className="overflow-hidden">
        <button onClick={() => setShowDocs((v) => !v)} className="w-full px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/6">
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
