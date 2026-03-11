import { cookies, headers } from "next/headers";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";

const SESSION_COOKIE = "evtext_session";
const SESSION_TTL_DAYS = 7;

export type SessionUser = {
  id: string;
  name: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { user: true }
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: token } }).catch(() => {});
    return null;
  }

  return { id: session.user.id, name: session.user.name };
}

export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }
  return user;
}

export async function createSession(userId: string) {
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { id: token, userId, expiresAt }
  });

  const secure = process.env.NODE_ENV === "production";
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt
  });
}

export async function clearSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.delete({ where: { id: token } }).catch(() => {});
  }
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/"
  });
}

export function getClientIp() {
  const forwarded = headers().get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return headers().get("x-real-ip") || "unknown";
}
