import { Router } from "express";
import { subscribeToNewsletter } from "../controllers/newsletter.controller.js";
import { newsletterRateLimit } from "../utils/rateLimiter.js";

const newsletterRouter = Router();

newsletterRouter.route("/").post(newsletterRateLimit, subscribeToNewsletter);

export default newsletterRouter;
