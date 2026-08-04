import { getDb, latency, mutate, recordAudit } from "@/mocks/db";
import type { Notification, ReminderSettings } from "../types";

export async function getNotifications(): Promise<Notification[]> {
  await latency("read");
  return getDb()
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
    }));
}

export async function getUnreadCount(): Promise<number> {
  await latency("read");
  return getDb().notifications.filter((n) => !n.isRead).length;
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

export async function getReminderSettings(): Promise<ReminderSettings> {
  await latency("read");
  return { ...getDb().settings.reminder };
}

export async function saveReminderSettings(
  settings: ReminderSettings,
): Promise<ReminderSettings> {
  await latency("write");
  return mutate((db) => {
    db.settings.reminder = { ...settings };
    recordAudit(db, {
      action: "settings.reminder",
      entity: "Settings",
      entityId: "reminder",
      summary: "Memperbarui aturan pengingat otomatis.",
    });
    return { ...db.settings.reminder };
  });
}
