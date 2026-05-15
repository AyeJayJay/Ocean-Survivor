import app from "./app";
import { logger } from "./lib/logger";

/*
 * Stripe initialization is disabled for App Store submission.
 * Donations are off (DONATIONS_ENABLED = false in the frontend) and Stripe
 * routes return safe stubs. Restore the original initStripe() implementation
 * once the LLC is established and ready for payments.
 */

const rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
