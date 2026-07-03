import { Router } from "express";
import crypto from "node:crypto";
import { authenticate } from "../middlewares/auth";
import type { AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

// ─── Upload hardening ────────────────────────────────────────────────────────

const ALLOWED_MIME_PREFIXES = [
  "data:image/jpeg;base64,",
  "data:image/png;base64,",
  "data:image/webp;base64,",
];

const MAX_DECODED_BYTES = 5 * 1024 * 1024; // 5MB

// Per-user rate limit: 20 uploads per rolling hour, in-memory (no new deps).
const uploadCounts = new Map<string, number[]>(); // userId → array of timestamps (ms)

function checkUploadRateLimit(userId: string): boolean {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const timestamps = (uploadCounts.get(userId) ?? []).filter(t => t > oneHourAgo);
  if (timestamps.length >= 20) return false;
  timestamps.push(now);
  uploadCounts.set(userId, timestamps);
  return true;
}

router.post("/", authenticate, async (req: AuthenticatedRequest, res) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    res.status(503).json({ error: "Photo upload is not configured." });
    return;
  }

  const { data } = req.body as { data?: string };
  if (!data || typeof data !== "string") {
    res.status(400).json({ error: "Missing field: data (base64 image URI)" });
    return;
  }

  // MIME allowlist — only real image data URIs, no SVG/HTML/PDF smuggling
  if (!ALLOWED_MIME_PREFIXES.some(p => data.startsWith(p))) {
    res.status(400).json({ error: "Only JPEG, PNG, or WebP images are allowed" });
    return;
  }

  // Size cap: base64 expands ~4/3, so decoded size ≈ length * 0.75
  if (data.length * 0.75 > MAX_DECODED_BYTES) {
    res.status(400).json({ error: "Image must be under 5MB" });
    return;
  }

  if (!checkUploadRateLimit(String(req.userId!))) {
    res.status(429).json({ error: "Upload limit reached. Try again in an hour." });
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "bara-jobs";
  // Cloudinary auto-compression (f_auto,q_auto) to cut storage cost.
  // Signed params must be in the signature string in alphabetical order.
  const transformation = "f_auto,q_auto";
  const signature = crypto
    .createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}&transformation=${transformation}${apiSecret}`)
    .digest("hex");

  const formData = new FormData();
  formData.append("file", data);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);
  formData.append("transformation", transformation);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: formData }
    );
    const result = (await response.json()) as any;
    if (!response.ok) {
      res.status(502).json({ error: result?.error?.message || "Upload failed" });
      return;
    }
    res.json({ url: result.secure_url as string });
  } catch {
    res.status(502).json({ error: "Could not reach Cloudinary." });
  }
});

export default router;
