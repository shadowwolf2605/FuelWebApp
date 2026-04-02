export interface ActiveTrip {
  id: string;
  startedAt: string;
  startKm: number;
  liters: number;
  pricePerLiter: number;
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
}

export interface CarDocument {
  id: string;
  name: string;
  category: "insurance" | "registration" | "inspection" | "other";
  dataUrl: string;
  addedAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface Expense {
  id: string;
  category: "repair" | "wash" | "parking" | "toll" | "fine" | "other";
  amount: number;
  date: string;
  note: string;
}

export interface SavedLocation {
  lat: number;
  lon: number;
  timestamp: string;
}

export interface CarProfile {
  make: string;
  model: string;
  year: string;
  currentValue: string;
  annualKm: string;
  insuranceCost: string;
  maintenanceBudget: string;
}

export function tripDistance(t: CompletedTrip) { return t.endKm - t.startKm; }
export function tripConsumption(t: CompletedTrip) { return (t.liters / tripDistance(t)) * 100; }
export function tripTotalCost(t: CompletedTrip) { return t.liters * t.pricePerLiter; }
