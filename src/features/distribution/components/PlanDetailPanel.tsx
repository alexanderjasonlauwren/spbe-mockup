import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Lock,
  Plus,
  Printer,
  Save,
  Trash2,
  TriangleAlert,
  Truck,
  XCircle,
} from "lucide-react";
import { PanelHeader } from "@/components/common/Panel";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/common/Panel";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getStatusVariant } from "@/lib/status";
import { SelectInput, TextInput } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateLong, formatNumber } from "@/lib/format";
import type {
  DistributionPlan,
  DriverOption,
  PlanOption,
  PlanRow,
} from "../types";
import { outletLabel, outletLabelTitle, unitLabel } from "@/lib/lexicon";

interface PlanDetailPanelProps {
  plan?: DistributionPlan;
  rows: PlanRow[];
  isLoading: boolean;
  outletOptions: PlanOption[];
  productOptions: { id: string; label: string; satuan: string }[];
  driverOptions: DriverOption[];
  onSaveDraft: (rows: PlanRow[]) => void;
  onConfirm: () => void;
  onCancelPlan: () => void;
  onPrint: () => void;
  isSaving: boolean;
  isConfirming: boolean;
}

/** A stop that has not been persisted yet gets a temporary id. */
let tempSeq = 0;

export function PlanDetailPanel({
  plan,
  rows,
  isLoading,
  outletOptions,
  productOptions,
  driverOptions,
  onSaveDraft,
  onConfirm,
  onCancelPlan,
  onPrint,
  isSaving,
  isConfirming,
}: PlanDetailPanelProps) {
  const [draft, setDraft] = useState<PlanRow[]>(rows);
  const [dirty, setDirty] = useState(false);

  // Server state wins whenever the selected plan or its saved rows change.
  useEffect(() => {
    setDraft(rows);
    setDirty(false);
  }, [rows, plan?.id]);

  const editable = plan?.status === "Draft";

  const total = draft.reduce((s, r) => s + r.jumlahUnit, 0);
  const overQuota = plan ? total > plan.sisaKuotaSA : false;

  const loadByDriver = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of draft) {
      if (!row.driverId) continue;
      map.set(row.driverId, (map.get(row.driverId) ?? 0) + row.jumlahUnit);
    }
    return map;
  }, [draft]);

  const overloaded = driverOptions.filter(
    (d) => (loadByDriver.get(d.id) ?? 0) > d.kapasitas,
  );
  const unassigned = draft.filter((r) => !r.driverId);
  // A line with no product cannot be priced, so it cannot be invoiced either.
  const tanpaProduk = draft.filter((r) => r.lines.some((l) => !l.productId));
  const kreditDiblokir = draft.filter((r) => r.alasanBlokir);
  const adaHambatan =
    overQuota ||
    overloaded.length > 0 ||
    unassigned.length > 0 ||
    tanpaProduk.length > 0 ||
    kreditDiblokir.length > 0;

  const patchRow = (id: string, patch: Partial<PlanRow>) => {
    setDraft((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty(true);
  };

  /**
   * Lines are what the stop is; the total is a consequence of them.
   *
   * Recomputed here on every edit so the quota and capacity warnings above the
   * table respond as the planner types, rather than after a save round trip.
   */
  const patchLines = (id: string, lines: PlanRow["lines"]) =>
    patchRow(id, { lines, jumlahUnit: lines.reduce((s, l) => s + l.jumlah, 0) });

  const addRow = () => {
    const used = new Set(draft.map((r) => r.outletId));
    const next = outletOptions.find((p) => !used.has(p.id));
    if (!next) return;
    tempSeq += 1;
    const hour = Math.min(17, 7 + draft.length);
    setDraft((prev) => [
      ...prev,
      {
        id: `baru-${tempSeq}`,
        outletId: next.id,
        outlet: next.label,
        alamat: next.sublabel ?? "",
        lines: [{ productId: productOptions[0]?.id ?? "", jumlah: 100 }],
        jumlahUnit: 100,
        driverId: null,
        driver: "Belum ditetapkan",
        jamPengiriman: `${String(hour).padStart(2, "0")}:00`,
        statusBayar: "Lunas",
        sisaKuotaOutlet: 0,
        piutang: 0,
        piutangJatuhTempo: 0,
      },
    ]);
    setDirty(true);
  };

  const removeRow = (id: string) => {
    setDraft((prev) => prev.filter((r) => r.id !== id));
    setDirty(true);
  };

  if (!plan) {
    return (
      <div className="flex h-full items-center justify-center rounded-md border border-line bg-panel">
        <EmptyState
          icon={Truck}
          title="Pilih rencana di sebelah kiri"
          description="Atau buat rencana baru untuk tanggal pengiriman berikutnya."
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-line bg-panel">
      <PanelHeader
        title={
          <span className="flex items-center gap-2">
            <span className="data text-xs normal-case tracking-normal text-ink">
              {plan.kode}
            </span>
            <StatusBadge variant={getStatusVariant(plan.status)} label={plan.status} />
          </span>
        }
        hint={`${formatDateLong(plan.tanggal)} · menarik kuota dari ${plan.nomorSA}`}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={onPrint}>
              <Printer className="h-3.5 w-3.5" />
              Lembar rute
            </Button>
            {editable ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSaveDraft(draft)}
                  disabled={isSaving || !dirty}
                >
                  <Save className="h-3.5 w-3.5" />
                  {dirty ? "Simpan draf" : "Tersimpan"}
                </Button>
                <Button
                  size="sm"
                  onClick={onConfirm}
                  disabled={
                    isConfirming || draft.length === 0 || dirty || adaHambatan
                  }
                  title={
                    dirty
                      ? "Simpan draf terlebih dahulu"
                      : adaHambatan
                        ? "Selesaikan hambatan di atas sebelum konfirmasi"
                        : "Terbitkan surat jalan dan tarik kuota"
                  }
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Konfirmasi
                </Button>
              </>
            ) : plan.status === "Terkonfirmasi" ? (
              <Button variant="outline" size="sm" onClick={onCancelPlan}>
                <XCircle className="h-3.5 w-3.5" />
                Batalkan
              </Button>
            ) : null}
          </>
        }
      />

      {/* Running totals — the ceiling the planner works against. */}
      <div className="grid grid-cols-2 divide-x divide-line border-b border-line sm:grid-cols-4">
        <Figure label="Titik singgah" value={formatNumber(draft.length)} unit={outletLabel()} />
        <Figure
          label="Total muatan"
          value={formatNumber(total)}
          unit={unitLabel()}
          tone={overQuota ? "rust" : undefined}
        />
        <Figure
          label="Sisa kuota SA"
          value={formatNumber(Math.max(0, plan.sisaKuotaSA - (editable ? total : 0)))}
          unit={unitLabel()}
          tone={overQuota ? "rust" : undefined}
        />
        <Figure
          label="Armada terpakai"
          value={formatNumber(loadByDriver.size)}
          unit="unit"
        />
      </div>

      {/* Blockers, stated as what to do about them. */}
      {editable && adaHambatan && (
        <ul className="divide-y divide-line border-b border-line">
          {overQuota && (
            <Blocker>
              Muatan melebihi sisa kuota {plan.nomorSA} sebanyak{" "}
              <span className="data">{formatNumber(total - plan.sisaKuotaSA)}</span>{" "}
              {unitLabel()}. Kurangi jumlah, atau aktifkan agreement lain di{" "}
              <Link to="/sa" className="font-semibold text-ink underline decoration-signal decoration-2 underline-offset-2">
                Schedule Agreement
              </Link>
              .
            </Blocker>
          )}
          {overloaded.map((d) => (
            <Blocker key={d.id}>
              {d.label} membawa{" "}
              <span className="data">{formatNumber(loadByDriver.get(d.id) ?? 0)}</span>{" "}
              {unitLabel()}, melebihi kapasitas{" "}
              <span className="data">{formatNumber(d.kapasitas)}</span>. Pindahkan
              sebagian titik ke armada lain.
            </Blocker>
          ))}
          {tanpaProduk.length > 0 && (
            <Blocker>
              {tanpaProduk.length} titik punya baris muatan tanpa produk. Pilih
              produknya agar tagihan dapat dihitung.
            </Blocker>
          )}
          {unassigned.length > 0 && (
            <Blocker>
              {unassigned.length} titik belum punya driver. Tetapkan armada sebelum
              konfirmasi.
            </Blocker>
          )}
          {kreditDiblokir.map((r) => (
              <Blocker key={`kredit-${r.id}`}>
                {r.outlet} diblokir karena kredit. {r.alasanBlokir} Selesaikan
                tagihan di{" "}
                <Link
                  to="/receivables"
                  className="font-semibold text-ink underline decoration-signal decoration-2 underline-offset-2"
                >
                  Piutang
                </Link>
                , atau naikkan plafon pada data {outletLabel()}.
            </Blocker>
          ))}
        </ul>
      )}

      {/* Stop list */}
      <div className="flex-1 overflow-x-auto">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : draft.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="Rencana ini belum punya titik singgah"
            description={`Tambahkan ${outletLabel()} satu per satu, atau tarik pesanan yang sudah disetujui dari halaman Pesanan ${outletLabelTitle()}.`}
            action={
              editable && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={addRow}>
                    <Plus className="h-3.5 w-3.5" />
                    Tambah {outletLabel()}
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/orders">Lihat pesanan</Link>
                  </Button>
                </div>
              )
            }
          />
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-panel-sunk">
                <th className="label px-5 py-2.5 text-2xs text-ink-muted">{outletLabelTitle()}</th>
                <th className="label px-3 py-2.5 text-2xs text-ink-muted" style={{ width: "6.5rem" }}>
                  Jam
                </th>
                <th className="label px-3 py-2.5 text-2xs text-ink-muted" style={{ width: "19rem" }}>
                  Muatan
                </th>
                <th className="label px-3 py-2.5 text-2xs text-ink-muted" style={{ width: "14rem" }}>
                  Driver / armada
                </th>
                <th className="label px-3 py-2.5 text-2xs text-ink-muted" style={{ width: "8rem" }}>
                  Kredit
                </th>
                {editable && <th style={{ width: "1%" }} />}
              </tr>
            </thead>
            <tbody>
              {draft.map((row) => {
                const driver = driverOptions.find((d) => d.id === row.driverId);
                const load = row.driverId ? loadByDriver.get(row.driverId) ?? 0 : 0;
                const over = driver ? load > driver.kapasitas : false;

                return (
                  <tr key={row.id} className="border-b border-line last:border-b-0">
                    <td className="px-5 py-2.5">
                      <span className="block text-sm font-medium text-ink">
                        {row.outlet}
                      </span>
                      <span className="block text-xs text-ink-muted">{row.alamat}</span>
                    </td>

                    <td className="px-3 py-2.5">
                      {editable ? (
                        <TextInput
                          type="time"
                          mono
                          aria-label={`Jam pengiriman ${row.outlet}`}
                          value={row.jamPengiriman}
                          onChange={(e) =>
                            patchRow(row.id, { jamPengiriman: e.target.value })
                          }
                        />
                      ) : (
                        <span className="data text-sm text-ink">{row.jamPengiriman}</span>
                      )}
                    </td>

                    <td className="px-3 py-2.5">
                      {editable ? (
                        <LoadEditor
                          row={row}
                          products={productOptions}
                          onChange={(lines) => patchLines(row.id, lines)}
                        />
                      ) : (
                        <LoadSummary row={row} products={productOptions} />
                      )}
                    </td>

                    <td className="px-3 py-2.5">
                      {editable ? (
                        <>
                          <SelectInput
                            aria-label={`Driver untuk ${row.outlet}`}
                            value={row.driverId ?? ""}
                            invalid={!row.driverId || over}
                            onChange={(e) =>
                              patchRow(row.id, {
                                driverId: e.target.value || null,
                                driver:
                                  driverOptions.find((d) => d.id === e.target.value)
                                    ?.label ?? "Belum ditetapkan",
                              })
                            }
                          >
                            <option value="">Belum ditetapkan</option>
                            {driverOptions.map((d) => (
                              <option key={d.id} value={d.id} disabled={d.disabled}>
                                {d.label} — {d.sublabel}
                                {d.disabled ? " (cuti)" : ""}
                              </option>
                            ))}
                          </SelectInput>
                          {driver && (
                            <p
                              className={cn(
                                "mt-1 text-2xs",
                                over ? "font-semibold text-rust-ink" : "text-ink-muted",
                              )}
                            >
                              Muatan <span className="data">{formatNumber(load)}</span> /{" "}
                              <span className="data">{formatNumber(driver.kapasitas)}</span>
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="block text-sm text-ink">{row.driver}</span>
                          {driver && (
                            <span className="data block text-2xs text-ink-muted">
                              {driver.sublabel}
                            </span>
                          )}
                        </>
                      )}
                    </td>

                    <td className="px-3 py-2.5">
                      <StatusBadge
                        variant={row.alasanBlokir ? "danger" : "success"}
                        label={row.alasanBlokir ? "Diblokir" : "Lancar"}
                      />
                      {row.piutang > 0 && (
                        <span className="data mt-1 block text-2xs text-ink-muted">
                          piutang {formatNumber(Math.round(row.piutang / 1000))} rb
                        </span>
                      )}
                    </td>

                    {editable && (
                      <td className="px-3 py-2.5">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Hapus ${row.outlet} dari rencana`}
                          onClick={() => removeRow(row.id)}
                          className="hover:bg-rust-soft hover:text-rust-ink"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
        {editable ? (
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-3.5 w-3.5" />
            Tambah {outletLabel()}
          </Button>
        ) : (
          <p className="flex items-center gap-2 text-xs text-ink-muted">
            <Lock className="h-3.5 w-3.5" />
            {plan.status === "Batal"
              ? "Rencana dibatalkan. Kuota sudah dikembalikan ke agreement."
              : `Dikonfirmasi oleh ${plan.dikonfirmasiOleh ?? "—"}. Surat jalan sudah terbit dan tidak dapat diubah di sini.`}
          </p>
        )}
        {dirty && editable && (
          <p className="text-xs font-medium text-signal-ink">
            Ada perubahan yang belum disimpan.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * What one stop carries, per product.
 *
 * The planner used to type a single number here and the API guessed which
 * product it meant — fine while everything was 3 kg cylinders, wrong the moment
 * a round carries two sizes at very different prices. A stop is a set of lines,
 * so this edits lines.
 */
function LoadEditor({
  row,
  products,
  onChange,
}: {
  row: PlanRow;
  products: { id: string; label: string; satuan: string }[];
  onChange: (lines: PlanRow["lines"]) => void;
}) {
  const used = new Set(row.lines.map((l) => l.productId));
  const spare = products.find((p) => !used.has(p.id));

  return (
    <div className="space-y-1.5">
      {row.lines.map((line, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <SelectInput
            aria-label={`Produk baris ${i + 1} untuk ${row.outlet}`}
            className="min-w-0 flex-1 py-1.5 text-xs"
            value={line.productId}
            invalid={!line.productId}
            onChange={(e) =>
              onChange(
                row.lines.map((l, li) =>
                  li === i ? { ...l, productId: e.target.value } : l,
                ),
              )
            }
          >
            <option value="">Pilih produk</option>
            {products.map((p) => (
              <option key={p.id} value={p.id} disabled={used.has(p.id) && p.id !== line.productId}>
                {p.label}
              </option>
            ))}
          </SelectInput>

          <TextInput
            type="number"
            min={1}
            step={10}
            mono
            aria-label={`Jumlah baris ${i + 1} untuk ${row.outlet}`}
            className="w-20 shrink-0 py-1.5 text-right text-xs"
            value={line.jumlah}
            onChange={(e) =>
              onChange(
                row.lines.map((l, li) =>
                  li === i ? { ...l, jumlah: Math.max(0, Number(e.target.value)) } : l,
                ),
              )
            }
          />

          {/* The last line stays: a stop with nothing on it is not a stop. */}
          {row.lines.length > 1 && (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Hapus baris ${i + 1}`}
              onClick={() => onChange(row.lines.filter((_, li) => li !== i))}
              className="shrink-0 hover:bg-rust-soft hover:text-rust-ink"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}

      <div className="flex items-center justify-between gap-2 pt-0.5">
        {spare ? (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onChange([...row.lines, { productId: spare.id, jumlah: 10 }])}
          >
            <Plus className="h-3 w-3" />
            Produk
          </Button>
        ) : (
          <span />
        )}
        <span className="data text-2xs font-semibold text-ink">
          {formatNumber(row.jumlahUnit)}
        </span>
      </div>
    </div>
  );
}

/** The same load, once the plan is frozen. */
function LoadSummary({
  row,
  products,
}: {
  row: PlanRow;
  products: { id: string; label: string; satuan: string }[];
}) {
  return (
    <div className="space-y-0.5">
      {row.lines.map((line, i) => {
        const p = products.find((x) => x.id === line.productId);
        return (
          <p key={i} className="flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate text-ink-muted">
              {p?.label ?? "Produk tidak dikenal"}
            </span>
            <span className="data shrink-0 font-semibold text-ink">
              {formatNumber(line.jumlah)}
            </span>
          </p>
        );
      })}
    </div>
  );
}

function Figure({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  tone?: "rust";
}) {
  return (
    <div className="px-5 py-3">
      <p className="label text-2xs text-ink-muted">{label}</p>
      <p
        className={cn(
          "data mt-0.5 text-lg font-semibold",
          tone === "rust" ? "text-rust-ink" : "text-ink",
        )}
      >
        {value}
        <span className="ml-1 font-sans text-2xs font-medium tracking-normal text-ink-muted">
          {unit}
        </span>
      </p>
    </div>
  );
}

function Blocker({ children }: { children: React.ReactNode }) {
  return (
    <li className="spine flex items-start gap-2.5 bg-rust-soft/40 px-5 py-2.5 text-rust">
      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rust-ink" />
      <p className="text-xs leading-relaxed text-ink">{children}</p>
    </li>
  );
}
