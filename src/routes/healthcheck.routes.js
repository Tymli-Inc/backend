import { healthcheck } from "../controllers/healthcheck.controller.js";
import { Router } from "express";

const healthcheckRouter = Router();

healthcheckRouter.route('/').get(healthcheck);

export default healthcheckRouter;