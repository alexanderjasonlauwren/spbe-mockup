import { useState } from "react";
import { Bell, MessageSquare, Smartphone, Send, Clock, ChevronRight } from "lucide-react";
import { useNotification } from "@/features/notification/hooks/useNotification";
import { NotificationFilterChips } from "@/features/notification/components/NotificationFilterChips";
import { NotificationItem } from "@/features/notification/components/NotificationItem";
import { ReminderSettingsForm } from "@/features/notification/components/ReminderSettingsForm";
import { EmptyState } from "@/components/common/EmptyState";
import type { NotificationType } from "@/features/notification/types";

type FilterType = "Semua" | NotificationType;
type PageTab = "sistem" | "whatsapp";

// ── WhatsApp mock data ────────────────────────────────────────────────────────
const WA_TEMPLATES = [
  {
    id: "t1",
    label: "Update Harga LPG Mingguan",
    body: "Halo Bapak/Ibu {Nama_Pangkalan},\n\nDiberitahukan bahwa terdapat penyesuaian harga LPG 3kg per tanggal {Tanggal_Efektif}. Stok tersedia saat ini: {Stok_Realtime} tabung.\n\nMohon segera melakukan sinkronisasi data.",
  },
  {
    id: "t2",
    label: "Peringatan Kuota Menipis",
    body: "Halo Bapak/Ibu {Nama_Pangkalan},\n\nKuota LPG Anda hampir habis. Sisa kuota bulan ini: {Sisa_Kuota} tabung. Segera hubungi kami untuk perpanjangan.",
  },
  {
    id: "t3",
    label: "Konfirmasi Pengiriman Selesai",
    body: "Halo Bapak/Ibu {Nama_Pangkalan},\n\nPengiriman {Jumlah_Tabung} tabung LPG telah selesai pada {Waktu_Selesai}. Mohon konfirmasi penerimaan.",
  },
];

const RECIPIENTS = ["Semua Pangkalan", "Region I", "Jateng & DIY"];

const BLAST_HISTORY = [
  { id: "b1", label: "Update Harga LPG Mingguan", count: "1.240 Penerima", status: "Selesai", time: "14:05", color: "text-emerald-500", bg: "bg-emerald-50" },
  { id: "b2", label: "Peringatan Kuota Pangkalan Y", count: "15 Penerima", status: "Selesai", time: "Kemarin", color: "text-emerald-500", bg: "bg-emerald-50" },
  { id: "b3", label: "Broadcast Hari Libur Nasional", count: "4.500 Penerima", status: "Terjadwal", time: "25 Des", color: "text-amber-500", bg: "bg-amber-50" },
];

const AUTO_REMINDERS = [
  { id: "r1", label: "Notifikasi Download Schedule Agreement", desc: "Kirim peringatan jika SA belum diunduh pangkalan.", app: true, wa: false },
  { id: "r2", label: "Reminder Perencanaan Harian", desc: "Ingatkan input rencana penyaluran sebelum pukul 10:00.", app: true, wa: true },
  { id: "r3", label: "Status Verifikasi Pembayaran", desc: "Update otomatis setelah tim finance memverifikasi slip.", app: false, wa: true },
  { id: "r4", label: "Alert Kuota Tahunan/Bulanan", desc: "Peringatan otomatis saat realisasi mencapai 90% kuota.", app: true, wa: true },
];

