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

function getMapsKey(): string | undefined {
  return process.env.GOOGLE_MAPS_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
}

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  const key = getMapsKey();
  if (!key) return null;

  const query = encodeURIComponent(`${address}, Sweden`);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${key}&region=se&language=sv`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  if (data.status === "OK" && data.results?.[0]) {
    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lon: lng };
  }
  return null;
}

router.post("/", authenticate, async (req, res) => {
  const { origin, destination } = req.body;

  if (!origin || !destination) {
    res.status(400).json({ error: "Origin and destination are required" });
    return;
  }

  const key = getMapsKey();
  if (!key) {
    res.status(503).json({
      error: "Distance calculation is unavailable. GOOGLE_MAPS_KEY is not configured on the server.",
      code: "MAPS_KEY_MISSING",
    });
    return;
  }

  try {
    const [originCoords, destCoords] = await Promise.all([
      geocodeAddress(origin),
      geocodeAddress(destination),
    ]);

    if (!originCoords || !destCoords) {
      res.status(422).json({
        error: "Could not find one or both addresses. Please check the addresses and try again.",
        code: "GEOCODE_FAILED",
      });
      return;
    }

    const rawKm = haversineDistance(originCoords.lat, originCoords.lon, destCoords.lat, destCoords.lon);
    const distanceKm = Math.max(1, Math.round(rawKm * 10) / 10);

    res.json({
      distanceKm,
      distanceText: `${distanceKm} km`,
    });
  } catch (err) {
    req.log?.error(err, "Distance calculation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
