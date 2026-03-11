import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: { roomId: string } }
) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const room = await prisma.room.findUnique({ where: { id: params.roomId } });
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.roomMember.upsert({
    where: { userId_roomId: { userId: user.id, roomId: params.roomId } },
    update: {},
    create: { userId: user.id, roomId: params.roomId }
  });

  return NextResponse.json({ room });
}
