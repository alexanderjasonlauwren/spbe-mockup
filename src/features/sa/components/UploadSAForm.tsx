import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, Loader2, FileText, X } from "lucide-react";
import { useRef, useState } from "react";
import { uploadSASchema, type UploadSAFormValues } from "../schema";
import { SPBE_LIST } from "@/utils/constants";
import { cn } from "@/lib/utils";

interface UploadSAFormProps {
  onSubmit: (values: UploadSAFormValues) => void;
  isPending: boolean;
}

export function UploadSAForm({ onSubmit, isPending }: UploadSAFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<UploadSAFormValues>({
    resolver: zodResolver(uploadSASchema),
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") setFile(dropped);
  };

  const handleReset = () => {
    reset();
    setFile(null);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* NO SA */}
      <div>
        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
          No SA
        </label>
        <input
          {...register("nomorSA")}
          placeholder="Contoh: SA-2023-09-001"
          className={cn(
            "w-full px-3 py-2 text-sm bg-surface-container-highest rounded-lg border-b-2 outline-none transition-colors",
            errors.nomorSA
              ? "border-red-500"
              : "border-transparent focus:border-[#1565C0]",
          )}
        />
        {errors.nomorSA && (
          <p className="text-xs text-red-600 mt-1">{errors.nomorSA.message}</p>
        )}
      </div>

      {/* SPBE */}
      <div>
        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
          SPBE
        </label>
        <select
          {...register("spbe")}
          className={cn(
            "w-full px-3 py-2 text-sm bg-surface-container-highest rounded-lg border-b-2 outline-none transition-colors",
            errors.spbe
              ? "border-red-500"
              : "border-transparent focus:border-[#1565C0]",
          )}
        >
          <option value="">Pilih SPBE Tujuan</option>
          {SPBE_LIST.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {errors.spbe && (
          <p className="text-xs text-red-600 mt-1">{errors.spbe.message}</p>
        )}
      </div>

      {/* Periode */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
            Periode Mulai
          </label>
          <input
            type="date"
            {...register("periodeMultai")}
            className={cn(
              "w-full px-3 py-2 text-sm bg-surface-container-highest rounded-lg border-b-2 outline-none transition-colors",
              errors.periodeMultai
                ? "border-red-500"
                : "border-transparent focus:border-[#1565C0]",
            )}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
            Periode Berakhir
          </label>
          <input
            type="date"
            {...register("periodeBerakhir")}
            className={cn(
              "w-full px-3 py-2 text-sm bg-surface-container-highest rounded-lg border-b-2 outline-none transition-colors",
              errors.periodeBerakhir
                ? "border-red-500"
                : "border-transparent focus:border-[#1565C0]",
            )}
          />
        </div>
      </div>

      {/* Total Kuota */}
      <div>
        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
          Total Kuota (MT)
        </label>
        <Controller
          name="totalKuota"
          control={control}
          render={({ field }) => (
            <input
              type="number"
              placeholder="0.00"
              value={field.value ?? ""}
              onChange={(e) =>
                field.onChange(
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              className={cn(
                "w-full px-3 py-2 text-sm bg-surface-container-highest rounded-lg border-b-2 outline-none transition-colors",
                errors.totalKuota
                  ? "border-red-500"
                  : "border-transparent focus:border-[#1565C0]",
              )}
            />
          )}
        />
        {errors.totalKuota && (
          <p className="text-xs text-red-600 mt-1">
            {errors.totalKuota.message}
          </p>
        )}
      </div>

      {/* Catatan */}
      <div>
        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
          Catatan Tambahan
        </label>
        <textarea
          {...register("notes")}
          placeholder="Tambahkan informasi tambahan jika diperlukan..."
          rows={3}
          className="w-full px-3 py-2 text-sm bg-surface-container-highest rounded-lg border-b-2 border-transparent focus:border-[#1565C0] outline-none transition-colors resize-none"
        />
      </div>

      {/* File Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
          dragging
            ? "border-[#1565C0] bg-blue-50"
            : "border-outline-variant hover:border-[#1565C0]",
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-5 w-5 text-[#1565C0]" />
            <span className="text-sm font-medium text-on-surface">
              {file.name}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              className="p-1 hover:bg-red-50 rounded-lg"
            >
              <X className="h-4 w-4 text-red-500" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 text-on-surface-variant mx-auto mb-2" />
            <p className="text-sm font-bold text-on-surface">
              Drag & Drop Dokumen SA
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              Mendukung Format PDF, XLSX (Max 10MB)
            </p>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleReset}
          className="flex-1 px-4 py-2.5 text-sm font-bold border border-outline-variant rounded-lg hover:bg-slate-50 transition-colors"
        >
          Reset Form
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 px-4 py-2.5 text-sm font-bold bg-[#1565C0] text-white rounded-lg hover:bg-[#004d99] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Konfirmasi & Simpan SA
        </button>
      </div>
    </form>
  );
}
