import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser, getClientIp } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { storeFile } from "@/lib/storage";

const MAX_SIZE = 50 * 1024 * 1024;
const ALLOWED_PREFIXES = ["image/", "video/", "audio/"];

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp();
  const limit = rateLimit(`upload:${ip}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  const type = file.type || "";
  if (!ALLOWED_PREFIXES.some((prefix) => type.startsWith(prefix))) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }

  const stored = await storeFile(file);

  const media = await prisma.media.create({
    data: {
      url: stored.url,
      type: type.split("/")[0],
      mime: stored.mime,
      size: stored.size,
      name: stored.name
    }
  });

  return NextResponse.json({ media });
}
