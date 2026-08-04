import { z } from "zod";

export const uploadSASchema = z.object({
  nomorSA: z.string().min(1, "Nomor SA wajib diisi"),
  spbe: z.string().min(1, "SPBE wajib dipilih"),
  periodeMulai: z.string().min(1, "Periode mulai wajib diisi"),
  periodeBerakhir: z.string().min(1, "Periode berakhir wajib diisi"),
  totalKuota: z
    .number({ error: "Kuota harus berupa angka" })
    .min(1, "Kuota minimal 1 tabung"),
  notes: z.string().optional(),
});

export type UploadSAFormValues = z.infer<typeof uploadSASchema>;
