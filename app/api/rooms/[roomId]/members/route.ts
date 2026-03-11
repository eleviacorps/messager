import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";

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

  const members = await prisma.roomMember.findMany({
    where: { roomId: params.roomId },
    include: { user: true }
  });

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      role: m.role,
      avatarColor: m.user.avatarColor
    }))
  });
}
