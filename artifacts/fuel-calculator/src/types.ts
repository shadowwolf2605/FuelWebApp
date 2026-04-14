export type FuelType = "petrol" | "diesel" | "gas" | "electric" | "hybrid";

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  petrol: "Бензин",
  diesel: "Дизел",
  gas: "Газ",
  electric: "Електро",
  hybrid: "Хибрид",
};

export const FUEL_TYPE_COLORS: Record<FuelType, string> = {
  petrol: "text-orange-500 bg-orange-500/10",
  diesel: "text-blue-500 bg-blue-500/10",
  gas: "text-green-500 bg-green-500/10",
  electric: "text-teal-500 bg-teal-500/10",
  hybrid: "text-purple-500 bg-purple-500/10",
};

export interface ActiveTrip {
  id: string;
  startedAt: string;
  startKm: number;
  liters: number;
  pricePerLiter: number;
  fuelType?: FuelType;
  carId?: string;
  routePoints?: { lat: number; lon: number }[];
  receiptPhoto?: string;
  passengers?: number;
}

export interface CompletedTrip {
  id: string;
  startedAt: string;
  endedAt: string;
  startKm: number;
  endKm: number;
  liters: number;
  pricePerLiter: number;
  note: string;
  fuelType?: FuelType;
  carId?: string;
  routePoints?: { lat: number; lon: number }[];
  photo?: string;
  passengers?: number;
}

export interface FuelFillUp {
  id: string;
  date: string;
  station?: string;
  liters: number;
  pricePerLiter: number;
  photo?: string;
  carId?: string;
}

export interface MaintenanceItem {
  id: string;
  category: "oil" | "insurance" | "tires" | "inspection" | "other";
  title: string;
  doneDate: string;
  nextDate: string;
  cost: number;
  mileage: number;
  note: string;
  carId?: string;
}

export interface CarDocument {
  id: string;
  name: string;
  category: "insurance" | "registration" | "inspection" | "other";
  dataUrl: string;
  addedAt: string;
  carId?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface Expense {
  id: string;
  category: "repair" | "wash" | "parking" | "toll" | "fine" | "vignette" | "insurance" | "inspection" | "other";
  amount: number;
  date: string;
  note: string;
  fineDeadline?: string;
  finePaid?: boolean;
  photo?: string;
  carId?: string;
}

export interface RecurringExpense {
  id: string;
  label: string;
  category: "repair" | "wash" | "parking" | "toll" | "fine" | "vignette" | "insurance" | "inspection" | "other";
  amount: number;
  intervalMonths: number;
  nextDueDate: string;
  note?: string;
  carId?: string;
}

export interface SavedLocation {
  lat: number;
  lon: number;
  timestamp: string;
}

export interface ExpiryDates {
  vignette: string;      // Винетка
  civil: string;         // Гражданска отговорност
  kasko: string;         // Каско
  inspection: string;    // Технически преглед
  driverLicense: string; // Шофьорска книжка
  vignettePaid?: boolean;
  civilPaid?: boolean;
  kaskoPaid?: boolean;
  inspectionPaid?: boolean;
  vignetteAmount?: number;
  civilAmount?: number;
  kaskoAmount?: number;
  inspectionAmount?: number;
}

export interface CarProfile {
  id: string;
  make: string;
  model: string;
  year: string;
  fuelType: "petrol" | "diesel" | "gas" | "electric" | "hybrid";
  currentValue: string;
  annualKm: string;
  insuranceCost: string;
  maintenanceBudget: string;
  photo?: string;
  oilChangeKm?: number;
  lastOilChangeKm?: number;
  currentKm?: number;
  expiries?: ExpiryDates;  // per-car document expiry dates
}

export function tripDistance(t: CompletedTrip) { return t.endKm - t.startKm; }
export function tripConsumption(t: CompletedTrip) {
  const d = tripDistance(t);
  return d > 0 ? (t.liters / d) * 100 : 0;
}
export function tripTotalCost(t: CompletedTrip) { return t.liters * t.pricePerLiter; }

export type AppTheme = "blue" | "purple" | "green" | "orange" | "rose";

export interface ParkingTimer {
  startedAt: string;       // ISO timestamp
  durationMinutes: number; // how long paid for
}

export interface CarDamage {
  id: string;
  location: "front" | "rear" | "left" | "right" | "roof" | "other";
  description: string;
  date: string;
  repaired: boolean;
  repairCost?: number;
  photo?: string;
  carId?: string;
}
