import { Router, type IRouter } from "express";
import healthRouter from "./health";
import donateRouter from "./donate";
import analyticsRouter from "./analytics";
import leaderboardRouter from "./leaderboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(donateRouter);
router.use(analyticsRouter);
router.use(leaderboardRouter);

export default router;
