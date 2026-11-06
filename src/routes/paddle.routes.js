import { Router } from "express";
import express from "express";
import {
  getPrices,
  getOrCreateCustomer,
  handleWebhook,
  getSubscriptionStatus,
  cancelSubscription,
  getUpdatePaymentUrl,
} from "../controllers/paddle.controller.js";

const paddleRouter = Router();

// Webhook needs raw body
paddleRouter.post(
  "/webhook",
  express.json({ verify: (req, res, buf) => { req.rawBody = buf.toString(); } }),
  handleWebhook
);

// Other routes use JSON
paddleRouter.post("/get-prices", getPrices);
paddleRouter.post("/get-customer", getOrCreateCustomer);
paddleRouter.post("/subscription-status", getSubscriptionStatus);
paddleRouter.post("/cancel-subscription", cancelSubscription);
paddleRouter.post("/update-payment-url", getUpdatePaymentUrl);

export default paddleRouter;
