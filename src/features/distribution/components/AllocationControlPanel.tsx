import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { Panel, PanelBody, PanelHeader, Skeleton } from "@/components/common/Panel";
import { Field, TextInput } from "@/components/common/Field";
import { Badge } from "@/components/ui/badge";
import { getMonthlyGrid, getPaymentBoard } from "@/features/distribution/api/distributionApi";
import { useAuthStore } from "@/features/auth/store/authStore";
import { PERMISSIONS } from "@/features/rbac/permissions";
import { scopeKey } from "@/mocks/scope";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  const canSeePayments = useAuthStore((state) => state.hasPermission(PERMISSIONS.PAYMENTS_VIEW));
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
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="border-b border-line bg-panel-sunk text-xs text-ink-muted">
                    <tr><th className="px-4 py-2 text-left">Pangkalan</th><th className="px-4 py-2 text-right">Rencana</th><th className="px-4 py-2 text-right">Terverifikasi</th><th className="px-4 py-2 text-right">Belum didanai</th><th className="px-4 py-2 text-left">Status</th></tr>
                  </thead>
                  <tbody>
                    {board.data?.rows.map((row) => (
                      <tr key={row.outletId} className="border-b border-line last:border-0">
                        <td className="px-4 py-3"><span className="block font-mono text-xs text-ink-muted">{row.outletCode}</span>{row.outletName}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatNumber(row.plannedQty)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatNumber(row.fundedQty)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatNumber(row.unpaidQty)}</td>
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
