import { scopeKey } from "@/mocks/scope";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Factory,
  Pencil,
  Plus,
  Star,
  Trash2,
  CalendarClock,
} from "lucide-react";
import {
  deleteBankAccount,
  deleteSpbe,
  getBankAccounts,
  getSpbeList,
  getSystemConfig,
  saveBankAccount,
  saveNumbering,
  saveOperations,
  saveSpbe,
  type SpbeView,
} from "@/features/system/api/systemApi";
import { useDeskMutation } from "@/hooks/useDeskMutation";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel, PanelBody, PanelHeader, Skeleton } from "@/components/common/Panel";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  Field,
  SegmentedControl,
  SelectInput,
  TextInput,
  Toggle,
} from "@/components/common/Field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import type {
  BankAccountEntity,
  BankNameEntity,
  NumberingEntity,
  OperationsEntity,
} from "@/mocks/types";

type Tab = "spbe" | "rekening" | "penomoran" | "operasi";

const BANKS: BankNameEntity[] = ["BCA", "BNI", "Mandiri", "BRI", "BSI"];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function SystemConfigPage() {
  const [tab, setTab] = useState<Tab>("spbe");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Data induk"
        title="Konfigurasi Sistem"
        description="Data acuan yang dipakai seluruh konsol: mitra SPBE, rekening penerimaan, penomoran dokumen, dan jadwal operasi."
        meta={
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: "spbe" as const, label: "Mitra SPBE" },
              { value: "rekening" as const, label: "Rekening penerimaan" },
              { value: "penomoran" as const, label: "Penomoran dokumen" },
              { value: "operasi" as const, label: "Jadwal operasi" },
            ]}
          />
        }
      />

      {tab === "spbe" && <SpbeSection />}
      {tab === "rekening" && <BankSection />}
      {tab === "penomoran" && <NumberingSection />}
      {tab === "operasi" && <OperationsSection />}
    </div>
  );
}

/* ── SPBE ──────────────────────────────────────────────────────────────── */

interface SpbeForm {
  id?: string;
  kode: string;
  nama: string;
  alamat: string;
  penanggungJawab: string;
  telepon: string;
  aktif: boolean;
}

const EMPTY_SPBE: SpbeForm = {
  kode: "",
  nama: "",
  alamat: "",
  penanggungJawab: "",
  telepon: "",
  aktif: true,
};

