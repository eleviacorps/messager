import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { broadcast } from "@/lib/realtime";

export async function POST(
  request: Request,
  { params }: { params: { messageId: string } }
) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const emoji = body?.emoji ? String(body.emoji) : "";
  if (!emoji) return NextResponse.json({ error: "Missing emoji" }, { status: 400 });

  const message = await prisma.message.findUnique({
    where: { id: params.messageId },
    select: { id: true, roomId: true }
  });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isMember = await prisma.roomMember.findUnique({
    where: { userId_roomId: { userId: user.id, roomId: message.roomId } }
  });
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.messageReaction.findFirst({
    where: { messageId: message.id, userId: user.id, emoji }
  });

  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.messageReaction.create({
      data: { messageId: message.id, userId: user.id, emoji }
    });
  }

  const reactions = await prisma.messageReaction.findMany({
    where: { messageId: message.id },
    select: { id: true, userId: true, emoji: true }
  });

  broadcast(message.roomId, {
    type: "reaction:update",
    messageId: message.id,
    reactions
  });

  return NextResponse.json({ reactions });
}
