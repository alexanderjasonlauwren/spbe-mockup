import { cn } from "@/lib/utils";
import type { Notification } from "../types";

const typeColors = {
  Pengingat: "border-blue-400 bg-blue-50",
  Alert: "border-red-400 bg-red-50",
  Sistem: "border-slate-300 bg-slate-50",
};

const typeDotColors = {
  Pengingat: "bg-blue-400",
  Alert: "bg-red-400",
  Sistem: "bg-slate-400",
};

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
}

export function NotificationItem({
  notification,
  onMarkRead,
}: NotificationItemProps) {
  const { type, title, message, timestamp, isRead, id } = notification;

  return (
    <div
      className={cn(
        "border-l-4 rounded-r-xl p-4 transition-all",
        typeColors[type],
        !isRead && "shadow-sm",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <span
            className={cn(
              "w-2 h-2 rounded-full mt-1.5 shrink-0",
              typeDotColors[type],
            )}
          />
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className={cn(
                  "text-[10px] font-black px-2 py-0.5 rounded-full uppercase",
                  type === "Pengingat" && "bg-blue-200 text-blue-800",
                  type === "Alert" && "bg-red-200 text-red-800",
                  type === "Sistem" && "bg-slate-200 text-slate-800",
                )}
              >
                {type}
              </span>
              {!isRead && (
                <span className="w-2 h-2 rounded-full bg-[#1565C0]" />
              )}
            </div>
            <p className="text-sm font-bold text-on-surface">{title}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">{message}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <p className="text-[10px] text-on-surface-variant">{timestamp}</p>
          {!isRead && (
            <button
              onClick={() => onMarkRead(id)}
              className="text-[10px] font-bold text-[#1565C0] hover:underline"
            >
              Tandai dibaca
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
