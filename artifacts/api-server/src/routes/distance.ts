import { Router, type IRouter } from "express";
import { authenticate } from "../middlewares/auth";

const router: IRouter = Router();

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function geocodeNominatim(address: string): Promise<{ lat: number; lon: number } | null> {
  const query = encodeURIComponent(`${address}, Sverige`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&countrycodes=se&limit=1`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Bara-App/1.0 (noreply@baraapp.se)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

async function geocodeGoogleMaps(address: string): Promise<{ lat: number; lon: number } | null> {
  const key = process.env.GOOGLE_MAPS_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key) return null;

  const query = encodeURIComponent(`${address}, Sweden`);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${key}&region=se&language=sv`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === "OK" && data.results?.[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lon: lng };
    }
    return null;
  } catch {
    return null;
  }
}

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  const nominatim = await geocodeNominatim(address);
  if (nominatim) return nominatim;
  return geocodeGoogleMaps(address);
}

function calcPrice(distanceKm: number, jobType?: string): { priceBase: number; pricePerKm: number; priceTotal: number } {
  const type = (jobType || "furniture_transport").toLowerCase();
  let base = 799;
  let perKm = 15;

  if (type === "bulky_delivery") {
    base = 499;
    perKm = 12;
  } else if (type === "junk_pickup") {
    base = 699;
    perKm = 14;
  }

  const priceTotal = Math.round(base + perKm * distanceKm);
  return { priceBase: base, pricePerKm: perKm, priceTotal };
}

router.post("/", authenticate, async (req, res) => {
  const { origin, destination, jobType } = req.body;

  if (!origin || !destination) {
    res.status(400).json({ error: "Origin and destination are required" });
    return;
  }

  try {
    const [originCoords, destCoords] = await Promise.all([
      geocodeAddress(origin),
      geocodeAddress(destination),
    ]);

    if (!originCoords || !destCoords) {
      res.status(422).json({
        error: "Could not find one or both addresses. Please try city names like 'Stockholm' or 'Göteborg'.",
        code: "GEOCODE_FAILED",
      });
      return;
    }

    const rawKm = haversineDistance(originCoords.lat, originCoords.lon, destCoords.lat, destCoords.lon);
    const distanceKm = Math.max(1, Math.round(rawKm * 10) / 10);
    const pricing = calcPrice(distanceKm, jobType);

    res.json({
      distanceKm,
      distanceText: `${distanceKm} km`,
      ...pricing,
    });
  } catch (err) {
    req.log?.error(err, "Distance calculation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
