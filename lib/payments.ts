import type { Appointment } from "@/lib/types";

export const BOOKING_DEPOSIT_CENTS = 800;
export const BOOKING_CURRENCY = "eur";
export const PENDING_PAYMENT_EXPIRY_MINUTES = 15;
export const STRIPE_PRODUCT_NAME = "Reserva de cita peluquería";

export function getPendingPaymentExpiryDate(now = new Date()): Date {
  return new Date(now.getTime() - PENDING_PAYMENT_EXPIRY_MINUTES * 60 * 1000);
}

export function isPendingPaymentExpired(
  appointment: Pick<Appointment, "status" | "created_at">,
  now = new Date()
): boolean {
  if (appointment.status !== "pending_payment") return false;
  if (!appointment.created_at) return false;
  return new Date(appointment.created_at) <= getPendingPaymentExpiryDate(now);
}

export function appointmentBlocksAvailability(
  appointment: Pick<Appointment, "status" | "created_at">,
  now = new Date()
): boolean {
  if (appointment.status === "confirmed") return true;
  if (appointment.status === "pending_payment") return !isPendingPaymentExpired(appointment, now);
  return false;
}

export function getCheckoutUrls(siteUrl: string) {
  const cleanUrl = siteUrl.replace(/\/$/, "");
  return {
    success_url: `${cleanUrl}/reservar/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${cleanUrl}/reservar/cancel`
  };
}

export function buildPendingPaymentAppointmentFields() {
  return {
    status: "pending_payment" as const,
    payment_status: "pending" as const,
    amount_paid_cents: null,
    currency: BOOKING_CURRENCY,
    paid_at: null
  };
}

export function buildCompletedPaymentUpdate(params: {
  amountPaidCents: number | null;
  currency: string | null;
  paymentIntentId: string | null;
  paidAt: string;
}) {
  return {
    status: "confirmed" as const,
    payment_status: "paid" as const,
    amount_paid_cents: params.amountPaidCents,
    currency: params.currency ?? BOOKING_CURRENCY,
    stripe_payment_intent_id: params.paymentIntentId,
    paid_at: params.paidAt
  };
}
