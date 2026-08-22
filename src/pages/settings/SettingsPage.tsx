import { scopeKey } from "@/mocks/scope";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Database,
  Download,
  Moon,
  Play,
  RotateCcw,
  Sun,
} from "lucide-react";
import {
  exportData,
  getSettings,
  resetData,
  updateSettings,
} from "@/features/settings/api/settingsApi";
import { advanceOperations } from "@/mocks/rules";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ROLE_LABEL, ROLE_SUMMARY } from "@/features/users/api/userApi";
import { useDeskMutation } from "@/hooks/useDeskMutation";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel, PanelBody, PanelHeader, Skeleton } from "@/components/common/Panel";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  Field,
  SelectInput,
  TextInput,
  TextareaInput,
} from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { cn, getInitials } from "@/lib/utils";
import type { SettingsEntity } from "@/mocks/types";
import { supplierLabel } from "@/lib/lexicon";

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const settings = useQuery({ queryKey: [...scopeKey(), "settings"], queryFn: getSettings });
  const [form, setForm] = useState<SettingsEntity | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (settings.data) setForm(structuredClone(settings.data));
  }, [settings.data]);

  const dirty =
    !!form && !!settings.data && JSON.stringify(form) !== JSON.stringify(settings.data);

  const saveMutation = useDeskMutation({
    mutationFn: (patch: Partial<SettingsEntity>) => updateSettings(patch),
    errorTitle: "Pengaturan tidak tersimpan",
    success: "Pengaturan disimpan",
  });

  const exportMutation = useDeskMutation({
    mutationFn: () => exportData(),
    errorTitle: "Ekspor gagal",
    success: "Salinan data diunduh",
  });

  const resetMutation = useDeskMutation({
    mutationFn: () => resetData(),
    errorTitle: "Atur ulang gagal",
    success: () => ({
      title: "Data contoh dibuat ulang",
      description: "Konsol kembali ke satu hari kerja yang segar.",
    }),
    onDone: () => setResetting(false),
  });

  const set = <K extends keyof SettingsEntity>(key: K, value: SettingsEntity[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  /** Demo control: pushes today's run forward without waiting for the clock. */
  const runSimulation = () => {
    let steps = 0;
    for (let i = 0; i < 6; i++) if (advanceOperations()) steps += 1;
    queryClient.invalidateQueries();
    toast({
      title:
        steps > 0
          ? "Simulasi hari dimajukan"
          : "Tidak ada surat jalan yang bisa dimajukan",
      description:
        steps > 0
          ? "Surat jalan hari ini bergerak beberapa langkah. Periksa papan berangkat dan monitoring."
          : "Semua surat jalan hari ini sudah selesai, atau jadwalnya belum tiba.",
      tone: steps > 0 ? "success" : "info",
    });
  };

  if (!form) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengaturan"
        description="Akun Anda, profil agen, harga acuan, dan jam operasional. Data acuan dan aturan notifikasi diatur di halamannya sendiri."
        actions={
          dirty && (
            <>
              <Button
                variant="outline"
                onClick={() => settings.data && setForm(structuredClone(settings.data))}
              >
                Urungkan
              </Button>
              <Button
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending}
              >
                Simpan perubahan
              </Button>
            </>
          )
        }
      />

      {/* The account menu links here for "Profil saya", so it leads the page. */}
      <Panel>
        <PanelHeader title="Akun saya" hint="Identitas Anda di konsol ini" />
        <PanelBody className="flex flex-wrap items-start gap-5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-ink text-sm font-bold text-ink-on">
            {getInitials(user?.name ?? "SD")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold tracking-[-0.01em] text-ink">
              {user?.name ?? "—"}
            </p>
            <p className="data text-xs text-ink-muted">{user?.email ?? "—"}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-ink-muted">Peran</dt>
                <dd className="font-medium text-ink">
                  {user ? ROLE_LABEL[user.role] : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Cabang</dt>
                <dd className="font-medium text-ink">{user?.branch ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Telepon</dt>
                <dd className="data text-ink">{user?.phone ?? "—"}</dd>
              </div>
            </dl>
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-ink-muted">
              {user ? ROLE_SUMMARY[user.role] : ""}
            </p>
            <p className="mt-3 text-xs text-ink-muted">
              Peran dan cabang diatur oleh admin di{" "}
              <Link
                to="/users"
                className="font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4"
              >
                Pengguna &amp; Akses
              </Link>
              .
            </p>
          </div>
        </PanelBody>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel>
          <PanelHeader title="Profil agen" hint="Muncul pada surat jalan dan laporan cetak" />
          <PanelBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nama perusahaan" htmlFor="nama" className="sm:col-span-2">
              <TextInput
                id="nama"
                value={form.namaPerusahaan}
                onChange={(e) => set("namaPerusahaan", e.target.value)}
              />
            </Field>
            <Field label="Nomor agen" htmlFor="agen">
              <TextInput
                id="agen"
                mono
                value={form.nomorAgen}
                onChange={(e) => set("nomorAgen", e.target.value)}
              />
            </Field>
            <Field label="Telepon" htmlFor="telp">
              <TextInput
                id="telp"
                mono
                value={form.telepon}
                onChange={(e) => set("telepon", e.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="email" className="sm:col-span-2">
              <TextInput
                id="email"
                type="email"
                mono
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <Field label="Alamat" htmlFor="alamat" className="sm:col-span-2">
              <TextareaInput
                id="alamat"
                rows={2}
                value={form.alamat}
                onChange={(e) => set("alamat", e.target.value)}
              />
            </Field>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            title="Operasional"
            hint="Menentukan rentang papan berangkat dan nilai tagihan"
          />
          <PanelBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Jam buka" htmlFor="buka">
              <TextInput
                id="buka"
                type="time"
                mono
                value={form.jamOperasionalMulai}
                onChange={(e) => set("jamOperasionalMulai", e.target.value)}
              />
            </Field>
            <Field label="Jam tutup" htmlFor="tutup">
              <TextInput
                id="tutup"
                type="time"
                mono
                value={form.jamOperasionalSelesai}
                onChange={(e) => set("jamOperasionalSelesai", e.target.value)}
              />
            </Field>
            <Field
              label="Target harian"
              htmlFor="target"
              hint="Dipakai bila belum ada rencana untuk hari itu."
            >
              <TextInput
                id="target"
                type="number"
                min={1}
                step={50}
                mono
                value={form.targetHarian}
                onChange={(e) => set("targetHarian", Number(e.target.value))}
              />
            </Field>
            <Field label="Zona waktu" htmlFor="tz" className="sm:col-span-2">
              <SelectInput
                id="tz"
                value={form.zonaWaktu}
                onChange={(e) => set("zonaWaktu", e.target.value)}
              >
                <option value="Asia/Jakarta">WIB — Asia/Jakarta</option>
                <option value="Asia/Makassar">WITA — Asia/Makassar</option>
                <option value="Asia/Jayapura">WIT — Asia/Jayapura</option>
              </SelectInput>
            </Field>
          </PanelBody>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Istilah"
            hint="Sebutan yang dipakai di seluruh konsol — ubah untuk bidang usaha lain"
          />
          <PanelBody className="space-y-4">
            <p className="text-xs leading-relaxed text-ink-muted">
              Konsol ini menangani distribusi apa pun. Yang membedakan satu bidang
              usaha dari yang lain hanyalah sebutannya, jadi tiga kata di bawah ini
              adalah data, bukan bagian dari aplikasi. Mengubahnya mengganti label
              di seluruh halaman, kolom tabel, surat jalan, dan berkas ekspor —
              tanpa menyentuh satu pun angka atau riwayat.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field
                label="Satuan"
                htmlFor="istilah-satuan"
                hint="Satu unit yang Anda antar — tabung, galon, dus, sak. Dipakai pada angka gabungan lintas produk."
              >
                <TextInput
                  id="istilah-satuan"
                  value={form.istilah.satuan}
                  placeholder="tabung"
                  onChange={(e) =>
                    set("istilah", { ...form.istilah, satuan: e.target.value })
                  }
                />
              </Field>
              <Field
                label="Titik antar"
                htmlFor="istilah-outlet"
                hint="Tempat tujuan pengiriman — pangkalan, depot, toko, gerai."
              >
                <TextInput
                  id="istilah-outlet"
                  value={form.istilah.outlet}
                  placeholder="outlet"
                  onChange={(e) =>
                    set("istilah", { ...form.istilah, outlet: e.target.value })
                  }
                />
              </Field>
              <Field
                label="Pemasok"
                htmlFor="istilah-pemasok"
                hint="Sumber pasokan yang kuotanya Anda tarik — SPBE, pabrik, distributor pusat."
              >
                <TextInput
                  id="istilah-pemasok"
                  value={form.istilah.pemasok}
                  placeholder="SPBE"
                  onChange={(e) =>
                    set("istilah", { ...form.istilah, pemasok: e.target.value })
                  }
                />
              </Field>
            </div>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Tampilan" />
          <PanelBody>
            <p className="label mb-2 text-2xs text-ink-muted">Tema</p>
            <div className="flex gap-2">
              {(
                [
                  { value: "light", label: "Terang", icon: Sun },
                  { value: "dark", label: "Gelap", icon: Moon },
                ] as const
              ).map((option) => {
                const Icon = option.icon;
                const active = theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    aria-pressed={active}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-semibold transition-colors",
                      active
                        ? "border-ink bg-ink text-ink-on"
                        : "border-line bg-panel text-ink-muted hover:border-line-strong hover:text-ink",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-muted">
              Pilihan tersimpan di peramban ini dan berlaku untuk seluruh konsol,
              termasuk grafik dan peta.
            </p>
          </PanelBody>
        </Panel>

      </div>

      <Panel>
        <PanelHeader
          title="Konfigurasi lain"
          hint="Data acuan dan aturan yang diatur di halaman tersendiri"
        />
        <PanelBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            to="/system"
            className="rounded-md border border-line bg-panel-sunk p-4 transition-colors hover:border-line-strong"
          >
            <p className="text-sm font-semibold text-ink">Konfigurasi Sistem</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Mitra {supplierLabel()}, rekening penerimaan, penomoran dokumen, dan hari kerja.
            </p>
          </Link>
          <Link
            to="/notifications"
            className="rounded-md border border-line bg-panel-sunk p-4 transition-colors hover:border-line-strong"
          >
            <p className="text-sm font-semibold text-ink">Aturan notifikasi</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Kapan peringatan dibuat, siapa penerimanya, dan kanal pengirimannya.
            </p>
          </Link>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title="Data & simulasi"
          hint="Konsol ini berjalan di atas data contoh yang tersimpan di peramban Anda"
        />
        <PanelBody className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Action
            icon={Play}
            title="Majukan simulasi hari"
            description="Menggerakkan surat jalan hari ini beberapa langkah — berguna untuk melihat papan berangkat hidup di luar jam operasional."
            action={
              <Button variant="outline" className="w-full" onClick={runSimulation}>
                Jalankan simulasi
              </Button>
            }
          />
          <Action
            icon={Download}
            title="Unduh salinan data"
            description="Mengekspor seluruh isi konsol sebagai berkas JSON, setara dengan cadangan basis data."
            action={
              <Button
                variant="outline"
                className="w-full"
                onClick={() => exportMutation.mutate(undefined as never)}
                disabled={exportMutation.isPending}
              >
                Unduh JSON
              </Button>
            }
          />
          <Action
            icon={RotateCcw}
            title="Atur ulang data contoh"
            description="Menghapus seluruh perubahan Anda dan membuat ulang satu hari kerja yang segar."
            action={
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setResetting(true)}
              >
                Atur ulang
              </Button>
            }
          />
        </PanelBody>
      </Panel>

      <ConfirmDialog
        isOpen={resetting}
        title="Atur ulang seluruh data?"
        message="Semua rencana, verifikasi, dan perubahan data induk yang Anda buat akan hilang."
        details="Konsol dimuat ulang dengan satu hari kerja baru: riwayat pengiriman di belakang, rencana berjalan hari ini, dan draf untuk hari berikutnya."
        confirmLabel="Atur ulang data"
        isPending={resetMutation.isPending}
        onCancel={() => setResetting(false)}
        onConfirm={() => resetMutation.mutate(undefined as never)}
      />
    </div>
  );
}

function Action({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Database;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-md border border-line bg-panel-sunk p-4">
      <Icon className="mb-3 h-4 w-4 text-ink-muted" strokeWidth={1.75} />
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-ink-muted">{description}</p>
      <div className="mt-4">{action}</div>
    </div>
  );
}
