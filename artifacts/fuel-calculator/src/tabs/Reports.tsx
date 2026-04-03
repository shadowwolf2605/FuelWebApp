import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileDown, Mail, Link2, BarChart3, Calendar, Receipt,
  TrendingUp, Download, ChevronRight, CheckCircle2, Copy,
  Fuel, Wrench, Wallet, Car, AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import { Card, EmptyState } from "../components/ui";
import { formatShortDate } from "../utils/helpers";
import type { CompletedTrip, Expense, MaintenanceItem } from "../types";
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
};

const PIE_COLORS = ["#3b82f6", "#f97316", "#22c55e", "#a855f7", "#ef4444", "#eab308", "#06b6d4"];

// ─── PDF generation (print window) ───────────────────────────────────────────

function buildPrintHTML(trips: CompletedTrip[], expenses: Expense[], maint: MaintenanceItem[], period: string) {
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
    <div class="stat"><div class="stat-val">${totalFuel.toFixed(2)} €</div><div class="stat-lbl">Гориво</div></div>
    <div class="stat"><div class="stat-val">${grand.toFixed(2)} €</div><div class="stat-lbl">Всичко</div></div>
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
      <td>${tripTotalCost(t).toFixed(2)} €</td>
      <td>${t.note || "—"}</td>
    </tr>`).join("")}
    <tr class="sum-row"><td colspan="6">Общо гориво</td><td>${totalFuel.toFixed(2)} €</td><td></td></tr>
  </table>`}

  <h2>Разходи (${expenses.length})</h2>
  ${expenses.length === 0 ? "<p style='color:#9ca3af'>Няма данни</p>" : `
  <table>
    <tr><th>Дата</th><th>Категория</th><th>Сума</th><th>Бележка</th></tr>
    ${expenses.map(e => `<tr>
      <td>${e.date}</td>
      <td>${EXPENSE_BG[e.category] ?? e.category}</td>
      <td>${e.amount.toFixed(2)} €</td>
      <td>${e.note || "—"}</td>
    </tr>`).join("")}
    <tr class="sum-row"><td colspan="2">Общо разходи</td><td>${totalExp.toFixed(2)} €</td><td></td></tr>
  </table>`}

  <h2>Поддръжка (${maint.length})</h2>
  ${maint.length === 0 ? "<p style='color:#9ca3af'>Няма данни</p>" : `
  <table>
    <tr><th>Дата</th><th>Описание</th><th>Км</th><th>Сума</th><th>Бележка</th></tr>
    ${maint.map(m => `<tr>
      <td>${m.doneDate}</td>
      <td>${m.title}</td>
      <td>${m.mileage > 0 ? m.mileage.toLocaleString() : "—"}</td>
      <td>${m.cost > 0 ? m.cost.toFixed(2) + " €" : "—"}</td>
      <td>${m.note || "—"}</td>
    </tr>`).join("")}
    <tr class="sum-row"><td colspan="3">Общо поддръжка</td><td>${totalMaint.toFixed(2)} €</td><td></td></tr>
  </table>`}

  <div class="total-box">
    <span style="font-size:15px;font-weight:600">Обща сума на разходите</span>
    <span class="total-val">${grand.toFixed(2)} €</span>
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

