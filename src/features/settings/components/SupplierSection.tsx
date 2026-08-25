import { scopeKey } from "@/mocks/scope";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Factory, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteSupplier, getSupplierList, saveSupplier, type SupplierView } from "@/features/system/api/systemApi";
import { useDeskMutation } from "@/hooks/useDeskMutation";
import { Panel, PanelHeader } from "@/components/common/Panel";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Field, TextInput, Toggle } from "@/components/common/Field";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { supplierLabel } from "@/lib/lexicon";

/* ── supply sources ────────────────────────────────────────────────────── */

interface SupplierForm {
  id?: string;
  kode: string;
  nama: string;
  alamat: string;
  penanggungJawab: string;
  telepon: string;
  aktif: boolean;
}

const EMPTY_SUPPLIER: SupplierForm = {
  kode: "",
  nama: "",
  alamat: "",
  penanggungJawab: "",
  telepon: "",
  aktif: true,
};

export function SupplierSection() {
  const list = useQuery({ queryKey: [...scopeKey(), "supplier-list"], queryFn: getSupplierList });
  const [editing, setEditing] = useState<SupplierForm | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SupplierView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useDeskMutation({
    mutationFn: (values: SupplierForm) => saveSupplier(values),
    errorTitle: `${supplierLabel()} tidak tersimpan`,
    success: (s) => ({ title: `${s.nama} tersimpan` }),
    onDone: () => setEditing(null),
  });

  const deleteMutation = useDeskMutation({
    mutationFn: (id: string) => deleteSupplier(id),
    errorTitle: `Hapus ${supplierLabel()} gagal`,
    success: `${supplierLabel()} dihapus`,
    onDone: () => setPendingDelete(null),
  });

  const open = (values: SupplierForm) => {
    setError(null);
    setEditing(values);
  };

  const columns: Column<SupplierView>[] = [
    {
      key: "nama",
      header: supplierLabel(),
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
          title={`Mitra ${supplierLabel()}`}
          hint={`Sumber kuota. Setiap Schedule Agreement diterbitkan oleh salah satu ${supplierLabel()} di sini.`}
          actions={
            <Button size="sm" onClick={() => open(EMPTY_SUPPLIER)}>
              <Plus className="h-3.5 w-3.5" />
              Tambah {supplierLabel()}
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
          emptyMessage={`Belum ada mitra ${supplierLabel()}`}
          emptyDescription={`Tambahkan ${supplierLabel()} agar dapat dipilih saat mengunggah Schedule Agreement.`}
          emptyAction={
            <Button size="sm" onClick={() => open(EMPTY_SUPPLIER)}>
              Tambah {supplierLabel()}
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
              if (!editing.nama.trim()) return setError(`Nama ${supplierLabel()} wajib diisi.`);
              saveMutation.mutate(editing);
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {editing?.id ? `Ubah ${editing.nama}` : `Tambah mitra ${supplierLabel()}`}
              </DialogTitle>
              <DialogDescription>
                Mengubah nama {supplierLabel()} juga memperbarui agreement yang sudah merujuk
                padanya.
              </DialogDescription>
            </DialogHeader>

            {editing && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label={`Nama ${supplierLabel()}`}
                  htmlFor="supplier-nama"
                  error={error ?? undefined}
                  required
                  className="sm:col-span-2"
                >
                  <TextInput
                    id="supplier-nama"
                    value={editing.nama}
                    invalid={!!error}
                    placeholder={`${supplierLabel()} Salatiga Utama`}
                    onChange={(e) => setEditing({ ...editing, nama: e.target.value })}
                  />
                </Field>
                <Field label="Kode" htmlFor="supplier-kode" hint="Dibuat otomatis jika kosong.">
                  <TextInput
                    id="supplier-kode"
                    mono
                    value={editing.kode}
                    onChange={(e) => setEditing({ ...editing, kode: e.target.value })}
                  />
                </Field>
                <Field label="Telepon" htmlFor="supplier-telp">
                  <TextInput
                    id="supplier-telp"
                    mono
                    value={editing.telepon}
                    onChange={(e) => setEditing({ ...editing, telepon: e.target.value })}
                  />
                </Field>
                <Field label="Penanggung jawab" htmlFor="supplier-pj">
                  <TextInput
                    id="supplier-pj"
                    value={editing.penanggungJawab}
                    onChange={(e) =>
                      setEditing({ ...editing, penanggungJawab: e.target.value })
                    }
                  />
                </Field>
                <Field label="Alamat" htmlFor="supplier-alamat">
                  <TextInput
                    id="supplier-alamat"
                    value={editing.alamat}
                    onChange={(e) => setEditing({ ...editing, alamat: e.target.value })}
                  />
                </Field>
                <div className="sm:col-span-2 border-t border-line">
                  <Toggle
                    label="Aktif"
                    description={`${supplierLabel()} nonaktif tidak muncul saat mengunggah agreement baru.`}
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
                Simpan {supplierLabel()}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title={`Hapus ${pendingDelete?.nama}?`}
        message={`${supplierLabel()} hilang dari pilihan saat mengunggah Schedule Agreement.`}
        details={
          pendingDelete && pendingDelete.jumlahSA > 0
            ? `Masih dipakai ${pendingDelete.jumlahSA} agreement — penghapusan akan ditolak. Nonaktifkan saja agar riwayat kuota tetap utuh.`
            : `Tidak ada agreement yang merujuk ${supplierLabel()} ini, jadi aman dihapus.`
        }
        confirmLabel={`Hapus ${supplierLabel()}`}
        isPending={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </>
  );
}
