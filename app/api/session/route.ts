import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, getCurrentUser, isValidLogin, setSessionCookie } from "@/lib/auth";

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { username?: string; password?: string } | null;
  const user = body?.username && body?.password ? isValidLogin(body.username, body.password) : null;

  if (!user) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  const response = NextResponse.json({ user });
  setSessionCookie(response, user);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
