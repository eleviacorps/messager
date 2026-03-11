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
  const targetRoomId = body?.targetRoomId ? String(body.targetRoomId) : "";
  if (!targetRoomId) {
    return NextResponse.json({ error: "Missing target room" }, { status: 400 });
  }

  const message = await prisma.message.findUnique({
    where: { id: params.messageId },
    include: { media: true, user: true }
  });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sourceMember = await prisma.roomMember.findUnique({
    where: { userId_roomId: { userId: user.id, roomId: message.roomId } }
  });
  if (!sourceMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const targetMember = await prisma.roomMember.findUnique({
    where: { userId_roomId: { userId: user.id, roomId: targetRoomId } }
  });
  if (!targetMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const forwarded = await prisma.message.create({
    data: {
      roomId: targetRoomId,
      userId: user.id,
      text: message.text,
      forwardedFromMessageId: message.id,
      media: message.media.length
        ? {
            create: message.media.map((m) => ({
              url: m.url,
              type: m.type,
              mime: m.mime,
              size: m.size,
              name: m.name
            }))
          }
        : undefined
    },
    include: {
      user: true,
      media: true,
      replyTo: { include: { user: true, media: true } },
      forwardedFrom: { include: { user: true, media: true } },
      reactions: true
    }
  });

  broadcast(targetRoomId, { type: "message", message: forwarded });

  return NextResponse.json({ message: forwarded });
}
