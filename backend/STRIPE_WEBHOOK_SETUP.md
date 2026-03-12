# Stripe Webhook Setup

## Webhook Endpoint URL

Use this URL in Stripe Dashboard -> Developers -> Webhooks:

`https://tikbook-1cdb.onrender.com/api/wallet/stripe/webhook`

If your backend domain changes, keep the same path:

`<YOUR_BACKEND_BASE_URL>/api/wallet/stripe/webhook`

## Required Stripe Events

Add these events to the webhook destination:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

## Required Backend Environment Variables

Set these in backend environment (Render or local `.env`):

- `STRIPE_SECRET_KEY=sk_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`
- `COIN_PRICE_EGP=0.605` (optional pricing override)

## Notes

- Webhook signature verification is enabled using `STRIPE_WEBHOOK_SECRET`.
- Webhook endpoint must be public and does not require auth.
- The app also keeps `POST /api/wallet/topup/confirm` as a fallback confirmation path.
