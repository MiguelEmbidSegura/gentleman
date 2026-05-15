import { NextRequest, NextResponse } from "next/server";
import { canCreateAppointment, getAvailableSlots } from "@/lib/availability";
import { isReasonableSpanishPhone, normalizeSpanishPhone } from "@/lib/date";
import {
  BOOKING_CURRENCY,
  BOOKING_DEPOSIT_CENTS,
  STRIPE_PRODUCT_NAME,
  buildCompletedPaymentUpdate,
  buildPendingPaymentAppointmentFields,
  getCheckoutUrls
} from "@/lib/payments";
import { createAppointmentAccessToken } from "@/lib/appointment-access";
import { HAIRDRESSERS } from "@/lib/schedule";
import { createStripeClient } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { AppointmentInput, HairdresserId, ServiceDuration } from "@/lib/types";

type CheckoutInput = Omit<AppointmentInput, "hairdresser_id"> & {
  hairdresser_id: HairdresserId | "any";
};

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Falta STRIPE_SECRET_KEY.");
  return createStripeClient(key);
}

async function findOrCreateClient(input: CheckoutInput) {
  const supabase = getSupabaseAdmin();
  const phone = normalizeSpanishPhone(input.client_phone ?? "");
  const name = input.client_name.trim();

  const { data: existingClient } = await supabase
    .from("clients")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (existingClient) {
    const { data, error } = await supabase
      .from("clients")
      .update({ name, phone })
      .eq("id", existingClient.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({ name, phone, notes: null })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as CheckoutInput | null;
  if (!body?.client_name || !body.client_phone || !body.service_id || !body.date || !body.start_time || !body.hairdresser_id) {
    return NextResponse.json({ error: "Faltan datos obligatorios." }, { status: 400 });
  }

  if (!isReasonableSpanishPhone(body.client_phone)) {
    return NextResponse.json({ error: "Introduce un teléfono español válido." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("*")
    .eq("id", body.service_id)
    .eq("active", true)
    .single();

  if (serviceError || !service) return NextResponse.json({ error: "Servicio no disponible." }, { status: 400 });

  const duration = service.duration_minutes as ServiceDuration;
  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select("*")
    .eq("date", body.date)
    .in("status", ["pending_payment", "confirmed"]);

  if (appointmentsError) return NextResponse.json({ error: appointmentsError.message }, { status: 500 });

  const { data: blocks, error: blocksError } = await supabase
    .from("schedule_blocks")
    .select("*")
    .lte("start_date", body.date)
    .gte("end_date", body.date);

  if (blocksError) return NextResponse.json({ error: blocksError.message }, { status: 500 });

  const candidateHairdressers = body.hairdresser_id === "any"
    ? HAIRDRESSERS
    : HAIRDRESSERS.filter((hairdresser) => hairdresser.id === body.hairdresser_id);

  const selectedHairdresser = candidateHairdressers.find((hairdresser) =>
    getAvailableSlots(hairdresser.id, body.date, appointments ?? [], duration, blocks ?? [], { disallowPast: true })
      .includes(body.start_time)
  );

  if (!selectedHairdresser) {
    return NextResponse.json({ error: "Ese hueco ya no está disponible." }, { status: 400 });
  }

  const appointmentInput: AppointmentInput = {
    client_name: body.client_name,
    client_phone: body.client_phone,
    hairdresser_id: selectedHairdresser.id,
    service_id: service.id,
    date: body.date,
    start_time: body.start_time,
    duration_minutes: duration,
    status: "pending_payment",
    payment_status: "pending",
    source: "public",
    notes: body.notes
  };

  const availability = canCreateAppointment(appointmentInput, appointments ?? [], blocks ?? [], { disallowPast: true });
  if (!availability.ok) return NextResponse.json({ error: availability.reason }, { status: 400 });

  try {
    const client = await findOrCreateClient(body);
    const shouldSimulatePayment = !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || !process.env.STRIPE_SECRET_KEY;

    if (shouldSimulatePayment) {
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          client_id: client.id,
          hairdresser_id: selectedHairdresser.id,
          service_id: service.id,
          date: body.date,
          start_time: body.start_time,
          duration_minutes: duration,
          ...buildCompletedPaymentUpdate({
            amountPaidCents: BOOKING_DEPOSIT_CENTS,
            currency: BOOKING_CURRENCY,
            paymentIntentId: null,
            paidAt: new Date().toISOString()
          }),
          notes: body.notes?.trim() || null,
          delay_minutes: 0,
          source: "public",
          created_by: null
        })
        .select("*, clients(*), services(*), hairdressers(*)")
        .single();

      if (appointmentError) throw appointmentError;

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin") || new URL(request.url).origin;
      const appointmentToken = createAppointmentAccessToken(appointment.id);
      return NextResponse.json({
        url: `${siteUrl.replace(/\/$/, "")}/reservar/success?debug=1&appointment_token=${encodeURIComponent(appointmentToken)}`,
        appointment_id: appointment.id,
        simulated_payment: true
      });
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        client_id: client.id,
        hairdresser_id: selectedHairdresser.id,
        service_id: service.id,
        date: body.date,
        start_time: body.start_time,
        duration_minutes: duration,
        ...buildPendingPaymentAppointmentFields(),
        notes: body.notes?.trim() || null,
        delay_minutes: 0,
        source: "public",
        created_by: null,
      })
      .select("*, clients(*), services(*), hairdressers(*)")
      .single();

    if (appointmentError) throw appointmentError;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin") || new URL(request.url).origin;
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: BOOKING_CURRENCY,
            unit_amount: BOOKING_DEPOSIT_CENTS,
            product_data: {
              name: STRIPE_PRODUCT_NAME
            }
          }
        }
      ],
      metadata: {
        appointment_id: appointment.id,
        client_name: body.client_name,
        client_phone: normalizeSpanishPhone(body.client_phone),
        hairdresser_id: selectedHairdresser.id,
        service_id: service.id,
        date: body.date,
        start_time: body.start_time
      },
      ...getCheckoutUrls(siteUrl)
    });

    const { error: updateError } = await supabase
      .from("appointments")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", appointment.id);

    if (updateError) throw updateError;

    return NextResponse.json({ url: session.url, appointment_id: appointment.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo iniciar el pago." },
      { status: 500 }
    );
  }
}
