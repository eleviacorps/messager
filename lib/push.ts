import webpush from "web-push";
import { prisma } from "@/lib/db";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (publicKey && privateKey && subject) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
}

export async function sendPushToRoom(params: {
  roomId: string;
  title: string;
  body: string;
  url: string;
  senderId: string;
}) {
  ensureConfigured();
  if (!configured) return;

  const members = await prisma.roomMember.findMany({
    where: { roomId: params.roomId },
    include: {
      user: {
        include: { pushSubscriptions: true }
      }
    }
  });

  const payload = JSON.stringify({
    title: params.title,
    body: params.body,
    url: params.url,
    roomId: params.roomId
  });

  await Promise.all(
    members
      .filter((member) => member.userId !== params.senderId)
      .flatMap((member) =>
        member.user.pushSubscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth }
              },
              payload
            );
          } catch (err) {
            await prisma.pushSubscription
              .delete({ where: { id: sub.id } })
              .catch(() => {});
          }
        })
      )
  );
}
