/**
 * The two halves of a Base SA import.
 *
 * Kept as a hook of its own rather than folded into `useScheduleAgreement`
 * because the batch between the two calls is state: parsing produces something
 * that exists on the server and has written nothing, and the screen holding it
 * has to be able to say so — and to throw it away when the dialog closes
 * without applying.
 */
import { useState } from "react";
import { useDeskMutation } from "@/hooks/useDeskMutation";
import { applyImport, parseImport } from "../api/saApi";
import type { SAImportBatch } from "../types";

export function useSAImport() {
  const [batch, setBatch] = useState<SAImportBatch | null>(null);

  const parseMutation = useDeskMutation({
    mutationFn: ({ saId, file }: { saId: string; file: File }) =>
      parseImport(saId, file),
    errorTitle: "Berkas tidak terbaca",
    // No success toast. The diff IS the result, and it is on screen the moment
    // this resolves; a toast saying "read" over the top of it would be the
    // second announcement of the same fact.
    onDone: setBatch,
  });

  const applyMutation = useDeskMutation({
    mutationFn: (batchId: string) => applyImport(batchId),
    errorTitle: "Impor gagal diterapkan",
    success: (applied) => ({
      title: "Target harian diperbarui",
      description: `${applied.barisDitulis.toLocaleString("id-ID")} tanggal tercatat dengan berkas ini sebagai sumbernya.`,
    }),
    // Every query is refetched by useDeskMutation itself, which is what the
    // planning grid needs: it reads these targets, and a grid still showing
    // yesterday's obligations after an import is the failure this screen exists
    // to prevent.
    onDone: () => setBatch(null),
  });

  return {
    batch,
    /** Drops a parsed batch without applying it. The server keeps the record. */
    discard: () => setBatch(null),
    parseMutation,
    applyMutation,
  };
}
