import { motion } from "framer-motion";
import type { CompletedTrip, Expense } from "../types";
import { tripConsumption, tripDistance, tripTotalCost } from "../types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface WrappedProps {
  tripHistory: CompletedTrip[];
  expenses: Expense[];
  currency: string;
}

// ─── Confetti decoration (CSS-only) ──────────────────────────────────────────

const CONFETTI_ITEMS = [
  { left: "8%",  top: "6%",  color: "#f97316", size: 10, rotate: 20  },
  { left: "18%", top: "12%", color: "#6366f1", size: 7,  rotate: -15 },
  { left: "75%", top: "5%",  color: "#22c55e", size: 9,  rotate: 45  },
  { left: "85%", top: "14%", color: "#ec4899", size: 6,  rotate: -30 },
  { left: "90%", top: "8%",  color: "#eab308", size: 11, rotate: 10  },
  { left: "50%", top: "3%",  color: "#06b6d4", size: 8,  rotate: 60  },
  { left: "30%", top: "8%",  color: "#f43f5e", size: 6,  rotate: -45 },
  { left: "65%", top: "10%", color: "#a855f7", size: 9,  rotate: 25  },
];

function ConfettiDots() {
  return (
    <>
      {CONFETTI_ITEMS.map((c, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.85, scale: 1 }}
          transition={{ delay: 0.2 + i * 0.06, duration: 0.4, type: "spring" }}
          style={{
            position: "absolute",
            left: c.left,
            top: c.top,
            width: c.size,
            height: c.size,
            borderRadius: "2px",
            backgroundColor: c.color,
            transform: `rotate(${c.rotate}deg)`,
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function BigStatCard({
  label,
  value,
  unit,
  gradient,
  delay,
}: {
  label: string;
  value: string;
  unit: string;
  gradient: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      className="rounded-2xl p-4 flex flex-col justify-between"
      style={{ background: gradient, boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}
    >
      <p className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">{label}</p>
      <div className="mt-2">
        <p className="text-[30px] font-extrabold text-white tabular-nums leading-none">{value}</p>
        <p className="text-[12px] text-white/70 mt-0.5">{unit}</p>
      </div>
    </motion.div>
  );
}

// ─── Fun Fact Row ─────────────────────────────────────────────────────────────

function FunFactRow({ icon, text, delay }: { icon: string; text: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.45, ease: "easeOut" }}
      className="flex items-center gap-3 bg-white/8 dark:bg-white/6 rounded-2xl px-4 py-3"
    >
      <span className="text-[24px] leading-none flex-shrink-0">{icon}</span>
      <p className="text-[13px] text-white/90 leading-snug">{text}</p>
    </motion.div>
  );
}

// ─── Best Trip Highlight ──────────────────────────────────────────────────────

function BestTripHighlight({ trip, currency, delay }: { trip: CompletedTrip; currency: string; delay: number }) {
  const cons = tripConsumption(trip);
  const dist = tripDistance(trip);
  const cost = tripTotalCost(trip);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, type: "spring", stiffness: 200 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", boxShadow: "0 4px 24px rgba(34,197,94,0.35)" }}
    >
      <div className="px-4 pt-4 pb-2">
        <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Най-ефективно пътуване</p>
        <p className="text-[22px] font-extrabold text-white mt-0.5">
          {cons.toFixed(2)} л/100км
        </p>
      </div>
      <div className="px-4 pb-4 flex gap-3">
        {[
          { label: "Разстояние", value: `${dist.toFixed(0)} км` },
          { label: "Сума",       value: `${cost.toFixed(2)} ${currency}` },
          { label: "Заредени",   value: `${trip.liters.toFixed(1)} л` },
        ].map(s => (
          <div key={s.label} className="flex-1 bg-white/20 rounded-xl py-2 text-center">
            <p className="text-[10px] text-white/60">{s.label}</p>
            <p className="text-[13px] font-bold text-white tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Expense Category Row ─────────────────────────────────────────────────────

const EXPENSE_LABELS: Record<string, string> = {
  repair:  "Ремонти",
  wash:    "Автомивка",
  parking: "Паркинг",
  toll:    "Винетка/Тол",
  fine:    "Глоби",
  other:   "Друго",
};

const EXPENSE_COLORS: Record<string, string> = {
  repair:  "#ef4444",
  wash:    "#06b6d4",
  parking: "#6366f1",
  toll:    "#f97316",
  fine:    "#eab308",
  other:   "#9ca3af",
};

function ExpenseBreakdown({ expenses, currency, delay }: { expenses: Expense[]; currency: string; delay: number }) {
  if (expenses.length === 0) return null;
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  }
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white/8 dark:bg-white/6 rounded-2xl p-4"
    >
      <p className="text-[12px] font-bold text-white/60 uppercase tracking-wider mb-3">Разбивка на разходите</p>
      <div className="space-y-2">
        {sorted.map(([cat, amt]) => {
          const pct = total > 0 ? (amt / total) * 100 : 0;
          const color = EXPENSE_COLORS[cat] ?? "#9ca3af";
          return (
            <div key={cat}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[12px] text-white/80 font-medium">{EXPENSE_LABELS[cat] ?? cat}</span>
                <span className="text-[12px] text-white tabular-nums font-semibold">{amt.toFixed(2)} {currency}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: delay + 0.2, duration: 0.7, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-white/10 flex justify-between">
        <span className="text-[12px] text-white/60">Общо разходи</span>
        <span className="text-[14px] font-extrabold text-white tabular-nums">{total.toFixed(2)} {currency}</span>
      </div>
    </motion.div>
  );
}

// ─── Wrapped Main ─────────────────────────────────────────────────────────────

export default function Wrapped({ tripHistory, expenses, currency }: WrappedProps) {
  const currentYear = new Date().getFullYear();

  const yearTrips = tripHistory.filter(t => new Date(t.endedAt).getFullYear() === currentYear);
  const yearExpenses = expenses.filter(e => new Date(e.date).getFullYear() === currentYear);

  const totalKm     = yearTrips.reduce((s, t) => s + tripDistance(t), 0);
  const totalFuel   = yearTrips.reduce((s, t) => s + tripTotalCost(t), 0);
  const tripCount   = yearTrips.length;

  const validYearTrips = yearTrips.filter(t => tripDistance(t) > 0);
  const avgConsRaw  = validYearTrips.length > 0
    ? validYearTrips.reduce((s, t) => s + tripConsumption(t), 0) / validYearTrips.length
    : 0;
  const avgCons = isFinite(avgConsRaw) ? avgConsRaw : 0;

  const sofiaVarnaTimes = totalKm > 0 && isFinite(totalKm) ? Math.floor(totalKm / 450) : 0;
  const longestDist     = validYearTrips.length > 0 ? Math.max(...validYearTrips.map(t => tripDistance(t))) : 0;
  const avgCostPerTrip  = tripCount > 0 && isFinite(totalFuel) ? totalFuel / tripCount : 0;

  const bestTrip = validYearTrips.length > 0
    ? validYearTrips
        .filter(t => isFinite(tripConsumption(t)))
        .reduce((best, t) => best === null || tripConsumption(t) < tripConsumption(best) ? t : best, null as typeof validYearTrips[0] | null)
    : null;

  return (
    <div
      className="min-h-full px-4 pb-12 pt-4"
      style={{ background: "linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}
    >
      {/* Hero */}
      <div className="relative mb-8">
        <ConfettiDots />
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center pt-6"
        >
          <p
            className="text-[38px] font-extrabold leading-tight"
            style={{
              background: "linear-gradient(90deg, #f97316, #ec4899, #6366f1)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Твоят {currentYear}
          </p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="text-[14px] text-white/60 mt-2"
          >
            Ето как изглежда годината ти зад волана
          </motion.p>
        </motion.div>
      </div>

      {/* Empty state */}
      {tripCount === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center py-16"
        >
          <p className="text-[48px]">🚗</p>
          <p className="text-white/60 text-[14px] mt-3">Няма пътувания за {currentYear} г. още.</p>
          <p className="text-white/40 text-[12px] mt-1">Добави пътувания за да видиш своя Wrapped.</p>
        </motion.div>
      ) : (
        <div className="space-y-5">
          {/* Big stat cards 2x2 */}
          <div className="grid grid-cols-2 gap-3">
            <BigStatCard
              label="Изминати км"
              value={totalKm.toFixed(0)}
              unit="километра"
              gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
              delay={0.2}
            />
            <BigStatCard
              label="Разходи за гориво"
              value={totalFuel.toFixed(0)}
              unit={currency}
              gradient="linear-gradient(135deg, #f97316 0%, #c2410c 100%)"
              delay={0.3}
            />
            <BigStatCard
              label="Пътувания"
              value={String(tripCount)}
              unit="броя"
              gradient="linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)"
              delay={0.4}
            />
            <BigStatCard
              label="Среден разход"
              value={avgCons.toFixed(1)}
              unit="л/100км"
              gradient="linear-gradient(135deg, #22c55e 0%, #15803d 100%)"
              delay={0.5}
            />
          </div>

          {/* Fun facts */}
          <div className="space-y-2.5">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-[12px] font-bold text-white/40 uppercase tracking-wider px-1"
            >
              Интересни факти
            </motion.p>
            {sofiaVarnaTimes > 0 && (
              <FunFactRow
                icon="🗺️"
                text={`Изминал си разстоянието от София до Варна ${sofiaVarnaTimes} ${sofiaVarnaTimes === 1 ? "път" : "пъти"} (${totalKm.toFixed(0)} км)`}
                delay={0.65}
              />
            )}
            {longestDist > 0 && (
              <FunFactRow
                icon="🛣️"
                text={`Най-дългото ти пътуване беше ${longestDist.toFixed(0)} км`}
                delay={0.75}
              />
            )}
            {avgCostPerTrip > 0 && (
              <FunFactRow
                icon="💰"
                text={`Харчиш средно ${avgCostPerTrip.toFixed(2)} ${currency} на пътуване`}
                delay={0.85}
              />
            )}
          </div>

          {/* Best trip */}
          {bestTrip && (
            <div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.95 }}
                className="text-[12px] font-bold text-white/40 uppercase tracking-wider px-1 mb-2"
              >
                Звезда на годината
              </motion.p>
              <BestTripHighlight trip={bestTrip} currency={currency} delay={1.0} />
            </div>
          )}

          {/* Expense breakdown */}
          {yearExpenses.length > 0 && (
            <div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="text-[12px] font-bold text-white/40 uppercase tracking-wider px-1 mb-2"
              >
                Разходи за {currentYear}
              </motion.p>
              <ExpenseBreakdown expenses={yearExpenses} currency={currency} delay={1.15} />
            </div>
          )}

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            className="text-center pt-4"
          >
            <p className="text-[12px] text-white/30">Продължавай да шофираш умно ✨</p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
