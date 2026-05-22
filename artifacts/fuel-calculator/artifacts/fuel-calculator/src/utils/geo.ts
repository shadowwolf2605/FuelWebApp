export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface GeoResult {
  lat: number;
  lon: number;
  label: string;
}

export async function geocodeAddress(q: string): Promise<GeoResult | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: { "Accept-Language": "bg,en" } },
    );
    const data = await r.json();
    if (!data[0]) return null;
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      label: data[0].display_name.split(",")[0],
    };
  } catch {
    return null;
  }
}

export async function routeDistanceKm(a: GeoResult, b: GeoResult): Promise<number> {
  const r = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`,
  );
  const data = await r.json();
  if (data.code !== "Ok" || !data.routes?.[0]) throw new Error("Маршрутът не беше намерен");
  return data.routes[0].distance / 1000;
}
