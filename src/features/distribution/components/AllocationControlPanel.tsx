import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock3, Wallet } from "lucide-react";
import { Panel, PanelBody, PanelHeader, Skeleton } from "@/components/common/Panel";
import { Field, SelectInput, TextInput } from "@/components/common/Field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getMonthlyGrid, getPaymentBoard } from "@/features/distribution/api/distributionApi";
import {
  fundDistributionStop,
  getOutletReceipts,
  releaseDistributionStop,
} from "@/features/finance/api/financeApi";
import { useAuthStore } from "@/features/auth/store/authStore";
import { PERMISSIONS } from "@/features/rbac/permissions";
import { useDeskMutation } from "@/hooks/useDeskMutation";
import { scopeKey } from "@/mocks/scope";
import { formatNumber, formatRupiah, formatRupiahShort } from "@/lib/format";
import { cn } from "@/lib/utils";

/** One outlet's stop for one plan, on the date the board is showing --
 *  everything Danai/Lepas needs that a board row already carries. */
interface StopTarget {
  outletId: string;
  outletCode: string;
  outletName: string;
  distributionOrderId: string;
  fundingPaymentId?: string;
  hasUnpricedLine: boolean;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const stateLabel = {
  paid: "Terverifikasi",
  partial: "Sebagian",
  unpaid: "Belum bayar",
  credit: "Kredit disetujui",
} as const;

export function AllocationControlPanel() {
  const [month, setMonth] = useState(currentMonth);
  const [date, setDate] = useState(today);
  const [funding, setFunding] = useState<StopTarget | null>(null);
  const canSeePayments = useAuthStore((state) => state.hasPermission(PERMISSIONS.PAYMENTS_VIEW));
  // The route this hangs off requires BOTH finance.create.payment_allocations
  // AND distribution.update.distribution_orders (see fortius-backend's
  // routes.go) -- funding a stop writes payment state and releases a
  // distribution slot, and neither permission alone carries both authorities.
  // DISTRIBUTION_EDIT is the frontend constant for the second; the first has
  // none yet, matching PaymentPage's own "Alokasikan" button, which is
  // likewise ungated in the console and left to the backend to refuse.
  const canEditDistribution = useAuthStore((state) => state.hasPermission(PERMISSIONS.DISTRIBUTION_EDIT));
  const canFund = canSeePayments && canEditDistribution;

  const releaseMutation = useDeskMutation({
    mutationFn: (input: { paymentId: string; distributionOrderId: string; outletId: string }) =>
      releaseDistributionStop(input),
    errorTitle: "Gagal melepas dana",
    success: (result) => ({
      title: "Dana dilepas",
      description: `${formatRupiahShort(result.availableBalance)} tersedia kembali pada penerimaan ini.`,
      tone: "warning",
    }),
  });

  const grid = useQuery({
    queryKey: [...scopeKey(), "distribution-month-grid", month],
    queryFn: () => getMonthlyGrid(month),
    enabled: /^\d{4}-\d{2}$/.test(month),
  });
  const board = useQuery({
    queryKey: [...scopeKey(), "distribution-payment-board", date],
    queryFn: () => getPaymentBoard(date),
    enabled: canSeePayments && /^\d{4}-\d{2}-\d{2}$/.test(date),
  });

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title="Matriks alokasi pangkalan"
          hint="Format operasional: Id Registrasi / pangkalan × tanggal"
        />
        <PanelBody className="space-y-4">
          <div className="max-w-xs">
            <Field label="Bulan">
              <TextInput type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            </Field>
          </div>

          {grid.isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : grid.isError ? (
            <p className="text-sm text-danger">Matriks tidak dapat dimuat: {grid.error.message}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="min-w-max border-collapse text-xs">
                <thead className="bg-panel-sunk text-ink-muted">
                  <tr>
                    <th className="sticky left-0 z-20 min-w-48 border-b border-r border-line bg-panel-sunk px-3 py-2 text-left">
                      Id Registrasi / Pangkalan
                    </th>
                    <th className="border-b border-r border-line px-3 py-2 text-right">Alokasi</th>
                    {grid.data?.dates.map((day) => (
                      <th key={day} className="min-w-12 border-b border-r border-line px-2 py-2 text-right">
                        {Number(day.slice(-2))}
                      </th>
                    ))}
                    <th className="border-b border-r border-line px-3 py-2 text-right">Total</th>
                    <th className="border-b border-line px-3 py-2 text-right">Sisa</th>
                  </tr>
                </thead>
                <tbody>
                  {grid.data?.rows.map((row) => (
                    <tr key={row.outletId} className="border-b border-line last:border-0">
                      <th className="sticky left-0 z-10 border-r border-line bg-panel px-3 py-2 text-left font-medium text-ink">
                        <span className="block font-mono text-[10px] text-ink-muted">{row.outletCode}</span>
                        {row.outletName}
                      </th>
                      <td className="border-r border-line px-3 py-2 text-right tabular-nums">{formatNumber(row.targetQty)}</td>
                      {grid.data?.dates.map((day) => (
                        <td key={day} className="border-r border-line px-2 py-2 text-right tabular-nums">
                          {row.cells[day] == null ? "·" : formatNumber(row.cells[day])}
                        </td>
                      ))}
                      <td className="border-r border-line px-3 py-2 text-right font-medium tabular-nums">{formatNumber(row.total)}</td>
                      <td className={cn("px-3 py-2 text-right font-medium tabular-nums", row.remainingQty < 0 && "text-danger")}>
                        {formatNumber(row.remainingQty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-panel-sunk font-medium">
                  <tr>
                    <th className="sticky left-0 border-r border-t border-line bg-panel-sunk px-3 py-2 text-left">Total rencana / target SA</th>
                    <td className="border-r border-t border-line" />
                    {grid.data?.footer.map((day) => (
                      <td key={day.date} className={cn("border-r border-t border-line px-2 py-2 text-right tabular-nums", day.shortfall !== 0 && "text-warning")}>
                        {formatNumber(day.planned)} / {day.hasTarget ? formatNumber(day.required) : "—"}
                      </td>
                    ))}
                    <td className="border-r border-t border-line px-3 py-2 text-right">{formatNumber(grid.data?.totals.planned ?? 0)}</td>
                    <td className="border-t border-line px-3 py-2 text-right">{formatNumber(grid.data?.totals.shortfall ?? 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <p className="text-xs text-ink-muted">
            Titik berarti belum direncanakan; angka 0 berarti nol memang dicatat. Sisa negatif tetap ditampilkan agar kelebihan alokasi tidak tersembunyi.
          </p>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="Kontrol pembayaran sebelum berangkat" hint="Hanya pembayaran terverifikasi yang dihitung sebagai dana tersedia" />
        <PanelBody className="space-y-4">
          <div className="max-w-xs">
            <Field label="Tanggal pengiriman">
              <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </Field>
          </div>
          {!canSeePayments ? (
            <p className="text-sm text-ink-muted">Anda dapat melihat matriks distribusi, tetapi status pembayaran memerlukan izin membaca penerimaan kas.</p>
          ) : board.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : board.isError ? (
            <p className="text-sm text-danger">Kontrol pembayaran tidak dapat dimuat: {board.error.message}</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  ["Direncanakan", board.data?.summary.planned ?? 0],
                  ["Terverifikasi", board.data?.summary.funded ?? 0],
                  ["Belum didanai", board.data?.summary.unpaid ?? 0],
                  ["Terkirim", board.data?.summary.delivered ?? 0],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-line bg-panel-sunk px-4 py-3">
                    <p className="text-xs text-ink-muted">{label}</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">{formatNumber(Number(value))}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="border-b border-line bg-panel-sunk text-xs text-ink-muted">
                    <tr>
                      <th className="px-4 py-2 text-left">Pangkalan</th>
                      <th className="px-4 py-2 text-right">Rencana</th>
                      <th className="px-4 py-2 text-right">Terverifikasi</th>
                      <th className="px-4 py-2 text-right">Belum didanai</th>
                      <th className="px-4 py-2 text-right">Kredit</th>
                      <th className="px-4 py-2 text-right">Terkirim</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.data?.rows.map((row) => {
                      const target: StopTarget = {
                        outletId: row.outletId,
                        outletCode: row.outletCode,
                        outletName: row.outletName,
                        distributionOrderId: row.distributionOrderId,
                        fundingPaymentId: row.fundingPaymentId,
                        hasUnpricedLine: row.hasUnpricedLine,
                      };
                      const anomaly = row.planCount > 1;
                      const isFunded = !!row.fundingPaymentId;
                      return (
                        <tr key={row.outletId} className="border-b border-line last:border-0">
                          <td className="px-4 py-3">
                            <span className="block font-mono text-xs text-ink-muted">{row.outletCode}</span>
                            {row.outletName}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatNumber(row.plannedQty)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatNumber(row.fundedQty)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatNumber(row.unpaidQty)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatNumber(row.creditQty)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatNumber(row.deliveredQty)}</td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={row.state === "unpaid" ? "destructive" : "outline"}
                              className={cn(
                                (row.state === "paid" || row.state === "credit") && "border-success/30 bg-success/10 text-success",
                                row.state === "partial" && "border-warning/30 bg-warning/10 text-warning",
                              )}
                            >
                              {row.state === "paid" ? <CheckCircle2 className="mr-1 h-3 w-3" /> : row.hasUnverifiedPayment ? <Clock3 className="mr-1 h-3 w-3" /> : <AlertTriangle className="mr-1 h-3 w-3" />}
                              {row.hasUnverifiedPayment ? "Menunggu verifikasi" : stateLabel[row.state]}
                            </Badge>
                            {row.lastPaymentAt && (
                              <span className={cn("mt-1 block text-2xs text-ink-muted", row.late && "text-rust-ink")}>
                                {row.late ? "Terlambat — " : ""}dibayar {new Date(row.lastPaymentAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                            {row.hasUnpricedLine && (
                              <span className="mt-1 block text-2xs text-warning">Harga jual belum ditetapkan</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.state === "credit" ? (
                              <span className="text-xs text-ink-muted">Kredit, tanpa penerimaan</span>
                            ) : !canFund ? (
                              <span className="text-xs text-ink-muted">—</span>
                            ) : anomaly ? (
                              <Button
                                size="xs"
                                variant="outline"
                                disabled
                                title="Pangkalan ini ada pada lebih dari satu rencana untuk tanggal ini — pilih rencana yang benar secara manual."
                              >
                                Danai
                              </Button>
                            ) : isFunded ? (
                              <Button
                                size="xs"
                                variant="outline"
                                disabled={releaseMutation.isPending}
                                onClick={() =>
                                  releaseMutation.mutate({
                                    paymentId: row.fundingPaymentId!,
                                    distributionOrderId: row.distributionOrderId,
                                    outletId: row.outletId,
                                  })
                                }
                              >
                                Lepas
                              </Button>
                            ) : (
                              <Button size="xs" onClick={() => setFunding(target)}>
                                <Wallet className="mr-1 h-3 w-3" />
                                Danai
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </PanelBody>
      </Panel>

      <FundStopDialog target={funding} onClose={() => setFunding(null)} />
    </div>
  );
}

/**
 * Danai's picker. A stop is funded from an existing, already-recorded
 * receipt -- not by recording one here -- because a receipt can arrive
 * before or after the plan, and RecordPaymentDialog on PaymentPage is
 * already the one place that creates one. This dialog answers a narrower
 * question: which already-recorded receipt covers this stop.
 */
function FundStopDialog({ target, onClose }: { target: StopTarget | null; onClose: () => void }) {
  const [paymentId, setPaymentId] = useState("");

  const receipts = useQuery({
    queryKey: [...scopeKey(), "outlet-receipts", target?.outletId],
    queryFn: () => getOutletReceipts(target!.outletId),
    enabled: !!target,
  });

  const mutation = useDeskMutation({
    mutationFn: (input: { paymentId: string; distributionOrderId: string; outletId: string }) =>
      fundDistributionStop(input),
    errorTitle: "Gagal mendanai titik ini",
    success: (result) => ({
      title: "Titik didanai",
      description: `Sisa penerimaan setelah ini: ${formatRupiahShort(result.availableBalance)}.`,
      tone: "success",
    }),
    onDone: () => {
      onClose();
      setPaymentId("");
    },
  });

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Danai {target?.outletName}</DialogTitle>
          <DialogDescription>
            Pilih penerimaan yang menutup seluruh titik ini pada rencana hari ini. Satu
            penerimaan mendanai satu titik secara penuh — tidak ada pendanaan sebagian.
          </DialogDescription>
        </DialogHeader>

        {target?.hasUnpricedLine && (
          <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            Salah satu produk pada titik ini belum punya harga jual yang berlaku. Pendanaan
            akan ditolak sampai harga ditetapkan.
          </p>
        )}

        {receipts.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (receipts.data ?? []).length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-muted">
            Belum ada penerimaan tercatat untuk pangkalan ini. Catat penerimaan dari halaman
            Pembayaran terlebih dahulu.
          </p>
        ) : (
          <Field label="Penerimaan">
            <SelectInput value={paymentId} onChange={(e) => setPaymentId(e.target.value)}>
              <option value="">Pilih penerimaan…</option>
              {(receipts.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nomor} — {formatRupiah(r.jumlah)} ({r.status})
                </option>
              ))}
            </SelectInput>
          </Field>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            disabled={!paymentId || mutation.isPending}
            onClick={() =>
              target &&
              mutation.mutate({
                paymentId,
                distributionOrderId: target.distributionOrderId,
                outletId: target.outletId,
              })
            }
          >
            Danai titik ini
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
