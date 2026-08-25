import { scopeKey } from "@/mocks/scope";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import {
  createOrUpdateProduct,
  getProductDetail,
} from "@/features/products/api/productApi";
import { useDeskMutation } from "@/hooks/useDeskMutation";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel, PanelBody, PanelHeader, Skeleton } from "@/components/common/Panel";
import { Field, TextInput, Toggle } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { formatPercentId, formatRupiah } from "@/lib/format";

interface FormState {
  kode: string;
  nama: string;
  ukuran: string;
  hargaBeli: number;
  hargaJual: number;
  stok: number;
  stokMinimum: number;
  aktif: boolean;
}

const EMPTY: FormState = {
  kode: "",
  nama: "",
  ukuran: "",
  hargaBeli: 0,
  hargaJual: 0,
  stok: 0,
  stokMinimum: 0,
  aktif: true,
};

export function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const detail = useQuery({
    queryKey: [...scopeKey(), "product-detail", id],
    queryFn: () => getProductDetail(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!detail.data) return;
    const p = detail.data;
    setForm({
      kode: p.kode,
      nama: p.nama,
      ukuran: p.ukuran,
      hargaBeli: p.hargaBeli,
      hargaJual: p.hargaJual,
      stok: p.stok,
      stokMinimum: p.stokMinimum,
      aktif: p.aktif,
    });
  }, [detail.data]);

  const saveMutation = useDeskMutation({
    mutationFn: (values: FormState) =>
      createOrUpdateProduct(isEdit ? { ...values, id } : values),
    errorTitle: isEdit ? "Perubahan tidak tersimpan" : "Produk tidak ditambahkan",
    success: (p) => ({ title: `${p.nama} tersimpan` }),
    onDone: () => navigate("/products"),
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const margin = form.hargaJual - form.hargaBeli;
  const marginPct = form.hargaJual === 0 ? 0 : (margin / form.hargaJual) * 100;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!form.nama.trim()) next.nama = "Nama produk wajib diisi.";
    if (form.hargaJual <= 0) next.hargaJual = "Harga jual harus lebih dari nol.";
    if (form.hargaBeli > form.hargaJual)
      next.hargaBeli = "Harga beli melebihi harga jual — margin akan negatif.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    saveMutation.mutate(form);
  };

  if (isEdit && detail.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="h-3.5 w-3.5" />
        Kembali
      </Button>

      <PageHeader
        eyebrow="Data induk"
        title={isEdit ? `Ubah ${detail.data?.nama ?? "produk"}` : "Tambah produk"}
        description="Harga jual dipakai untuk menghitung nilai tagihan, dan stok minimum memicu peringatan otomatis."
      />

      <form onSubmit={submit}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel className="lg:col-span-2">
            <PanelHeader title="Identitas produk" />
            <PanelBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Nama produk"
                htmlFor="nama"
                error={errors.nama}
                required
                className="sm:col-span-2"
              >
                <TextInput
                  id="nama"
                  value={form.nama}
                  invalid={!!errors.nama}
                  placeholder="Nama produk"
                  onChange={(e) => set("nama", e.target.value)}
                />
              </Field>

              <Field
                label="Kode SKU"
                htmlFor="kode"
                hint={isEdit ? undefined : "Dibuat otomatis jika dikosongkan."}
              >
                <TextInput
                  id="kode"
                  mono
                  value={form.kode}
                  placeholder="SKU-0007"
                  onChange={(e) => set("kode", e.target.value)}
                />
              </Field>

              <Field label="Ukuran" htmlFor="ukuran">
                <TextInput
                  id="ukuran"
                  value={form.ukuran}
                  placeholder="3 kg"
                  onChange={(e) => set("ukuran", e.target.value)}
                />
              </Field>

              <Field label="Harga beli" htmlFor="beli" error={errors.hargaBeli}>
                <TextInput
                  id="beli"
                  type="number"
                  min={0}
                  step={100}
                  mono
                  value={form.hargaBeli}
                  invalid={!!errors.hargaBeli}
                  onChange={(e) => set("hargaBeli", Number(e.target.value))}
                />
              </Field>

              <Field
                label="Harga jual"
                htmlFor="jual"
                error={errors.hargaJual}
                required
              >
                <TextInput
                  id="jual"
                  type="number"
                  min={1}
                  step={100}
                  mono
                  value={form.hargaJual}
                  invalid={!!errors.hargaJual}
                  onChange={(e) => set("hargaJual", Number(e.target.value))}
                />
              </Field>
            </PanelBody>
          </Panel>

          <div className="space-y-4">
            <Panel>
              <PanelHeader title="Margin" />
              <PanelBody>
                <p className="data truncate text-figure font-semibold text-ink">
                  {formatRupiah(margin)}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {formatPercentId(marginPct, 1)} dari harga jual
                </p>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader title="Stok" />
              <PanelBody className="space-y-4">
                <Field label="Stok saat ini" htmlFor="stok">
                  <TextInput
                    id="stok"
                    type="number"
                    min={0}
                    mono
                    value={form.stok}
                    onChange={(e) => set("stok", Number(e.target.value))}
                  />
                </Field>
                <Field
                  label="Stok minimum"
                  htmlFor="min"
                  hint="Peringatan muncul saat stok turun di bawah angka ini."
                >
                  <TextInput
                    id="min"
                    type="number"
                    min={0}
                    mono
                    value={form.stokMinimum}
                    onChange={(e) => set("stokMinimum", Number(e.target.value))}
                  />
                </Field>
                <div className="border-t border-line">
                  <Toggle
                    label="Aktif dijual"
                    description="Produk nonaktif tetap tersimpan tapi tidak muncul di katalog aktif."
                    checked={form.aktif}
                    onChange={(aktif) => set("aktif", aktif)}
                  />
                </div>
              </PanelBody>
            </Panel>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <Button asChild variant="outline" type="button">
            <Link to="/products">Batal</Link>
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEdit ? "Simpan perubahan" : "Tambah produk"}
          </Button>
        </div>
      </form>
    </div>
  );
}
