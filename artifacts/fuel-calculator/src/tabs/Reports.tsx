import { useState, useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileDown, Mail, Link2, BarChart3, Calendar, Receipt,
  TrendingUp, Download, ChevronRight, CheckCircle2, Copy,
  Fuel, Wrench, Wallet, Car, AlertTriangle, Upload, Database,
  QrCode, Shield, ClipboardPaste, Trash2, RotateCcw, MapPin, FileText, CreditCard,
} from "lucide-react";
import QRCode from "qrcode";
import LZString from "lz-string";
import Wrapped from "./Wrapped";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import { Card, EmptyState } from "../components/ui";
import { formatShortDate } from "../utils/helpers";
import type { CompletedTrip, ActiveTrip, Expense, MaintenanceItem, CarProfile, CarDamage, FuelFillUp, ChecklistItem, SavedLocation, ExpiryDates, RecurringExpense, CarDocument, DeletedItem } from "../types";
import { tripDistance, tripConsumption, tripTotalCost } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BG_MONTHS = ["Яну", "Фев", "Мар", "Апр", "Май", "Юни", "Юли", "Авг", "Сеп", "Окт", "Ное", "Дек"];
const BG_MONTHS_FULL = ["Януари","Февруари","Март","Април","Май","Юни","Юли","Август","Септември","Октомври","Ноември","Декември"];

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function yearOf(iso: string) { return new Date(iso).getFullYear(); }
function monthOf(iso: string) { return new Date(iso).getMonth(); }

const EXPENSE_BG: Record<string, string> = {
  repair: "Ремонт", wash: "Миене", parking: "Паркинг",
  toll: "Магистрала", fine: "Глоба", other: "Друго",
  vignette: "Винетка", insurance: "Застраховка", inspection: "Техн. преглед",
};

const PIE_COLORS = ["#3b82f6", "#f97316", "#22c55e", "#a855f7", "#ef4444", "#eab308", "#06b6d4"];

// ─── PDF generation (print window) ───────────────────────────────────────────

function buildPrintHTML(trips: CompletedTrip[], expenses: Expense[], maint: MaintenanceItem[], period: string, currency = "€") {
  const totalKm = trips.reduce((s, t) => s + tripDistance(t), 0);
  const totalFuel = trips.reduce((s, t) => s + tripTotalCost(t), 0);
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
  const totalMaint = maint.reduce((s, m) => s + m.cost, 0);
  const grand = totalFuel + totalExp + totalMaint;

  return `<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="UTF-8"/>
  <title>Отчет за автомобил — ${period}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:32px;color:#111;font-size:13px;line-height:1.6}
    h1{font-size:22px;font-weight:700;margin-bottom:4px}
    .meta{color:#666;margin-bottom:28px;font-size:12px}
    h2{font-size:15px;font-weight:700;margin:24px 0 8px;padding-bottom:4px;border-bottom:2px solid #3b82f6}
    table{width:100%;border-collapse:collapse;margin-bottom:8px}
    th{background:#f3f4f6;text-align:left;padding:6px 8px;font-weight:600;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em}
    td{padding:6px 8px;border-bottom:1px solid #e5e7eb}
    tr:last-child td{border-bottom:none}
    .sum-row td{font-weight:700;background:#f9fafb}
    .stat-grid{display:flex;gap:16px;margin:12px 0}
    .stat{flex:1;background:#f3f4f6;border-radius:8px;padding:12px}
    .stat-val{font-size:20px;font-weight:700;color:#3b82f6}
    .stat-lbl{font-size:11px;color:#6b7280;margin-top:2px}
    .total-box{background:#1e293b;color:#fff;border-radius:8px;padding:16px;display:flex;justify-content:space-between;align-items:center;margin-top:16px}
    .total-val{font-size:24px;font-weight:700;color:#22c55e}
    @media print{body{padding:16px}h2{page-break-after:avoid}table{page-break-inside:auto}tr{page-break-inside:avoid}}
  </style>
</head>
<body>
  <h1>🚗 Отчет за автомобил</h1>
  <p class="meta">Период: ${period} &nbsp;·&nbsp; Генериран: ${new Date().toLocaleDateString("bg-BG", { day: "numeric", month: "long", year: "numeric" })}</p>

  <div class="stat-grid">
    <div class="stat"><div class="stat-val">${trips.length}</div><div class="stat-lbl">Пътувания</div></div>
    <div class="stat"><div class="stat-val">${totalKm.toFixed(0)} км</div><div class="stat-lbl">Изминати</div></div>
    <div class="stat"><div class="stat-val">${totalFuel.toFixed(2)} ${currency}</div><div class="stat-lbl">Гориво</div></div>
    <div class="stat"><div class="stat-val">${grand.toFixed(2)} ${currency}</div><div class="stat-lbl">Всичко</div></div>
  </div>

  <h2>Пътувания (${trips.length})</h2>
  ${trips.length === 0 ? "<p style='color:#9ca3af'>Няма данни</p>" : `
  <table>
    <tr><th>Дата</th><th>Начало км</th><th>Край км</th><th>Разстояние</th><th>Гориво</th><th>Разход</th><th>Сума</th><th>Бележка</th></tr>
    ${trips.map(t => `<tr>
      <td>${new Date(t.endedAt).toLocaleDateString("bg-BG")}</td>
      <td>${t.startKm.toFixed(0)}</td>
      <td>${t.endKm.toFixed(0)}</td>
      <td>${tripDistance(t).toFixed(1)} км</td>
      <td>${t.liters.toFixed(1)} л</td>
      <td>${tripConsumption(t).toFixed(2)} л/100км</td>
      <td>${tripTotalCost(t).toFixed(2)} ${currency}</td>
      <td>${t.note || "—"}</td>
    </tr>`).join("")}
    <tr class="sum-row"><td colspan="6">Общо гориво</td><td>${totalFuel.toFixed(2)} ${currency}</td><td></td></tr>
  </table>`}

  <h2>Разходи (${expenses.length})</h2>
  ${expenses.length === 0 ? "<p style='color:#9ca3af'>Няма данни</p>" : `
  <table>
    <tr><th>Дата</th><th>Категория</th><th>Сума</th><th>Бележка</th></tr>
    ${expenses.map(e => `<tr>
      <td>${e.date}</td>
      <td>${EXPENSE_BG[e.category] ?? e.category}</td>
      <td>${e.amount.toFixed(2)} ${currency}</td>
      <td>${e.note || "—"}</td>
    </tr>`).join("")}
    <tr class="sum-row"><td colspan="2">Общо разходи</td><td>${totalExp.toFixed(2)} ${currency}</td><td></td></tr>
  </table>`}

  <h2>Поддръжка (${maint.length})</h2>
  ${maint.length === 0 ? "<p style='color:#9ca3af'>Няма данни</p>" : `
  <table>
    <tr><th>Дата</th><th>Описание</th><th>Км</th><th>Сума</th><th>Бележка</th></tr>
    ${maint.map(m => `<tr>
      <td>${m.doneDate}</td>
      <td>${m.title}</td>
      <td>${m.mileage > 0 ? m.mileage.toLocaleString() : "—"}</td>
      <td>${m.cost > 0 ? m.cost.toFixed(2) + " " + currency : "—"}</td>
      <td>${m.note || "—"}</td>
    </tr>`).join("")}
    <tr class="sum-row"><td colspan="3">Общо поддръжка</td><td>${totalMaint.toFixed(2)} ${currency}</td><td></td></tr>
  </table>`}

  <div class="total-box">
    <span style="font-size:15px;font-weight:600">Обща сума на разходите</span>
    <span class="total-val">${grand.toFixed(2)} ${currency}</span>
  </div>
</body>
</html>`;
}

