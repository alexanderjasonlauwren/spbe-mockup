export type NotificationType = "Pengingat" | "Alert" | "Sistem";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  /** ISO datetime — formatted relative to now at the point of display. */
  timestamp: string;
  isRead: boolean;
  /** Where "Buka" takes the reader. */
  href?: string;
}

export interface ReminderSettings {
  saExpiry: boolean;
  stockLow: boolean;
  paymentPending: boolean;
  deliveryDelay: boolean;
  stockThresholdPct: number;
}
