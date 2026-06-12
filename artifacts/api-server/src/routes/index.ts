import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import componentsRouter from "./components";
import connectionsRouter from "./connections";
import templatesRouter from "./templates";
import exportRouter from "./export";
import validationRouter from "./validation";
import aiRouter from "./ai";
import importRouter from "./import";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(componentsRouter);
router.use(connectionsRouter);
router.use(templatesRouter);
router.use(exportRouter);
router.use(validationRouter);
router.use(aiRouter);
router.use(importRouter);

export default router;
