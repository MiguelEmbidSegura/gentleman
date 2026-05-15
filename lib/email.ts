import { Resend } from "resend";
import type { Appointment } from "@/lib/types";

type SendAppointmentEmailParams = {
  to: string;
  appointment: Appointment;
  manageUrl: string;
  calendarUrl: string;
  siteUrl: string;
  kind?: "confirmed" | "updated" | "cancelled";
};

export type EmailSendResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "provider_error" };

function absoluteUrl(siteUrl: string, path: string): string {
  return `${siteUrl.replace(/\/$/, "")}${path}`;
}

function subjectFor(kind: NonNullable<SendAppointmentEmailParams["kind"]>): string {
  if (kind === "updated") return "Tu cita en Gentleman se ha modificado";
  if (kind === "cancelled") return "Tu cita en Gentleman se ha anulado";
  return "Confirmación de tu cita en Gentleman";
}

function statusText(kind: NonNullable<SendAppointmentEmailParams["kind"]>): string {
  if (kind === "updated") return "Tu cita se ha modificado.";
  if (kind === "cancelled") return "Tu cita se ha anulado.";
  return "Tu cita está confirmada.";
}

export async function sendAppointmentEmail({
  to,
  appointment,
  manageUrl,
  calendarUrl,
  siteUrl,
  kind = "confirmed"
}: SendAppointmentEmailParams): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_EMAIL_FROM;
  if (!apiKey || !from) return { sent: false, reason: "not_configured" };
  const resend = new Resend(apiKey);

  const fullManageUrl = absoluteUrl(siteUrl, manageUrl);
  const fullCalendarUrl = absoluteUrl(siteUrl, calendarUrl);
  const serviceName = appointment.services?.name ?? "Cita";
  const hairdresserName = appointment.hairdressers?.name ?? "Gentleman";
  const startTime = appointment.start_time.slice(0, 5);

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: subjectFor(kind),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        <h1 style="margin-bottom:8px">${statusText(kind)}</h1>
        <p><strong>${serviceName}</strong></p>
        <p>${appointment.date} a las ${startTime} con ${hairdresserName}</p>
        <p style="margin-top:24px">
          <a href="${fullManageUrl}" style="display:inline-block;background:#0057ff;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">
            Modificar o anular cita
          </a>
        </p>
        <p>
          <a href="${fullCalendarUrl}">Añadir al calendario</a>
        </p>
        <p style="margin-top:24px;color:#6b7280;font-size:14px">
          Guarda este email: desde aquí podrás volver a tu cita cuando lo necesites.
        </p>
      </div>
    `,
    text: [
      statusText(kind),
      `${serviceName}: ${appointment.date} a las ${startTime} con ${hairdresserName}`,
      `Modificar o anular cita: ${fullManageUrl}`,
      `Añadir al calendario: ${fullCalendarUrl}`
    ].join("\n")
  }).catch(() => ({ error: true }));

  if (error) return { sent: false, reason: "provider_error" };
  return { sent: true };
}
