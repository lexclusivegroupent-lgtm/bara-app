import { Router, type IRouter, Request, Response } from "express";
import { db } from "@workspace/db";
import { jobsTable, usersTable } from "@workspace/db";
import { eq, sql, count } from "drizzle-orm";

const router: IRouter = Router();

function checkAdminKey(req: Request, res: Response): boolean {
  const adminKey = process.env.ADMIN_STATS_KEY || "bara-admin-2025";
  const provided = (req.headers["x-admin-key"] as string) || (req.query.key as string);
  if (!provided || provided !== adminKey) {
    res.status(401).json({ error: "Unauthorized. Provide x-admin-key header or ?key= query param." });
    return false;
  }
  return true;
}

router.get("/stats", async (req: Request, res: Response) => {
  if (!checkAdminKey(req, res)) return;

  try {
    const [{ totalUsers }] = await db
      .select({ totalUsers: count() })
      .from(usersTable);

    const [{ totalCompletedJobs }] = await db
      .select({ totalCompletedJobs: count() })
      .from(jobsTable)
      .where(eq(jobsTable.status, "completed"));

    const [{ totalJobs }] = await db
      .select({ totalJobs: count() })
      .from(jobsTable);

    const jobsByCity = await db
      .select({
        city: jobsTable.city,
        total: count(),
        completed: sql<number>`count(*) filter (where ${jobsTable.status} = 'completed')`,
      })
      .from(jobsTable)
      .groupBy(jobsTable.city)
      .orderBy(sql`count(*) desc`);

    const activeDriversByCity = await db
      .select({
        city: usersTable.city,
        activeDrivers: sql<number>`count(*) filter (where ${usersTable.isAvailable} = true)`,
        totalDrivers: count(),
      })
      .from(usersTable)
      .where(eq(usersTable.role, "driver"))
      .groupBy(usersTable.city)
      .orderBy(sql`count(*) desc`);

    const bothRoleDriversByCity = await db
      .select({
        city: usersTable.city,
        count: count(),
      })
      .from(usersTable)
      .where(eq(usersTable.role, "both"))
      .groupBy(usersTable.city);

    const [{ oldestJob }] = await db
      .select({ oldestJob: sql<string>`min(${jobsTable.createdAt})` })
      .from(jobsTable);

    let avgJobsPerDay: number | null = null;
    if (oldestJob && totalJobs > 0) {
      const daysSinceFirst = Math.max(
        1,
        (Date.now() - new Date(oldestJob).getTime()) / (1000 * 60 * 60 * 24)
      );
      avgJobsPerDay = Math.round((totalJobs / daysSinceFirst) * 10) / 10;
    }

    res.json({
      overview: {
        totalUsers,
        totalJobs,
        totalCompletedJobs,
        completionRate: totalJobs > 0 ? Math.round((totalCompletedJobs / totalJobs) * 100) : 0,
        avgJobsPerDay,
        firstJobAt: oldestJob || null,
        generatedAt: new Date().toISOString(),
      },
      jobsByCity,
      activeDriversByCity,
      bothRoleDriversByCity,
    });
  } catch (err: any) {
    console.error("Admin stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
