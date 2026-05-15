import { Router } from "express";

const router = Router();

/*
 * Stripe donations are temporarily disabled for App Store submission.
 * These stubs return safe, empty responses so the client handles
 * the "not available" state gracefully without any Stripe SDK calls.
 * Re-enable by restoring the original implementation once the LLC is ready.
 */

router.get("/donate/prices", (_req, res) => {
  res.json({ prices: [], disabled: true });
});

router.post("/donate/checkout", (_req, res) => {
  res.status(503).json({ error: "Donations are not currently available." });
});

export default router;
