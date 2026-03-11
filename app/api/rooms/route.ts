import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser, getClientIp } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rooms = await prisma.room.findMany({
    where: { members: { some: { userId: user.id } } },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ rooms });
}

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp();
  const limit = rateLimit(`rooms:${ip}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const name = String(body?.name || "").trim().slice(0, 60);
  if (!name) return NextResponse.json({ error: "Invalid name" }, { status: 400 });

  const room = await prisma.room.create({
    data: {
      name,
      members: {
        create: {
          userId: user.id,
          role: "owner"
        }
      }
    }
  });

  return NextResponse.json({ room });
}
