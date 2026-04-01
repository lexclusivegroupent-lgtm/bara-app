import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import jobsRouter from "./jobs";
import distanceRouter from "./distance";
import adminRouter from "./admin";
import placesRouter from "./places";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/jobs", jobsRouter);
router.use("/distance", distanceRouter);
router.use("/admin", adminRouter);
router.use("/places", placesRouter);

export default router;
