import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { savedAddressesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate, AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const addresses = await db.select()
      .from(savedAddressesTable)
      .where(eq(savedAddressesTable.userId, req.userId!))
      .orderBy(savedAddressesTable.createdAt);
    res.json(addresses.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })));
  } catch (err) {
    req.log?.error(err, "Get addresses error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", authenticate, async (req: AuthenticatedRequest, res) => {
  const { label, address } = req.body;
  if (!label?.trim() || !address?.trim()) {
    res.status(400).json({ error: "label and address are required" });
    return;
  }
  try {
    const existing = await db.select().from(savedAddressesTable)
      .where(eq(savedAddressesTable.userId, req.userId!));
    if (existing.length >= 10) {
      res.status(400).json({ error: "Maximum of 10 saved addresses allowed" });
      return;
    }
    const [addr] = await db.insert(savedAddressesTable).values({
      userId: req.userId!,
      label: label.trim(),
      address: address.trim(),
    }).returning();
    res.status(201).json({ ...addr, createdAt: addr.createdAt.toISOString() });
  } catch (err) {
    req.log?.error(err, "Save address error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  try {
    await db.delete(savedAddressesTable)
      .where(and(eq(savedAddressesTable.id, id), eq(savedAddressesTable.userId, req.userId!)));
    res.json({ ok: true });
  } catch (err) {
    req.log?.error(err, "Delete address error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