// ── WhatsApp Blast Panel ──────────────────────────────────────────────────────
function WhatsAppBlastPanel() {
  const [recipient, setRecipient] = useState("Semua Pangkalan");
  const [templateId, setTemplateId] = useState("t1");
  const [scheduled, setScheduled] = useState(false);
  const [sending, setSending] = useState(false);

  const template = WA_TEMPLATES.find((t) => t.id === templateId) ?? WA_TEMPLATES[0];

  function handleSend() {
    setSending(true);
    setTimeout(() => setSending(false), 1500);
  }

  return (
    <div className="space-y-5">
      {/* Config card */}
      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm space-y-5">
        <h4 className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">
          Konfigurasi Pesan Massal
        </h4>

        {/* Recipient */}
        <div>
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2.5">
            Pilih Penerima
          </label>
          <div className="flex flex-wrap gap-2">
            {RECIPIENTS.map((r) => (
              <button
                key={r}
                onClick={() => setRecipient(r)}
                className={
                  "px-3.5 py-1.5 rounded-full border text-sm font-medium transition-all " +
                  (recipient === r
                    ? "bg-blue-50 border-[#1565C0] text-[#1565C0]"
                    : "border-outline-variant text-on-surface-variant hover:border-[#1565C0]/50")
                }
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Template */}
        <div>
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
            Template Pesan
          </label>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full bg-surface-container-high border-none rounded-lg py-2.5 px-4 text-sm focus:ring-2 focus:ring-[#1565C0]/30 focus:outline-none"
          >
            {WA_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Preview */}
        <div>
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
            Pratinjau Pesan
          </label>
          <div className="bg-[#ECE5DD] rounded-xl p-3 min-h-[100px]">
            <div className="bg-[#DCF8C6] rounded-lg p-3 shadow-sm text-sm leading-relaxed max-w-[90%] ml-auto">
              {template.body.split("{").map((part, i) => {
                if (i === 0) return <span key={i}>{part}</span>;
                const [varName, rest] = part.split("}");
                return (
                  <span key={i}>
                    <span className="font-bold text-blue-700">{`{${varName}}`}</span>
                    {rest}
                  </span>
                );
              })}
              <p className="text-[10px] text-slate-400 text-right mt-1">14:02 ✓✓</p>
            </div>
          </div>
        </div>

        {/* Schedule toggle */}
        <div className="flex items-center justify-between p-3.5 bg-surface-container rounded-lg">
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-[#1565C0]" />
            <span className="text-sm font-semibold text-on-surface">Jadwalkan Pengiriman</span>
          </div>
          <button
            role="switch"
            aria-checked={scheduled}
            onClick={() => setScheduled(!scheduled)}
            className={
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors " +
              (scheduled ? "bg-[#1565C0]" : "bg-slate-300")
            }
          >
            <span
              className={
                "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform " +
                (scheduled ? "translate-x-5" : "translate-x-0.5")
              }
            />
          </button>
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={sending}
          className="w-full py-3.5 bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white font-bold rounded-lg shadow flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
        >
          <Send className="h-4 w-4" />
          {sending ? "Mengirim..." : "Kirim Sekarang"}
        </button>
      </div>

      {/* History */}
      <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest">
            Riwayat Blast
          </h4>
          <button className="text-xs font-bold text-[#1565C0] hover:underline">Lihat Semua</button>
        </div>
        <div className="space-y-1">
          {BLAST_HISTORY.map((h) => (
            <div
              key={h.id}
              className="flex items-center gap-3 p-2.5 hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer"
            >
              <div className={"w-9 h-9 rounded-full flex items-center justify-center shrink-0 " + h.bg}>
                <MessageSquare className={"h-4 w-4 " + h.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-on-surface truncate">{h.label}</p>
                <p className="text-[10px] text-on-surface-variant">{h.count} • {h.status}</p>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">{h.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Auto Reminder + API config (right panel, WhatsApp tab) ───────────────────
function WhatsAppRightPanel() {
  const [reminderState, setReminderState] = useState(
    AUTO_REMINDERS.reduce(
      (acc, r) => ({ ...acc, [r.id]: { app: r.app, wa: r.wa } }),
      {} as Record<string, { app: boolean; wa: boolean }>
    )
  );

  function toggle(id: string, channel: "app" | "wa") {
    setReminderState((prev) => ({
      ...prev,
      [id]: { ...prev[id], [channel]: !prev[id][channel] },
    }));
  }

  return (
    <div className="space-y-5">
      {/* Reminder settings */}
      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 bg-[#1565C0] h-6 rounded-full" />
          <h4 className="text-base font-bold text-on-surface">Pengaturan Reminder Otomatis</h4>
        </div>
        <div className="space-y-1">
          {AUTO_REMINDERS.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-4 hover:bg-surface-container-low rounded-lg transition-colors"
            >
              <div className="flex-1 pr-4">
                <p className="text-sm font-bold text-on-surface">{r.label}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">{r.desc}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => toggle(r.id, "app")}
                  className={
                    "px-2.5 py-1.5 rounded-lg text-[11px] font-bold border flex items-center gap-1 transition-all " +
                    (reminderState[r.id]?.app
                      ? "bg-blue-50 border-[#1565C0] text-[#1565C0]"
                      : "border-outline-variant text-on-surface-variant hover:border-[#1565C0]/50")
                  }
                >
                  <Smartphone className="h-3 w-3" />
                  In-App
                </button>
                <button
                  onClick={() => toggle(r.id, "wa")}
                  className={
                    "px-2.5 py-1.5 rounded-lg text-[11px] font-bold border flex items-center gap-1 transition-all " +
                    (reminderState[r.id]?.wa
                      ? "bg-emerald-50 border-[#25D366] text-[#128C7E]"
                      : "border-outline-variant text-on-surface-variant hover:border-[#25D366]/50")
                  }
                >
                  <MessageSquare className="h-3 w-3" />
                  WhatsApp
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Config */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border-t-4 border-[#25D366] overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h4 className="text-base font-bold text-on-surface">Konfigurasi WhatsApp API</h4>
              <p className="text-xs text-on-surface-variant mt-0.5">Hubungkan sistem dengan provider gateway eksternal.</p>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full shrink-0">
              <span className="w-2 h-2 bg-[#25D366] rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-[#128C7E] uppercase">Sistem Online</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-wider mb-1.5">
                Pilih Provider
              </label>
              <select className="w-full bg-surface-container-high border-none rounded-lg py-2.5 px-3.5 text-sm font-semibold text-[#1565C0] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30">
                <option>Fonnte (Official Partner)</option>
                <option>Wablas API</option>
                <option>Twilio for WhatsApp</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-wider mb-1.5">
                Nomor WhatsApp Pengirim
              </label>
              <input
                type="text"
                defaultValue="+62812-3456-7890"
                className="w-full bg-surface-container-high border-none rounded-lg py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-wider mb-1.5">
                API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  defaultValue="sk-fonnte-xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="flex-1 bg-surface-container-high border-none rounded-lg py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30"
                />
                <button className="px-4 py-2.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors whitespace-nowrap">
                  Kirim Pesan Test
                </button>
                <button className="px-4 py-2.5 bg-[#1565C0] text-white font-bold text-xs rounded-lg hover:bg-[#1255A0] transition-colors">
                  Simpan
                </button>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-3 gap-4">
            {[
              { label: "Pesan Terkirim Bulan Ini", value: "45.281" },
              { label: "Success Rate", value: "99.8%" },
              { label: "Server Latency", value: "124ms" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-xl font-black text-on-surface">{s.value}</p>
                <p className="text-[10px] text-on-surface-variant mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function NotificationPage() {
  const [activePageTab, setActivePageTab] = useState<PageTab>("sistem");

  const {
    notifications,
    isLoading,
    activeFilter,
    setActiveFilter,
    unreadCount,
    markAsReadMutation,
    markAllAsReadMutation,
    reminderSettings,
    isLoadingSettings,
    saveSettingsMutation,
  } = useNotification();

  const counts: Record<FilterType, number> = {
    Semua: notifications.length,
    Pengingat: notifications.filter((n) => n.type === "Pengingat").length,
    Alert: notifications.filter((n) => n.type === "Alert").length,
    Sistem: notifications.filter((n) => n.type === "Sistem").length,
  };

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-on-surface">Pusat Notifikasi & WhatsApp Blast</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Kelola komunikasi real-time dengan seluruh jaringan pangkalan dan mitra distribusi.
          </p>
        </div>
        {activePageTab === "sistem" && unreadCount > 0 && (
          <button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="text-xs font-bold text-[#1565C0] hover:underline"
          >
            Tandai semua dibaca
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="inline-flex bg-surface-container-low p-1.5 rounded-xl gap-1">
        <button
          onClick={() => setActivePageTab("sistem")}
          className={
            "flex items-center gap-2 py-2.5 px-5 rounded-lg text-sm font-semibold transition-all " +
            (activePageTab === "sistem"
              ? "bg-white text-on-surface shadow-sm"
              : "text-on-surface-variant hover:bg-white/50")
          }
        >
          <Bell className="h-4 w-4" />
          Notifikasi Sistem
          {unreadCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActivePageTab("whatsapp")}
          className={
            "flex items-center gap-2 py-2.5 px-5 rounded-lg text-sm font-semibold transition-all " +
            (activePageTab === "whatsapp"
              ? "bg-white text-[#128C7E] shadow-sm"
              : "text-on-surface-variant hover:bg-white/50")
          }
        >
          <MessageSquare className="h-4 w-4 text-[#25D366]" />
          WhatsApp Blast
        </button>
      </div>

      {/* Content: Notifikasi Sistem */}
      {activePageTab === "sistem" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: notification list */}
          <div className="lg:col-span-7 space-y-4">
            <NotificationFilterChips
              activeFilter={activeFilter}
              onChange={setActiveFilter}
              counts={counts}
            />
            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
                ))
              ) : notifications.length === 0 ? (
                <div className="bg-surface-container-lowest rounded-xl shadow-sm">
                  <EmptyState
                    icon={Bell}
                    title="Tidak ada notifikasi"
                    description="Semua notifikasi telah dibaca"
                  />
                </div>
              ) : (
                notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkRead={(id) => markAsReadMutation.mutate(id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right: reminder settings */}
          <div className="lg:col-span-5">
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6">
              <h3 className="text-base font-bold text-on-surface mb-5">
                Pengaturan Notifikasi
              </h3>
              {isLoadingSettings ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : reminderSettings ? (
                <ReminderSettingsForm
                  settings={reminderSettings}
                  onSave={(s) => saveSettingsMutation.mutate(s)}
                  isSaving={saveSettingsMutation.isPending}
                />
              ) : null}
            </div>
            {/* Quick link */}
            <button
              onClick={() => setActivePageTab("whatsapp")}
              className="mt-3 w-full flex items-center justify-between px-4 py-3.5 bg-[#25D366]/10 border border-[#25D366]/30 rounded-xl hover:bg-[#25D366]/15 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="h-4 w-4 text-[#25D366]" />
                <span className="text-sm font-bold text-[#128C7E]">Konfigurasi WhatsApp Blast</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#25D366] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* Content: WhatsApp Blast */}
      {activePageTab === "whatsapp" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <WhatsAppBlastPanel />
          </div>
          <div className="lg:col-span-7">
            <WhatsAppRightPanel />
          </div>
        </div>
      )}
    </div>
  );
}
