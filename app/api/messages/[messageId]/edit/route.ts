import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { sanitizeMessage } from "@/lib/sanitize";
import { broadcast } from "@/lib/realtime";

export async function POST(
  request: Request,
  { params }: { params: { messageId: string } }
) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const textRaw = body?.text ? String(body.text) : "";
  const text = textRaw ? sanitizeMessage(textRaw) : "";
  if (!text) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const message = await prisma.message.findUnique({
    where: { id: params.messageId },
    select: { id: true, roomId: true, userId: true }
  });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (message.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.message.update({
    where: { id: message.id },
    data: { text, isEdited: true },
    include: {
      user: true,
      media: true,
      replyTo: { include: { user: true, media: true } },
      forwardedFrom: { include: { user: true, media: true } },
      reactions: true
    }
  });

  broadcast(message.roomId, { type: "message:update", message: updated });

  return NextResponse.json({ message: updated });
}
