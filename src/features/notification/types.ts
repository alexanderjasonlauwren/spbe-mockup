export type NotificationType = "Pengingat" | "Alert" | "Sistem";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface ReminderSettings {
  saExpiry: boolean;
  stockLow: boolean;
  paymentPending: boolean;
  deliveryDelay: boolean;
  stockThresholdPct: number;
}
