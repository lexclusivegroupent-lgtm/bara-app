import { Router } from "express";
import crypto from "node:crypto";
import { authenticate } from "../middlewares/auth";
import type { AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

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

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "bara-jobs";
  const signature = crypto
    .createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  const formData = new FormData();
  formData.append("file", data);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

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
