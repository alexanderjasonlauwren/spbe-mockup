import { scopeKey } from "@/mocks/scope";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import {
  createClaim,
  deleteClaim,
  getClaims,
  updateClaim,
  updateClaimStatus,
  type ClaimView,
} from "@/features/transportation/api/transportationApi";
import { CLAIM_STATUSES, CLAIM_STATUS_LABEL } from "@/features/transportation/api/contract";
import { useDeskMutation } from "@/hooks/useDeskMutation";
import { CanAccess } from "@/features/rbac/components/CanAccess";
import { PERMISSIONS } from "@/features/rbac/permissions";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel, PanelHeader } from "@/components/common/Panel";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getStatusVariant, spineFor } from "@/lib/status";
import { Field, SearchInput, SelectInput, TextareaInput, TextInput } from "@/components/common/Field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDateId, formatRupiah } from "@/lib/format";
import type { ClaimStatus } from "@/types/domain";

interface FormState {
  id?: string;
  version?: number;
  handoverReference: string;
  handoverDate: string;
  claimedAmount: number;
}

const EMPTY: FormState = { handoverReference: "", handoverDate: "", claimedAmount: 0 };

interface StatusFormState {
  id: string;
  version: number;
  claimStatus: ClaimStatus;
  principalInvoiceNumber: string;
  statusNote: string;
  labelForTitle: string;
}

/**
 * The BAST ledger -- D3's own A-Step 1, the flow document's own words: "the
 * smallest useful version is manual: record the BAST, record the invoice
 * number, record the status the agent read off iVendor."
 *
 * Deliberately does not offer linking deliveries to a claim from this
 * screen yet: the API accepts `delivery_ids` at creation
 * (`transportationApi.http.ts`'s own `CreateClaimInput`), but a picker for
 * "which deliveries does this BAST cover" is a second, larger piece of UI
 * the flow document's own minimal version does not require -- a claim
 * recorded with no deliveries attached is exactly the manual-first case
 * this step exists to serve.
 */
