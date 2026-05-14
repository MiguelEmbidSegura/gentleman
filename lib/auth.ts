import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "gentleman_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type SessionUser = "Alberto" | "Rubén";

const USERS: Record<string, SessionUser> = {
  alberto: "Alberto",
  ruben: "Rubén"
};

function getSecret(): string {
  return process.env.APP_SECRET || "dev-secret-change-me";
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createSessionValue(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify({ user, createdAt: Date.now() })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionValue(value?: string): SessionUser | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || !safeCompare(signature, sign(payload))) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { user?: SessionUser };
    return data.user === "Alberto" || data.user === "Rubén" ? data.user : null;
  } catch {
    return null;
  }
}

export function getCurrentUser(): SessionUser | null {
  return readSessionValue(cookies().get(COOKIE_NAME)?.value);
}

export function setSessionCookie(response: NextResponse, user: SessionUser): void {
  response.cookies.set(COOKIE_NAME, createSessionValue(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/"
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/"
  });
}

export function assertAuthenticated(): SessionUser {
  const user = getCurrentUser();
  if (!user) {
    throw new Response("No autorizado", { status: 401 });
  }
  return user;
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export function isValidLogin(username: string, password: string): SessionUser | null {
  const normalized = username.trim().toLowerCase();
  const expectedPassword = normalized === "alberto"
    ? process.env.ALBERTO_PASSWORD
    : normalized === "ruben"
      ? process.env.RUBEN_PASSWORD
      : undefined;

  if (!expectedPassword) return null;
  if (!safeCompare(password, expectedPassword)) return null;
  return USERS[normalized] ?? null;
}

export function requireApiSession(_request: NextRequest): SessionUser | null {
  return getCurrentUser();
}
