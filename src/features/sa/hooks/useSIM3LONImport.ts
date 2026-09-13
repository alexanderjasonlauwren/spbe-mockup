import { useState } from "react";
import { useDeskMutation } from "@/hooks/useDeskMutation";
import { applySIM3LON, previewSIM3LON } from "../api/saApi";
import type { SIM3LONPreview } from "../types";

export function useSIM3LONImport() {
  const [preview, setPreview] = useState<SIM3LONPreview | null>(null);

  const previewMutation = useDeskMutation({
    mutationFn: ({ file, supplierName, productId }: {
      file: File;
      supplierName: string;
      productId: string;
    }) => previewSIM3LON(file, supplierName, productId),
    errorTitle: "XLSX SIM3LON tidak dapat dibaca",
    onDone: setPreview,
  });

  const applyMutation = useDeskMutation({
    mutationFn: (batchId: string) => applySIM3LON(batchId),
    errorTitle: "Impor SIM3LON gagal diterapkan",
    success: (result) => ({
      title: "Rencana bulanan SIM3LON diterapkan",
      description: `${result.outletTargetsWritten.toLocaleString("id-ID")} alokasi pangkalan dan ${result.dailyTargetsWritten.toLocaleString("id-ID")} target harian diperbarui.`,
    }),
    onDone: () => setPreview(null),
  });

  return {
    preview,
    discard: () => setPreview(null),
    previewMutation,
    applyMutation,
  };
}
