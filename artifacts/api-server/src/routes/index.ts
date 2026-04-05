import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import jobsRouter from "./jobs";
import distanceRouter from "./distance";
import adminRouter from "./admin";
import placesRouter from "./places";
import addressesRouter from "./addresses";
import promosRouter from "./promos";
import supportRouter from "./support";
import uploadRouter from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/jobs", jobsRouter);
router.use("/distance", distanceRouter);
router.use("/admin", adminRouter);
router.use("/places", placesRouter);
router.use("/addresses", addressesRouter);
router.use("/promos", promosRouter);
router.use("/support", supportRouter);
router.use("/upload", uploadRouter);

export default router;
