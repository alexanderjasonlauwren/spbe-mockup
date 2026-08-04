import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Info,
  Trash2,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { useNotification } from "@/features/notification/hooks/useNotification";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel, PanelBody, PanelHeader, Skeleton } from "@/components/common/Panel";
import { EmptyState } from "@/components/common/EmptyState";
import { Field, SegmentedControl, TextInput, Toggle } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateTimeId, relativeTime } from "@/lib/format";
import type { ReminderSettings } from "@/features/notification/types";

const TYPE_STYLE = {
  Alert: { spine: "text-rust", icon: TriangleAlert, iconClass: "text-rust-ink" },
  Pengingat: { spine: "text-signal", icon: Bell, iconClass: "text-signal-ink" },
  Sistem: { spine: "text-draft", icon: Info, iconClass: "text-ink-muted" },
} as const;

export function NotificationPage() {
  const {
    notifications,
    allNotifications,
    isLoading,
    activeFilter,
    setActiveFilter,
    unreadCount,
    markAsReadMutation,
    markAsUnreadMutation,
    markAllAsReadMutation,
    deleteMutation,
    clearReadMutation,
    reminderSettings,
    isLoadingSettings,
    saveSettingsMutation,
  } = useNotification();

  const [form, setForm] = useState<ReminderSettings | null>(null);
  useEffect(() => {
    if (reminderSettings) setForm(reminderSettings);
  }, [reminderSettings]);

  const dirty =
    !!form && !!reminderSettings && JSON.stringify(form) !== JSON.stringify(reminderSettings);

  const count = (type: string) =>
    type === "Semua"
      ? allNotifications.length
      : type === "Belum dibaca"
        ? unreadCount
        : allNotifications.filter((n) => n.type === type).length;

  const readCount = allNotifications.length - unreadCount;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifikasi"
        description="Peringatan yang dihasilkan sistem saat kuota menipis, pengiriman tertunda, atau tagihan menunggu verifikasi."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => clearReadMutation.mutate(undefined as never)}
              disabled={readCount === 0 || clearReadMutation.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Bersihkan terbaca
            </Button>
            <Button
              onClick={() => markAllAsReadMutation.mutate(undefined as never)}
              disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Tandai semua dibaca
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <SegmentedControl
            value={activeFilter}
            onChange={setActiveFilter}
            options={[
              { value: "Semua" as const, label: "Semua", count: count("Semua") },
              {
                value: "Belum dibaca" as const,
                label: "Belum dibaca",
                count: count("Belum dibaca"),
              },
              { value: "Alert" as const, label: "Peringatan", count: count("Alert") },
              {
                value: "Pengingat" as const,
                label: "Pengingat",
                count: count("Pengingat"),
              },
              { value: "Sistem" as const, label: "Sistem", count: count("Sistem") },
            ]}
          />

          <Panel>
            {isLoading ? (
              <div className="space-y-4 p-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3.5 w-1/3" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <EmptyState
                icon={BellOff}
                title={
                  activeFilter === "Semua"
                    ? "Tidak ada notifikasi"
                    : `Tidak ada notifikasi ${activeFilter.toLowerCase()}`
                }
                description="Sistem mengirim pesan ke sini saat kuota menipis, armada terlambat, atau ada tagihan yang menunggu."
              />
            ) : (
              <ul className="divide-y divide-line">
                {notifications.map((n) => {
                  const style = TYPE_STYLE[n.type];
                  const Icon = style.icon;
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        "spine flex gap-3 px-5 py-4 transition-colors hover:bg-panel-sunk",
                        style.spine,
                        !n.isRead && "bg-panel-sunk/60",
                      )}
                    >
                      <Icon
                        className={cn("mt-0.5 h-4 w-4 shrink-0", style.iconClass)}
                        strokeWidth={1.75}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <p
                            className={cn(
                              "text-sm text-ink",
                              !n.isRead && "font-semibold",
                            )}
                          >
                            {n.title}
                          </p>
                          <p
                            className="data shrink-0 text-2xs text-ink-muted"
                            title={formatDateTimeId(n.timestamp)}
                          >
                            {relativeTime(n.timestamp)}
                          </p>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                          {n.message}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1">
                          {n.href && (
                            <Button asChild variant="outline" size="xs">
                              <Link
                                to={n.href}
                                onClick={() =>
                                  !n.isRead && markAsReadMutation.mutate(n.id)
                                }
                              >
                                Buka
                              </Link>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() =>
                              n.isRead
                                ? markAsUnreadMutation.mutate(n.id)
                                : markAsReadMutation.mutate(n.id)
                            }
                          >
                            {n.isRead ? (
                              <>
                                <Undo2 className="h-3 w-3" />
                                Tandai belum dibaca
                              </>
                            ) : (
                              <>
                                <Check className="h-3 w-3" />
                                Tandai dibaca
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => deleteMutation.mutate(n.id)}
                            className="hover:bg-rust-soft hover:text-rust-ink"
                          >
                            <Trash2 className="h-3 w-3" />
                            Hapus
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        {/* Reminder rules */}
        <Panel className="h-fit">
          <PanelHeader
            title="Aturan pengingat"
            hint="Menentukan kapan sistem membuat notifikasi baru"
          />
          <PanelBody>
            {isLoadingSettings || !form ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="divide-y divide-line">
                  <Toggle
                    label="Agreement mendekati kedaluwarsa"
                    description="Ingatkan tujuh hari sebelum periode SA berakhir."
                    checked={form.saExpiry}
                    onChange={(saExpiry) => setForm({ ...form, saExpiry })}
                  />
                  <Toggle
                    label="Stok di bawah minimum"
                    description="Ingatkan saat stok produk turun di bawah ambang batas."
                    checked={form.stockLow}
                    onChange={(stockLow) => setForm({ ...form, stockLow })}
                  />
                  <Toggle
                    label="Pembayaran menunggu verifikasi"
                    description="Ingatkan tim keuangan setiap pagi selama masih ada tagihan tertunda."
                    checked={form.paymentPending}
                    onChange={(paymentPending) => setForm({ ...form, paymentPending })}
                  />
                  <Toggle
                    label="Keterlambatan pengiriman"
                    description="Ingatkan saat surat jalan belum berangkat lewat dari jadwal."
                    checked={form.deliveryDelay}
                    onChange={(deliveryDelay) => setForm({ ...form, deliveryDelay })}
                  />
                </div>

                <Field
                  className="mt-4"
                  label="Ambang stok"
                  htmlFor="threshold"
                  hint="Persentase dari stok minimum yang memicu peringatan."
                >
                  <TextInput
                    id="threshold"
                    type="number"
                    min={1}
                    max={100}
                    mono
                    value={form.stockThresholdPct}
                    onChange={(e) =>
                      setForm({ ...form, stockThresholdPct: Number(e.target.value) })
                    }
                  />
                </Field>

                <div className="mt-4 flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={!dirty || saveSettingsMutation.isPending}
                    onClick={() => saveSettingsMutation.mutate(form)}
                  >
                    {dirty ? "Simpan aturan" : "Tersimpan"}
                  </Button>
                  {dirty && (
                    <Button
                      variant="outline"
                      onClick={() => reminderSettings && setForm(reminderSettings)}
                    >
                      Urungkan
                    </Button>
                  )}
                </div>
              </>
            )}
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
