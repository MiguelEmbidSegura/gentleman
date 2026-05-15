import { describe, expect, it } from "vitest";
import { createAppointmentAccessToken, readAppointmentAccessToken } from "@/lib/appointment-access";

describe("appointment access tokens", () => {
  it("accepts signed appointment tokens and rejects tampered tokens", () => {
    const token = createAppointmentAccessToken("appointment-123");

    expect(readAppointmentAccessToken(token)).toBe("appointment-123");
    expect(readAppointmentAccessToken(`${token}x`)).toBeNull();
    expect(readAppointmentAccessToken("appointment-123.invalid")).toBeNull();
  });
});
