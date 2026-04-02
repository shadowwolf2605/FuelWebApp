import { motion } from "framer-motion";
import { Navigation } from "lucide-react";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/5 dark:border-white/8 ${className}`}
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
    >
      {children}
    </div>
  );
}

export function Divider() {
  return <div className="h-px bg-gray-100 dark:bg-white/6" />;
}

export function Field({
  label, placeholder, unit, icon, iconColorClass, value, onChange, type = "number", readOnly = false,
}: {
  label: string; placeholder: string; unit?: string;
  icon: React.ReactNode; iconColorClass: string;
  value: string; onChange?: (v: string) => void;
  type?: string; readOnly?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-7 flex-shrink-0 flex items-center justify-center ${iconColorClass}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-0.5 leading-none">{label}</p>
        <div className="flex items-center gap-2">
          <input
            type={type}
            inputMode={type === "number" ? "decimal" : "text"}
            placeholder={placeholder}
            value={value}
            readOnly={readOnly}
            onChange={(e) => onChange?.(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-[15px] font-medium text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 outline-none border-none focus:ring-0 read-only:opacity-60"
          />
          {unit && (
            <span className="text-[13px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/8 px-2 py-[3px] rounded-md flex-shrink-0">
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function StatPill({ icon, colorClass, label, value, unit }: {
  icon: React.ReactNode; colorClass: string; label: string; value: string; unit: string;
}) {
  return (
    <div className="flex-1 bg-gray-50 dark:bg-white/5 rounded-xl p-3 flex flex-col gap-1">
      <div className={colorClass}>{icon}</div>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-none">{label}</p>
      <div className="flex items-baseline gap-0.5">
        <span className="text-[15px] font-bold text-gray-900 dark:text-white tabular-nums">{value}</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">{unit}</span>
      </div>
    </div>
  );
}

export function PulsingDot() {
  return (
    <div className="relative flex items-center justify-center w-12 h-12">
      <motion.div className="absolute rounded-full bg-blue-500/25" style={{ width: 48, height: 48 }}
        animate={{ scale: [1, 1.6], opacity: [1, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }} />
      <motion.div className="absolute rounded-full bg-blue-500/40" style={{ width: 30, height: 30 }}
        animate={{ scale: [1, 1.3], opacity: [0.8, 0.1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }} />
      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center z-10">
        <Navigation size={10} className="text-white fill-white" />
      </div>
    </div>
  );
}

export function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[15px] font-semibold text-gray-900 dark:text-white">{title}</span>
      </div>
      {count !== undefined && (
        <span className="text-[12px] text-gray-400 dark:text-gray-500">{count}</span>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <div className="text-gray-200 dark:text-gray-700">{icon}</div>
      <p className="text-[14px] text-gray-400 dark:text-gray-500">{title}</p>
      {subtitle && <p className="text-[12px] text-gray-300 dark:text-gray-600 text-center px-6">{subtitle}</p>}
    </div>
  );
}

export function ActionButton({
  onClick, disabled = false, color = "blue", children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  color?: "blue" | "green" | "orange" | "red" | "purple";
  children: React.ReactNode;
}) {
  const colors = {
    blue: "bg-blue-500 text-white shadow-blue-500/25",
    green: "bg-green-500 text-white shadow-green-500/25",
    orange: "bg-orange-500 text-white shadow-orange-500/25",
    red: "bg-red-500 text-white shadow-red-500/25",
    purple: "bg-purple-500 text-white shadow-purple-500/25",
  };
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[15px] font-semibold transition-all duration-200 shadow-sm ${
        disabled
          ? "bg-gray-100 dark:bg-white/6 text-gray-300 dark:text-gray-600 cursor-not-allowed shadow-none"
          : colors[color]
      }`}
    >
      {children}
    </motion.button>
  );
}
