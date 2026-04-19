import { Router, type IRouter } from "express";
import healthRouter from "./health";
import donateRouter from "./donate";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(donateRouter);
router.use(analyticsRouter);

export default router;
