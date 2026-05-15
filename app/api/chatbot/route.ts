import { NextRequest, NextResponse } from "next/server";
import { getChatbotReply } from "@/lib/chatbot";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { message?: string } | null;
  if (!body?.message?.trim()) {
    return NextResponse.json({ error: "Escribe un mensaje." }, { status: 400 });
  }

  return NextResponse.json(getChatbotReply(body.message));
}
