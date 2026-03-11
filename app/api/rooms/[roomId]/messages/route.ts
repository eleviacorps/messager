import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser, getClientIp } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeMessage } from "@/lib/sanitize";
import { broadcast } from "@/lib/realtime";
import { sendPushToRoom } from "@/lib/push";

export async function GET(
  _request: Request,
  { params }: { params: { roomId: string } }
) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isMember = await prisma.roomMember.findUnique({
    where: { userId_roomId: { userId: user.id, roomId: params.roomId } }
  });
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const messages = await prisma.message.findMany({
    where: { roomId: params.roomId },
    include: {
      user: true,
      media: true,
      replyTo: { include: { user: true, media: true } },
      forwardedFrom: { include: { user: true, media: true } },
      reactions: true
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return NextResponse.json({ messages: messages.reverse() });
}

export async function POST(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp();
  const limit = rateLimit(`msg:${ip}`, 120, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const isMember = await prisma.roomMember.findUnique({
    where: { userId_roomId: { userId: user.id, roomId: params.roomId } }
  });
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const textRaw = body?.text ? String(body.text) : "";
  const text = textRaw ? sanitizeMessage(textRaw) : null;
  const mediaIds: string[] = Array.isArray(body?.mediaIds) ? body.mediaIds : [];
  const replyToMessageId = body?.replyToMessageId ? String(body.replyToMessageId) : null;

  if (!text && mediaIds.length === 0) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  if (replyToMessageId) {
    const replyTarget = await prisma.message.findFirst({
      where: { id: replyToMessageId, roomId: params.roomId }
    });
    if (!replyTarget) {
      return NextResponse.json({ error: "Invalid reply target" }, { status: 400 });
    }
  }

  const message = await prisma.message.create({
    data: {
      roomId: params.roomId,
      userId: user.id,
      text,
      replyToMessageId: replyToMessageId || undefined,
      media: mediaIds.length
        ? {
            connect: mediaIds.map((id) => ({ id }))
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

  broadcast(params.roomId, { type: "message", message });

  const preview = text
    ? text.slice(0, 80)
    : message.media[0]
      ? `[${message.media[0].type}]`
      : "New message";

  await sendPushToRoom({
    roomId: params.roomId,
    title: `${message.user.name}`,
    body: preview,
    url: `/#room=${params.roomId}`,
    senderId: user.id
  });

  return NextResponse.json({ message });
}
