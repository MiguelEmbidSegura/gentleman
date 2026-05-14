import { describe, expect, it } from "vitest";
import Stripe from "stripe";
import { canCreateAppointment } from "@/lib/availability";
import {
  BOOKING_DEPOSIT_CENTS,
  buildCompletedPaymentUpdate,
  buildPendingPaymentAppointmentFields,
  isPendingPaymentExpired
} from "@/lib/payments";
import { createStripeClient, verifyStripeWebhookEvent } from "@/lib/stripe";
import { HAIRDRESSER_IDS, SERVICE_IDS } from "@/lib/schedule";
import type { Appointment, AppointmentInput } from "@/lib/types";

const now = new Date("2026-05-14T10:00:00.000Z");

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "appointment-1",
    client_id: "client-1",
    hairdresser_id: HAIRDRESSER_IDS.alberto,
    service_id: SERVICE_IDS.corte,
    date: "2026-05-14",
    start_time: "10:00",
    duration_minutes: 15,
    status: "pending_payment",
    payment_status: "pending",
    stripe_checkout_session_id: "cs_test_123",
    stripe_payment_intent_id: null,
    amount_paid_cents: null,
    currency: "eur",
    paid_at: null,
    notes: null,
    delay_minutes: 0,
    source: "public",
    created_by: null,
    created_at: "2026-05-14T09:55:00.000Z",
    ...overrides
  };
}

function input(overrides: Partial<AppointmentInput> = {}): AppointmentInput {
  return {
    client_name: "Cliente",
    hairdresser_id: HAIRDRESSER_IDS.alberto,
    service_id: SERVICE_IDS.corte,
    date: "2026-05-14",
    start_time: "10:00",
    duration_minutes: 15,
    ...overrides
  };
}

describe("payments", () => {
  it("usa un importe fijo de 800 centimos", () => {
    expect(BOOKING_DEPOSIT_CENTS).toBe(800);
  });

  it("crea los campos de cita provisional en pending_payment", () => {
    expect(buildPendingPaymentAppointmentFields()).toMatchObject({
      status: "pending_payment",
      payment_status: "pending",
      amount_paid_cents: null,
      currency: "eur"
    });
  });

  it("no permite doble reserva si hay pending_payment activa", () => {
    const result = canCreateAppointment(input(), [appointment()], [], { now });
    expect(result.ok).toBe(false);
  });

  it("libera citas pending_payment antiguas", () => {
    const oldPending = appointment({ created_at: "2026-05-14T09:40:00.000Z" });

    expect(isPendingPaymentExpired(oldPending, now)).toBe(true);
    expect(canCreateAppointment(input(), [oldPending], [], { now }).ok).toBe(true);
  });

  it("prepara la actualizacion al completar checkout.session.completed", () => {
    expect(buildCompletedPaymentUpdate({
      amountPaidCents: 800,
      currency: "eur",
      paymentIntentId: "pi_123",
      paidAt: "2026-05-14T10:01:00.000Z"
    })).toMatchObject({
      status: "confirmed",
      payment_status: "paid",
      amount_paid_cents: 800,
      currency: "eur",
      stripe_payment_intent_id: "pi_123",
      paid_at: "2026-05-14T10:01:00.000Z"
    });
  });

  it("rechaza un webhook con firma invalida", () => {
    const stripe = createStripeClient("sk_test_123");
    const rawBody = JSON.stringify({ id: "evt_123", type: "checkout.session.completed" });
    const validHeader = Stripe.webhooks.generateTestHeaderString({
      payload: rawBody,
      secret: "whsec_valid"
    });

    expect(verifyStripeWebhookEvent({
      stripe,
      rawBody,
      signature: validHeader,
      webhookSecret: "whsec_other"
    })).toBeNull();
  });
});