function SpbeSection() {
  const list = useQuery({ queryKey: [...scopeKey(), "spbe-list"], queryFn: getSpbeList });
  const [editing, setEditing] = useState<SpbeForm | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SpbeView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useDeskMutation({
    mutationFn: (values: SpbeForm) => saveSpbe(values),
    errorTitle: "SPBE tidak tersimpan",
    success: (s) => ({ title: `${s.nama} tersimpan` }),
    onDone: () => setEditing(null),
  });

  const deleteMutation = useDeskMutation({
    mutationFn: (id: string) => deleteSpbe(id),
    errorTitle: "Hapus SPBE gagal",
    success: "SPBE dihapus",
    onDone: () => setPendingDelete(null),
  });

  const open = (values: SpbeForm) => {
    setError(null);
    setEditing(values);
  };

  const columns: Column<SpbeView>[] = [
    {
      key: "nama",
      header: "SPBE",
      render: (row) => (
        <>
          <span className="block font-medium text-ink">{row.nama}</span>
          <span className="data block text-2xs text-ink-muted">{row.kode}</span>
        </>
      ),
      sortValue: (row) => row.nama,
    },
    {
      key: "kontak",
      header: "Kontak",
      render: (row) => (
        <>
          <span className="block text-xs text-ink">{row.penanggungJawab || "—"}</span>
          <span className="data block text-2xs text-ink-muted">{row.telepon || "—"}</span>
        </>
      ),
    },
    {
      key: "alamat",
      header: "Alamat",
      render: (row) => (
        <span className="text-xs text-ink-muted">{row.alamat || "—"}</span>
      ),
    },
    {
      key: "sa",
      header: "Agreement",
      align: "right",
      render: (row) => (
        <>
          <span className="data block text-ink">{formatNumber(row.jumlahSA)}</span>
          <span className="data block text-2xs text-ink-muted">
            sisa {formatNumber(row.kuotaAktif)}
          </span>
        </>
      ),
      sortValue: (row) => row.jumlahSA,
    },
    {
      key: "status",
      header: "Status",
      width: "7rem",
      render: (row) => (
        <StatusBadge
          variant={row.aktif ? "success" : "draft"}
          label={row.aktif ? "Aktif" : "Nonaktif"}
        />
      ),
    },
    {
      key: "aksi",
      header: "",
      align: "right",
      width: "1%",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Ubah ${row.nama}`}
            onClick={() => open({ ...row })}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Hapus ${row.nama}`}
            onClick={() => setPendingDelete(row)}
            className="hover:bg-rust-soft hover:text-rust-ink"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Panel>
        <PanelHeader
          title="Mitra SPBE"
          hint="Sumber kuota. Setiap Schedule Agreement diterbitkan oleh salah satu SPBE di sini."
          actions={
            <Button size="sm" onClick={() => open(EMPTY_SPBE)}>
              <Plus className="h-3.5 w-3.5" />
              Tambah SPBE
            </Button>
          }
        />
        <DataTable
          columns={columns}
          data={list.data ?? []}
          isLoading={list.isLoading}
          rowKey={(row) => row.id}
          spineFor={(row) => (row.aktif ? "text-pine" : "text-draft")}
          emptyIcon={Factory}
          emptyMessage="Belum ada mitra SPBE"
          emptyDescription="Tambahkan SPBE agar dapat dipilih saat mengunggah Schedule Agreement."
          emptyAction={
            <Button size="sm" onClick={() => open(EMPTY_SPBE)}>
              Tambah SPBE
            </Button>
          }
          dense
        />
      </Panel>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editing) return;
              if (!editing.nama.trim()) return setError("Nama SPBE wajib diisi.");
              saveMutation.mutate(editing);
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {editing?.id ? `Ubah ${editing.nama}` : "Tambah mitra SPBE"}
              </DialogTitle>
              <DialogDescription>
                Mengubah nama SPBE juga memperbarui agreement yang sudah merujuk
                padanya.
              </DialogDescription>
            </DialogHeader>

            {editing && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Nama SPBE"
                  htmlFor="spbe-nama"
                  error={error ?? undefined}
                  required
                  className="sm:col-span-2"
                >
                  <TextInput
                    id="spbe-nama"
                    value={editing.nama}
                    invalid={!!error}
                    placeholder="SPBE Bekasi Utama"
                    onChange={(e) => setEditing({ ...editing, nama: e.target.value })}
                  />
                </Field>
                <Field label="Kode" htmlFor="spbe-kode" hint="Dibuat otomatis jika kosong.">
                  <TextInput
                    id="spbe-kode"
                    mono
                    value={editing.kode}
                    onChange={(e) => setEditing({ ...editing, kode: e.target.value })}
                  />
                </Field>
                <Field label="Telepon" htmlFor="spbe-telp">
                  <TextInput
                    id="spbe-telp"
                    mono
                    value={editing.telepon}
                    onChange={(e) => setEditing({ ...editing, telepon: e.target.value })}
                  />
                </Field>
                <Field label="Penanggung jawab" htmlFor="spbe-pj">
                  <TextInput
                    id="spbe-pj"
                    value={editing.penanggungJawab}
                    onChange={(e) =>
                      setEditing({ ...editing, penanggungJawab: e.target.value })
                    }
                  />
                </Field>
                <Field label="Alamat" htmlFor="spbe-alamat">
                  <TextInput
                    id="spbe-alamat"
                    value={editing.alamat}
                    onChange={(e) => setEditing({ ...editing, alamat: e.target.value })}
                  />
                </Field>
                <div className="sm:col-span-2 border-t border-line">
                  <Toggle
                    label="Aktif"
                    description="SPBE nonaktif tidak muncul saat mengunggah agreement baru."
                    checked={editing.aktif}
                    onChange={(aktif) => setEditing({ ...editing, aktif })}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setEditing(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                Simpan SPBE
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title={`Hapus ${pendingDelete?.nama}?`}
        message="SPBE hilang dari pilihan saat mengunggah Schedule Agreement."
        details={
          pendingDelete && pendingDelete.jumlahSA > 0
            ? `Masih dipakai ${pendingDelete.jumlahSA} agreement — penghapusan akan ditolak. Nonaktifkan saja agar riwayat kuota tetap utuh.`
            : "Tidak ada agreement yang merujuk SPBE ini, jadi aman dihapus."
        }
        confirmLabel="Hapus SPBE"
        isPending={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </>
  );
}

/* ── receiving accounts ────────────────────────────────────────────────── */

interface BankForm {
  id?: string;
  bank: BankNameEntity;
  nomorRekening: string;
  atasNama: string;
  cabang: string;
  utama: boolean;
  aktif: boolean;
}

const EMPTY_BANK: BankForm = {
  bank: "BCA",
  nomorRekening: "",
  atasNama: "",
  cabang: "",
  utama: false,
  aktif: true,
};

function BankSection() {
  const list = useQuery({ queryKey: [...scopeKey(), "bank-accounts"], queryFn: getBankAccounts });
  const [editing, setEditing] = useState<BankForm | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BankAccountEntity | null>(null);

  const saveMutation = useDeskMutation({
    mutationFn: (values: BankForm) => saveBankAccount(values),
    errorTitle: "Rekening tidak tersimpan",
    success: (a) => ({ title: `Rekening ${a.bank} ${a.nomorRekening} tersimpan` }),
    onDone: () => setEditing(null),
  });

  const deleteMutation = useDeskMutation({
    mutationFn: (id: string) => deleteBankAccount(id),
    errorTitle: "Hapus rekening gagal",
    success: "Rekening dihapus",
    onDone: () => setPendingDelete(null),
  });

  return (
    <>
      <Panel>
        <PanelHeader
          title="Rekening penerimaan"
          hint="Rekening tujuan transfer pangkalan. Yang utama dicetak pada tagihan."
          actions={
            <Button size="sm" onClick={() => setEditing(EMPTY_BANK)}>
              <Plus className="h-3.5 w-3.5" />
              Tambah rekening
            </Button>
          }
        />
        {list.isLoading ? (
          <PanelBody className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </PanelBody>
        ) : (list.data ?? []).length === 0 ? (
          <PanelBody>
            <p className="py-8 text-center text-sm text-ink-muted">
              Belum ada rekening penerimaan. Tim keuangan memerlukan ini untuk
              mencocokkan transfer yang masuk.
            </p>
          </PanelBody>
        ) : (
          <ul className="divide-y divide-line">
            {(list.data ?? []).map((a) => (
              <li
                key={a.id}
                className={cn(
                  "spine flex flex-wrap items-center gap-4 px-5 py-4",
                  a.utama ? "text-signal" : a.aktif ? "text-pine" : "text-draft",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    {a.bank}
                    {a.utama && (
                      <span className="flex items-center gap-1 rounded-sm bg-signal-soft px-1.5 py-0.5 text-2xs font-medium text-signal-ink">
                        <Star className="h-2.5 w-2.5" />
                        Utama
                      </span>
                    )}
                    {!a.aktif && <StatusBadge variant="draft" label="Nonaktif" />}
                  </p>
                  <p className="data mt-0.5 text-sm text-ink">{a.nomorRekening}</p>
                  <p className="text-xs text-ink-muted">
                    {a.atasNama}
                    {a.cabang && ` · KCP ${a.cabang}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Ubah rekening ${a.nomorRekening}`}
                    onClick={() => setEditing({ ...a })}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Hapus rekening ${a.nomorRekening}`}
                    onClick={() => setPendingDelete(a)}
                    className="hover:bg-rust-soft hover:text-rust-ink"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editing) saveMutation.mutate(editing);
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {editing?.id ? "Ubah rekening" : "Tambah rekening penerimaan"}
              </DialogTitle>
              <DialogDescription>
                Rekening ini muncul pada tagihan dan dipakai keuangan untuk
                mencocokkan mutasi masuk.
              </DialogDescription>
            </DialogHeader>

            {editing && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Bank" htmlFor="bank-nama">
                  <SelectInput
                    id="bank-nama"
                    value={editing.bank}
                    onChange={(e) =>
                      setEditing({ ...editing, bank: e.target.value as BankNameEntity })
                    }
                  >
                    {BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Cabang" htmlFor="bank-cabang">
                  <TextInput
                    id="bank-cabang"
                    value={editing.cabang}
                    onChange={(e) => setEditing({ ...editing, cabang: e.target.value })}
                  />
                </Field>
                <Field
                  label="Nomor rekening"
                  htmlFor="bank-no"
                  required
                  className="sm:col-span-2"
                >
                  <TextInput
                    id="bank-no"
                    mono
                    value={editing.nomorRekening}
                    onChange={(e) =>
                      setEditing({ ...editing, nomorRekening: e.target.value })
                    }
                  />
                </Field>
                <Field
                  label="Atas nama"
                  htmlFor="bank-atas"
                  required
                  className="sm:col-span-2"
                >
                  <TextInput
                    id="bank-atas"
                    value={editing.atasNama}
                    onChange={(e) => setEditing({ ...editing, atasNama: e.target.value })}
                  />
                </Field>
                <div className="divide-y divide-line sm:col-span-2">
                  <Toggle
                    label="Jadikan rekening utama"
                    description="Dicetak pada tagihan. Hanya satu rekening yang bisa menjadi utama."
                    checked={editing.utama}
                    onChange={(utama) => setEditing({ ...editing, utama })}
                  />
                  <Toggle
                    label="Aktif"
                    description="Rekening nonaktif tetap tersimpan untuk riwayat."
                    checked={editing.aktif}
                    onChange={(aktif) => setEditing({ ...editing, aktif })}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setEditing(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                Simpan rekening
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title="Hapus rekening ini?"
        message={`${pendingDelete?.bank} ${pendingDelete?.nomorRekening} tidak lagi muncul pada tagihan baru.`}
        details="Pembayaran yang sudah tercatat pada rekening ini tetap tersimpan."
        confirmLabel="Hapus rekening"
        isPending={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </>
  );
}

/* ── numbering ─────────────────────────────────────────────────────────── */

function NumberingSection() {
  const config = useQuery({ queryKey: [...scopeKey(), "system-config"], queryFn: getSystemConfig });
  const [form, setForm] = useState<NumberingEntity | null>(null);

  useEffect(() => {
    if (config.data) setForm({ ...config.data.penomoran });
  }, [config.data]);

  const saveMutation = useDeskMutation({
    mutationFn: (values: NumberingEntity) => saveNumbering(values),
    errorTitle: "Penomoran tidak tersimpan",
    success: "Penomoran dokumen disimpan",
  });

  const dirty =
    !!form && !!config.data && JSON.stringify(form) !== JSON.stringify(config.data.penomoran);

  if (!form) return <Skeleton className="h-64 w-full" />;

  const today = new Date();
  const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(
    today.getDate(),
  ).padStart(2, "0")}`;
  const preview = (prefix: string, seq: string) =>
    form.sertakanTanggal ? `${prefix}-${stamp}-${seq}` : `${prefix}-${seq}`;

  const fields: { key: keyof NumberingEntity; label: string; hint: string; seq: string }[] =
    [
      { key: "suratJalan", label: "Surat jalan", hint: "Dicetak dan dibawa armada.", seq: "01" },
      { key: "invoice", label: "Tagihan", hint: "Dipakai tim keuangan.", seq: "001" },
      { key: "rencana", label: "Rencana distribusi", hint: "Satu per hari pengiriman.", seq: "" },
      { key: "pesanan", label: "Pesanan pangkalan", hint: "Permintaan masuk.", seq: "001" },
    ];

  return (
    <Panel>
      <PanelHeader
        title="Penomoran dokumen"
        hint="Awalan yang muncul di setiap tabel dan cetakan"
        actions={
          dirty && (
            <>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => config.data && setForm({ ...config.data.penomoran })}
              >
                Urungkan
              </Button>
              <Button
                size="xs"
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending}
              >
                Simpan
              </Button>
            </>
          )
        }
      />
      <PanelBody className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <Field
              key={f.key}
              label={f.label}
              htmlFor={`num-${f.key}`}
              hint={
                <>
                  {f.hint} Contoh:{" "}
                  <span className="data text-ink">
                    {preview(String(form[f.key] || "?"), f.seq || "001")}
                  </span>
                </>
              }
            >
              <TextInput
                id={`num-${f.key}`}
                mono
                maxLength={6}
                value={String(form[f.key])}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value.toUpperCase() })}
              />
            </Field>
          ))}
        </div>

        <div className="border-t border-line">
          <Toggle
            label="Sertakan tanggal pada nomor"
            description="Nomor urut dihitung ulang setiap hari, misalnya SJ-20260804-01. Tanpa ini, nomor berjalan terus."
            checked={form.sertakanTanggal}
            onChange={(sertakanTanggal) => setForm({ ...form, sertakanTanggal })}
          />
        </div>

        <p className="rounded-md border border-line bg-panel-sunk px-4 py-3 text-xs leading-relaxed text-ink-muted">
          Perubahan berlaku untuk dokumen yang terbit setelah disimpan. Nomor yang
          sudah tercetak tidak ikut berubah, sehingga arsip lama tetap cocok.
        </p>
      </PanelBody>
    </Panel>
  );
}

/* ── operations ────────────────────────────────────────────────────────── */

function OperationsSection() {
  const config = useQuery({ queryKey: [...scopeKey(), "system-config"], queryFn: getSystemConfig });
  const [form, setForm] = useState<OperationsEntity | null>(null);

  useEffect(() => {
    if (config.data) setForm({ ...config.data.operasi });
  }, [config.data]);

  const saveMutation = useDeskMutation({
    mutationFn: (values: OperationsEntity) => saveOperations(values),
    errorTitle: "Jadwal operasi tidak tersimpan",
    success: "Jadwal operasi disimpan",
  });

  const dirty =
    !!form && !!config.data && JSON.stringify(form) !== JSON.stringify(config.data.operasi);

  if (!form) return <Skeleton className="h-64 w-full" />;

  const toggleDay = (day: number) =>
    setForm({
      ...form,
      hariKerja: form.hariKerja.includes(day)
        ? form.hariKerja.filter((d) => d !== day)
        : [...form.hariKerja, day].sort(),
    });

  return (
    <Panel>
      <PanelHeader
        title="Jadwal operasi"
        hint="Dipakai perencanaan distribusi dan papan berangkat"
        actions={
          dirty && (
            <>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => config.data && setForm({ ...config.data.operasi })}
              >
                Urungkan
              </Button>
              <Button
                size="xs"
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending}
              >
                Simpan
              </Button>
            </>
          )
        }
      />
      <PanelBody className="space-y-5">
        <div>
          <p className="label mb-2 text-2xs text-ink-muted">Hari kerja</p>
          <div className="flex flex-wrap gap-1.5">
            {HARI.map((nama, day) => {
              const on = form.hariKerja.includes(day);
              return (
                <button
                  key={nama}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors",
                    on
                      ? "border-ink bg-ink text-ink-on"
                      : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
                  )}
                >
                  {nama}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Rencana distribusi tidak dibuat untuk hari yang tidak dipilih.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Durasi singgah"
            htmlFor="ops-durasi"
            hint="Perjalanan dan bongkar per pangkalan. Menentukan lebar balok pada papan berangkat."
          >
            <TextInput
              id="ops-durasi"
              type="number"
              mono
              min={15}
              max={240}
              step={15}
              value={form.durasiSinggahMenit}
              onChange={(e) =>
                setForm({ ...form, durasiSinggahMenit: Number(e.target.value) })
              }
            />
          </Field>
          <Field
            label="Jangkauan perencanaan"
            htmlFor="ops-lead"
            hint="Sejauh berapa hari ke depan rencana boleh dibuat."
          >
            <TextInput
              id="ops-lead"
              type="number"
              mono
              min={1}
              max={90}
              value={form.leadTimeHari}
              onChange={(e) => setForm({ ...form, leadTimeHari: Number(e.target.value) })}
            />
          </Field>
        </div>

        <p className="flex items-start gap-2.5 rounded-md border border-line bg-panel-sunk px-4 py-3 text-xs leading-relaxed text-ink-muted">
          <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Jam buka dan tutup diatur terpisah di Pengaturan, karena keduanya juga
          menentukan rentang waktu pada papan berangkat.
        </p>
      </PanelBody>
    </Panel>
  );
}
