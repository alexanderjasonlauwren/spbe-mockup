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

interface PlanDetailPanelProps {
  plan?: DistributionPlan;
  rows: PlanRow[];
  isLoading: boolean;
  pangkalanOptions: PlanOption[];
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
  pangkalanOptions,
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

  const total = draft.reduce((s, r) => s + r.jumlahTabung, 0);
  const overQuota = plan ? total > plan.sisaKuotaSA : false;

  const loadByDriver = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of draft) {
      if (!row.driverId) continue;
      map.set(row.driverId, (map.get(row.driverId) ?? 0) + row.jumlahTabung);
    }
    return map;
  }, [draft]);

  const overloaded = driverOptions.filter(
    (d) => (loadByDriver.get(d.id) ?? 0) > d.kapasitas,
  );
  const unassigned = draft.filter((r) => !r.driverId);
  const kreditDiblokir = draft.filter((r) => r.alasanBlokir);
  const adaHambatan =
    overQuota ||
    overloaded.length > 0 ||
    unassigned.length > 0 ||
    kreditDiblokir.length > 0;

  const patchRow = (id: string, patch: Partial<PlanRow>) => {
    setDraft((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty(true);
  };

  const addRow = () => {
    const used = new Set(draft.map((r) => r.pangkalanId));
    const next = pangkalanOptions.find((p) => !used.has(p.id));
    if (!next) return;
    tempSeq += 1;
    const hour = Math.min(17, 7 + draft.length);
    setDraft((prev) => [
      ...prev,
      {
        id: `baru-${tempSeq}`,
        pangkalanId: next.id,
        pangkalan: next.label,
        alamat: next.sublabel ?? "",
        jumlahTabung: 100,
        driverId: null,
        driver: "Belum ditetapkan",
        jamPengiriman: `${String(hour).padStart(2, "0")}:00`,
        statusBayar: "Lunas",
        sisaKuotaPangkalan: 0,
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
        <Figure label="Titik singgah" value={formatNumber(draft.length)} unit="pangkalan" />
        <Figure
          label="Total muatan"
          value={formatNumber(total)}
          unit="tabung"
          tone={overQuota ? "rust" : undefined}
        />
        <Figure
          label="Sisa kuota SA"
          value={formatNumber(Math.max(0, plan.sisaKuotaSA - (editable ? total : 0)))}
          unit="tabung"
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
              tabung. Kurangi jumlah, atau aktifkan agreement lain di{" "}
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
              tabung, melebihi kapasitas{" "}
              <span className="data">{formatNumber(d.kapasitas)}</span>. Pindahkan
              sebagian titik ke armada lain.
            </Blocker>
          ))}
          {unassigned.length > 0 && (
            <Blocker>
              {unassigned.length} titik belum punya driver. Tetapkan armada sebelum
              konfirmasi.
            </Blocker>
          )}
          {kreditDiblokir.map((r) => (
              <Blocker key={`kredit-${r.id}`}>
                {r.pangkalan} diblokir karena kredit. {r.alasanBlokir} Selesaikan
                tagihan di{" "}
                <Link
                  to="/receivables"
                  className="font-semibold text-ink underline decoration-signal decoration-2 underline-offset-2"
                >
                  Piutang
                </Link>
                , atau naikkan plafon pada data pangkalan.
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
            description="Tambahkan pangkalan satu per satu, atau tarik pesanan yang sudah disetujui dari halaman Pesanan Pangkalan."
            action={
              editable && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={addRow}>
                    <Plus className="h-3.5 w-3.5" />
                    Tambah pangkalan
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
                <th className="label px-5 py-2.5 text-2xs text-ink-muted">Pangkalan</th>
                <th className="label px-3 py-2.5 text-2xs text-ink-muted" style={{ width: "6.5rem" }}>
                  Jam
                </th>
                <th className="label px-3 py-2.5 text-right text-2xs text-ink-muted" style={{ width: "8rem" }}>
                  Tabung
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
                        {row.pangkalan}
                      </span>
                      <span className="block text-xs text-ink-muted">{row.alamat}</span>
                    </td>

                    <td className="px-3 py-2.5">
                      {editable ? (
                        <TextInput
                          type="time"
                          mono
                          aria-label={`Jam pengiriman ${row.pangkalan}`}
                          value={row.jamPengiriman}
                          onChange={(e) =>
                            patchRow(row.id, { jamPengiriman: e.target.value })
                          }
                        />
                      ) : (
                        <span className="data text-sm text-ink">{row.jamPengiriman}</span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-right">
                      {editable ? (
                        <TextInput
                          type="number"
                          min={1}
                          step={10}
                          mono
                          aria-label={`Jumlah tabung ${row.pangkalan}`}
                          className="text-right"
                          value={row.jumlahTabung}
                          onChange={(e) =>
                            patchRow(row.id, {
                              jumlahTabung: Math.max(0, Number(e.target.value)),
                            })
                          }
                        />
                      ) : (
                        <span className="data text-sm font-semibold text-ink">
                          {formatNumber(row.jumlahTabung)}
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2.5">
                      {editable ? (
                        <>
                          <SelectInput
                            aria-label={`Driver untuk ${row.pangkalan}`}
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
                          aria-label={`Hapus ${row.pangkalan} dari rencana`}
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
            Tambah pangkalan
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
