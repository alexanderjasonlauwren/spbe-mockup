import { scopeKey } from "@/mocks/scope";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download, Pencil, Plus, Trash2, Truck } from "lucide-react";
import {
  createOrUpdateDriver,
  exportDrivers,
  getDrivers,
  removeDriver,
  type DriverView,
} from "@/features/drivers/api/driverApi";
import { useDeskMutation } from "@/hooks/useDeskMutation";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel, PanelHeader, Meter } from "@/components/common/Panel";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getStatusVariant, spineFor } from "@/lib/status";
import { Field, SearchInput, SegmentedControl, SelectInput, TextInput } from "@/components/common/Field";
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
import { formatNumber, formatPercentId } from "@/lib/format";
import type { DriverStatusEntity } from "@/mocks/types";

const STATUSES: (DriverStatusEntity | "Semua")[] = [
  "Semua",
  "Standby",
  "Dalam Perjalanan",
  "Bongkar Muat",
  "Selesai",
  "Cuti",
];

interface FormState {
  id?: string;
  nama: string;
  telepon: string;
  nomorSim: string;
  plat: string;
  armada: string;
  kapasitas: number;
  status: DriverStatusEntity;
}

const EMPTY: FormState = {
  nama: "",
  telepon: "",
  nomorSim: "",
  plat: "",
  armada: "",
  kapasitas: 240,
  status: "Standby",
};