function QuickActions({ trips, expenses, maint }: {
  trips: CompletedTrip[]; expenses: Expense[]; maint: MaintenanceItem[];
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
    const html = buildPrintHTML(trips, expenses, maint, period);
    openPrintWindow(html);
  }

  function handleEmail() {
    const subject = encodeURIComponent("Отчет за автомобил");
    const body = encodeURIComponent(
      `Отчет за автомобил — ${new Date().toLocaleDateString("bg-BG")}\n\n` +
      `Пътувания: ${trips.length} бр.\n` +
      `Изминати км: ${totalKm.toFixed(0)} км\n` +
      `Гориво: ${totalFuel.toFixed(2)} €\n` +
      `Разходи: ${totalExp.toFixed(2)} €\n` +
      `Поддръжка: ${totalMaint.toFixed(2)} €\n` +
      `─────────────────\n` +
      `ОБЩО: ${grand.toFixed(2)} €\n\n` +
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
        `Отчет ${summary.date}: ${summary.trips} пъту., ${summary.km} км, ${summary.total} €`
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
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/6">
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
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-white/4 transition-colors">
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

function MonthlyReport({ trips, expenses, maint }: {
  trips: CompletedTrip[]; expenses: Expense[]; maint: MaintenanceItem[];
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
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100 dark:border-white/6">
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
              { icon: <Fuel size={14} />, color: "text-blue-500 bg-blue-500/10", label: "Гориво", value: `${fuelCost.toFixed(2)} €` },
              { icon: <Wallet size={14} />, color: "text-orange-500 bg-orange-500/10", label: "Разходи", value: `${expCost.toFixed(2)} €` },
              { icon: <Wrench size={14} />, color: "text-purple-500 bg-purple-500/10", label: "Поддръжка", value: `${maintCost.toFixed(2)} €` },
              { icon: <Car size={14} />, color: "text-green-500 bg-green-500/10", label: "Изминати", value: `${totalKm.toFixed(0)} км` },
            ].map((s, i) => (
              <div key={i} className="bg-gray-50 dark:bg-white/4 rounded-xl p-3 flex items-center gap-2">
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
            <span className="text-[18px] font-bold text-blue-500 tabular-nums">{grand.toFixed(2)} €</span>
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
                  <Tooltip formatter={(v: number) => [`${v.toFixed(2)} €`, "Гориво"]}
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
                  <Tooltip formatter={(v: number) => [`${v.toFixed(2)} €`]}
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

function YearlyReport({ trips, expenses, maint }: {
  trips: CompletedTrip[]; expenses: Expense[]; maint: MaintenanceItem[];
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
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/6">
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
              className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold transition-all ${y === year ? "bg-indigo-500 text-white" : "bg-gray-100 dark:bg-white/8 text-gray-500"}`}>
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
              { label: "Гориво", value: `${totalFuel.toFixed(2)} €`, color: "text-orange-500" },
              { label: "Разходи + Поддръжка", value: `${(totalExp + totalMaint).toFixed(2)} €`, color: "text-red-500" },
            ].map((s, i) => (
              <div key={i} className="bg-gray-50 dark:bg-white/4 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 leading-none">{s.label}</p>
                <p className={`text-[15px] font-bold tabular-nums mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between bg-indigo-500/8 dark:bg-indigo-500/15 border border-indigo-500/20 rounded-xl px-4 py-3">
            <span className="text-[13px] font-semibold text-gray-900 dark:text-white">Общо за {year}</span>
            <span className="text-[18px] font-bold text-indigo-500 tabular-nums">{grand.toFixed(2)} €</span>
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
                      return [`${v.toFixed(2)} €`, labels[name] ?? name];
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
                    <span className="text-[12px] font-semibold text-gray-900 dark:text-white tabular-nums">{amt.toFixed(2)} €</span>
                    <div className="w-16 h-1.5 bg-gray-100 dark:bg-white/8 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length], width: `${(amt / totalExp) * 100}%` }} />
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

function TaxReport({ trips, expenses, maint }: {
  trips: CompletedTrip[]; expenses: Expense[]; maint: MaintenanceItem[];
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
    const html = buildPrintHTML(yTrips, yExp, yMaint, `${year} (${businessPct}% бизнес)`);
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
      `Гориво (общо): ${totalFuelCost.toFixed(2)} €\n` +
      `Гориво (бизнес): ${businessFuelCost.toFixed(2)} €\n\n` +
      `Разходи (бизнес): ${businessExpCost.toFixed(2)} €\n` +
      `Поддръжка (бизнес): ${businessMaintCost.toFixed(2)} €\n\n` +
      `══════════════════════════\n` +
      `ПРИСПАДАЕМО ОБЩО: ${totalDeductible.toFixed(2)} €\n`;
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
    { label: "Гориво (общо)", value: `${totalFuelCost.toFixed(2)} €`, sub: null },
    { label: `Гориво (бизнес ${businessPct}%)`, value: `${businessFuelCost.toFixed(2)} €`, sub: "Приспадаемо" },
    { label: `Разходи (бизнес ${businessPct}%)`, value: `${businessExpCost.toFixed(2)} €`, sub: "Приспадаемо" },
    { label: `Поддръжка (бизнес ${businessPct}%)`, value: `${businessMaintCost.toFixed(2)} €`, sub: "Приспадаемо" },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/6">
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
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${y === year ? "bg-orange-500 text-white" : "bg-gray-100 dark:bg-white/8 text-gray-500"}`}>
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
            <div className="bg-gray-50 dark:bg-white/4 rounded-xl overflow-hidden">
              {rows.map((r, i) => (
                <div key={i} className={`flex items-center justify-between px-3 py-2.5 ${i < rows.length - 1 ? "border-b border-gray-100 dark:border-white/6" : ""} ${r.sub ? "bg-green-500/4 dark:bg-green-500/8" : ""}`}>
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
              <span className="text-[20px] font-bold text-orange-500 tabular-nums">{totalDeductible.toFixed(2)} €</span>
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
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${copied ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-white/8 text-gray-700 dark:text-gray-300"}`}>
                {copied ? <><CheckCircle2 size={14} />Копирано!</> : <><Copy size={14} />Копирай текст</>}
              </motion.button>
            </div>
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
}

export default function Reports({ tripHistory, expenses, maintenanceItems }: ReportsProps) {
  return (
    <div className="space-y-4 px-4 pb-8 pt-2">
      <QuickActions trips={tripHistory} expenses={expenses} maint={maintenanceItems} />
      <MonthlyReport trips={tripHistory} expenses={expenses} maint={maintenanceItems} />
      <YearlyReport trips={tripHistory} expenses={expenses} maint={maintenanceItems} />
      <TaxReport trips={tripHistory} expenses={expenses} maint={maintenanceItems} />
    </div>
  );
}
