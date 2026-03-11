import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: { code: string } }
) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invite = await prisma.invite.findUnique({ where: { code: params.code } });
  if (!invite) return NextResponse.json({ error: "Invalid invite" }, { status: 404 });

  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  await prisma.roomMember.upsert({
    where: { userId_roomId: { userId: user.id, roomId: invite.roomId } },
    update: {},
    create: { userId: user.id, roomId: invite.roomId }
  });

  return NextResponse.json({ roomId: invite.roomId });
}
