import { History, Upload } from "lucide-react";
import { useScheduleAgreement } from "@/features/sa/hooks/useScheduleAgreement";
import { SAFilterBar } from "@/features/sa/components/SAFilterBar";
import { SATable } from "@/features/sa/components/SATable";
import { UploadSAForm } from "@/features/sa/components/UploadSAForm";
import { downloadSAPDF } from "@/features/sa/api/saApi";
import type { UploadSAFormValues } from "@/features/sa/schema";

export function SAManagementPage() {
  const { saList, isLoading, filters, setFilters, uploadMutation, convertMutation } =
    useScheduleAgreement();

  const handleUpload = (values: UploadSAFormValues) => {
    uploadMutation.mutate(values);
  };

  const handleDownload = async (id: string) => {
    const blob = await downloadSAPDF(id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SA-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const globalSisaKuota = saList
    .filter((s) => s.status === "Aktif")
    .reduce((sum, s) => sum + s.sisaKuota, 0);

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-on-surface">Schedule Agreement</h1>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-[#1565C0] text-white rounded-lg hover:bg-[#004d99] transition-all">
            <Upload className="h-4 w-4" />
            Upload SA Baru
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold border border-outline-variant rounded-lg hover:bg-slate-50 transition-all">
            <History className="h-4 w-4" />
            Riwayat SA
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <SAFilterBar filters={filters} onFilterChange={setFilters} />

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SA Table */}
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h3 className="text-base font-bold text-on-surface">
              Daftar Schedule Agreement Aktif
            </h3>
          </div>
          <SATable
            data={saList}
            isLoading={isLoading}
            onConvert={(id) => convertMutation.mutate(id)}
            onDownload={handleDownload}
          />
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-4 space-y-6">
          {/* Upload Form */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6">
            <h3 className="text-base font-bold text-on-surface mb-5">
              Upload Schedule Agreement
            </h3>
            <UploadSAForm
              onSubmit={handleUpload}
              isPending={uploadMutation.isPending}
            />
          </div>

          {/* Sisa Kuota Global */}
          <div className="bg-[#1565C0] rounded-xl p-6 text-white">
            <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">
              Sisa Kuota Global
            </p>
            <p className="text-4xl font-black">
              {(globalSisaKuota / 1000).toFixed(1)}
              <span className="text-lg font-medium ml-1">M MT</span>
            </p>
            <p className="text-xs opacity-70 mt-2">Periode Mei – Terjaga</p>
          </div>

          {/* Panduan */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-4">
              Panduan Pengisian
            </h4>
            <ol className="space-y-3">
              {[
                "Pastikan No SA sesuai dengan format penomoran resmi Pertamina untuk sinkronisasi data.",
                "Upload dokumen pendukung dalam resolusi tinggi agar sistem OCR dapat membaca data otomatis.",
                "Periksa kembali Total Kuota sebelum menyimpan, data ini akan menjadi acuan perencanaan logistik.",
              ].map((text, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#1565C0] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-xs text-on-surface-variant">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
