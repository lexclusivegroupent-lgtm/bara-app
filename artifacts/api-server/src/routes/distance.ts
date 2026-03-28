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

const SWEDISH_CITIES: Record<string, { lat: number; lon: number }> = {
  "Stockholm": { lat: 59.3293, lon: 18.0686 },
  "Göteborg": { lat: 57.7089, lon: 11.9746 },
  "Malmö": { lat: 55.6050, lon: 13.0038 },
  "Uppsala": { lat: 59.8586, lon: 17.6389 },
  "Västerås": { lat: 59.6099, lon: 16.5448 },
  "Örebro": { lat: 59.2741, lon: 15.2066 },
  "Linköping": { lat: 58.4108, lon: 15.6214 },
  "Helsingborg": { lat: 56.0465, lon: 12.6945 },
  "Jönköping": { lat: 57.7826, lon: 14.1618 },
  "Norrköping": { lat: 58.5942, lon: 16.1826 },
};

router.post("/", authenticate, async (req, res) => {
  const { origin, destination } = req.body;

  if (!origin || !destination) {
    res.status(400).json({ error: "Origin and destination are required" });
    return;
  }

  try {
    const estimatedKm = 8 + Math.random() * 22;
    const distanceKm = Math.round(estimatedKm * 10) / 10;

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
