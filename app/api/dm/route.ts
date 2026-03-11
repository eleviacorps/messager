import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const targetUserId = body?.userId ? String(body.userId) : "";
  if (!targetUserId || targetUserId === user.id) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const directKey = [user.id, targetUserId].sort().join(":");

  const existing = await prisma.room.findUnique({
    where: { directKey },
    include: { members: { include: { user: true } } }
  });

  if (existing) {
    return NextResponse.json({ room: existing });
  }

  const room = await prisma.room.create({
    data: {
      name: "Direct",
      isDirect: true,
      directKey,
      members: {
        create: [{ userId: user.id, role: "member" }, { userId: targetUserId, role: "member" }]
      }
    },
    include: { members: { include: { user: true } } }
  });

  return NextResponse.json({ room });
}
