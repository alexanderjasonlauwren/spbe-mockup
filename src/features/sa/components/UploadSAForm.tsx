import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload } from "lucide-react";
import {
  Field,
  FileDrop,
  SelectInput,
  TextInput,
  TextareaInput,
} from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { uploadSASchema, type UploadSAFormValues } from "../schema";

interface UploadSAFormProps {
  onSubmit: (values: UploadSAFormValues & { namaDokumen?: string }) => void;
  isPending: boolean;
  spbeOptions?: string[];
}

export function UploadSAForm({ onSubmit, isPending, spbeOptions }: UploadSAFormProps) {
  const [file, setFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UploadSAFormValues>({
    resolver: zodResolver(uploadSASchema),
    defaultValues: { nomorSA: "", spbe: "", periodeMulai: "", periodeBerakhir: "" },
  });

  const options = spbeOptions ?? [];

  const submit = handleSubmit((values) => {
    onSubmit({ ...values, namaDokumen: file?.name });
    reset();
    setFile(null);
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nomor SA" htmlFor="nomorSA" error={errors.nomorSA?.message} required>
        <TextInput
          id="nomorSA"
          mono
          placeholder="SA-2026-08-014"
          invalid={!!errors.nomorSA}
          {...register("nomorSA")}
        />
      </Field>

      <Field label="SPBE penerbit" htmlFor="spbe" error={errors.spbe?.message} required>
        <SelectInput id="spbe" invalid={!!errors.spbe} {...register("spbe")}>
          <option value="">
            {options.length === 0 ? "Belum ada mitra SPBE terdaftar" : "Pilih SPBE"}
          </option>
          {options.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectInput>
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Periode mulai"
          htmlFor="periodeMulai"
          error={errors.periodeMulai?.message}
          required
        >
          <TextInput
            id="periodeMulai"
            type="date"
            invalid={!!errors.periodeMulai}
            {...register("periodeMulai")}
          />
        </Field>
        <Field
          label="Periode berakhir"
          htmlFor="periodeBerakhir"
          error={errors.periodeBerakhir?.message}
          required
        >
          <TextInput
            id="periodeBerakhir"
            type="date"
            invalid={!!errors.periodeBerakhir}
            {...register("periodeBerakhir")}
          />
        </Field>
      </div>

      <Field
        label="Total kuota"
        htmlFor="totalKuota"
        error={errors.totalKuota?.message}
        hint="Jumlah tabung yang dialokasikan SPBE untuk periode ini."
        required
      >
        <TextInput
          id="totalKuota"
          type="number"
          min={1}
          mono
          placeholder="450000"
          invalid={!!errors.totalKuota}
          {...register("totalKuota", { valueAsNumber: true })}
        />
      </Field>

      <Field label="Dokumen SA" hint="Disimpan sebagai lampiran pada arsip agreement.">
        <FileDrop
          file={file}
          onFile={setFile}
          accept="application/pdf"
          hint="PDF, maksimal 10 MB"
          disabled={isPending}
        />
      </Field>

      <Field label="Catatan" htmlFor="notes" error={errors.notes?.message}>
        <TextareaInput
          id="notes"
          placeholder="Misalnya: menunggu tanda tangan basah dari SPBE."
          {...register("notes")}
        />
      </Field>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {isPending ? "Mengunggah…" : "Unggah agreement"}
      </Button>
      <p className="text-xs leading-relaxed text-ink-muted">
        Agreement masuk sebagai draf. Kuota baru dapat ditarik rencana distribusi
        setelah diaktifkan.
      </p>
    </form>
  );
}
