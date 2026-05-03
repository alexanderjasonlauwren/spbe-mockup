import { useState } from "react";
import { Toggle } from "./Toggle";
import type { ReminderSettings } from "../types";

interface ReminderSettingsFormProps {
  settings: ReminderSettings;
  onSave: (settings: ReminderSettings) => void;
  isSaving: boolean;
}

export function ReminderSettingsForm({
  settings: initialSettings,
  onSave,
  isSaving,
}: ReminderSettingsFormProps) {
  const [settings, setSettings] = useState<ReminderSettings>(initialSettings);

  const update = <K extends keyof ReminderSettings>(
    key: K,
    value: ReminderSettings[K],
  ) => setSettings((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4">
      <Toggle
        checked={settings.saExpiry}
        onChange={(v) => update("saExpiry", v)}
        label="SA Akan Kedaluwarsa"
        description="Notifikasi 7 hari sebelum SA berakhir"
      />
      <Toggle
        checked={settings.stockLow}
        onChange={(v) => update("stockLow", v)}
        label="Stok Kritis"
        description="Alert saat sisa kuota di bawah threshold"
      />
      <Toggle
        checked={settings.paymentPending}
        onChange={(v) => update("paymentPending", v)}
        label="Pembayaran Menunggu"
        description="Pengingat pembayaran yang belum diverifikasi"
      />
      <Toggle
        checked={settings.deliveryDelay}
        onChange={(v) => update("deliveryDelay", v)}
        label="Keterlambatan Pengiriman"
        description="Alert saat pengiriman terlambat lebih dari 1 jam"
      />

      {/* Threshold Slider */}
      <div className="py-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-bold text-on-surface">
            Threshold Stok Kritis
          </label>
          <span className="text-sm font-black text-[#1565C0]">
            {settings.stockThresholdPct}%
          </span>
        </div>
        <input
          type="range"
          min={5}
          max={50}
          step={5}
          value={settings.stockThresholdPct}
          onChange={(e) => update("stockThresholdPct", Number(e.target.value))}
          className="w-full accent-[#1565C0]"
        />
        <div className="flex justify-between text-[10px] text-on-surface-variant mt-1">
          <span>5%</span>
          <span>50%</span>
        </div>
      </div>

      <button
        onClick={() => onSave(settings)}
        disabled={isSaving}
        className="w-full py-2.5 text-sm font-bold bg-[#1565C0] text-white rounded-lg hover:bg-[#004d99] transition-colors disabled:opacity-60"
      >
        {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
      </button>
    </div>
  );
}
