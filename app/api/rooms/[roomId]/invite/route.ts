import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: { roomId: string } }
) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isMember = await prisma.roomMember.findUnique({
    where: { userId_roomId: { userId: user.id, roomId: params.roomId } }
  });
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const code = nanoid(10);
  const invite = await prisma.invite.create({
    data: { code, roomId: params.roomId }
  });

  return NextResponse.json({ invite });
}
