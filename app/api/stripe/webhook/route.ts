import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { buildCompletedPaymentUpdate } from "@/lib/payments";
import { createStripeClient, verifyStripeWebhookEvent } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Falta STRIPE_SECRET_KEY.");
  return createStripeClient(key);
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook no configurado." }, { status: 400 });
  }

  const rawBody = await request.text();
  const event = verifyStripeWebhookEvent({
    stripe: getStripe(),
    rawBody,
    signature,
    webhookSecret
  });

  if (!event) {
    return NextResponse.json({ error: "Firma de webhook invalida." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { error } = await supabase
      .from("appointments")
      .update(buildCompletedPaymentUpdate({
        amountPaidCents: session.amount_total,
        currency: session.currency,
        paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
        paidAt: new Date().toISOString()
      }))
      .eq("stripe_checkout_session_id", session.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { error } = await supabase
      .from("appointments")
      .update({ status: "expired", payment_status: "failed" })
      .eq("stripe_checkout_session_id", session.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
