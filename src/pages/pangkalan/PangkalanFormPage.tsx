import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save } from "lucide-react";

const pangkalanSchema = z.object({
  name: z.string().min(1, "Nama pangkalan harus diisi"),
  address: z.string().min(1, "Alamat harus diisi"),
  city: z.string().min(1, "Kota/Kabupaten harus diisi"),
  province: z.string().min(1, "Provinsi harus dipilih"),
  phone: z.string().min(1, "Nomor telepon harus diisi"),
  manager: z.string().min(1, "Nama manager harus diisi"),
  capacity: z.number().int().min(0, "Kapasitas tidak boleh negatif"),
  notes: z.string().optional(),
  status: z.enum(["active", "inactive", "maintenance"]),
});

type PangkalanFormData = z.infer<typeof pangkalanSchema>;

export function PangkalanFormPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PangkalanFormData>({
    resolver: zodResolver(pangkalanSchema),
    defaultValues: {
      status: "active",
      capacity: 0,
    },
  });

  const onSubmit = async (data: PangkalanFormData) => {
    setIsSubmitting(true);
    try {
      // TODO: Replace with actual API call
      console.log("Pangkalan data:", data);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

      // Show success message (you can use toast here)
      alert("Pangkalan berhasil ditambahkan!");
      navigate("/products");
    } catch (error) {
      console.error("Error saving pangkalan:", error);
      alert("Gagal menyimpan pangkalan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = (value: string) => {
    if (value === "active" || value === "inactive" || value === "maintenance") {
      setValue("status", value);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tambah Pangkalan Baru"
        description="Isi formulir di bawah untuk menambahkan pangkalan baru ke sistem."
        actions={
          <Button
            variant="outline"
            onClick={() => navigate("/products")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card className="dark:bg-gray-800/50 dark:border-gray-700">
          <CardHeader className="border-b dark:border-gray-700">
            <CardTitle className="dark:text-white">Informasi Dasar</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="dark:text-gray-200">
                  Nama Pangkalan <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Contoh: Pangkalan Utama Jakarta"
                  className="dark:bg-gray-900 dark:border-gray-600"
                />
                {errors.name && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="manager" className="dark:text-gray-200">
                  Manager <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="manager"
                  {...register("manager")}
                  placeholder="Contoh: Budi Santoso"
                  className="dark:bg-gray-900 dark:border-gray-600"
                />
                {errors.manager && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.manager.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="dark:text-gray-200">
                Alamat <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="address"
                {...register("address")}
                placeholder="Jalan, nomor, kelurahan, kecamatan..."
                rows={3}
                className="dark:bg-gray-900 dark:border-gray-600"
              />
              {errors.address && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.address.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card className="dark:bg-gray-800/50 dark:border-gray-700">
          <CardHeader className="border-b dark:border-gray-700">
            <CardTitle className="dark:text-white">Informasi Lokasi</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="dark:text-gray-200">
                  Kota/Kabupaten <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="city"
                  {...register("city")}
                  placeholder="Contoh: Jakarta Selatan"
                  className="dark:bg-gray-900 dark:border-gray-600"
                />
                {errors.city && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.city.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="province" className="dark:text-gray-200">
                  Provinsi <span className="text-red-500">*</span>
                </Label>
                <Select onValueChange={(value) => setValue("province", value)}>
                  <SelectTrigger className="dark:bg-gray-900 dark:border-gray-600">
                    <SelectValue placeholder="Pilih provinsi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aceh">Aceh</SelectItem>
                    <SelectItem value="banten">Banten</SelectItem>
                    <SelectItem value="bengkulu">Bengkulu</SelectItem>
                    <SelectItem value="dki-jakarta">DKI Jakarta</SelectItem>
                    <SelectItem value="gorontalo">Gorontalo</SelectItem>
                    <SelectItem value="jambi">Jambi</SelectItem>
                    <SelectItem value="jawa-barat">Jawa Barat</SelectItem>
                    <SelectItem value="jawa-tengah">Jawa Tengah</SelectItem>
                    <SelectItem value="jawa-timur">Jawa Timur</SelectItem>
                    <SelectItem value="kalimantan-barat">
                      Kalimantan Barat
                    </SelectItem>
                    <SelectItem value="kalimantan-selatan">
                      Kalimantan Selatan
                    </SelectItem>
                    <SelectItem value="kalimantan-tengah">
                      Kalimantan Tengah
                    </SelectItem>
                    <SelectItem value="kalimantan-timur">
                      Kalimantan Timur
                    </SelectItem>
                    <SelectItem value="kalimantan-utara">
                      Kalimantan Utara
                    </SelectItem>
                    <SelectItem value="kepulauan-bangka-belitung">
                      Kepulauan Bangka Belitung
                    </SelectItem>
                    <SelectItem value="kepulauan-riau">
                      Kepulauan Riau
                    </SelectItem>
                    <SelectItem value="lampung">Lampung</SelectItem>
                    <SelectItem value="maluku">Maluku</SelectItem>
                    <SelectItem value="maluku-utara">Maluku Utara</SelectItem>
                    <SelectItem value="nusa-tenggara-barat">
                      Nusa Tenggara Barat
                    </SelectItem>
                    <SelectItem value="nusa-tenggara-timur">
                      Nusa Tenggara Timur
                    </SelectItem>
                    <SelectItem value="papua">Papua</SelectItem>
                    <SelectItem value="papua-barat">Papua Barat</SelectItem>
                    <SelectItem value="riau">Riau</SelectItem>
                    <SelectItem value="sulawesi-barat">
                      Sulawesi Barat
                    </SelectItem>
                    <SelectItem value="sulawesi-selatan">
                      Sulawesi Selatan
                    </SelectItem>
                    <SelectItem value="sulawesi-tengah">
                      Sulawesi Tengah
                    </SelectItem>
                    <SelectItem value="sulawesi-tenggara">
                      Sulawesi Tenggara
                    </SelectItem>
                    <SelectItem value="sulawesi-utara">
                      Sulawesi Utara
                    </SelectItem>
                    <SelectItem value="sumatera-barat">
                      Sumatera Barat
                    </SelectItem>
                    <SelectItem value="sumatera-selatan">
                      Sumatera Selatan
                    </SelectItem>
                    <SelectItem value="sumatera-utara">
                      Sumatera Utara
                    </SelectItem>
                    <SelectItem value="yogyakarta">Yogyakarta</SelectItem>
                  </SelectContent>
                </Select>
                {errors.province && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.province.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact & Capacity */}
        <Card className="dark:bg-gray-800/50 dark:border-gray-700">
          <CardHeader className="border-b dark:border-gray-700">
            <CardTitle className="dark:text-white">
              Kontak & Kapasitas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="dark:text-gray-200">
                  Nomor Telepon <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="Contoh: 021-1234567"
                  className="dark:bg-gray-900 dark:border-gray-600"
                />
                {errors.phone && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity" className="dark:text-gray-200">
                  Kapasitas (Ton) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  {...register("capacity", { valueAsNumber: true })}
                  placeholder="Contoh: 500"
                  className="dark:bg-gray-900 dark:border-gray-600"
                />
                {errors.capacity && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.capacity.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="dark:text-gray-200">
                Status
              </Label>
              <Select defaultValue="active" onValueChange={handleStatusChange}>
                <SelectTrigger className="dark:bg-gray-900 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Tidak Aktif</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card className="dark:bg-gray-800/50 dark:border-gray-700">
          <CardHeader className="border-b dark:border-gray-700">
            <CardTitle className="dark:text-white">Catatan Tambahan</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label htmlFor="notes" className="dark:text-gray-200">
                Catatan
              </Label>
              <Textarea
                id="notes"
                {...register("notes")}
                placeholder="Informasi tambahan tentang pangkalan (opsional)"
                rows={4}
                className="dark:bg-gray-900 dark:border-gray-600"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/products")}
          >
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Save className="h-4 w-4" />
            {isSubmitting ? "Menyimpan..." : "Simpan Pangkalan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
