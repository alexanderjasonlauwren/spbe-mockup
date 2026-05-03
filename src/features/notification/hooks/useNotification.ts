import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getReminderSettings,
  saveReminderSettings,
} from "../api/notificationApi";
import type { NotificationType, ReminderSettings } from "../types";

type FilterType = "Semua" | NotificationType;

export function useNotification() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<FilterType>("Semua");

  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  });

  const reminderSettings = useQuery({
    queryKey: ["reminder-settings"],
    queryFn: getReminderSettings,
  });

  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (settings: ReminderSettings) => saveReminderSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminder-settings"] });
    },
  });

  const filtered = (notifications.data ?? []).filter(
    (n) => activeFilter === "Semua" || n.type === activeFilter,
  );

  const unreadCount = (notifications.data ?? []).filter(
    (n) => !n.isRead,
  ).length;

  return {
    notifications: filtered,
    isLoading: notifications.isLoading,
    activeFilter,
    setActiveFilter,
    unreadCount,
    markAsReadMutation,
    markAllAsReadMutation,
    reminderSettings: reminderSettings.data,
    isLoadingSettings: reminderSettings.isLoading,
    saveSettingsMutation,
  };
}
