import Stripe from "stripe";

export const STRIPE_API_VERSION = "2026-04-22.dahlia";

export function createStripeClient(secretKey: string) {
  return new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
}

export function verifyStripeWebhookEvent(params: {
  stripe: Stripe;
  rawBody: string;
  signature: string;
  webhookSecret: string;
}): Stripe.Event | null {
  try {
    return params.stripe.webhooks.constructEvent(
      params.rawBody,
      params.signature,
      params.webhookSecret
    );
  } catch {
    return null;
  }
}
