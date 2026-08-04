import { scopedDb } from "@/mocks/scope";
import { latency, mutate, recordAudit } from "@/mocks/db";
import type { Notification, NotificationSettings } from "../types";

export async function getNotifications(): Promise<Notification[]> {
  await latency("read");
  return scopedDb()
    .notifications.slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      timestamp: n.createdAt,
      isRead: n.isRead,
      href: n.href,
      rule: n.rule,
    }));
}

export async function getUnreadCount(): Promise<number> {
  await latency("read");
  return scopedDb().notifications.filter((n) => !n.isRead).length;
}

export async function markAsRead(id: string): Promise<void> {
  await latency("write");
  mutate((db) => {
    const n = db.notifications.find((x) => x.id === id);
    if (n) n.isRead = true;
  });
}

export async function markAsUnread(id: string): Promise<void> {
  await latency("write");
  mutate((db) => {
    const n = db.notifications.find((x) => x.id === id);
    if (n) n.isRead = false;
  });
}

export async function markAllAsRead(): Promise<number> {
  await latency("write");
  return mutate((db) => {
    const unread = db.notifications.filter((n) => !n.isRead);
    unread.forEach((n) => (n.isRead = true));
    return unread.length;
  });
}

export async function deleteNotification(id: string): Promise<void> {
  await latency("write");
  mutate((db) => {
    db.notifications = db.notifications.filter((n) => n.id !== id);
  });
}

export async function clearReadNotifications(): Promise<number> {
  await latency("write");
  return mutate((db) => {
    const before = db.notifications.length;
    db.notifications = db.notifications.filter((n) => !n.isRead);
    return before - db.notifications.length;
  });
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  await latency("read");
  return structuredClone(scopedDb().settings.notifikasi);
}

export async function saveNotificationSettings(
  settings: NotificationSettings,
): Promise<NotificationSettings> {
  await latency("write");
  return mutate((db) => {
    db.settings.notifikasi = structuredClone(settings);
    const aktif = Object.values(settings.rules).filter((r) => r.aktif).length;
    recordAudit(db, {
      action: "settings.notifications",
      entity: "Settings",
      entityId: "notifikasi",
      summary: `Memperbarui aturan notifikasi — ${aktif} dari ${
        Object.keys(settings.rules).length
      } aturan aktif.`,
    });
    return structuredClone(db.settings.notifikasi);
  });
}

/** Sends a sample so the wording and sender can be checked before going live. */
export async function sendTestNotification(channel: "whatsapp" | "email") {
  await latency("write");
  const { whatsapp, email } = scopedDb().settings.notifikasi;
  if (channel === "whatsapp") {
    if (!whatsapp.aktif) throw new Error("Kanal WhatsApp sedang nonaktif.");
    if (!/^[0-9+\-\s]{8,}$/.test(whatsapp.nomorPengirim)) {
      throw new Error("Nomor pengirim WhatsApp tidak valid.");
    }
    return { channel, tujuan: whatsapp.nomorPengirim };
  }
  if (!email.aktif) throw new Error("Kanal email sedang nonaktif.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.pengirim)) {
    throw new Error("Alamat pengirim email tidak valid.");
  }
  return { channel, tujuan: email.pengirim };
}
