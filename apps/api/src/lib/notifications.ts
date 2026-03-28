import webpush from "web-push";
import { prisma } from "./prisma.js";

const vapidSubject = process.env["VAPID_SUBJECT"];
const vapidPublicKey = process.env["VAPID_PUBLIC_KEY"];
const vapidPrivateKey = process.env["VAPID_PRIVATE_KEY"];

const pushEnabled = Boolean(vapidSubject && vapidPublicKey && vapidPrivateKey);

if (pushEnabled) {
  webpush.setVapidDetails(vapidSubject!, vapidPublicKey!, vapidPrivateKey!);
}

export async function notifyWallet(
  wallet: string,
  title: string,
  body: string,
  link?: string,
): Promise<void> {
  await prisma.notification.create({
    data: {
      wallet,
      title,
      body,
      ...(link ? { link } : {}),
    },
  });

  if (!pushEnabled) {
    return;
  }

  const subs = await prisma.pushSubscription.findMany({ where: { wallet } });
  if (subs.length === 0) {
    return;
  }

  const payload = JSON.stringify({ title, body, link });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload,
        );
      } catch (error) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number((error as { statusCode: number }).statusCode)
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
        }
      }
    }),
  );
}
