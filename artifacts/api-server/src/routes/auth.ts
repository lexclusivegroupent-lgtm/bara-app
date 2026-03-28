import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, signToken, AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/register", async (req, res) => {
  const { email, password, fullName, role, city, vehicleDescription } = req.body;

  if (!email || !password || !fullName || !role || !city) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(usersTable).values({
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      role,
      city,
      vehicleDescription: vehicleDescription || null,
      isAvailable: true,
      totalJobs: 0,
    }).returning();

    const token = signToken(user.id, user.role);
    res.status(201).json({
      token,
      user: formatUser(user),
    });
  } catch (err) {
    req.log?.error(err, "Register error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Missing email or password" });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken(user.id, user.role);
    res.json({
      token,
      user: formatUser(user),
    });
  } catch (err) {
    req.log?.error(err, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(formatUser(user));
  } catch (err) {
    req.log?.error(err, "Get me error");
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    city: user.city,
    profilePhoto: user.profilePhoto,
    isAvailable: user.isAvailable,
    rating: user.rating ? parseFloat(user.rating) : null,
    totalJobs: user.totalJobs,
    vehicleDescription: user.vehicleDescription,
    createdAt: user.createdAt.toISOString(),
  };
}

export { formatUser };
export default router;
