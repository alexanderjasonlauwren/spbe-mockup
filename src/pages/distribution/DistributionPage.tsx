import { useState } from "react";
import { useDistributionPlan } from "@/features/distribution/hooks/useDistributionPlan";
import { PlanListPanel } from "@/features/distribution/components/PlanListPanel";
import { PlanDetailPanel } from "@/features/distribution/components/PlanDetailPanel";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Field, SelectInput, TextInput } from "@/components/common/Field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDateLong, formatNumber } from "@/lib/format";
import type { PlanRow } from "@/features/distribution/types";
import { unitLabel } from "@/lib/lexicon";

function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function DistributionPage() {
  const {
    planList,
    planDetail,
    selectedPlan,
    isLoadingList,
    isLoadingDetail,
    selectedPlanId,
    setSelectedPlanId,
    outletOptions,
    productOptions,
    driverOptions,
    saOptions,
    saveDraftMutation,
    confirmPlanMutation,
    createPlanMutation,
    cancelPlanMutation,
    printMutation,
  } = useDistributionPlan();

  const [creating, setCreating] = useState(false);
  const [newDate, setNewDate] = useState(tomorrowIso());
  const [newSaId, setNewSaId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const total = planDetail.reduce((s, r) => s + r.jumlahUnit, 0);
  const drafts = planList.filter((p) => p.status === "Draft").length;

  const handleSaveDraft = (rows: PlanRow[]) => {
    if (selectedPlanId) saveDraftMutation.mutate({ planId: selectedPlanId, rows });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operasi harian"
        title="Perencanaan Distribusi"
        description="Susun titik singgah dan armada untuk satu hari pengiriman. Konfirmasi menarik kuota dari Schedule Agreement dan menerbitkan surat jalan."
        meta={
          <span className="text-xs text-ink-muted">
            {planList.length} rencana tercatat · {drafts} masih draf
          </span>
        }
      />

      <div className="grid min-h-[36rem] grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <PlanListPanel
            plans={planList}
            isLoading={isLoadingList}
            selectedId={selectedPlanId}
            onSelect={setSelectedPlanId}
            onCreate={() => {
              setNewSaId(saOptions.find((s) => !s.disabled)?.id ?? "");
              setCreating(true);
            }}
          />
        </div>

        <div className="lg:col-span-9">
          <PlanDetailPanel
            plan={selectedPlan}
            rows={planDetail}
            isLoading={isLoadingDetail}
            outletOptions={outletOptions}
            productOptions={productOptions}
            driverOptions={driverOptions}
            onSaveDraft={handleSaveDraft}
            onConfirm={() => setConfirming(true)}
            onCancelPlan={() => setCancelling(true)}
            onPrint={() => selectedPlanId && printMutation.mutate(selectedPlanId)}
            isSaving={saveDraftMutation.isPending}
            isConfirming={confirmPlanMutation.isPending}
          />
        </div>
      </div>

      {/* New plan */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buat rencana distribusi</DialogTitle>
            <DialogDescription>
              Satu rencana mewakili satu hari pengiriman. Kuota baru berkurang saat
              rencana dikonfirmasi, bukan saat dibuat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field label="Tanggal pengiriman" htmlFor="tanggal" required>
              <TextInput
                id="tanggal"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </Field>

            <Field
              label="Schedule Agreement"
              htmlFor="sa"
              hint="Hanya agreement aktif yang masih punya sisa kuota."
              required
            >
              <SelectInput
                id="sa"
                value={newSaId}
                onChange={(e) => setNewSaId(e.target.value)}
              >
                <option value="">Pilih agreement</option>
                {saOptions.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.disabled}>
                    {s.label} — {s.sublabel}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Batal
            </Button>
            <Button
              disabled={!newDate || !newSaId || createPlanMutation.isPending}
              onClick={() =>
                createPlanMutation.mutate(
                  { tanggal: newDate, saId: newSaId },
                  { onSuccess: () => setCreating(false) },
                )
              }
            >
              Buat rencana
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm — spell out what confirmation actually does. */}
      <ConfirmDialog
        isOpen={confirming}
        variant="default"
        title={`Konfirmasi ${selectedPlan?.kode ?? "rencana"}?`}
        message="Setelah dikonfirmasi, rencana tidak dapat diubah dan armada dapat berangkat."
        details={
          selectedPlan && (
            <ul className="space-y-1.5">
              <li>
                <span className="data">{formatNumber(total)}</span> {unitLabel()} ditarik dari{" "}
                <span className="data">{selectedPlan.nomorSA}</span>, menyisakan{" "}
                <span className="data">
                  {formatNumber(Math.max(0, selectedPlan.sisaKuotaSA - total))}
                </span>
                .
              </li>
              <li>
                <span className="data">{planDetail.length}</span> surat jalan terbit
                untuk {formatDateLong(selectedPlan.tanggal)}.
              </li>
              <li>Pemberhentian muncul di Monitoring Distribusi dan papan berangkat.</li>
            </ul>
          )
        }
        confirmLabel="Konfirmasi rencana"
        isPending={confirmPlanMutation.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          if (!selectedPlanId) return;
          confirmPlanMutation.mutate(selectedPlanId, {
            onSettled: () => setConfirming(false),
          });
        }}
      />

      <ConfirmDialog
        isOpen={cancelling}
        title={`Batalkan ${selectedPlan?.kode ?? "rencana"}?`}
        message="Surat jalan yang belum berjalan akan ditarik kembali dan kuota dikembalikan ke agreement."
        details="Rencana yang sebagian armadanya sudah bergerak tidak dapat dibatalkan sekaligus — tutup surat jalan satu per satu di Monitoring Distribusi."
        confirmLabel="Batalkan rencana"
        isPending={cancelPlanMutation.isPending}
        onCancel={() => setCancelling(false)}
        onConfirm={() => {
          if (!selectedPlanId) return;
          cancelPlanMutation.mutate(selectedPlanId, {
            onSettled: () => setCancelling(false),
          });
        }}
      />
    </div>
  );
}
