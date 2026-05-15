import nodemailer from "nodemailer";
import type { Appointment } from "@/lib/types";

type SendAppointmentEmailParams = {
  to: string;
  appointment: Appointment;
  manageUrl: string;
  calendarUrl: string;
  siteUrl: string;
  kind?: "confirmed" | "updated" | "cancelled";
  simulated?: boolean;
};

export type EmailSendResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "provider_error" };

function absoluteUrl(siteUrl: string, path: string): string {
  return `${siteUrl.replace(/\/$/, "")}${path}`;
}

function subjectFor(
  kind: NonNullable<SendAppointmentEmailParams["kind"]>,
  appointment: Appointment,
  simulated: boolean
): string {
  const prefix = simulated ? "[PRUEBA] " : "";
  const when = `${appointment.date} ${appointment.start_time.slice(0, 5)}`;
  if (kind === "updated") return `${prefix}Tu cita en Gentleman se ha modificado · ${when}`;
  if (kind === "cancelled") return `${prefix}Tu cita en Gentleman se ha anulado · ${when}`;
  return `${prefix}Confirmación de tu cita en Gentleman · ${when}`;
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
  kind = "confirmed",
  simulated = false
}: SendAppointmentEmailParams): Promise<EmailSendResult> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  const from = process.env.BOOKING_EMAIL_FROM;
  if (!gmailUser || !gmailAppPassword || !from) return { sent: false, reason: "not_configured" };
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword
    }
  });

  const fullManageUrl = absoluteUrl(siteUrl, manageUrl);
  const fullCalendarUrl = absoluteUrl(siteUrl, calendarUrl);
  const serviceName = appointment.services?.name ?? "Cita";
  const hairdresserName = appointment.hairdressers?.name ?? "Gentleman";
  const startTime = appointment.start_time.slice(0, 5);

  const result = await transporter.sendMail({
    from,
    to,
    subject: subjectFor(kind, appointment, simulated),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        ${simulated ? '<p style="margin-bottom:16px;color:#92400e;font-weight:bold">Correo de prueba</p>' : ""}
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
      simulated ? "Correo de prueba" : "",
      statusText(kind),
      `${serviceName}: ${appointment.date} a las ${startTime} con ${hairdresserName}`,
      `Modificar o anular cita: ${fullManageUrl}`,
      `Añadir al calendario: ${fullCalendarUrl}`
    ].filter(Boolean).join("\n")
  }).catch(() => null);

  if (!result) return { sent: false, reason: "provider_error" };
  return { sent: true };
}
