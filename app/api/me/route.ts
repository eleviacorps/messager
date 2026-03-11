import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const avatarColor = body?.avatarColor ? String(body.avatarColor) : "";
  if (!avatarColor) {
    return NextResponse.json({ error: "Invalid avatar" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { avatarColor }
  });

  return NextResponse.json({
    user: { id: updated.id, name: updated.name, avatarColor: updated.avatarColor }
  });
}