export function DriverPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DriverStatusEntity | "Semua">("Semua");
  const [editing, setEditing] = useState<FormState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DriverView | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const list = useQuery({
    queryKey: [...scopeKey(), "drivers", search, status],
    queryFn: () => getDrivers({ search, status }),
  });

  const saveMutation = useDeskMutation({
    mutationFn: (values: FormState) => createOrUpdateDriver(values),
    errorTitle: "Data armada tidak tersimpan",
    success: (d) => ({ title: `${d.nama} tersimpan` }),
    onDone: () => setEditing(null),
  });

  const deleteMutation = useDeskMutation({
    mutationFn: (id: string) => removeDriver(id),
    errorTitle: "Hapus armada gagal",
    success: "Armada dihapus",
    onDone: () => setPendingDelete(null),
  });

  const exportMutation = useDeskMutation({
    mutationFn: () => exportDrivers(),
    errorTitle: "Unduh gagal",
    success: (count) => ({
      title: "Berkas CSV diunduh",
      description: `${count} armada diekspor.`,
    }),
  });

  const rows = list.data ?? [];

  /** Opening the editor is what clears stale validation, not an effect. */
  const openEditor = (values: FormState) => {
    setErrors({});
    setEditing(values);
  };
  const bertugas = rows.filter((d) => d.tugasHariIni > 0).length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const next: typeof errors = {};
    if (!editing.nama.trim()) next.nama = "Nama driver wajib diisi.";
    if (!editing.plat.trim()) next.plat = "Nomor plat wajib diisi.";
    if (editing.kapasitas <= 0) next.kapasitas = "Kapasitas harus lebih dari nol.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    saveMutation.mutate(editing);
  };

  const columns: Column<DriverView>[] = [
    {
      key: "nama",
      header: "Driver",
      render: (row) => (
        <>
          <Link
            to={`/drivers/${row.id}`}
            className="block font-medium text-ink hover:underline hover:decoration-signal hover:decoration-2 hover:underline-offset-4"
          >
            {row.nama}
          </Link>
          <span className="data block text-2xs text-ink-muted">{row.telepon}</span>
        </>
      ),
      sortValue: (row) => row.nama,
    },
    {
      key: "armada",
      header: "Armada",
      render: (row) => (
        <>
          <span className="data block text-xs text-ink">{row.plat}</span>
          <span className="block text-2xs text-ink-muted">{row.armada}</span>
        </>
      ),
      sortValue: (row) => row.plat,
    },
    {
      key: "muatan",
      header: "Muatan hari ini",
      width: "14rem",
      render: (row) => (
        <div className="min-w-[9rem]">
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
            <span className="data text-ink">
              {formatNumber(row.muatanHariIni)}
              <span className="text-ink-muted"> / {formatNumber(row.kapasitas)}</span>
            </span>
            <span className="data text-ink-muted">
              {formatPercentId(row.utilisasi * 100)}
            </span>
          </div>
          <Meter
            value={row.muatanHariIni}
            max={row.kapasitas}
            tone={row.utilisasi > 1 ? "rust" : "signal"}
            label={`Muatan ${row.nama}`}
          />
        </div>
      ),
      sortValue: (row) => row.utilisasi,
    },
    {
      key: "tugas",
      header: "Singgah hari ini",
      align: "right",
      render: (row) => (
        <span className="data text-ink">
          {formatNumber(row.selesaiHariIni)}
          <span className="text-ink-muted"> / {formatNumber(row.tugasHariIni)}</span>
        </span>
      ),
      sortValue: (row) => row.tugasHariIni,
    },
    {
      key: "kinerja",
      header: "30 hari",
      align: "right",
      render: (row) => (
        <>
          <span className="data block text-ink">{formatNumber(row.tabung30Hari)}</span>
          <span className="data block text-2xs text-ink-muted">
            {formatPercentId(row.ketepatan * 100)} tepat
          </span>
        </>
      ),
      sortValue: (row) => row.tabung30Hari,
    },
    {
      key: "status",
      header: "Status",
      width: "9rem",
      render: (row) => (
        <StatusBadge variant={getStatusVariant(row.status)} label={row.status} />
      ),
      sortValue: (row) => row.status,
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
            onClick={() =>
              openEditor({
                id: row.id,
                nama: row.nama,
                telepon: row.telepon,
                nomorSim: row.nomorSim,
                plat: row.plat,
                armada: row.armada,
                kapasitas: row.kapasitas,
                status: row.status,
              })
            }
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
    <div className="space-y-5">
      <PageHeader
        eyebrow="Data induk"
        title="Armada & Driver"
        description="Kendaraan yang tersedia untuk penugasan, kapasitas angkutnya, dan kinerja pengemudi selama 30 hari terakhir."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => exportMutation.mutate(undefined as never)}
              disabled={exportMutation.isPending}
            >
              <Download className="h-3.5 w-3.5" />
              Unduh CSV
            </Button>
            <Button onClick={() => openEditor(EMPTY)}>
              <Plus className="h-3.5 w-3.5" />
              Tambah armada
            </Button>
          </>
        }
        meta={
          <span className="text-xs text-ink-muted">
            <span className="data">{bertugas}</span> dari{" "}
            <span className="data">{rows.length}</span> armada bertugas hari ini
          </span>
        }
      />

      <Panel>
        <PanelHeader
          title="Daftar armada"
          hint={`${rows.length} baris`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Nama, plat, atau jenis armada"
                className="w-56"
              />
              <SegmentedControl
                value={status}
                onChange={setStatus}
                options={STATUSES.map((s) => ({ value: s, label: s }))}
              />
            </div>
          }
        />
        <DataTable
          columns={columns}
          data={rows}
          isLoading={list.isLoading}
          rowKey={(row) => row.id}
          spineFor={(row) => spineFor(row.status)}
          pageSize={12}
          defaultSortKey="nama"
          emptyIcon={Truck}
          emptyMessage="Tidak ada armada yang cocok"
          emptyDescription="Ubah filter, atau tambahkan kendaraan baru ke daftar."
          emptyAction={
            <Button size="sm" onClick={() => openEditor(EMPTY)}>
              Tambah armada
            </Button>
          }
          dense
        />
      </Panel>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>
                {editing?.id ? `Ubah ${editing.nama}` : "Tambah armada"}
              </DialogTitle>
              <DialogDescription>
                Kapasitas menentukan batas muatan yang boleh ditugaskan ke kendaraan
                ini pada satu rencana distribusi.
              </DialogDescription>
            </DialogHeader>

            {editing && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Nama driver"
                  htmlFor="d-nama"
                  error={errors.nama}
                  required
                  className="sm:col-span-2"
                >
                  <TextInput
                    id="d-nama"
                    value={editing.nama}
                    invalid={!!errors.nama}
                    onChange={(e) => setEditing({ ...editing, nama: e.target.value })}
                  />
                </Field>

                <Field label="Telepon" htmlFor="d-telp">
                  <TextInput
                    id="d-telp"
                    mono
                    inputMode="tel"
                    value={editing.telepon}
                    onChange={(e) => setEditing({ ...editing, telepon: e.target.value })}
                  />
                </Field>

                <Field label="Nomor SIM" htmlFor="d-sim">
                  <TextInput
                    id="d-sim"
                    mono
                    value={editing.nomorSim}
                    onChange={(e) => setEditing({ ...editing, nomorSim: e.target.value })}
                  />
                </Field>

                <Field label="Nomor plat" htmlFor="d-plat" error={errors.plat} required>
                  <TextInput
                    id="d-plat"
                    mono
                    placeholder="B 1234 TGH"
                    value={editing.plat}
                    invalid={!!errors.plat}
                    onChange={(e) => setEditing({ ...editing, plat: e.target.value })}
                  />
                </Field>

                <Field label="Jenis armada" htmlFor="d-armada">
                  <TextInput
                    id="d-armada"
                    placeholder="Isuzu Elf NMR"
                    value={editing.armada}
                    onChange={(e) => setEditing({ ...editing, armada: e.target.value })}
                  />
                </Field>

                <Field
                  label="Kapasitas"
                  htmlFor="d-kap"
                  error={errors.kapasitas}
                  hint="Jumlah tabung per rit."
                  required
                >
                  <TextInput
                    id="d-kap"
                    type="number"
                    min={1}
                    step={20}
                    mono
                    value={editing.kapasitas}
                    invalid={!!errors.kapasitas}
                    onChange={(e) =>
                      setEditing({ ...editing, kapasitas: Number(e.target.value) })
                    }
                  />
                </Field>

                <Field label="Status" htmlFor="d-status">
                  <SelectInput
                    id="d-status"
                    value={editing.status}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        status: e.target.value as DriverStatusEntity,
                      })
                    }
                  >
                    <option value="Standby">Standby — siap ditugaskan</option>
                    <option value="Cuti">Cuti — tidak dapat dipilih</option>
                  </SelectInput>
                </Field>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setEditing(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                Simpan armada
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title={`Hapus ${pendingDelete?.nama}?`}
        message="Armada hilang dari daftar penugasan pada rencana distribusi berikutnya."
        details={
          pendingDelete && (
            <p className={cn(pendingDelete.tugasHariIni > 0 && "text-rust-ink")}>
              {pendingDelete.tugasHariIni > 0
                ? `Masih memegang ${pendingDelete.tugasHariIni} surat jalan hari ini. Tugaskan ulang sebelum menghapus.`
                : "Riwayat pengiriman tetap tersimpan untuk laporan kinerja."}
            </p>
          )
        }
        confirmLabel="Hapus armada"
        isPending={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </div>
  );
}
