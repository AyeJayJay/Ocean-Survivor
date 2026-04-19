import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router = Router();

router.get("/donate/prices", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT
        pr.id as price_id,
        pr.unit_amount,
        pr.currency,
        p.name as product_name,
        p.description as product_description
      FROM stripe.prices pr
      JOIN stripe.products p ON p.id = pr.product
      WHERE p.active = true
        AND pr.active = true
        AND p.metadata->>'category' = 'donation'
      ORDER BY pr.unit_amount ASC
    `);
    res.json({ prices: result.rows });
  } catch (err) {
    logger.error({ err }, "Failed to fetch donation prices");
    res.json({ prices: [] });
  }
});

router.post("/donate/checkout", async (req, res) => {
  const { priceId } = req.body;
  if (!priceId || typeof priceId !== "string") {
    return res.status(400).json({ error: "priceId is required" });
  }

  try {
    const stripe = await getUncachableStripeClient();
    const host = req.headers.host ?? "localhost";
    const proto = req.headers["x-forwarded-proto"] ?? "https";
    const baseUrl = `${proto}://${host}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${baseUrl}/?donate=success`,
      cancel_url: `${baseUrl}/?donate=cancel`,
      submit_type: "donate",
      custom_text: {
        submit: {
          message: "Your donation goes directly to the Sea Turtle Conservancy to protect sea turtles and their habitat.",
        },
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "Failed to create donation checkout session");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

export default router;
