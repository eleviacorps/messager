import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, getClientIp } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp();
  const limit = rateLimit(`login:${ip}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const sharedPassword = process.env.APP_SHARED_PASSWORD;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }
  if (!sharedPassword) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  if (body.password !== sharedPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const name = String(body.name).trim().slice(0, 48);
  if (!name) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  try {
  const palette = ["#4f7cff", "#ff8a5b", "#6dd3b0", "#caa3ff", "#f4c95d", "#6aa9ff"];
  const index = name
    .split("")
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % palette.length;

  const user = await prisma.user.create({
    data: { name, avatarColor: palette[index] }
  });

    await createSession(user.id);

    return NextResponse.json({ user: { id: user.id, name: user.name } });
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
