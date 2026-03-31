import { Router, type IRouter, Request, Response } from "express";
import { db } from "@workspace/db";
import { jobsTable, usersTable } from "@workspace/db";
import { eq, sql, count, and } from "drizzle-orm";

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

    const [{ totalDrivers }] = await db
      .select({ totalDrivers: count() })
      .from(usersTable)
      .where(eq(usersTable.role, "driver"));

    const [{ totalBothRoleUsers }] = await db
      .select({ totalBothRoleUsers: count() })
      .from(usersTable)
      .where(eq(usersTable.role, "both"));

    const [{ activeDrivers }] = await db
      .select({ activeDrivers: sql<number>`count(*) filter (where ${usersTable.isAvailable} = true)` })
      .from(usersTable)
      .where(sql`${usersTable.role} in ('driver', 'both')`);

    const [{ totalJobs }] = await db
      .select({ totalJobs: count() })
      .from(jobsTable);

    const [{ totalCompletedJobs }] = await db
      .select({ totalCompletedJobs: count() })
      .from(jobsTable)
      .where(eq(jobsTable.status, "completed"));

    const [{ totalCancelledJobs }] = await db
      .select({ totalCancelledJobs: count() })
      .from(jobsTable)
      .where(eq(jobsTable.status, "cancelled"));

    const [{ totalDisputedJobs }] = await db
      .select({ totalDisputedJobs: count() })
      .from(jobsTable)
      .where(eq(jobsTable.disputed, true));

    const [{ totalPendingJobs }] = await db
      .select({ totalPendingJobs: count() })
      .from(jobsTable)
      .where(eq(jobsTable.status, "pending"));

    const [{ avgCompletionMinutes }] = await db
      .select({
        avgCompletionMinutes: sql<number>`
          avg(extract(epoch from (${jobsTable.completedAt} - ${jobsTable.createdAt})) / 60)
          filter (where ${jobsTable.status} = 'completed' and ${jobsTable.completedAt} is not null)
        `,
      })
      .from(jobsTable);

    const jobsByType = await db
      .select({
        jobType: jobsTable.jobType,
        total: count(),
        completed: sql<number>`count(*) filter (where ${jobsTable.status} = 'completed')`,
      })
      .from(jobsTable)
      .groupBy(jobsTable.jobType)
      .orderBy(sql`count(*) desc`);

    const jobsByCity = await db
      .select({
        city: jobsTable.city,
        total: count(),
        completed: sql<number>`count(*) filter (where ${jobsTable.status} = 'completed')`,
        cancelled: sql<number>`count(*) filter (where ${jobsTable.status} = 'cancelled')`,
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
      .where(sql`${usersTable.role} in ('driver', 'both')`)
      .groupBy(usersTable.city)
      .orderBy(sql`count(*) desc`);

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
        totalDrivers: totalDrivers + totalBothRoleUsers,
        activeDrivers,
        totalJobs,
        totalPendingJobs,
        totalCompletedJobs,
        totalCancelledJobs,
        totalDisputedJobs,
        completionRate: totalJobs > 0 ? Math.round((Number(totalCompletedJobs) / Number(totalJobs)) * 100) : 0,
        cancellationRate: totalJobs > 0 ? Math.round((Number(totalCancelledJobs) / Number(totalJobs)) * 100) : 0,
        avgCompletionMinutes: avgCompletionMinutes ? Math.round(Number(avgCompletionMinutes)) : null,
        avgJobsPerDay,
        firstJobAt: oldestJob || null,
        generatedAt: new Date().toISOString(),
      },
      jobsByType,
      jobsByCity,
      activeDriversByCity,
    });
  } catch (err: any) {
    console.error("Admin stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