export function TransportationClaimListPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ClaimStatus | "Semua">("Semua");
  const [editing, setEditing] = useState<FormState | null>(null);
  const [statusEditing, setStatusEditing] = useState<StatusFormState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ClaimView | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const list = useQuery({
    queryKey: [...scopeKey(), "transportation-claims", search, status],
    queryFn: () => getClaims({ search, claimStatus: status }),
  });

  const saveMutation = useDeskMutation({
    mutationFn: (values: FormState) =>
      values.id
        ? updateClaim({
            id: values.id,
            version: values.version!,
            handoverReference: values.handoverReference,
            handoverDate: values.handoverDate,
            claimedAmount: values.claimedAmount,
          })
        : createClaim({
            handoverReference: values.handoverReference,
            handoverDate: values.handoverDate,
            claimedAmount: values.claimedAmount,
          }),
    errorTitle: "BAST tidak tersimpan",
    success: (c) => ({ title: `${c.claimNumber} tersimpan` }),
    onDone: () => setEditing(null),
  });

  const statusMutation = useDeskMutation({
    mutationFn: (values: StatusFormState) =>
      updateClaimStatus({
        id: values.id,
        version: values.version,
        claimStatus: values.claimStatus,
        principalInvoiceNumber: values.principalInvoiceNumber || undefined,
        statusNote: values.statusNote || undefined,
      }),
    errorTitle: "Status tidak tersimpan",
    success: (c) => ({ title: `Status ${c.claimNumber} diperbarui` }),
    onDone: () => setStatusEditing(null),
  });

  const deleteMutation = useDeskMutation({
    mutationFn: (id: string) => deleteClaim(id),
    errorTitle: "Hapus BAST gagal",
    success: "BAST dihapus",
    onDone: () => setPendingDelete(null),
  });

  const openEditor = (state: FormState) => {
    setErrors({});
    setEditing(state);
  };

  const openStatusEditor = (row: ClaimView) => {
    setStatusEditing({
      id: row.id,
      version: row.version,
      claimStatus: row.claimStatus,
      principalInvoiceNumber: row.principalInvoiceNumber ?? "",
      statusNote: "",
      labelForTitle: row.claimNumber,
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const next: typeof errors = {};
    if (!editing.handoverReference.trim()) next.handoverReference = "Nomor BAST wajib diisi.";
    if (!editing.handoverDate) next.handoverDate = "Tanggal serah terima wajib diisi.";
    if (editing.claimedAmount <= 0) next.claimedAmount = "Nilai klaim harus lebih dari nol.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    saveMutation.mutate(editing);
  };

  const rows = list.data ?? [];

  const columns: Column<ClaimView>[] = [
    {
      key: "claimNumber",
      header: "Nomor",
      render: (row) => (
        <>
          <span className="data block text-xs text-ink">{row.claimNumber}</span>
          <span className="block text-2xs text-ink-muted">BAST {row.handoverReference}</span>
        </>
      ),
      sortValue: (row) => row.claimNumber,
    },
    {
      key: "handoverDate",
      header: "Tanggal Serah Terima",
      render: (row) => <span className="data text-xs text-ink">{formatDateId(row.handoverDate)}</span>,
      sortValue: (row) => row.handoverDate,
    },
    {
      key: "claimedAmount",
      header: "Nilai Klaim",
      align: "right",
      render: (row) => <span className="data text-ink">{formatRupiah(row.claimedAmount)}</span>,
      sortValue: (row) => row.claimedAmount,
    },
    {
      key: "principalInvoiceNumber",
      header: "No. Invoice iVendor",
      render: (row) => (
        <span className="data text-xs text-ink-muted">{row.principalInvoiceNumber ?? "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <div className="flex flex-col gap-1">
          <StatusBadge
            variant={getStatusVariant(CLAIM_STATUS_LABEL[row.claimStatus])}
            label={CLAIM_STATUS_LABEL[row.claimStatus]}
          />
          {row.statusNote && (
            <span className="max-w-[16rem] truncate text-2xs text-ink-muted" title={row.statusNote}>
              {row.statusNote}
            </span>
          )}
        </div>
      ),
      sortValue: (row) => row.claimStatus,
    },
    {
      key: "aksi",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <CanAccess permission={PERMISSIONS.TRANSPORTATION_CLAIMS_EDIT}>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Ubah status ${row.claimNumber}`}
              onClick={() => openStatusEditor(row)}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Ubah ${row.claimNumber}`}
              onClick={() =>
                openEditor({
                  id: row.id,
                  version: row.version,
                  handoverReference: row.handoverReference,
                  handoverDate: row.handoverDate,
                  claimedAmount: row.claimedAmount,
                })
              }
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </CanAccess>
          {/* Only a draft may be deleted -- mirrors the service's own rule
              (a submitted claim is a record of something already sent to
              the principal), rather than offering an action that would
              always fail past draft. */}
          {row.claimStatus === "draft" && (
            <CanAccess permission={PERMISSIONS.TRANSPORTATION_CLAIMS_DELETE}>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Hapus ${row.claimNumber}`}
                onClick={() => setPendingDelete(row)}
                className="hover:bg-rust-soft hover:text-rust-ink"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </CanAccess>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operasi harian"
        title="Klaim Transportasi (BAST)"
        description="Catat setiap BAST yang diserahkan ke prinsipal, dan perbarui statusnya begitu iVendor menjawab."
        actions={
          <CanAccess permission={PERMISSIONS.TRANSPORTATION_CLAIMS_CREATE}>
            <Button onClick={() => openEditor(EMPTY)}>
              <Plus className="h-3.5 w-3.5" />
              Catat BAST baru
            </Button>
          </CanAccess>
        }
        meta={
          <span className="text-xs text-ink-muted">
            <span className="data">{rows.length}</span> klaim
          </span>
        }
      />

      <Panel>
        <PanelHeader
          title="Daftar klaim"
          hint={`${rows.length} baris`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Nomor BAST, klaim, atau invoice"
                className="w-64"
              />
              <SelectInput value={status} onChange={(e) => setStatus(e.target.value as ClaimStatus | "Semua")}>
                <option value="Semua">Semua status</option>
                {CLAIM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {CLAIM_STATUS_LABEL[s]}
                  </option>
                ))}
              </SelectInput>
            </div>
          }
        />
        <DataTable
          columns={columns}
          data={rows}
          isLoading={list.isLoading}
          rowKey={(row) => row.id}
          spineFor={(row) => spineFor(CLAIM_STATUS_LABEL[row.claimStatus])}
          pageSize={12}
          defaultSortKey="handoverDate"
          emptyIcon={FileText}
          emptyMessage="Belum ada klaim BAST"
          emptyDescription="Catat BAST pertama begitu diserahkan ke prinsipal."
          emptyAction={
            <CanAccess permission={PERMISSIONS.TRANSPORTATION_CLAIMS_CREATE}>
              <Button size="sm" onClick={() => openEditor(EMPTY)}>
                Catat BAST baru
              </Button>
            </CanAccess>
          }
          dense
        />
      </Panel>

      {/* Create / edit the claim's own paperwork fields. */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>{editing?.id ? "Ubah BAST" : "Catat BAST baru"}</DialogTitle>
              <DialogDescription>
                Nomor klaim diterbitkan otomatis. Nomor BAST adalah nomor pada dokumen serah
                terima itu sendiri.
              </DialogDescription>
            </DialogHeader>

            {editing && (
              <div className="grid grid-cols-1 gap-4 py-4">
                <Field
                  label="Nomor BAST"
                  htmlFor="tc-ref"
                  error={errors.handoverReference}
                  required
                >
                  <TextInput
                    id="tc-ref"
                    mono
                    placeholder="BAST/123/2026"
                    value={editing.handoverReference}
                    invalid={!!errors.handoverReference}
                    onChange={(e) => setEditing({ ...editing, handoverReference: e.target.value })}
                  />
                </Field>

                <Field
                  label="Tanggal serah terima"
                  htmlFor="tc-date"
                  error={errors.handoverDate}
                  required
                >
                  <TextInput
                    id="tc-date"
                    type="date"
                    value={editing.handoverDate}
                    invalid={!!errors.handoverDate}
                    onChange={(e) => setEditing({ ...editing, handoverDate: e.target.value })}
                  />
                </Field>

                <Field
                  label="Nilai klaim"
                  htmlFor="tc-amount"
                  error={errors.claimedAmount}
                  required
                >
                  <TextInput
                    id="tc-amount"
                    type="number"
                    min={1}
                    step="any"
                    mono
                    value={editing.claimedAmount}
                    invalid={!!errors.claimedAmount}
                    onChange={(e) =>
                      setEditing({ ...editing, claimedAmount: Number(e.target.value) })
                    }
                  />
                </Field>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record what the agent read off iVendor. */}
      <Dialog open={!!statusEditing} onOpenChange={(open) => !open && setStatusEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (statusEditing) statusMutation.mutate(statusEditing);
            }}
          >
            <DialogHeader>
              <DialogTitle>Ubah status {statusEditing?.labelForTitle}</DialogTitle>
              <DialogDescription>
                Catat status yang dibaca dari iVendor. Bisa diubah ke status apa pun, kapan
                pun -- ini catatan atas proses di luar sistem, bukan alur persetujuan internal.
              </DialogDescription>
            </DialogHeader>

            {statusEditing && (
              <div className="grid grid-cols-1 gap-4 py-4">
                <Field label="Status" htmlFor="tc-status">
                  <SelectInput
                    id="tc-status"
                    value={statusEditing.claimStatus}
                    onChange={(e) =>
                      setStatusEditing({
                        ...statusEditing,
                        claimStatus: e.target.value as ClaimStatus,
                      })
                    }
                  >
                    {CLAIM_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {CLAIM_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </SelectInput>
                </Field>

                <Field label="Nomor invoice iVendor" htmlFor="tc-inv" hint="Kosongkan jika belum diterbitkan.">
                  <TextInput
                    id="tc-inv"
                    mono
                    value={statusEditing.principalInvoiceNumber}
                    onChange={(e) =>
                      setStatusEditing({ ...statusEditing, principalInvoiceNumber: e.target.value })
                    }
                  />
                </Field>

                <Field label="Catatan" htmlFor="tc-note" hint="Misalnya pesan dari iVendor yang tidak jelas.">
                  <TextareaInput
                    id="tc-note"
                    rows={3}
                    value={statusEditing.statusNote}
                    onChange={(e) =>
                      setStatusEditing({ ...statusEditing, statusNote: e.target.value })
                    }
                  />
                </Field>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStatusEditing(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={statusMutation.isPending}>
                Simpan status
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title={`Hapus ${pendingDelete?.claimNumber}?`}
        message="Hanya draft yang bisa dihapus. Klaim yang sudah diserahkan adalah catatan yang sudah dikirim ke prinsipal -- ubah statusnya jika perlu dikoreksi."
        confirmLabel="Hapus"
        variant="destructive"
        isPending={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </div>
  );
}
