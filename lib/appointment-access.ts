import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  return process.env.APP_SECRET || "dev-secret-change-me";
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createAppointmentAccessToken(appointmentId: string): string {
  return `${appointmentId}.${sign(appointmentId)}`;
}

export function readAppointmentAccessToken(token?: string): string | null {
  if (!token) return null;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const appointmentId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!appointmentId || !signature || !safeCompare(signature, sign(appointmentId))) return null;
  return appointmentId;
}
