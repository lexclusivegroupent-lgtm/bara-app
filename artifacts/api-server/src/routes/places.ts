import { Router, type IRouter, type Request, type Response } from "express";
import { authenticate } from "../middlewares/auth";
import { db } from "@workspace/db";
import { mapsApiCallsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const geocodeCache = new Map<string, { data: unknown; expires: number }>();

function getCached(key: string): unknown | null {
  const entry = geocodeCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    geocodeCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown): void {
  geocodeCache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

function getToken(): string | null {
  return process.env.MAPBOX_SECRET_TOKEN || process.env.EXPO_PUBLIC_MAPBOX_TOKEN || null;
}

function trackCall(callType: string): void {
  const yearMonth = new Date().toISOString().slice(0, 7);
  db.insert(mapsApiCallsTable)
    .values({ yearMonth, callType, callCount: 1 })
    .onConflictDoUpdate({
      target: [mapsApiCallsTable.yearMonth, mapsApiCallsTable.callType],
      set: {
        callCount: sql`${mapsApiCallsTable.callCount} + 1`,
        updatedAt: sql`now()`,
      },
    })
    .catch(() => {});
}

// GET /api/places/autocomplete?input=Kungsgatan
router.get("/autocomplete", authenticate, async (req: Request, res: Response) => {
  const input = (req.query.input as string || "").trim();
  if (!input || input.length < 2) {
    res.json({ predictions: [] });
    return;
  }

  const token = getToken();
  if (!token) {
    res.status(503).json({ error: "Mapbox token not configured" });
    return;
  }

  const cacheKey = `ac:${input}`;
  const cached = getCached(cacheKey);
  if (cached) {
    res.set("X-Cache", "HIT");
    res.json(cached);
    return;
  }

  try {
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input)}.json`);
    url.searchParams.set("access_token", token);
    url.searchParams.set("country", "se");
    url.searchParams.set("language", "sv");
    url.searchParams.set("types", "address,place,locality,neighborhood");
    url.searchParams.set("autocomplete", "true");
    url.searchParams.set("limit", "5");

    const mapboxRes = await fetch(url.toString());
    if (!mapboxRes.ok) {
      res.status(502).json({ error: "Geocoding API error" });
      return;
    }

    const data = await mapboxRes.json() as any;
    trackCall("autocomplete");

    const predictions = (data.features || []).map((f: any) => {
      const parts = (f.place_name as string).split(", ");
      const mainText = f.text || parts[0];
      const secondaryText = parts.length > 1 ? parts.slice(1).join(", ") : "";
      const [lng, lat] = f.geometry?.coordinates ?? [null, null];
      return {
        placeId: f.id,
        description: f.place_name,
        mainText,
        secondaryText,
        lat: lat ?? undefined,
        lng: lng ?? undefined,
      };
    });

    const result = { predictions };
    setCache(cacheKey, result);
    res.set("X-Cache", "MISS");
    res.json(result);
  } catch (err) {
    (req as any).log?.error(err, "Places autocomplete error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/places/details?placeId=<mapbox-feature-id-or-address>
// Coordinates are already returned with autocomplete predictions.
// This endpoint is a fallback for clients that didn't receive coordinates.
router.get("/details", authenticate, async (req: Request, res: Response) => {
  const placeId = (req.query.placeId as string || "").trim();
  if (!placeId) {
    res.status(400).json({ error: "placeId is required" });
    return;
  }

  const token = getToken();
  if (!token) {
    res.status(503).json({ error: "Mapbox token not configured" });
    return;
  }

  const cacheKey = `det:${placeId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    res.set("X-Cache", "HIT");
    res.json(cached);
    return;
  }

  try {
    // Use placeId as search text — reliable for any address string
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(placeId)}.json`);
    url.searchParams.set("access_token", token);
    url.searchParams.set("country", "se");
    url.searchParams.set("language", "sv");
    url.searchParams.set("limit", "1");

    const mapboxRes = await fetch(url.toString());
    if (!mapboxRes.ok) {
      res.status(502).json({ error: "Geocoding API error" });
      return;
    }

    const data = await mapboxRes.json() as any;
    if (!data.features?.length) {
      res.status(404).json({ error: "Place not found" });
      return;
    }

    trackCall("details");

    const feature = data.features[0];
    const [lng, lat] = feature.geometry.coordinates;
    const result = { address: feature.place_name, lat, lng };
    setCache(cacheKey, result);
    res.set("X-Cache", "MISS");
    res.json(result);
  } catch (err) {
    (req as any).log?.error(err, "Places details error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
