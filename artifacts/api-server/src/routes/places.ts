import { Router, type IRouter, type Request, type Response } from "express";
import { authenticate } from "../middlewares/auth";

const router: IRouter = Router();

function getKey(): string | null {
  return process.env.GOOGLE_MAPS_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || null;
}

// GET /api/places/autocomplete?input=Kungsgatan
router.get("/autocomplete", authenticate, async (req: Request, res: Response) => {
  const input = (req.query.input as string || "").trim();
  if (!input || input.length < 2) {
    res.json({ predictions: [] });
    return;
  }

  const key = getKey();
  if (!key) {
    res.status(503).json({ error: "Places API not configured" });
    return;
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", input);
    url.searchParams.set("key", key);
    url.searchParams.set("components", "country:se");
    url.searchParams.set("language", "sv");
    url.searchParams.set("types", "address");

    const googleRes = await fetch(url.toString());
    if (!googleRes.ok) {
      res.status(502).json({ error: "Places API error" });
      return;
    }

    const data = await googleRes.json();

    if (data.status === "REQUEST_DENIED") {
      res.status(403).json({ error: "Places API key invalid or restricted" });
      return;
    }

    const predictions = (data.predictions || []).slice(0, 5).map((p: any) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text ?? p.description,
      secondaryText: p.structured_formatting?.secondary_text ?? "",
    }));

    res.json({ predictions });
  } catch (err) {
    (req as any).log?.error(err, "Places autocomplete error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/places/details?placeId=ChIJ...
router.get("/details", authenticate, async (req: Request, res: Response) => {
  const placeId = (req.query.placeId as string || "").trim();
  if (!placeId) {
    res.status(400).json({ error: "placeId is required" });
    return;
  }

  const key = getKey();
  if (!key) {
    res.status(503).json({ error: "Places API not configured" });
    return;
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("key", key);
    url.searchParams.set("fields", "geometry,formatted_address");
    url.searchParams.set("language", "sv");

    const googleRes = await fetch(url.toString());
    if (!googleRes.ok) {
      res.status(502).json({ error: "Places API error" });
      return;
    }

    const data = await googleRes.json();
    if (data.status !== "OK" || !data.result) {
      res.status(404).json({ error: "Place not found" });
      return;
    }

    const loc = data.result.geometry?.location;
    res.json({
      address: data.result.formatted_address,
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
    });
  } catch (err) {
    (req as any).log?.error(err, "Places details error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