function openPrintWindow(html: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// ─── Quick Actions Card ───────────────────────────────────────────────────────

function QuickActions({ trips, expenses, maint, currency }: {
  trips: CompletedTrip[]; expenses: Expense[]; maint: MaintenanceItem[]; currency: string;
}) {
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const totalKm = trips.reduce((s, t) => s + tripDistance(t), 0);
  const totalFuel = trips.reduce((s, t) => s + tripTotalCost(t), 0);
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
  const totalMaint = maint.reduce((s, m) => s + m.cost, 0);
  const grand = totalFuel + totalExp + totalMaint;

  function handlePDF() {
    const period = "Всички данни";
    const html = buildPrintHTML(trips, expenses, maint, period, currency);
    openPrintWindow(html);
  }

  function handleEmail() {
    const subject = encodeURIComponent("Отчет за автомобил");
    const body = encodeURIComponent(
      `Отчет за автомобил — ${new Date().toLocaleDateString("bg-BG")}\n\n` +
      `Пътувания: ${trips.length} бр.\n` +
      `Изминати км: ${totalKm.toFixed(0)} км\n` +
      `Гориво: ${totalFuel.toFixed(2)} ${currency}\n` +
      `Разходи: ${totalExp.toFixed(2)} ${currency}\n` +
      `Поддръжка: ${totalMaint.toFixed(2)} ${currency}\n` +
      `─────────────────\n` +
      `ОБЩО: ${grand.toFixed(2)} ${currency}\n\n` +
      `Генериран от Разход на гориво`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 3000);
  }

  function handleShare() {
    const summary = {
      date: new Date().toISOString().slice(0, 10),
      trips: trips.length,
      km: Math.round(totalKm),
      fuel: +totalFuel.toFixed(2),
      expenses: +totalExp.toFixed(2),
      maint: +totalMaint.toFixed(2),
      total: +grand.toFixed(2),
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(summary))));
    const url = `${window.location.origin}${window.location.pathname}#report=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {
      navigator.clipboard.writeText(
        `Отчет ${summary.date}: ${summary.trips} пъту., ${summary.km} км, ${summary.total} ${currency}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  }

  const actions = [
    {
      icon: <FileDown size={20} className="text-blue-500" />,
      bg: "bg-blue-500/10",
      title: "Запази като PDF",
      subtitle: "Отвори за печат / изтегли",
      onClick: handlePDF,
      badge: null,
    },
    {
      icon: <Mail size={20} className="text-purple-500" />,
      bg: "bg-purple-500/10",
      title: "Изпрати по имейл",
      subtitle: "Обобщение в имейл клиент",
      onClick: handleEmail,
      badge: emailSent ? "Отворено!" : null,
    },
    {
      icon: copied ? <CheckCircle2 size={20} className="text-green-500" /> : <Link2 size={20} className="text-teal-500" />,
      bg: copied ? "bg-green-500/10" : "bg-teal-500/10",
      title: "Сподели линк",
      subtitle: copied ? "Копирано в клипборда!" : "Копира линк с обобщение",
      onClick: handleShare,
      badge: null,
    },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/[0.07]">
        <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center">
          <Download size={15} className="text-white" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Бързи действия</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Сподели или архивирай данните</p>
        </div>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-white/6">
        {actions.map((a, i) => (
          <motion.button key={i} onClick={a.onClick} whileTap={{ scale: 0.98 }}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-[#323238] transition-colors">
            <div className={`w-10 h-10 rounded-2xl ${a.bg} flex items-center justify-center flex-shrink-0`}>{a.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-gray-900 dark:text-white">{a.title}</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">{a.subtitle}</p>
            </div>
            {a.badge ? (
              <span className="text-[11px] font-semibold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">{a.badge}</span>
            ) : (
              <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
            )}
          </motion.button>
        ))}
      </div>
    </Card>
  );
}

// ─── Monthly Report ───────────────────────────────────────────────────────────

function MonthlyReport({ trips, expenses, maint, currency }: {
  trips: CompletedTrip[]; expenses: Expense[]; maint: MaintenanceItem[]; currency: string;
}) {
  const now = new Date();
  const curMonth = monthKey(now.toISOString());
  const monthLabel = `${BG_MONTHS_FULL[now.getMonth()]} ${now.getFullYear()}`;

  const monthTrips = trips.filter(t => monthKey(t.endedAt) === curMonth);
  const monthExp = expenses.filter(e => e.date.startsWith(curMonth));
  const monthMaint = maint.filter(m => m.doneDate.startsWith(curMonth));

  const fuelCost = monthTrips.reduce((s, t) => s + tripTotalCost(t), 0);
  const expCost = monthExp.reduce((s, e) => s + e.amount, 0);
  const maintCost = monthMaint.reduce((s, m) => s + m.cost, 0);
  const totalKm = monthTrips.reduce((s, t) => s + tripDistance(t), 0);
  const grand = fuelCost + expCost + maintCost;

  const hasData = monthTrips.length > 0 || monthExp.length > 0 || monthMaint.length > 0;

  // Pie chart data
  const pieData = [
    { name: "Гориво", value: +fuelCost.toFixed(2) },
    { name: "Разходи", value: +expCost.toFixed(2) },
    { name: "Поддръжка", value: +maintCost.toFixed(2) },
  ].filter(d => d.value > 0);

  // Trip bar chart: group by week number in month
  const weeklyFuel: Record<number, number> = {};
  monthTrips.forEach(t => {
    const d = new Date(t.endedAt);
    const week = Math.ceil(d.getDate() / 7);
    weeklyFuel[week] = (weeklyFuel[week] ?? 0) + tripTotalCost(t);
  });
  const weekBarData = [1, 2, 3, 4, 5].map(w => ({
    name: `С${w}`,
    fuel: +(weeklyFuel[w] ?? 0).toFixed(2),
  })).filter(d => d.fuel > 0);

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/[0.07]">
        <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center">
          <Calendar size={15} className="text-white" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Месечен отчет</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">{monthLabel}</p>
        </div>
      </div>

      {!hasData ? (
        <div className="p-4">
          <EmptyState icon={<Calendar size={36} />} title={`Няма данни за ${monthLabel}`} subtitle="Добави пътувания или разходи за текущия месец" />
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: <Fuel size={14} />, color: "text-blue-500 bg-blue-500/10", label: "Гориво", value: `${fuelCost.toFixed(2)} ${currency}` },
              { icon: <Wallet size={14} />, color: "text-orange-500 bg-orange-500/10", label: "Разходи", value: `${expCost.toFixed(2)} ${currency}` },
              { icon: <Wrench size={14} />, color: "text-purple-500 bg-purple-500/10", label: "Поддръжка", value: `${maintCost.toFixed(2)} ${currency}` },
              { icon: <Car size={14} />, color: "text-green-500 bg-green-500/10", label: "Изминати", value: `${totalKm.toFixed(0)} км` },
            ].map((s, i) => (
              <div key={i} className="bg-gray-50 dark:bg-[#2c2c30] rounded-xl p-3 flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg ${s.color} flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 leading-none">{s.label}</p>
                  <p className="text-[14px] font-bold text-gray-900 dark:text-white tabular-nums truncate">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between bg-blue-500/8 dark:bg-blue-500/15 border border-blue-500/20 rounded-xl px-4 py-3">
            <span className="text-[13px] font-semibold text-gray-900 dark:text-white">Общо за месеца</span>
            <span className="text-[18px] font-bold text-blue-500 tabular-nums">{grand.toFixed(2)} {currency}</span>
          </div>

          {/* Weekly fuel bar chart */}
          {weekBarData.length > 0 && (
            <div>
              <p className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 mb-2">Разходи за гориво по седмици</p>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={weekBarData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(2)} ${currency}`, "Гориво"]}
                    contentStyle={{ borderRadius: 8, border: "none", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                  <Bar dataKey="fuel" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pie chart */}
          {pieData.length > 1 && (
            <div>
              <p className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 mb-2">Разпределение на разходите</p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value" paddingAngle={3}>
                    {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v.toFixed(2)} ${currency}`]}
                    contentStyle={{ borderRadius: 8, border: "none", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: "#6b7280" }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Yearly Report ────────────────────────────────────────────────────────────

function YearlyReport({ trips, expenses, maint, currency }: {
  trips: CompletedTrip[]; expenses: Expense[]; maint: MaintenanceItem[]; currency: string;
}) {
  const years = Array.from(new Set([
    ...trips.map(t => yearOf(t.endedAt)),
    ...expenses.map(e => yearOf(e.date)),
    ...maint.map(m => yearOf(m.doneDate)),
    new Date().getFullYear(),
  ])).sort((a, b) => b - a);

  const [year, setYear] = useState(years[0] ?? new Date().getFullYear());

  const yTrips = trips.filter(t => yearOf(t.endedAt) === year);
  const yExp = expenses.filter(e => yearOf(e.date) === year);
  const yMaint = maint.filter(m => yearOf(m.doneDate) === year);

  const totalKm = yTrips.reduce((s, t) => s + tripDistance(t), 0);
  const totalFuel = yTrips.reduce((s, t) => s + tripTotalCost(t), 0);
  const totalExp = yExp.reduce((s, e) => s + e.amount, 0);
  const totalMaint = yMaint.reduce((s, m) => s + m.cost, 0);
  const grand = totalFuel + totalExp + totalMaint;

  // Month-by-month data
  const monthData = BG_MONTHS.map((name, mi) => {
    const fuel = yTrips.filter(t => monthOf(t.endedAt) === mi).reduce((s, t) => s + tripTotalCost(t), 0);
    const exp = yExp.filter(e => monthOf(e.date) === mi).reduce((s, e) => s + e.amount, 0);
    const main = yMaint.filter(m => monthOf(m.doneDate) === mi).reduce((s, m) => s + m.cost, 0);
    return { name, fuel: +fuel.toFixed(2), exp: +exp.toFixed(2), main: +main.toFixed(2) };
  });

  const hasData = yTrips.length > 0 || yExp.length > 0 || yMaint.length > 0;

  // Expense by category
  const expByCat = Object.entries(
    yExp.reduce((acc, e) => { acc[e.category] = (acc[e.category] ?? 0) + e.amount; return acc; }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]);

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/[0.07]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center">
            <TrendingUp size={15} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Годишен отчет</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">Обобщение за цялата година</p>
          </div>
        </div>
        {/* Year picker */}
        <div className="flex gap-1">
          {years.slice(0, 3).map(y => (
            <button key={y} onClick={() => setYear(y)}
              className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold transition-all ${y === year ? "bg-indigo-500 text-white" : "bg-gray-100 dark:bg-[#2c2c30] text-gray-500"}`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="p-4">
          <EmptyState icon={<TrendingUp size={36} />} title={`Няма данни за ${year}`} subtitle="Добави пътувания, разходи или поддръжка" />
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Пътувания", value: `${yTrips.length} бр.`, color: "text-blue-500" },
              { label: "Изминати км", value: `${totalKm.toFixed(0)} км`, color: "text-green-500" },
              { label: "Гориво", value: `${totalFuel.toFixed(2)} ${currency}`, color: "text-orange-500" },
              { label: "Разходи + Поддръжка", value: `${(totalExp + totalMaint).toFixed(2)} ${currency}`, color: "text-red-500" },
            ].map((s, i) => (
              <div key={i} className="bg-gray-50 dark:bg-[#2c2c30] rounded-xl p-3">
                <p className="text-[10px] text-gray-400 leading-none">{s.label}</p>
                <p className={`text-[15px] font-bold tabular-nums mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between bg-indigo-500/8 dark:bg-indigo-500/15 border border-indigo-500/20 rounded-xl px-4 py-3">
            <span className="text-[13px] font-semibold text-gray-900 dark:text-white">Общо за {year}</span>
            <span className="text-[18px] font-bold text-indigo-500 tabular-nums">{grand.toFixed(2)} {currency}</span>
          </div>

          {/* Month-by-month chart */}
          <div>
            <p className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 mb-2">Разходи по месеци</p>
            <div className="overflow-x-auto">
              <div style={{ minWidth: 320 }}>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={monthData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number, name: string) => {
                      const labels: Record<string, string> = { fuel: "Гориво", exp: "Разходи", main: "Поддръжка" };
                      return [`${v.toFixed(2)} ${currency}`, labels[name] ?? name];
                    }} contentStyle={{ borderRadius: 8, border: "none", fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                    <Bar dataKey="fuel" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="exp" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="main" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1 justify-center">
              {[["#3b82f6", "Гориво"], ["#f97316", "Разходи"], ["#a855f7", "Поддръжка"]].map(([c, l]) => (
                <div key={l} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                  <span className="text-[10px] text-gray-400">{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Expense by category */}
          {expByCat.length > 0 && (
            <div>
              <p className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 mb-2">Разходи по категория</p>
              <div className="space-y-2">
                {expByCat.map(([cat, amt], i) => (
                  <div key={cat} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-[12px] text-gray-600 dark:text-gray-400 flex-1">{EXPENSE_BG[cat] ?? cat}</span>
                    <span className="text-[12px] font-semibold text-gray-900 dark:text-white tabular-nums">{amt.toFixed(2)} {currency}</span>
                    <div className="w-16 h-1.5 bg-gray-100 dark:bg-[#2c2c30] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length], width: `${totalExp > 0 ? (amt / totalExp) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Tax Report ───────────────────────────────────────────────────────────────

function TaxReport({ trips, expenses, maint, currency }: {
  trips: CompletedTrip[]; expenses: Expense[]; maint: MaintenanceItem[]; currency: string;
}) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [businessPct, setBusinessPct] = useState(100);
  const [copied, setCopied] = useState(false);

  const years = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];

  const yTrips = trips.filter(t => yearOf(t.endedAt) === year);
  const yExp = expenses.filter(e => yearOf(e.date) === year);
  const yMaint = maint.filter(m => yearOf(m.doneDate) === year);

  const totalKm = yTrips.reduce((s, t) => s + tripDistance(t), 0);
  const businessKm = totalKm * businessPct / 100;
  const totalFuelCost = yTrips.reduce((s, t) => s + tripTotalCost(t), 0);
  const businessFuelCost = totalFuelCost * businessPct / 100;
  const totalExpCost = yExp.reduce((s, e) => s + e.amount, 0);
  const businessExpCost = totalExpCost * businessPct / 100;
  const totalMaintCost = yMaint.reduce((s, m) => s + m.cost, 0);
  const businessMaintCost = totalMaintCost * businessPct / 100;
  const totalDeductible = businessFuelCost + businessExpCost + businessMaintCost;

  function handlePrint() {
    const html = buildPrintHTML(yTrips, yExp, yMaint, `${year} (${businessPct}% бизнес)`, currency);
    openPrintWindow(html);
  }

  function handleCopyText() {
    const text =
      `ДАНЪЧЕН ОТЧЕТ — ${year}\n` +
      `══════════════════════════\n` +
      `Период: 01.01.${year} – 31.12.${year}\n` +
      `Бизнес дял: ${businessPct}%\n\n` +
      `Общо км: ${totalKm.toFixed(0)} км\n` +
      `Бизнес км: ${businessKm.toFixed(0)} км\n\n` +
      `Гориво (общо): ${totalFuelCost.toFixed(2)} ${currency}\n` +
      `Гориво (бизнес): ${businessFuelCost.toFixed(2)} ${currency}\n\n` +
      `Разходи (бизнес): ${businessExpCost.toFixed(2)} ${currency}\n` +
      `Поддръжка (бизнес): ${businessMaintCost.toFixed(2)} ${currency}\n\n` +
      `══════════════════════════\n` +
      `ПРИСПАДАЕМО ОБЩО: ${totalDeductible.toFixed(2)} ${currency}\n`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  }

  const hasData = yTrips.length > 0 || yExp.length > 0 || yMaint.length > 0;

  const rows = [
    { label: "Пътувания", value: `${yTrips.length} бр.`, sub: null },
    { label: "Общо изминати км", value: `${totalKm.toFixed(0)} км`, sub: null },
    { label: `Бизнес км (${businessPct}%)`, value: `${businessKm.toFixed(0)} км`, sub: "Приспадаемо" },
    { label: "Гориво (общо)", value: `${totalFuelCost.toFixed(2)} ${currency}`, sub: null },
    { label: `Гориво (бизнес ${businessPct}%)`, value: `${businessFuelCost.toFixed(2)} ${currency}`, sub: "Приспадаемо" },
    { label: `Разходи (бизнес ${businessPct}%)`, value: `${businessExpCost.toFixed(2)} ${currency}`, sub: "Приспадаемо" },
    { label: `Поддръжка (бизнес ${businessPct}%)`, value: `${businessMaintCost.toFixed(2)} ${currency}`, sub: "Приспадаемо" },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/[0.07]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center">
            <Receipt size={15} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Данъчен отчет</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">За бизнес ползване на автомобила</p>
          </div>
        </div>
        <div className="flex gap-1">
          {years.map(y => (
            <button key={y} onClick={() => setYear(y)}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${y === year ? "bg-orange-500 text-white" : "bg-gray-100 dark:bg-[#2c2c30] text-gray-500"}`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Business % slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-semibold text-gray-900 dark:text-white">Бизнес дял</p>
            <span className="text-[15px] font-bold text-orange-500">{businessPct}%</span>
          </div>
          <input type="range" min={0} max={100} step={5} value={businessPct} onChange={e => setBusinessPct(+e.target.value)}
            className="w-full h-1.5 rounded-full appearance-none bg-gray-200 dark:bg-white/15 accent-orange-500 cursor-pointer" />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
        </div>

        {!hasData ? (
          <EmptyState icon={<Receipt size={36} />} title={`Няма данни за ${year}`} subtitle="Добави пътувания и разходи" />
        ) : (
          <>
            {/* Data rows */}
            <div className="bg-gray-50 dark:bg-[#2c2c30] rounded-xl overflow-hidden">
              {rows.map((r, i) => (
                <div key={i} className={`flex items-center justify-between px-3 py-2.5 ${i < rows.length - 1 ? "border-b border-gray-100 dark:border-white/[0.07]" : ""} ${r.sub ? "bg-green-500/4 dark:bg-green-500/8" : ""}`}>
                  <div>
                    <p className="text-[13px] text-gray-700 dark:text-gray-300">{r.label}</p>
                    {r.sub && <p className="text-[10px] text-green-600 dark:text-green-500">{r.sub}</p>}
                  </div>
                  <span className={`text-[13px] font-bold tabular-nums ${r.sub ? "text-green-600 dark:text-green-500" : "text-gray-900 dark:text-white"}`}>{r.value}</span>
                </div>
              ))}
            </div>

            {/* Total deductible */}
            <div className="flex items-center justify-between bg-orange-500/8 dark:bg-orange-500/15 border border-orange-500/20 rounded-xl px-4 py-3">
              <div>
                <p className="text-[13px] font-semibold text-gray-900 dark:text-white">Приспадаемо общо</p>
                <p className="text-[10px] text-gray-400">Гориво + Разходи + Поддръжка × {businessPct}%</p>
              </div>
              <span className="text-[20px] font-bold text-orange-500 tabular-nums">{totalDeductible.toFixed(2)} {currency}</span>
            </div>

            <div className="flex items-start gap-2 bg-blue-500/6 dark:bg-blue-500/12 rounded-xl px-3 py-2.5">
              <AlertTriangle size={13} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-blue-600 dark:text-blue-400 leading-relaxed">Консултирайте се с данъчен консултант. Сумите са изчислени на база въведените данни.</p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <motion.button onClick={handlePrint} whileTap={{ scale: 0.97 }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold bg-orange-500 text-white">
                <FileDown size={14} />PDF
              </motion.button>
              <motion.button onClick={handleCopyText} whileTap={{ scale: 0.97 }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${copied ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-[#2c2c30] text-gray-700 dark:text-gray-300"}`}>
                {copied ? <><CheckCircle2 size={14} />Копирано!</> : <><Copy size={14} />Копирай текст</>}
              </motion.button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

// ─── Import / Export ──────────────────────────────────────────────────────────

interface ImportData {
  trips?: CompletedTrip[];
  expenses?: Expense[];
  maintenance?: MaintenanceItem[];
}

function ImportCard({ onImport, trips, expenses, maint }: {
  onImport: (data: AllBackupData) => void;
  trips: CompletedTrip[]; expenses: Expense[]; maint: MaintenanceItem[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as ImportData;
        onImport(data);
        setStatus("success");
        setTimeout(() => setStatus("idle"), 3000);
      } catch {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleExport() {
    const data: ImportData = { trips, expenses, maintenance: maint };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `razhood-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  }

  function handleExportCSV() {
    const rows: string[] = [];

    // Trips sheet
    rows.push("=== ПЪТУВАНИЯ ===");
    rows.push("Дата,Начало км,Край км,Разстояние км,Литри,Цена/л,Общо,Разход л/100км,Бележка,Гориво");
    for (const t of trips) {
      const dist = (t.endKm - t.startKm).toFixed(1);
      const cons = t.endKm > t.startKm ? ((t.liters / (t.endKm - t.startKm)) * 100).toFixed(2) : "0";
      const cost = (t.liters * t.pricePerLiter).toFixed(2);
      const row = [
        t.endedAt.slice(0, 10),
        t.startKm, t.endKm, dist,
        t.liters.toFixed(2),
        t.pricePerLiter.toFixed(2),
        cost, cons,
        `"${(t.note ?? "").replace(/"/g, "'")}"`,
        t.fuelType ?? "petrol",
      ].join(",");
      rows.push(row);
    }

    rows.push("");
    rows.push("=== РАЗХОДИ ===");
    rows.push("Дата,Категория,Сума,Бележка");
    for (const e of expenses) {
      const cat: Record<string, string> = { repair:"Ремонт", wash:"Миене", parking:"Паркинг", toll:"Магистрала", fine:"Глоба", other:"Друго" };
      rows.push([
        e.date,
        cat[e.category] ?? e.category,
        e.amount.toFixed(2),
        `"${(e.note ?? "").replace(/"/g, "'")}"`,
      ].join(","));
    }

    rows.push("");
    rows.push("=== ПОДДРЪЖКА ===");
    rows.push("Дата,Тип,Цена,Километри,Бележка");
    for (const m of maint) {
      rows.push([
        m.doneDate,
        `"${(m.category ?? "").replace(/"/g, "'")}"`,
        m.cost.toFixed(2),
        m.mileage ?? "",
        `"${(m.note ?? "").replace(/"/g, "'")}"`,
      ].join(","));
    }

    const bom = "\uFEFF"; // UTF-8 BOM за правилно кирилица в Excel
    const blob = new Blob([bom + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `razhood-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/[0.07]">
        <div className="w-8 h-8 rounded-xl bg-teal-500 flex items-center justify-center">
          <Database size={15} className="text-white" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Импорт / Експорт</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Архивирай или възстанови данните</p>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <motion.button onClick={handleExportCSV} whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold bg-green-500 text-white">
          <Download size={15} />Изтегли CSV (Excel)
        </motion.button>
        <motion.button onClick={handleExport} whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold bg-teal-500 text-white">
          <Download size={15} />Изтегли архив (JSON)
        </motion.button>
        <motion.button onClick={() => fileRef.current?.click()} whileTap={{ scale: 0.98 }}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold transition-all ${
            status === "success" ? "bg-green-500 text-white" :
            status === "error" ? "bg-red-500 text-white" :
            "bg-gray-100 dark:bg-[#2c2c30] text-gray-700 dark:text-gray-300"
          }`}>
          <Upload size={15} />
          {status === "success" ? "Успешно импортиране!" : status === "error" ? "Грешка в JSON файла" : "Импортирай от JSON"}
        </motion.button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">Импортът замества съществуващите данни</p>
      </div>
    </Card>
  );
}

// ─── Fines Report ─────────────────────────────────────────────────────────────

function FinesReport({ expenses, currency, onUpdateExpense }: { expenses: Expense[]; currency: string; onUpdateExpense: (e: Expense) => void }) {
  const fines = expenses.filter(e => e.category === "fine");
  if (fines.length === 0) return null;

  const unpaid = fines.filter(f => !f.finePaid);
  const totalUnpaid = unpaid.reduce((s, f) => s + f.amount, 0);

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/[0.07]">
        <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center">
          <AlertTriangle size={15} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Глоби</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            {unpaid.length} неплатени · {totalUnpaid.toFixed(2)} {currency}
          </p>
        </div>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-white/[0.07]">
        {fines.sort((a, b) => (a.finePaid ? 1 : -1)).map(fine => {
          const deadlineMs = fine.fineDeadline ? new Date(fine.fineDeadline).getTime() : NaN;
          const daysLeft = !isNaN(deadlineMs) ? Math.floor((deadlineMs - Date.now()) / 86400000) : null;
          return (
            <div key={fine.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 dark:text-white">{fine.amount.toFixed(2)} {currency}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{fine.date}{fine.note ? ` · ${fine.note}` : ""}</p>
                {fine.fineDeadline && !fine.finePaid && (
                  <p className={`text-[11px] font-semibold mt-0.5 ${daysLeft !== null && daysLeft < 0 ? "text-red-500" : daysLeft !== null && daysLeft <= 7 ? "text-orange-500" : "text-gray-400"}`}>
                    {daysLeft !== null && daysLeft < 0 ? `Просрочена с ${Math.abs(daysLeft)} дни` : `Краен срок: ${fine.fineDeadline} (${daysLeft} дни)`}
                  </p>
                )}
              </div>
              <button
                onClick={() => onUpdateExpense({ ...fine, finePaid: !fine.finePaid })}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                  fine.finePaid ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-500"
                }`}>
                {fine.finePaid ? <><CheckCircle2 size={11} />Платена</> : "Неплатена"}
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Period Comparison ────────────────────────────────────────────────────────

function thisMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function lastMonthKey() {
  const d = new Date(); d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function PeriodComparison({ trips, expenses, currency }: { trips: CompletedTrip[]; expenses: Expense[]; currency: string }) {
  // null = user hasn't picked → always default to current/last month (never stale)
  const [periodAOverride, setPeriodAOverride] = useState<string | null>(null);
  const [periodBOverride, setPeriodBOverride] = useState<string | null>(null);
  const periodA = periodAOverride ?? lastMonthKey();
  const periodB = periodBOverride ?? thisMonthKey();

  function statsForPeriod(period: string) {
    const t = trips.filter(tr => tr.endedAt && typeof tr.endedAt === "string" && tr.endedAt.startsWith(period));
    const e = expenses.filter(ex => ex.date && typeof ex.date === "string" && ex.date.startsWith(period));
    const km = t.reduce((s, tr) => s + tripDistance(tr), 0);
    const fuel = t.reduce((s, tr) => s + tripTotalCost(tr), 0);
    const expCost = e.reduce((s, ex) => s + ex.amount, 0);
    const avgCons = t.length > 0 ? t.reduce((s, tr) => s + tripConsumption(tr), 0) / t.length : 0;
    return { trips: t.length, km, fuel, expCost, avgCons };
  }

  const a = statsForPeriod(periodA);
  const b = statsForPeriod(periodB);

  const months = Array.from(new Set([
    ...trips.filter(t => t.endedAt && typeof t.endedAt === "string").map(t => t.endedAt.slice(0, 7)),
    ...expenses.filter(e => e.date && typeof e.date === "string").map(e => e.date.slice(0, 7)),
  ])).sort().reverse().slice(0, 12);

  if (months.length < 2) return null;

  function monthLabel(m: string) {
    const [y, mo] = m.split("-");
    return `${BG_MONTHS[parseInt(mo) - 1]} ${y}`;
  }

  function DiffBadge({ valA, valB, lowerIsBetter = false }: { valA: number; valB: number; lowerIsBetter?: boolean }) {
    if (valA === 0 && valB === 0) return null;
    const diff = valB - valA;
    const pct = valA > 0 ? Math.abs(diff / valA * 100) : 0;
    const better = lowerIsBetter ? diff < 0 : diff > 0;
    if (Math.abs(diff) < 0.01) return <span className="text-[10px] text-gray-400">=</span>;
    return (
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${better ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-500"}`}>
        {diff > 0 ? "+" : ""}{pct.toFixed(0)}%
      </span>
    );
  }

  const rows: { label: string; valA: number; valB: number; unit: string; lowerIsBetter?: boolean }[] = [
    { label: "Пътувания", valA: a.trips, valB: b.trips, unit: "" },
    { label: "Километри", valA: a.km, valB: b.km, unit: "км" },
    { label: "Гориво", valA: a.fuel, valB: b.fuel, unit: currency, lowerIsBetter: true },
    { label: "Разходи", valA: a.expCost, valB: b.expCost, unit: currency, lowerIsBetter: true },
    { label: "Ср. разход", valA: a.avgCons, valB: b.avgCons, unit: "л/100км", lowerIsBetter: true },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/[0.07]">
        <div className="w-8 h-8 rounded-xl bg-purple-500 flex items-center justify-center">
          <TrendingUp size={15} className="text-white" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Сравнение периоди</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Сравни два месеца</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <p className="text-[11px] text-gray-400 mb-1">Период А</p>
            <select value={periodA} onChange={e => setPeriodAOverride(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#252528] rounded-xl px-3 py-2 text-[13px] text-gray-900 dark:text-white outline-none border border-gray-100 dark:border-white/[0.07]">
              {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </div>
          <div className="flex items-end pb-2 text-gray-400 font-bold">vs</div>
          <div className="flex-1">
            <p className="text-[11px] text-gray-400 mb-1">Период Б</p>
            <select value={periodB} onChange={e => setPeriodBOverride(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#252528] rounded-xl px-3 py-2 text-[13px] text-gray-900 dark:text-white outline-none border border-gray-100 dark:border-white/[0.07]">
              {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-[#252528] rounded-xl overflow-hidden">
          <div className="grid grid-cols-4 px-3 py-2 border-b border-gray-100 dark:border-white/[0.07]">
            <p className="text-[10px] text-gray-400 col-span-1"></p>
            <p className="text-[10px] font-semibold text-purple-500 text-center">{monthLabel(periodA)}</p>
            <p className="text-[10px] font-semibold text-blue-500 text-center">{monthLabel(periodB)}</p>
            <p className="text-[10px] text-gray-400 text-center">Промяна</p>
          </div>
          {rows.map((r, i) => (
            <div key={i} className={`grid grid-cols-4 px-3 py-2.5 items-center ${i < rows.length - 1 ? "border-b border-gray-100 dark:border-white/[0.05]" : ""}`}>
              <p className="text-[12px] text-gray-600 dark:text-gray-300">{r.label}</p>
              <p className="text-[12px] font-semibold text-gray-900 dark:text-white tabular-nums text-center">{r.valA > 0 ? r.valA.toFixed(r.unit === "" ? 0 : 1) : "—"}{r.unit ? ` ${r.unit}` : ""}</p>
              <p className="text-[12px] font-semibold text-gray-900 dark:text-white tabular-nums text-center">{r.valB > 0 ? r.valB.toFixed(r.unit === "" ? 0 : 1) : "—"}{r.unit ? ` ${r.unit}` : ""}</p>
              <div className="flex justify-center"><DiffBadge valA={r.valA} valB={r.valB} lowerIsBetter={r.lowerIsBetter} /></div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─── Backup Card ──────────────────────────────────────────────────────────────

interface AllBackupData {
  version: number;
  trips: CompletedTrip[];
  expenses: Expense[];
  maintenance: MaintenanceItem[];
  cars?: CarProfile[];
  carDamages?: CarDamage[];
  fillUps?: FuelFillUp[];
  documents?: CarDocument[];
  checklistItems?: ChecklistItem[];
  savedLocation?: SavedLocation | null;
  expiries?: ExpiryDates;
  recurringExpenses?: RecurringExpense[];
  currency?: string;
  activeCarId?: string;
  activeTrip?: ActiveTrip | null;
}


function BackupCard({ trips, expenses, maint, cars, carDamages, fillUps, documents, checklistItems, savedLocation, expiries, recurringExpenses, currency, activeCarId, activeTrip, onRestore }: {
  trips: CompletedTrip[];
  expenses: Expense[];
  maint: MaintenanceItem[];
  cars: CarProfile[];
  carDamages: CarDamage[];
  fillUps: FuelFillUp[];
  documents: CarDocument[];
  checklistItems: ChecklistItem[];
  savedLocation: SavedLocation | null;
  expiries: ExpiryDates;
  recurringExpenses: RecurringExpense[];
  currency: string;
  activeCarId: string;
  activeTrip: ActiveTrip | null;
  onRestore: (data: AllBackupData) => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [backupCode, setBackupCode] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [withPhotos, setWithPhotos] = useState(false);
  const [restoreCode, setRestoreCode] = useState("");
  const [restoreStatus, setRestoreStatus] = useState<"idle" | "ok" | "err">("idle");
  const [restoreErr, setRestoreErr] = useState("");

  function buildBackupData(): AllBackupData {
    return {
      version: 4,
      // Strip GPS route points even when photos are included — they're large and not needed for restore
      trips:      trips.map(({ routePoints: _r, ...t }) => t as typeof trips[0]),
      expenses,
      maintenance: maint,
      cars,
      carDamages,
      fillUps,
      documents,
      checklistItems,
      savedLocation,
      expiries,
      recurringExpenses,
      currency,
      activeCarId,
      activeTrip: activeTrip ? { ...activeTrip, routePoints: undefined } : activeTrip,
    };
  }

  // Removes null / undefined / empty-string / empty-array / false fields
  function compact<T extends object>(obj: T): T {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) =>
        v !== null && v !== undefined && v !== "" && v !== false &&
        !(Array.isArray(v) && v.length === 0)
      )
    ) as T;
  }

  // Shorten ISO timestamps: "2026-04-07T07:11:00.000Z" → "2026-04-07T07:11"  (saves 9 chars each)
  function shortDate(iso: string | undefined): string | undefined {
    if (!iso) return undefined;
    return iso.length > 16 ? iso.slice(0, 16) : iso;
  }

  // Strips photos, GPS traces, auto-derived fill-ups, checklist and active trip
  // Auto fill-ups (id = trip_<tripId>) are regenerated on restore — no need to backup twice
  // checklistItems and activeTrip are excluded — they're large and easy to re-create
  function buildBackupDataNoPhotos(): AllBackupData {
    return {
      version: 5,
      trips: trips.map(({ photo: _p, routePoints: _r, ...t }) =>
        compact({ ...t, startedAt: shortDate(t.startedAt), endedAt: shortDate(t.endedAt) } as object) as typeof trips[0]
      ),
      expenses:   expenses.map(({ photo: _p, ...e }) => compact(e as object) as typeof expenses[0]),
      // Only back up manually-added fill-ups; auto ones (trip_*) are rebuilt from trips on restore
      fillUps:    fillUps.filter(f => !f.id.startsWith("trip_")).map(({ photo: _p, ...f }) => compact(f as object) as typeof fillUps[0]),
      cars:       cars.map(({ photo: _p, ...c }) => compact(c as object) as typeof cars[0]),
      carDamages: carDamages.map(({ photo: _p, ...x }) => compact(x as object) as typeof carDamages[0]),
      documents:  documents.map(doc => compact({ ...doc, dataUrl: "" }) as typeof documents[0]),
      maintenance: maint.map(m => compact(m as object) as typeof maint[0]),
      savedLocation,
      expiries:   expiries ? compact(expiries as object) as typeof expiries : expiries,
      recurringExpenses: recurringExpenses.map(r => compact(r as object) as typeof recurringExpenses[0]),
      currency,
      activeCarId,
      // checklistItems — omitted (12 items = ~700 chars, easy to recreate)
      // activeTrip     — omitted (in-progress trip not needed in transfer backup)
    };
  }

  function generateCode() {
    const data = withPhotos ? buildBackupData() : buildBackupDataNoPhotos();
    const json = JSON.stringify(data);
    const code = LZString.compressToEncodedURIComponent(json);
    setBackupCode(code);
    setShowCode(true);
    setShowQr(false);
  }

  async function generateQR() {
    const data = withPhotos ? buildBackupData() : buildBackupDataNoPhotos();
    const json = JSON.stringify(data);
    const code = LZString.compressToEncodedURIComponent(json);
    // QR codes support ~3KB — photos make the code too large to scan
    if (code.length > 3000) {
      alert("Кодът е твърде голям за QR код.\n\nИзползвай бутона 'Сподели' или 'Код' за прехвърляне с снимки.");
      return;
    }
    // QR code embeds just the code — user scans and pastes into app
    try {
      const url = await QRCode.toDataURL(code, { width: 280, margin: 2, color: { dark: "#1e1e22", light: "#ffffff" } });
      setQrDataUrl(url);
      setBackupCode(code);
      setShowQr(true);
      setShowCode(false);
    } catch {
      generateCode(); // fallback to text code
    }
  }

  function copyCode() {
    if (!backupCode) return;
    navigator.clipboard.writeText(backupCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function handleRestore() {
    const code = restoreCode.trim();
    if (!code) return;
    try {
      const json = LZString.decompressFromEncodedURIComponent(code);
      if (!json) throw new Error("Невалиден код — не може да се декомпресира");
      const data = JSON.parse(json) as AllBackupData;
      if (typeof data !== "object" || data === null) throw new Error("Невалиден формат");
      if (!Array.isArray(data.trips) && !Array.isArray(data.cars) && !Array.isArray(data.fillUps))
        throw new Error("Непознат формат на backup");
      // Ensure all array fields are actually arrays (prevent corrupted data from crashing app)
      if (!Array.isArray(data.trips))           data.trips = [];
      if (!Array.isArray(data.expenses))        data.expenses = [];
      if (!Array.isArray(data.maintenance))     data.maintenance = [];
      if (!Array.isArray(data.cars))            data.cars = [];
      if (!Array.isArray(data.carDamages))      data.carDamages = [];
      if (!Array.isArray(data.fillUps))         data.fillUps = [];
      if (!Array.isArray(data.documents))       data.documents = [];
      if (!Array.isArray(data.checklistItems))  data.checklistItems = [];
      if (!Array.isArray(data.recurringExpenses)) data.recurringExpenses = [];
      onRestore(data);
      setRestoreStatus("ok");
      setRestoreCode("");
      setTimeout(() => setRestoreStatus("idle"), 4000);
    } catch (e) {
      setRestoreErr(e instanceof Error ? e.message : "Невалиден backup код");
      setRestoreStatus("err");
      setTimeout(() => { setRestoreStatus("idle"); setRestoreErr(""); }, 5000);
    }
  }

  const totalItems = trips.length + expenses.length + maint.length + cars.length + fillUps.length;

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/[0.07]">
        <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center">
          <Shield size={15} className="text-white" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Backup & Синхронизация</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">{totalItems} записа · пренеси на друго устройство</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Status badge */}
        {restoreStatus !== "idle" && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-semibold ${restoreStatus === "ok" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-500"}`}>
            {restoreStatus === "ok" ? <><CheckCircle2 size={14} />Данните са възстановени успешно!</> : <><AlertTriangle size={14} />{restoreErr || "Невалиден backup код"}</>}
          </motion.div>
        )}

        {/* ── ИЗПРАТИ (Share) ── */}
        <div className="bg-indigo-500/8 dark:bg-indigo-500/12 rounded-2xl p-3 space-y-2.5">
          <p className="text-[12px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
            <Database size={13} />Изпрати на друго устройство
          </p>
          {/* Photos toggle */}
          <button
            onClick={() => { setWithPhotos(v => !v); setBackupCode(null); setShowCode(false); setShowQr(false); }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white dark:bg-[#1e1e22] border border-gray-200 dark:border-white/[0.08] active:scale-95 transition-all"
          >
            <div className="text-left">
              <p className="text-[13px] font-semibold text-gray-900 dark:text-white">
                {withPhotos ? "Включи снимките" : "Само данните"}
              </p>
              <p className="text-[11px] text-gray-400">
                {withPhotos ? "Кодът е по-дълъг, но снимките се прехвърлят" : "Кратък код — снимките остават на устройството"}
              </p>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 flex items-center px-0.5 ${withPhotos ? "bg-indigo-500" : "bg-gray-200 dark:bg-gray-700"}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${withPhotos ? "translate-x-5" : "translate-x-0"}`} />
            </div>
          </button>
          <div className="flex gap-2">
            {/* Native share (AirDrop / iMessage / WhatsApp) */}
            <button onClick={async () => {
              const data = withPhotos ? buildBackupData() : buildBackupDataNoPhotos();
              const code = LZString.compressToEncodedURIComponent(JSON.stringify(data));
              if (navigator.share) {
                try { await navigator.share({ title: "Backup — Разход на гориво", text: code }); } catch { /* dismissed */ }
              } else {
                navigator.clipboard.writeText(code);
                setCopied(true); setTimeout(() => setCopied(false), 2500);
              }
            }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold bg-indigo-500 text-white active:scale-95 transition-all">
              <Link2 size={14} />Сподели
            </button>
            <button onClick={generateQR}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold bg-gray-100 dark:bg-[#2c2c30] text-gray-700 dark:text-gray-300 active:scale-95 transition-all">
              <QrCode size={14} />QR
            </button>
            <button onClick={generateCode}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold bg-gray-100 dark:bg-[#2c2c30] text-gray-700 dark:text-gray-300 active:scale-95 transition-all">
              <Copy size={14} />Код
            </button>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            "Сподели" отваря AirDrop / iMessage / WhatsApp.{" "}
            {withPhotos ? "Снимките са включени." : "Снимките не се включват."}
          </p>
        </div>

        {/* ── ПОЛУЧИ (Import) ── */}
        <div className="bg-green-500/6 dark:bg-green-500/10 rounded-2xl p-3 space-y-2.5">
          <p className="text-[12px] font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5">
            <Download size={13} />Получи от друго устройство
          </p>
          <textarea
            value={restoreCode}
            onChange={e => setRestoreCode(e.target.value)}
            rows={3}
            placeholder="Постни backup кода тук..."
            className="w-full bg-white dark:bg-[#1e1e22] rounded-xl p-2.5 text-[11px] text-gray-700 dark:text-gray-300 font-mono outline-none border border-gray-200 dark:border-white/[0.07] resize-none placeholder-gray-300 dark:placeholder-gray-600"
          />
          <div className="flex gap-2">
            <button onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                if (text.trim()) setRestoreCode(text.trim());
              } catch { /* permission denied */ }
            }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold bg-gray-100 dark:bg-[#2c2c30] text-gray-600 dark:text-gray-300 active:scale-95 transition-all">
              <ClipboardPaste size={14} />Постни от клипборд
            </button>
            <button onClick={handleRestore} disabled={!restoreCode.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold bg-green-500 text-white disabled:opacity-40 active:scale-95 transition-all">
              <Download size={14} />Възстанови
            </button>
          </div>
        </div>

        {/* QR Code display */}
        <AnimatePresence>
          {showQr && qrDataUrl && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="bg-white rounded-2xl p-4 flex flex-col items-center gap-3">
                <img src={qrDataUrl} alt="Backup QR" className="w-56 h-56 rounded-xl" />
                <p className="text-[11px] text-gray-500 text-center">Сканирай с другото устройство → "Постни от клипборд"</p>
                <button onClick={copyCode}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${copied ? "bg-green-500 text-white" : "bg-indigo-500 text-white"}`}>
                  {copied ? <><CheckCircle2 size={13} />Копирано!</> : <><Copy size={13} />Копирай кода</>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text code display */}
        <AnimatePresence>
          {showCode && backupCode && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="bg-gray-50 dark:bg-[#252528] rounded-xl p-3 space-y-2">
                <textarea readOnly value={backupCode} rows={3}
                  className="w-full bg-white dark:bg-[#1e1e22] rounded-lg p-2 text-[10px] text-gray-500 dark:text-gray-400 font-mono outline-none border border-gray-200 dark:border-white/[0.07] resize-none" />
                <button onClick={copyCode}
                  className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-semibold transition-all ${copied ? "bg-green-500 text-white" : "bg-indigo-500 text-white"}`}>
                  {copied ? <><CheckCircle2 size={13} />Копирано!</> : <><Copy size={13} />Копирай</>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[10px] text-orange-500/80 text-center">⚠️ Restore ще замести съществуващите данни</p>
      </div>
    </Card>
  );
}

// ─── Trash Card ───────────────────────────────────────────────────────────────

const TYPE_META: Record<DeletedItem["type"], { label: string; icon: ReactNode; color: string; bg: string }> = {
  trip:        { label: "Пътуване",   icon: <MapPin size={13} />,    color: "text-blue-500",   bg: "bg-blue-500/10" },
  document:    { label: "Документ",   icon: <FileText size={13} />,  color: "text-purple-500", bg: "bg-purple-500/10" },
  maintenance: { label: "Поддръжка",  icon: <Wrench size={13} />,   color: "text-orange-500", bg: "bg-orange-500/10" },
  expense:     { label: "Разход",     icon: <CreditCard size={13} />,color: "text-red-500",    bg: "bg-red-500/10" },
  carDamage:   { label: "Щета",       icon: <Car size={13} />,       color: "text-rose-500",   bg: "bg-rose-500/10" },
  fillUp:      { label: "Зареждане",  icon: <Fuel size={13} />,      color: "text-green-500",  bg: "bg-green-500/10" },
};

function getItemDescription(entry: DeletedItem, currency: string): string {
  switch (entry.type) {
    case "trip": {
      const t = entry.item as CompletedTrip;
      const km = Math.max(0, t.endKm - t.startKm);
      return `${km.toFixed(0)} км · ${(t.liters * t.pricePerLiter).toFixed(2)} ${currency}`;
    }
    case "document": {
      const d = entry.item as CarDocument;
      return d.name;
    }
    case "maintenance": {
      const m = entry.item as MaintenanceItem;
      return `${m.title} · ${m.cost.toFixed(2)} ${currency}`;
    }
    case "expense": {
      const e = entry.item as Expense;
      return `${e.note || e.category} · ${e.amount.toFixed(2)} ${currency}`;
    }
    case "carDamage": {
      const d = entry.item as CarDamage;
      return d.description;
    }
    case "fillUp": {
      const f = entry.item as FuelFillUp;
      return `${f.liters.toFixed(1)} л · ${(f.liters * f.pricePerLiter).toFixed(2)} ${currency}`;
    }
  }
}

function getItemDate(entry: DeletedItem): string {
  switch (entry.type) {
    case "trip":        return (entry.item as CompletedTrip).endedAt ?? "";
    case "document":    return (entry.item as CarDocument).addedAt ?? "";
    case "maintenance": return (entry.item as MaintenanceItem).doneDate ?? "";
    case "expense":     return (entry.item as Expense).date ?? "";
    case "carDamage":   return (entry.item as CarDamage).date ?? "";
    case "fillUp":      return (entry.item as FuelFillUp).date ?? "";
  }
}

interface TrashCardProps {
  deletedItems: DeletedItem[];
  onRestoreItem: (trashId: string) => void;
  onRestoreAll: () => void;
  onClearTrash: () => void;
  currency: string;
}

function TrashCard({ deletedItems, onRestoreItem, onRestoreAll, onClearTrash, currency }: TrashCardProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmRestoreAll, setConfirmRestoreAll] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const visibleItems = expanded ? deletedItems : deletedItems.slice(0, 5);

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/[0.07]">
        <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center">
          <Trash2 size={15} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Изтрити данни</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            {deletedItems.length === 0 ? "Кошчето е празно" : `${deletedItems.length} запис${deletedItems.length === 1 ? "" : "а"} — натисни за възстановяване`}
          </p>
        </div>
        {deletedItems.length > 0 && !confirmClear && !confirmRestoreAll && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setConfirmRestoreAll(true)}
              className="text-[11px] text-green-600 dark:text-green-400 font-semibold px-2.5 py-1.5 rounded-lg bg-green-500/10 active:scale-95 transition-all"
            >
              Върни всичко
            </button>
            <button
              onClick={() => setConfirmClear(true)}
              className="text-[11px] text-red-400 font-semibold px-2.5 py-1.5 rounded-lg bg-red-500/10 active:scale-95 transition-all"
            >
              Изчисти
            </button>
          </div>
        )}
        {confirmRestoreAll && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { onRestoreAll(); setConfirmRestoreAll(false); }}
              className="text-[11px] text-white font-semibold px-2.5 py-1.5 rounded-lg bg-green-500 active:scale-95 transition-all"
            >
              Да, върни
            </button>
            <button
              onClick={() => setConfirmRestoreAll(false)}
              className="text-[11px] text-gray-500 font-semibold px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-[#2c2c30] active:scale-95 transition-all"
            >
              Отказ
            </button>
          </div>
        )}
        {confirmClear && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { onClearTrash(); setConfirmClear(false); }}
              className="text-[11px] text-white font-semibold px-2.5 py-1.5 rounded-lg bg-red-500 active:scale-95 transition-all"
            >
              Да, изчисти
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="text-[11px] text-gray-500 font-semibold px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-[#2c2c30] active:scale-95 transition-all"
            >
              Отказ
            </button>
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        {deletedItems.length === 0 ? (
          <div className="py-6 flex flex-col items-center gap-2 text-gray-300 dark:text-gray-600">
            <Trash2 size={32} strokeWidth={1.2} />
            <p className="text-[12px]">Все още нищо не е изтрито</p>
          </div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {visibleItems.map((entry) => {
                const meta = TYPE_META[entry.type];
                const desc = getItemDescription(entry, currency);
                const itemDate = getItemDate(entry);
                const deletedAgo = (() => {
                  const ms = Date.now() - new Date(entry.deletedAt).getTime();
                  const mins = Math.floor(ms / 60000);
                  const hrs  = Math.floor(ms / 3600000);
                  const days = Math.floor(ms / 86400000);
                  if (mins < 1) return "преди малко";
                  if (mins < 60) return `преди ${mins} мин`;
                  if (hrs < 24) return `преди ${hrs} ч`;
                  return `преди ${days} дни`;
                })();

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-[#1e1e22] border border-gray-100 dark:border-white/[0.05]"
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg} ${meta.color}`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${meta.color}`}>{meta.label}</span>
                        {itemDate && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatShortDate(itemDate)}</span>
                        )}
                      </div>
                      <p className="text-[12px] font-medium text-gray-800 dark:text-gray-200 truncate">{desc}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Изтрито {deletedAgo}</p>
                    </div>
                    <button
                      onClick={() => onRestoreItem(entry.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 text-[11px] font-semibold active:scale-95 transition-all flex-shrink-0"
                    >
                      <RotateCcw size={11} />Върни
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {deletedItems.length > 5 && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-[12px] font-semibold text-gray-500 dark:text-gray-400 active:opacity-70 transition-all"
              >
                <ChevronRight size={13} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
                {expanded ? "Покажи по-малко" : `Покажи още ${deletedItems.length - 5}`}
              </button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────

interface ReportsProps {
  tripHistory: CompletedTrip[];
  expenses: Expense[];
  maintenanceItems: MaintenanceItem[];
  currency: string;
  activeCarId: string;
  activeTrip: ActiveTrip | null;
  onUpdateExpense: (e: Expense) => void;
  onImport: (data: AllBackupData) => void;
  cars: CarProfile[];
  carDamages: CarDamage[];
  fillUps: FuelFillUp[];
  documents: CarDocument[];
  checklistItems: ChecklistItem[];
  savedLocation: SavedLocation | null;
  expiries: ExpiryDates;
  recurringExpenses: RecurringExpense[];
  deletedItems: DeletedItem[];
  onRestoreItem: (trashId: string) => void;
  onRestoreAll: () => void;
  onClearTrash: () => void;
}

export default function Reports({ tripHistory, expenses, maintenanceItems, currency, activeCarId, activeTrip, onUpdateExpense, onImport, cars, carDamages, fillUps, documents, checklistItems, savedLocation, expiries, recurringExpenses, deletedItems, onRestoreItem, onRestoreAll, onClearTrash }: ReportsProps) {
  const currentYear = new Date().getFullYear();
  return (
    <div className="space-y-4 px-4 pb-8 pt-2">
      <MonthlyReport trips={tripHistory} expenses={expenses} maint={maintenanceItems} currency={currency} />
      <YearlyReport trips={tripHistory} expenses={expenses} maint={maintenanceItems} currency={currency} />
      <TaxReport trips={tripHistory} expenses={expenses} maint={maintenanceItems} currency={currency} />
      <PeriodComparison trips={tripHistory} expenses={expenses} currency={currency} />
      <FinesReport expenses={expenses} currency={currency} onUpdateExpense={onUpdateExpense} />
      <QuickActions trips={tripHistory} expenses={expenses} maint={maintenanceItems} currency={currency} />
      <BackupCard
        trips={tripHistory} expenses={expenses} maint={maintenanceItems}
        cars={cars} carDamages={carDamages} fillUps={fillUps} documents={documents}
        checklistItems={checklistItems} savedLocation={savedLocation}
        expiries={expiries} recurringExpenses={recurringExpenses}
        currency={currency} activeCarId={activeCarId} activeTrip={activeTrip}
        onRestore={onImport}
      />
      <ImportCard onImport={onImport} trips={tripHistory} expenses={expenses} maint={maintenanceItems} />
      <TrashCard
        deletedItems={deletedItems}
        onRestoreItem={onRestoreItem}
        onRestoreAll={onRestoreAll}
        onClearTrash={onClearTrash}
        currency={currency}
      />

      {/* ─── Wrapped Section ─────────────────────────────────────────── */}
      <div className="rounded-3xl overflow-hidden" style={{ background: "linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}>
        <div className="px-5 pt-5 pb-2 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest"
              style={{ background: "linear-gradient(90deg, #f97316, #ec4899, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Разход на гориво
            </p>
            <p className="text-[22px] font-extrabold text-white mt-0.5">Wrapped {currentYear}</p>
          </div>
          <div className="text-[36px] leading-none">🏆</div>
        </div>
        <Wrapped tripHistory={tripHistory} expenses={expenses} currency={currency} />
      </div>
    </div>
  );
}
