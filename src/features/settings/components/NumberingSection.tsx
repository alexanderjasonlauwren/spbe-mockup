import { scopeKey } from "@/mocks/scope";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSystemConfig, saveNumbering } from "@/features/system/api/systemApi";
import { useDeskMutation } from "@/hooks/useDeskMutation";
import { Panel, PanelBody, PanelHeader, Skeleton } from "@/components/common/Panel";
import { Field, TextInput, Toggle } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import type { NumberingEntity } from "@/mocks/types";
import { outletLabel } from "@/lib/lexicon";

/* ── numbering ─────────────────────────────────────────────────────────── */

export function NumberingSection() {
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
      { key: "pesanan", label: `Pesanan ${outletLabel()}`, hint: "Permintaan masuk.", seq: "001" },
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
