import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const subscription = await prisma.pushSubscription.upsert({
    where: {
      userId_endpoint: { userId: user.id, endpoint: body.endpoint }
    },
    update: {
      p256dh: body.keys.p256dh,
      auth: body.keys.auth
    },
    create: {
      userId: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth
    }
  });

  return NextResponse.json({ subscriptionId: subscription.id });
}
