import { Router, type IRouter } from "express";
import healthRouter from "./health";
import donateRouter from "./donate";

const router: IRouter = Router();

router.use(healthRouter);
router.use(donateRouter);

export default router;
