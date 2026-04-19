import { getUncachableStripeClient } from './stripeClient';

const DONATION_TIERS = [
  { amount: 500,  label: "$5",  description: "Help fund sea turtle nest monitoring" },
  { amount: 1000, label: "$10", description: "Sponsor one beach patrol" },
  { amount: 2500, label: "$25", description: "Fund a sea turtle rescue kit" },
  { amount: 5000, label: "$50", description: "Sponsor a satellite tracker for a turtle" },
];

async function seedDonations() {
  const stripe = await getUncachableStripeClient();
  console.log("Seeding Sea Turtle Conservancy donation tiers...");

  for (const tier of DONATION_TIERS) {
    const name = `Sea Turtle Conservancy Donation ${tier.label}`;

    // Check if it already exists
    const existing = await stripe.products.search({
      query: `name:'${name}' AND active:'true'`,
    });

    if (existing.data.length > 0) {
      console.log(`  ✓ ${name} already exists (${existing.data[0].id})`);
      continue;
    }

    const product = await stripe.products.create({
      name,
      description: tier.description,
      metadata: { category: "donation", amount_label: tier.label },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: tier.amount,
      currency: "usd",
    });

    console.log(`  ✓ Created ${name} — price ID: ${price.id}`);
  }

  console.log("Done! Donation tiers ready in Stripe.");
}

seedDonations().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
