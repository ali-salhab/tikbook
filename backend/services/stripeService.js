const Stripe = require("stripe");

let stripe;
try {
  const key = process.env.STRIPE_SECRET_KEY;
  if (key) {
    stripe = new Stripe(key);
    console.log("Stripe initialized");
  } else {
    console.warn("STRIPE_SECRET_KEY not set – Stripe disabled");
  }
} catch (err) {
  console.error("Failed to initialize Stripe:", err);
}

const createCoinPurchaseIntent = async ({ amountCents, metadata = {} }) => {
  if (!stripe) return null;
  return stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    metadata,
    automatic_payment_methods: { enabled: true },
  });
};

module.exports = { createCoinPurchaseIntent };
