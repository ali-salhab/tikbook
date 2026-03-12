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

const createCoinPurchaseIntent = async ({
  amountCents,
  metadata = {},
  currency = "egp",
}) => {
  if (!stripe) return null;
  return stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    metadata,
    automatic_payment_methods: { enabled: true },
  });
};

const retrievePaymentIntent = async (paymentIntentId) => {
  if (!stripe || !paymentIntentId) return null;
  return stripe.paymentIntents.retrieve(paymentIntentId);
};

const constructWebhookEvent = ({ rawBody, signature }) => {
  if (!stripe) {
    throw new Error("Stripe is not initialized");
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }

  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
};

module.exports = {
  createCoinPurchaseIntent,
  retrievePaymentIntent,
  constructWebhookEvent,
};
