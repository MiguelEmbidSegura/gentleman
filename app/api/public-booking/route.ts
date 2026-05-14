import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Las reservas públicas deben completarse mediante Stripe Checkout." },
    { status: 410 }
  );
}
