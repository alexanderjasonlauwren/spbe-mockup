import { scopedDb } from "@/mocks/scope";
import { latency, mutate } from "@/mocks/db";
import { updateSettings } from "@/features/settings/api/settingsApi";
import type { Notification, NotificationSettings } from "../types";
import type { NotificationApi } from "./contract";

async function getNotifications(): Promise<Notification[]> {
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

async function getUnreadCount(): Promise<number> {
  await latency("read");
  return scopedDb().notifications.filter((n) => !n.isRead).length;
}

async function markAsRead(id: string): Promise<void> {
  await latency("write");
  mutate((db) => {
    const n = db.notifications.find((x) => x.id === id);
    if (n) n.isRead = true;
  });
}

async function markAsUnread(id: string): Promise<void> {
  await latency("write");
  mutate((db) => {
    const n = db.notifications.find((x) => x.id === id);
    if (n) n.isRead = false;
  });
}

async function markAllAsRead(): Promise<number> {
  await latency("write");
  return mutate((db) => {
    const unread = db.notifications.filter((n) => !n.isRead);
    unread.forEach((n) => (n.isRead = true));
    return unread.length;
  });
}

async function deleteNotification(id: string): Promise<void> {
  await latency("write");
  mutate((db) => {
    db.notifications = db.notifications.filter((n) => n.id !== id);
  });
}

async function clearReadNotifications(): Promise<number> {
  await latency("write");
  return mutate((db) => {
    const before = db.notifications.length;
    db.notifications = db.notifications.filter((n) => !n.isRead);
    return before - db.notifications.length;
  });
}

async function getNotificationSettings(): Promise<NotificationSettings> {
  await latency("read");
  return structuredClone(scopedDb().settings.notifikasi);
}

/**
 * Routed through `settingsApi.updateSettings()` rather than a bespoke
 * `db.settings.notifikasi` write: both used to mutate the same backing
 * object through two different paths, which is the same class of bug the
 * D2 Step 7 permission blocker was (two writers of one concept, silently
 * able to disagree). `updateSettings` already validates and audits a
 * settings patch; this feature's own write no longer needs a copy of that.
 */
async function saveNotificationSettings(
  settings: NotificationSettings,
): Promise<NotificationSettings> {
  const saved = await updateSettings({ notifikasi: settings });
  return saved.notifikasi;
}

/** Sends a sample so the wording and sender can be checked before going live. */
async function sendTestNotification(channel: "whatsapp" | "email") {
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

export const notificationApiMock: NotificationApi = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  getNotificationSettings,
  saveNotificationSettings,
  sendTestNotification,
};
