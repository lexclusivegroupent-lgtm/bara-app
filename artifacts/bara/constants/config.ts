export const SWEDISH_CITIES = [
  "Stockholm",
  "Göteborg",
  "Malmö",
  "Uppsala",
  "Västerås",
  "Örebro",
  "Linköping",
  "Helsingborg",
  "Jönköping",
  "Norrköping",
  "Lund",
  "Umeå",
  "Gävle",
  "Borås",
  "Södertälje",
  "Eskilstuna",
  "Karlstad",
  "Täby",
  "Växjö",
  "Sundsvall",
];

export type JobType = "furniture_transport" | "bulky_delivery" | "junk_pickup";

export function calculatePrice(jobType: JobType, distanceKm: number): {
  priceTotal: number;
  driverPayout: number;
  platformFee: number;
} {
  let basePrice: number;
  let ratePerKm: number;
  let minimum: number;

  switch (jobType) {
    case "furniture_transport":
      basePrice = 299;
      ratePerKm = 15;
      minimum = 349;
      break;
    case "bulky_delivery":
      basePrice = 249;
      ratePerKm = 12;
      minimum = 299;
      break;
    case "junk_pickup":
    default:
      basePrice = 199;
      ratePerKm = 10;
      minimum = 249;
      break;
  }

  const priceTotal = Math.max(minimum, basePrice + distanceKm * ratePerKm);
  const rounded = Math.round(priceTotal);
  const driverPayout = Math.round(rounded * 0.75);
  const platformFee = Math.round(rounded * 0.25);

  return { priceTotal: rounded, driverPayout, platformFee };
}

export function formatSEK(amount: number): string {
  return `${amount.toLocaleString("sv-SE")} kr`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "Not specified";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "pending":     return "#8B9CBD";
    case "accepted":    return "#4A9EE8";
    case "arrived":     return "#A47FE8";
    case "in_progress": return "#E87A2A";
    case "completed":   return "#4CAF82";
    case "cancelled":   return "#E05252";
    case "disputed":    return "#C9A84C";
    default:            return "#8B9CBD";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "pending":     return "Pending";
    case "accepted":    return "Accepted";
    case "arrived":     return "Driver Arrived";
    case "in_progress": return "In Progress";
    case "completed":   return "Completed";
    case "cancelled":   return "Cancelled";
    case "disputed":    return "Disputed";
    default:            return status;
  }
}

export function getJobTypeLabel(jobType: string): string {
  switch (jobType) {
    case "furniture_transport": return "Furniture Transport";
    case "bulky_delivery":      return "Bulky Item Delivery";
    case "junk_pickup":         return "Junk & Trash Pickup";
    default:                    return jobType;
  }
}

export const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || "";

export const CITY_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  Stockholm:    { latitude: 59.3293, longitude: 18.0686 },
  Göteborg:     { latitude: 57.7089, longitude: 11.9746 },
  Malmö:        { latitude: 55.6050, longitude: 13.0038 },
  Uppsala:      { latitude: 59.8586, longitude: 17.6389 },
  Västerås:     { latitude: 59.6109, longitude: 16.5448 },
  Örebro:       { latitude: 59.2741, longitude: 15.2066 },
  Linköping:    { latitude: 58.4109, longitude: 15.6219 },
  Helsingborg:  { latitude: 56.0467, longitude: 12.6945 },
  Jönköping:    { latitude: 57.7826, longitude: 14.1618 },
  Norrköping:   { latitude: 58.5942, longitude: 16.1826 },
  Lund:         { latitude: 55.7047, longitude: 13.1910 },
  Umeå:         { latitude: 63.8258, longitude: 20.2630 },
  Gävle:        { latitude: 60.6749, longitude: 17.1413 },
  Borås:        { latitude: 57.7210, longitude: 12.9401 },
  Södertälje:   { latitude: 59.1955, longitude: 17.6253 },
  Eskilstuna:   { latitude: 59.3706, longitude: 16.5099 },
  Karlstad:     { latitude: 59.3793, longitude: 13.5036 },
  Täby:         { latitude: 59.4441, longitude: 18.0689 },
  Växjö:        { latitude: 56.8777, longitude: 14.8096 },
  Sundsvall:    { latitude: 62.3913, longitude: 17.3069 },
};

const geocodeCache = new Map<string, { latitude: number; longitude: number } | null>();

export async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  if (geocodeCache.has(address)) return geocodeCache.get(address)!;
  if (!GOOGLE_MAPS_KEY || GOOGLE_MAPS_KEY === "YOUR_GOOGLE_MAPS_API_KEY_HERE") return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "OK" && data.results[0]) {
      const loc = data.results[0].geometry.location;
      const result = { latitude: loc.lat, longitude: loc.lng };
      geocodeCache.set(address, result);
      return result;
    }
  } catch {}
  geocodeCache.set(address, null);
  return null;
}
